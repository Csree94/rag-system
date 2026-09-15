import os
from dotenv import load_dotenv
from pathlib import Path
from functools import lru_cache

# Load .env relative to the backend/ directory (two levels up from this file)
_env_path = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(_env_path)


class Settings:
    """Application settings loaded from environment variables."""

    def __init__(self) -> None:
        # Database
        self.DATABASE_URL: str = os.environ.get("DATABASE_URL", "")

        # Embedding
        self.EMBEDDING_MODEL: str = os.environ.get("EMBEDDING_MODEL", "gemini")
        self.EMBEDDING_MODEL_NAME: str = os.environ.get("EMBEDDING_MODEL_NAME", "gemini-embedding-2")
        self.EMBEDDING_DIMENSION: int = int(os.environ.get("EMBEDDING_DIMENSION", "768"))
        self.GEMINI_API_KEY: str = os.environ.get("GEMINI_API_KEY", "")

        # OpenRouter (optional)
        self.OPENROUTER_API_KEY: str = os.environ.get("OPENROUTER_API_KEY", "")

    @property
    def use_openrouter(self) -> bool:
        return self.EMBEDDING_MODEL == "openrouter" and self.OPENROUTER_API_KEY

    @property
    def use_gemini(self) -> bool:
        return self.EMBEDDING_MODEL == "gemini"

    @property
    def use_sentence_transformers(self) -> bool:
        return self.EMBEDDING_MODEL == "sentence-transformers"

    @property
    def use_simple_hash(self) -> bool:
        return self.EMBEDDING_MODEL == "simple-hash"

    @property
    def is_database_configured(self) -> bool:
        """Check if database URL is properly configured (not placeholder)."""
        return bool(self.DATABASE_URL and not self.DATABASE_URL.startswith("postgresql://user:"))


@lru_cache
def get_settings() -> Settings:
    return Settings()
