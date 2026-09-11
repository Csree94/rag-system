from dotenv import load_dotenv
from pathlib import Path
from functools import lru_cache

load_dotenv()


class Settings:
    """Application settings loaded from environment variables."""

    # Database
    DATABASE_URL: str = ""

    # Embedding
    EMBEDDING_MODEL: str = "sentence-transformers"
    EMBEDDING_MODEL_NAME: str = "all-MiniLM-L6-v2"
    EMBEDDING_DIMENSION: int = 384  # Default for all-MiniLM-L6-v2

    # OpenRouter (optional)
    OPENROUTER_API_KEY: str = ""

    @property
    def use_openrouter(self) -> bool:
        return self.EMBEDDING_MODEL == "openrouter" and self.OPENROUTER_API_KEY

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
