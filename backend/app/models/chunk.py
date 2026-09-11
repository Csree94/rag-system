from sqlalchemy import String, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column
from pgvector.sqlalchemy import Vector
from app.core.database import Base, settings


class DocumentChunk(Base):
    """Represents a processed document chunk with its embedding vector."""

    __tablename__ = "document_chunks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    document_id: Mapped[str] = mapped_column(String, index=True)
    chunk_index: Mapped[int] = mapped_column(Integer)
    content: Mapped[str] = mapped_column(Text)
    embedding: Mapped[Vector] = mapped_column(Vector(settings.EMBEDDING_DIMENSION))  # Dimension from config

    def to_dict(self, similarity_score: float | None = None) -> dict:
        """Convert chunk to dictionary for API response."""
        result: dict = {
            "id": self.id,
            "document_id": self.document_id,
            "chunk_index": self.chunk_index,
            "content": self.content,
        }
        if similarity_score is not None:
            result["similarity_score"] = similarity_score
        return result
