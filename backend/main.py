from urllib import response

import requests
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

# Импортируем наши новые модули
from app.database import SessionLocal, engine, Base
from app.models import Race, Telemetry
from app.schemas import RaceInfo

# Создаем таблицы в БД (если их еще нет)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="F1 Analytics Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"], # Адрес твоего Vite
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Функция (Dependency) для получения сессии БД
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.on_event("startup")
def sync_data():
    """Синхронизация данных из API в PostgreSQL при старте"""
    db = SessionLocal()
    print("--- Проверка актуальности данных в БД ---")
    
    url = "https://api.openf1.org/v1/sessions?session_name=Race"
    response = requests.get(url)
    
    if response.status_code == 200:
        data = response.json()
        for item in data:
            # Проверяем, есть ли уже такая гонка в базе (по дате и стране)
            exists = db.query(Race).filter(Race.date_start == item['date_start']).first()
            if not exists:
                new_race = Race(
                country=item['country_name'],
                location=item['location'],
                circuit=item['circuit_short_name'],
                year=item['year'],
                date_start=item['date_start'],
                session_key=item['session_key'] # ВАЖНО: сохраняем ключ сессии
            )
                db.add(new_race)
        db.commit()
        print(f"--- Синхронизация завершена. Данные в безопасности в Postgres ---")
    db.close()

@app.get("/races")
def get_all_races(db: Session = Depends(get_db)):
    """Возвращает список всех гонок из базы данных"""
    races = db.query(Race).all()
    return races

@app.get("/search", response_model=RaceInfo)
def search_race(country: str, db: Session = Depends(get_db)):
    # ТЕПЕРЬ МЫ ИЩЕМ В ПОСТГРЕСЕ, А НЕ В ИНТЕРНЕТЕ
    race = db.query(Race).filter(Race.country.ilike(country)).first()
    
    if not race:
        raise HTTPException(status_code=404, detail="Race not found in database")
    
    # Возвращаем данные из БД, а Pydantic сам превратит их в JSON
    return race

@app.post("/sync-telemetry/{session_key}")
def sync_telemetry(session_key: int):
    db = SessionLocal()
    try:
        # 1. Сначала найдем гонку в нашей базе, чтобы знать её race.id
        race = db.query(Race).filter(Race.session_key == session_key).first()
        if not race:
            return {"status": "error", "message": "Race not found in local DB"}

        # 2. Формируем URL для запроса к внешнему API
        url = f"https://api.openf1.org/v1/car_data?session_key={session_key}&driver_number=1"
        
        print(f"--- Запрос к API: {url} ---")
        response = requests.get(url, timeout=10)
        data = response.json()

        if not data:
            return {"status": "empty"}

        # --- ТВОЙ ФИЛЬТР ACTIVE DATA ---
        active_data = [entry for entry in data if int(entry.get('speed', 0)) > 10]

        if not active_data:
            print("Машина стояла всю сессию, берем последние 300...")
            subset = data[-300:]
        else:
            # Берем 300 точек из середины гонки (где самый экшн)
            mid = len(active_data) // 2
            start = max(0, mid - 150)
            subset = active_data[start : start + 300]
        # --------------------------

        for entry in subset:
            new_point = Telemetry(
                race_id=race.id, # Теперь race определен!
                speed=int(entry.get('speed', 0)),
                rpm=int(entry.get('rpm', 0)),
                gear=int(entry.get('gear', 0)),
                throttle=int(entry.get('throttle', 0)),
                date=str(entry.get('date'))
            )
            db.add(new_point)
        
        db.commit()
        print(f"--- COMMIT SUCCESS! Добавлено {len(subset)} точек ---")
        return {"status": "success", "msg": f"Added {len(subset)} active records"}
    
    except Exception as e:
        db.rollback()
        print(f"Ошибка: {e}")
        return {"status": "error", "message": str(e)}
    finally:
        db.close()
        
@app.get("/test-db")
def test_db(db: Session = Depends(get_db)):
    # Считаем, сколько записей в каждой таблице
    races_count = db.query(Race).count()
    telemetry_count = db.query(Telemetry).count()
    return {
        "races_in_db": races_count,
        "telemetry_points_in_db": telemetry_count
    }

@app.get("/telemetry/{session_key}")
def get_telemetry(session_key: int, db: Session = Depends(get_db)):
    # Находим гонку по ключу сессии
    race = db.query(Race).filter(Race.session_key == session_key).first()
    if not race:
        raise HTTPException(status_code=404, detail="Race not found")
    
    # Забираем всю телеметрию для этой гонки
    telemetry_data = db.query(Telemetry).filter(Telemetry.race_id == race.id).order_by(Telemetry.date.asc()).all()
    return telemetry_data