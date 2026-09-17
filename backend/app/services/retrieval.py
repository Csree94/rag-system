import logging
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.chunk import DocumentChunk
from app.services.google_embeddings import get_embedding_service

logger = logging.getLogger(__name__)


class RetrievalService:
    """Service for retrieving relevant document chunks based on query."""

    def __init__(self, db: Session):
        self.db = db
        self.embedding_service = get_embedding_service()

    def retrieve(
        self,
        question: str,
        top_k: int = 5,
        min_similarity: float = 0.0,
    ) -> list[dict]:
        """
        Retrieve the most relevant document chunks for a given question.

        Args:
            question: The user's question to search for.
            top_k: Maximum number of chunks to return.
            min_similarity: Minimum similarity score (0-1) for results.

        Returns:
            List of retrieved chunks with similarity scores.

        Raises:
            ValueError: If the question is empty.
            RuntimeError: If embedding or search fails.
        """
        if not question or not question.strip():
            raise ValueError("Question cannot be empty")

        try:
            # Step 1: Generate query embedding (query task type for questions)
            query_embedding = self.embedding_service.embed(question, task_type="RETRIEVAL_QUERY")
            logger.debug(f"Generated query embedding with {len(query_embedding)} dimensions")

            # Step 2: Perform vector similarity search using pgvector
            results = self._vector_search(
                query_embedding=query_embedding,
                top_k=top_k,
                min_similarity=min_similarity,
            )

            logger.info(f"Retrieved {len(results)} chunks for question")
            return results

        except ValueError:
            raise
        except Exception as e:
            logger.error(f"Retrieval failed: {e}")
            raise RuntimeError(f"Failed to retrieve chunks: {e}") from e

    def _vector_search(
        self,
        query_embedding: list[float],
        top_k: int,
        min_similarity: float,
    ) -> list[dict]:
        """
        Perform vector similarity search using pgvector.

        Uses L2 distance (Euclidean) for similarity.
        pgvector returns distance; we convert to similarity score.
        """
        # Convert query embedding to numpy array for pgvector
        import numpy as np
        query_vector = np.array(query_embedding, dtype=np.float32)

        # Build the query with pgvector's <-> operator for L2 distance
        stmt = (
            select(DocumentChunk)
            .order_by(DocumentChunk.embedding.l2_distance(query_vector))
            .limit(top_k)
        )

        try:
            chunks = self.db.execute(stmt).scalars().all()
        except Exception as e:
            logger.error(f"Vector search failed: {e}")
            raise RuntimeError(f"Vector search failed: {e}") from e

        results = []
        for chunk in chunks:
            # Calculate similarity score from L2 distance
            # L2 distance of 0 means identical vectors (similarity 1.0)
            # Higher distance means less similar
            distance = chunk.embedding.l2_distance(query_vector)
            # Convert distance to similarity score (0-1 range)
            # This is a simple normalization; adjust as needed
            similarity = 1.0 / (1.0 + float(distance)) if distance > 0 else 1.0

            # Apply minimum similarity filter
            if similarity >= min_similarity:
                results.append(chunk.to_dict(similarity_score=similarity))

        return results


def create_retrieval_service(db: Session) -> RetrievalService:
    """Factory function to create a retrieval service with a database session."""
    return RetrievalService(db=db)
