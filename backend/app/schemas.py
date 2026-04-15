from pydantic import BaseModel
from typing import List, Optional

class TelemetryBase(BaseModel):
    speed: int
    rpm: int
    gear: int
    date: str

    class Config:
        from_attributes = True

class RaceInfo(BaseModel):
    country: str
    location: str
    circuit: str
    year: int
    date_start: str
    session_key: Optional[int]

    class Config:
        from_attributes = True # Эта строчка позволит Pydantic читать данные напрямую из базы SQLAlchemy