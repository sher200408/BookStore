from sqlalchemy import create_engine
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import sessionmaker, declarative_base
import os

import config
engine = create_engine(config.DATABASE_URL)

try:
    with engine.connect():
        pass
except OperationalError:
    engine.dispose()
    sqlite_path = os.path.join(config.BASE_DIR, "kitob.db").replace("\\", "/")
    config.DATABASE_URL = f"sqlite:///{sqlite_path}"
    engine = create_engine(
        config.DATABASE_URL,
        connect_args={"check_same_thread": False},
    )
    print("PostgreSQL ulanmadi. SQLite zaxira bazasi ishga tushirildi: kitob.db")
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
