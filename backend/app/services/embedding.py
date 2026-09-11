import logging
from typing import Optional
import numpy as np
from sentence_transformers import SentenceTransformer

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class EmbeddingService:
    """Service for generating embeddings from text."""

    def __init__(self):
        self._model: Optional[SentenceTransformer] = None
        self._embedding_dim: Optional[int] = None

    def _load_model(self) -> SentenceTransformer:
        """Load the sentence-transformers model if not already loaded."""
        if self._model is None:
            logger.info(f"Loading embedding model: {settings.EMBEDDING_MODEL_NAME}")
            self._model = SentenceTransformer(settings.EMBEDDING_MODEL_NAME)
            self._embedding_dim = self._model.get_sentence_embedding_dimension()
            logger.info(f"Model loaded. Embedding dimension: {self._embedding_dim}")
        return self._model

    def embed(self, text: str) -> list[float]:
        """
        Generate an embedding vector for the given text.

        Args:
            text: The text to embed.

        Returns:
            List of floats representing the embedding vector.

        Raises:
            ValueError: If the text is empty.
            RuntimeError: If embedding generation fails.
        """
        if not text or not text.strip():
            raise ValueError("Cannot embed empty text")

        try:
            if settings.use_sentence_transformers:
                model = self._load_model()
                embedding = model.encode(text, convert_to_numpy=True)
                return embedding.tolist()

            elif settings.use_openrouter:
                return self._embed_openrouter(text)

            elif settings.use_simple_hash:
                return self._embed_simple_hash(text)

            else:
                raise RuntimeError(f"Unknown embedding model: {settings.EMBEDDING_MODEL}")

        except Exception as e:
            logger.error(f"Embedding generation failed: {e}")
            raise RuntimeError(f"Failed to generate embedding: {e}") from e

    def _embed_openrouter(self, text: str) -> list[float]:
        """Generate embedding using OpenRouter API."""
        import httpx

        if not settings.OPENROUTER_API_KEY:
            raise RuntimeError("OpenRouter API key not configured")

        response = httpx.post(
            "https://openrouter.ai/api/v1/embeddings",
            headers={
                "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": settings.EMBEDDING_MODEL_NAME,
                "input": text,
            },
            timeout=30.0,
        )

        if response.status_code != 200:
            raise RuntimeError(f"OpenRouter API error: {response.status_code} - {response.text}")

        data = response.json()
        embeddings = data.get("data", [])
        if not embeddings:
            raise RuntimeError("No embeddings returned from OpenRouter")

        # Get the first embedding
        embedding = embeddings[0]["embedding"]
        return embedding

    def _embed_simple_hash(self, text: str) -> list[float]:
        """
        Generate a simple hash-based embedding for testing.
        NOT for production use. Just for development when no model is available.
        """
        import hashlib

        vector_size = 384  # Match our pgvector dimension
        hash_values = []

        for i in range(vector_size):
            # Create a unique hash for each position
            h = hashlib.md5(f"{text}:{i}".encode()).hexdigest()
            # Convert to a float between -1 and 1
            hash_int = int(h, 16)
            normalized = (hash_int % 2000) / 1000.0 - 1.0
            hash_values.append(normalized)

        return hash_values

    @property
    def embedding_dim(self) -> int:
        """Get the embedding dimension."""
        if self._embedding_dim is None:
            # Default for all-MiniLM-L6-v2
            return 384
        return self._embedding_dim


# Global instance
_embedding_service: Optional[EmbeddingService] = None


def get_embedding_service() -> EmbeddingService:
    """Get or create the global embedding service instance."""
    global _embedding_service
    if _embedding_service is None:
        _embedding_service = EmbeddingService()
    return _embedding_service
