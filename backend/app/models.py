from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
# МЫ УДАЛЯЕМ создание declarative_base() здесь!
# И импортируем его из твоего файла database.py
from app.database import Base 

class Race(Base):
    __tablename__ = "races"

    id = Column(Integer, primary_key=True, index=True)
    country = Column(String)
    location = Column(String)
    circuit = Column(String)
    date_start = Column(String)
    year = Column(Integer)
    session_key = Column(Integer, unique=True)

    telemetry_data = relationship("Telemetry", back_populates = "race")

class Telemetry(Base):
    __tablename__ = "telemetry"

    id = Column(Integer, primary_key=True, index=True)
    race_id = Column(Integer, ForeignKey("races.id"))
    speed = Column(Integer)
    rpm = Column(Integer)
    gear = Column(Integer)
    throttle = Column(Integer)
    date = Column(String)

    race = relationship("Race", back_populates = "telemetry_data")