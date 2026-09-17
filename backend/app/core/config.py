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
        # Gemini Embedding 2 - the pgvector schema is tied to 768 dimensions.
        self.EMBEDDING_MODEL: str = os.environ.get("EMBEDDING_MODEL", "gemini")
        self.EMBEDDING_MODEL_NAME: str = os.environ.get("EMBEDDING_MODEL_NAME", "gemini-embedding-2")
        self.EMBEDDING_DIMENSION: int = int(os.environ.get("EMBEDDING_DIMENSION", "768"))
        self.GEMINI_API_KEY: str = os.environ.get("GEMINI_API_KEY", "")

        # Gemini LLM (answer generation) - reuses GEMINI_API_KEY above
        self.GEMINI_LLM_MODEL: str = os.environ.get("GEMINI_LLM_MODEL", "gemini-3.8-flash")
        self.GEMINI_LLM_TEMPERATURE: float = float(os.environ.get("GEMINI_LLM_TEMPERATURE", "0.2"))
        self.GEMINI_LLM_MAX_OUTPUT_TOKENS: int = int(os.environ.get("GEMINI_LLM_MAX_OUTPUT_TOKENS", "1024"))

        # NVIDIA Nemotron fallback LLM (generation ONLY; used when Gemini fails)
        self.NVIDIA_API_KEY: str = os.environ.get("NVIDIA_API_KEY", "")
        self.NVIDIA_LLM_MODEL: str = os.environ.get(
            "NVIDIA_LLM_MODEL", "nvidia/nemotron-3-ultra-550b-a55b"
        )
        self.NVIDIA_LLM_BASE_URL: str = os.environ.get(
            "NVIDIA_LLM_BASE_URL", "https://integrate.api.nvidia.com/v1"
        )
        self.LLM_FALLBACK_ENABLED: bool = os.environ.get(
            "LLM_FALLBACK_ENABLED", "true"
        ).strip().lower() in ("1", "true", "yes", "on")

        # RAG pipeline defaults
        self.RAG_TOP_K: int = int(os.environ.get("RAG_TOP_K", "5"))
        self.RAG_MIN_SIMILARITY: float = float(os.environ.get("RAG_MIN_SIMILARITY", "0.3"))
        self.RAG_MAX_CONTEXT_CHARS: int = int(os.environ.get("RAG_MAX_CONTEXT_CHARS", "12000"))

        # JWT Authentication
        self.JWT_SECRET_KEY: str = os.environ.get("JWT_SECRET_KEY", "changeme-generate-a-real-secret")
        self.JWT_ALGORITHM: str = os.environ.get("JWT_ALGORITHM", "HS256")
        self.ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

        # OpenRouter (optional)
        self.OPENROUTER_API_KEY: str = os.environ.get("OPENROUTER_API_KEY", "")

        # Chunking (document ingestion pipeline)
        self.CHUNK_SIZE: int = int(os.environ.get("CHUNK_SIZE", "1000"))
        self.CHUNK_OVERLAP: int = int(os.environ.get("CHUNK_OVERLAP", "150"))

        # Retrieval (ingestion-side alias for RAG_TOP_K)
        self.TOP_K: int = int(os.environ.get("TOP_K", "5"))

        # CORS (frontend/ingestion UI)
        self.CORS_ORIGINS: str = os.environ.get("CORS_ORIGINS", "http://localhost:5173")

        # Application
        self.APP_HOST: str = os.environ.get("APP_HOST", "0.0.0.0")
        self.APP_PORT: int = int(os.environ.get("APP_PORT", "8000"))
        self.DEBUG: bool = os.environ.get("DEBUG", "true").lower() in ("1", "true", "yes")

    # ------------------------------------------------------------------
    # Compatibility aliases (read-only properties, NOT env-backed config)
    #
    # Littu's document-ingestion modules (document_processor, google_embeddings,
    # models/chunk) reference GOOGLE_* settings and google_api_configured.
    # They are mapped onto OUR Gemini Embedding 2 / GEMINI_API_KEY settings so
    # the ingestion pipeline produces 768-dim vectors consistent with the
    # pgvector column and our retrieval pipeline. gemini-embedding-001 and
    # GOOGLE_EMBEDDING_MODEL are intentionally NOT adopted.
    # ------------------------------------------------------------------

    @property
    def GOOGLE_API_KEY(self) -> str:
        """Alias for ingestion modules -> GEMINI_API_KEY."""
        return self.GEMINI_API_KEY

    @property
    def GOOGLE_EMBEDDING_MODEL(self) -> str:
        """Alias for ingestion modules -> our EMBEDDING_MODEL_NAME (Gemini Embedding 2)."""
        return self.EMBEDDING_MODEL_NAME

    @property
    def GOOGLE_EMBEDDING_DIMENSION(self) -> int:
        """Alias for ingestion modules -> our EMBEDDING_DIMENSION (768)."""
        return self.EMBEDDING_DIMENSION

    @property
    def GOOGLE_GEMINI_MODEL(self) -> str:
        """Alias for ingestion-side generation -> our GEMINI_LLM_MODEL."""
        return self.GEMINI_LLM_MODEL

    @property
    def google_api_configured(self) -> bool:
        """Check if the Gemini API key is configured (not a placeholder)."""
        return bool(self.GEMINI_API_KEY and not self.GEMINI_API_KEY.startswith("your-"))

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
