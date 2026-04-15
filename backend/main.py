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
    from app.database import SessionLocal
    import traceback # Чтобы видеть полную ошибку
    
    db = SessionLocal()
    try:
        race = db.query(Race).filter(Race.session_key == session_key).first()
        if not race:
            return {"error": f"Race {session_key} not found"}

        url = f"https://api.openf1.org/v1/car_data?session_key={session_key}&driver_number=1"
        print(f"--- Запрос к API: {url} ---")
        
        response = requests.get(url, timeout=10)
        
        if response.status_code != 200:
            print(f"!!! API Error: {response.status_code} !!!")
            return {"error": f"API returned {response.status_code}"}
            
        data = response.json()
        print(f"--- Получено записей: {len(data)} ---")

        if not data:
            return {"status": "empty"}

        # Пробуем сохранить только 5 штук и смотрим на каждую
        for i in range(min(5, len(data))):
            entry = data[i]
            print(f"Пробую записать точку {i}: {entry.get('date')}")
            
            new_point = Telemetry(
                race_id=race.id,
                speed=int(entry.get('speed', 0)), # Принудительно в int
                rpm=int(entry.get('rpm', 0)),
                gear=int(entry.get('gear', 0)),
                throttle=int(entry.get('throttle', 0)),
                date=str(entry.get('date')) # Принудительно в str
            )
            db.add(new_point)
        
        print("--- Пробую сделать COMMIT ---")
        db.commit()
        print("--- COMMIT SUCCESS! ---")
        
        return {"status": "success", "msg": "Records added"}

    except Exception as e:
        db.rollback()
        error_details = traceback.format_exc() # ПОЛНЫЙ ТРЕЙСБЭК
        print(f"!!!!!!!! КРИТИЧЕСКАЯ ОШИБКА !!!!!!!!\n{error_details}")
        return {"status": "error", "exception": str(e), "trace": error_details}
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