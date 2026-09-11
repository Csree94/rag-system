from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import get_settings
import os

settings = get_settings()

# Create engine using DATABASE_URL from environment
# If DATABASE_URL is sqlite:///./rag_dev.db or similar, it will work
if settings.DATABASE_URL:
    engine = create_engine(
        settings.DATABASE_URL,
        pool_pre_ping=True if not settings.DATABASE_URL.startswith("sqlite") else False,
    )
    SessionLocal = sessionmaker(
        bind=engine,
        autocommit=False,
        autoflush=False,
    )
else:
    engine = None
    SessionLocal = None

Base = declarative_base()


def get_db():
    """Dependency to get a database session."""
    if SessionLocal is None:
        raise RuntimeError("Database not configured. Set DATABASE_URL in .env")
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
