import os
import requests
import numpy as np
from fastapi import FastAPI, Body, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from groq import Groq
from dotenv import load_dotenv

# Загружаем ключ из .env
load_dotenv()

from app.database import SessionLocal, engine, Base
from app.models import Race, Telemetry
from app.schemas import RaceInfo

Base.metadata.create_all(bind=engine)

app = FastAPI(title="F1 Analytics Engine")

# Инициализация клиента Groq
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.on_event("startup")
def sync_data():
    """Синхронизация при старте"""
    db = SessionLocal()
    url = "https://api.openf1.org/v1/sessions?session_name=Race"
    try:
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            data = response.json()
            for item in data:
                exists = db.query(Race).filter(Race.date_start == item['date_start']).first()
                if not exists:
                    new_race = Race(
                        country=item['country_name'],
                        location=item['location'],
                        circuit=item['circuit_short_name'],
                        year=item['year'],
                        date_start=item['date_start'],
                        session_key=item['session_key']
                    )
                    db.add(new_race)
            db.commit()
    except Exception as e:
        print(f"Sync error: {e}")
    finally:
        db.close()

@app.get("/races")
def get_all_races(db: Session = Depends(get_db)):
    return db.query(Race).all()

@app.post("/analyze-telemetry")
async def analyze_telemetry(data: list = Body(...)):
    """Вызов реальной LLM Groq для анализа"""
    s1 = [d['speed1'] for d in data if d['speed1'] is not None]
    s2 = [d['speed2'] for d in data if d['speed2'] is not None]
    
    if not s1 or not s2:
        return {"analysis": "Insufficient data points for AI inference."}

    avg1, max1 = np.mean(s1), np.max(s1)
    avg2, max2 = np.mean(s2), np.max(s2)

    prompt = f"""
    Analyze F1 telemetry:
    Driver A: Avg {avg1:.1f} km/h, Top {max1} km/h.
    Driver B: Avg {avg2:.1f} km/h, Top {max2} km/h.
    Provide a professional PhD-level race engineering verdict (max 2 sentences).
    Focus on cornering efficiency and power delivery.
    """

    try:
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}]
        )
        return {"analysis": completion.choices[0].message.content}
    except Exception as e:
        return {"analysis": f"AI Engine Error: {str(e)}"}

@app.post("/sync-telemetry/{session_key}/{driver_number}")
def sync_telemetry(session_key: int, driver_number: int, db: Session = Depends(get_db)):
    try:
        # 1. Проверяем наличие гонки
        race = db.query(Race).filter(Race.session_key == session_key).first()
        if not race: 
            return {"status": "error", "message": "Race not found"}

        # 2. Очищаем старые данные (Идемпотентность)
        # Чтобы при повторном нажатии не плодить дубликаты
        db.query(Telemetry).filter(
            Telemetry.race_id == race.id, 
            Telemetry.driver_number == driver_number
        ).delete()

        # 3. Запрос к OpenF1
        url = f"https://api.openf1.org/v1/car_data?session_key={session_key}&driver_number={driver_number}"
        response = requests.get(url, timeout=15)
        
        if response.status_code != 200:
            return {"status": "error", "message": f"OpenF1 API error: {response.status_code}"}
            
        data = response.json()
        if not data: 
            return {"status": "empty", "message": "No data found for this driver"}

        # 4. Обработка данных
        # Берем последние 1000 точек для более глубокого анализа
        subset = data[-1000:] 
        
        telemetry_objects = [
            Telemetry(
                race_id=race.id,
                driver_number=driver_number,
                speed=int(entry.get('speed', 0)),
                rpm=int(entry.get('rpm', 0)),
                gear=int(entry.get('gear', 0)),
                throttle=int(entry.get('throttle', 0)),
                date=str(entry.get('date'))
            ) for entry in subset
        ]

        # Используем bulk_save_objects для ускорения записи в БД
        db.bulk_save_objects(telemetry_objects)
        db.commit()

        return {
            "status": "success", 
            "added": len(telemetry_objects), 
            "driver": driver_number,
            "session": session_key
        }

    except Exception as e:
        db.rollback()
        print(f"Telemetry Sync Error: {e}")
        return {"status": "error", "message": str(e)}
    
@app.get("/telemetry/{session_key}/{driver_number}")
def get_telemetry(session_key: int, driver_number: int, db: Session = Depends(get_db)):
    race = db.query(Race).filter(Race.session_key == session_key).first()
    if not race: raise HTTPException(status_code=404, detail="Race not found")
    
    return db.query(Telemetry).filter(
        Telemetry.race_id == race.id,
        Telemetry.driver_number == driver_number
    ).order_by(Telemetry.date.asc()).all()

@app.get("/drivers/{session_key}")
def get_drivers(session_key: int):
    url = f"https://api.openf1.org/v1/drivers?session_key={session_key}"
    res = requests.get(url, timeout=10)
    if res.status_code == 200:
        return [{"number": d['driver_number'], "name": d['full_name'], "code": d['name_acronym']} for d in res.json()]
    return []