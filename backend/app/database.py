from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Марат, замени на свои данные из BotLabX (пароль и имя базы)
SQLALCHEMY_DATABASE_URL = "postgresql://postgres:marikayrik04@db:5432/f1_db"

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()