"""
Google Embeddings Service
Generates embeddings using Google's embedding API (text-embedding-004).
"""
import logging
from typing import Optional

from google import genai
from google.genai import types
from google.genai import errors as genai_errors

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class GoogleEmbeddingService:
    """
    Service for generating embeddings using Google's embedding API.

    Uses the google-genai SDK to call Google's embedding model.
    Default model: text-embedding-004 (768-dimensional vectors).

    Responsibilities:
    - Create embeddings for text chunks
    - Handle API errors gracefully
    - Validate embedding dimensions
    """

    def __init__(self):
        self._client: Optional[genai.Client] = None
        self._embedding_dim: Optional[int] = None

    def _get_client(self) -> genai.Client:
        """Get or create the Google GenAI client."""
        if self._client is None:
            if not settings.GOOGLE_API_KEY:
                raise RuntimeError(
                    "Google API key not configured. Set GOOGLE_API_KEY in .env"
                )
            self._client = genai.Client(api_key=settings.GOOGLE_API_KEY)
        return self._client

    def embed(self, text: str, task_type: str = "RETRIEVAL_DOCUMENT") -> list[float]:
        """
        Generate an embedding vector for the given text.

        Uses Google's text-embedding-004 model by default.

        Args:
            text: The text to embed.
            task_type: Google embedding task type, e.g. "RETRIEVAL_DOCUMENT"
                for document chunks or "RETRIEVAL_QUERY" for user questions.

        Returns:
            List of floats representing the embedding vector (768 dimensions).

        Raises:
            ValueError: If the text is empty.
            RuntimeError: If embedding generation fails.
        """
        if not text or not text.strip():
            raise ValueError("임베드할 텍스트가 비어있습니다")

        try:
            client = self._get_client()

            # Configure embedding request
            embedding_config = types.EmbedContentConfig(
                task_type=task_type,
            )

            response = client.models.embed_content(
                model=settings.GOOGLE_EMBEDDING_MODEL,
                contents=text,
                config=embedding_config,
            )

            if not response.embeddings:
                raise RuntimeError("No embeddings returned from Google API")

            embedding = response.embeddings[0].values

            # Validate dimension
            if self._embedding_dim is None:
                self._embedding_dim = len(embedding)

            if len(embedding) != settings.GOOGLE_EMBEDDING_DIMENSION:
                logger.warning(
                    f"Embedding dimension mismatch: got {len(embedding)}, "
                    f"expected {settings.GOOGLE_EMBEDDING_DIMENSION}"
                )

            return list(embedding)

        except genai_errors.APIError as e:
            logger.error(f"Google API error: {e}")
            raise RuntimeError(f"Google API error: {e}") from e
        except Exception as e:
            logger.error(f"Embedding generation failed: {e}")
            raise RuntimeError(f"임베드 생성 실패: {e}") from e

    def embed_batch(
        self,
        texts: list[str],
        task_type: str = "RETRIEVAL_DOCUMENT",
    ) -> list[list[float]]:
        """
        Generate embeddings for multiple texts in a single API call.

        More efficient than calling embed() for each text individually.

        Args:
            texts: List of texts to embed.
            task_type: Google embedding task type (default: "RETRIEVAL_DOCUMENT").

        Returns:
            List of embedding vectors.
        """
        if not texts:
            return []

        # Filter out empty texts
        valid_texts = [(i, t) for i, t in enumerate(texts) if t and t.strip()]
        if not valid_texts:
            return [None] * len(texts)

        try:
            client = self._get_client()

            embedding_config = types.EmbedContentConfig(
                task_type=task_type,
            )

            # Build contents from valid texts
            contents = [t for _, t in valid_texts]

            response = client.models.embed_content(
                model=settings.GOOGLE_EMBEDDING_MODEL,
                contents=contents,
                config=embedding_config,
            )

            if not response.embeddings:
                raise RuntimeError("No embeddings returned from Google API")

            # Map embeddings back to original indices
            result = [None] * len(texts)
            for idx, (orig_idx, _) in enumerate(valid_texts):
                if idx < len(response.embeddings):
                    result[orig_idx] = list(response.embeddings[idx].values)

            return result

        except Exception as e:
            logger.error(f"Batch embedding failed: {e}")
            # Fall back to individual embeddings
            return [self.embed(t) if t and t.strip() else None for t in texts]

    @property
    def embedding_dim(self) -> int:
        """Get the embedding dimension."""
        if self._embedding_dim is not None:
            return self._embedding_dim
        return settings.GOOGLE_EMBEDDING_DIMENSION


# Global instance
_embedding_service: Optional[GoogleEmbeddingService] = None


def get_embedding_service() -> GoogleEmbeddingService:
    """Get or create the global Google embedding service instance."""
    global _embedding_service
    if _embedding_service is None:
        _embedding_service = GoogleEmbeddingService()
    return _embedding_service
