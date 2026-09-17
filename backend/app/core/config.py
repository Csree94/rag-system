import os

from dotenv import load_dotenv
from functools import lru_cache

load_dotenv()


class Settings:
    """Application settings loaded from environment variables."""

    def __init__(self) -> None:
        # Database
        self.DATABASE_URL: str = os.getenv("DATABASE_URL", "")

        # Google AI API
        self.GOOGLE_API_KEY: str = os.getenv("GOOGLE_API_KEY", "")

        # Google Embedding Model
        # NOTE: text-embedding-004 was retired from the Gemini API (404 errors).
        # gemini-embedding-001 outputs 3072 dims by default; we request 768
        # via output_dimensionality to stay compatible with the pgvector column.
        self.GOOGLE_EMBEDDING_MODEL: str = os.getenv("GOOGLE_EMBEDDING_MODEL", "gemini-embedding-001")
        self.GOOGLE_EMBEDDING_DIMENSION: int = int(os.getenv("GOOGLE_EMBEDDING_DIMENSION", "768"))

        # Google Gemini LLM Model
        self.GOOGLE_GEMINI_MODEL: str = os.getenv("GOOGLE_GEMINI_MODEL", "gemini-2.0-flash")

        # Chunking
        self.CHUNK_SIZE: int = int(os.getenv("CHUNK_SIZE", "1000"))
        self.CHUNK_OVERLAP: int = int(os.getenv("CHUNK_OVERLAP", "150"))

        # Retrieval
        self.TOP_K: int = int(os.getenv("TOP_K", "5"))

        # CORS
        self.CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "http://localhost:5173")

        # Application
        self.APP_HOST: str = os.getenv("APP_HOST", "0.0.0.0")
        self.APP_PORT: int = int(os.getenv("APP_PORT", "8000"))
        self.DEBUG: bool = os.getenv("DEBUG", "true").lower() in ("1", "true", "yes")

    @property
    def is_database_configured(self) -> bool:
        """Check if database URL is properly configured (not placeholder)."""
        return bool(self.DATABASE_URL and not self.DATABASE_URL.startswith("postgresql://user:"))

    @property
    def google_api_configured(self) -> bool:
        """Check if Google API key is configured."""
        return bool(self.GOOGLE_API_KEY and not self.GOOGLE_API_KEY.startswith("AIzaSyPlaceHolder"))


@lru_cache
def get_settings() -> Settings:
    return Settings()
