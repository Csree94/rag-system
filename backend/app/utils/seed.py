"""
Sample data seeding for testing the retrieval pipeline.

This module creates sample document chunks with embeddings so you can
test the retrieval endpoint without waiting for the ingestion module.

Run this as a script: python -m app.utils.seed
Or import and call seed_sample_data() from your application.

IMPORTANT: This is for DEVELOPMENT/TESTING only. In production,
the ingestion module will provide real document chunks.
"""

import logging
import os
from typing import Optional

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import get_settings
from app.core.database import Base
from app.models.chunk import DocumentChunk
from app.services.embedding import get_embedding_service

logger = logging.getLogger(__name__)


# Sample documents for testing
SAMPLE_DOCUMENTS = [
    {
        "document_id": "doc_france",
        "title": "France and Paris",
        "chunks": [
            "France is a country in Western Europe with a population of approximately 67 million people.",
            "The capital of France is Paris, known for the Eiffel Tower and Louvre Museum.",
            "Paris is the most populous city in France and serves as the country's major cultural and economic center.",
        ],
    },
    {
        "document_id": "doc_python",
        "title": "Python Programming",
        "chunks": [
            "Python is a high-level, interpreted programming language known for its simple and readable syntax.",
            "Python supports multiple programming paradigms including object-oriented, functional, and procedural programming.",
            "The Python Package Index (PyPI) hosts over 400,000 packages for web development, data science, and more.",
        ],
    },
    {
        "document_id": "doc_kerala",
        "title": "Kerala",
        "chunks": [
            "Kerala is a state on the Malabar Coast of India, known for its tropical greenery and backwaters.",
            "Kerala has the highest literacy rate among Indian states at approximately 96 percent.",
            "The capital of Kerala is Thiruvananthapuram, also known as Trivandrum.",
        ],
    },
    {
        "document_id": "doc_postgres",
        "title": "PostgreSQL",
        "chunks": [
            "PostgreSQL is an advanced open-source relational database management system with a focus on extensibility and standards compliance.",
            "PostgreSQL supports advanced data types including JSON, arrays, and geospatial data via the PostGIS extension.",
            "The pgvector extension for PostgreSQL enables storage and querying of vector embeddings for AI and machine learning applications.",
        ],
    },
]


def seed_sample_data(db_url: Optional[str] = None) -> int:
    """
    Seed the database with sample document chunks for testing.

    This creates embeddings for each chunk using the configured embedding model.

    Args:
        db_url: Optional database URL override. Uses settings if not provided.

    Returns:
        Number of chunks seeded.
    """
    settings = get_settings()
    # Settings is a plain class that doesn't read from os.environ,
    # so read DATABASE_URL directly (load_dotenv() already populated it).
    db_url = db_url or os.environ.get("DATABASE_URL", "") or settings.DATABASE_URL

    if not db_url or db_url.startswith("postgresql://user:"):
        logger.error("Database URL not configured. Set DATABASE_URL in .env")
        return 0

    logger.info("Seeding sample data...")

    # Create engine and tables
    engine = create_engine(db_url, pool_pre_ping=True)
    Base.metadata.create_all(engine)

    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()

    try:
        embedding_service = get_embedding_service()
        count = 0

        for doc in SAMPLE_DOCUMENTS:
            for idx, content in enumerate(doc["chunks"]):
                # Check if chunk already exists
                existing = session.query(DocumentChunk).filter_by(
                    document_id=doc["document_id"],
                    chunk_index=idx,
                ).first()

                if existing:
                    logger.debug(f"Chunk already exists: {doc['document_id']}:{idx}")
                    continue

                # Generate embedding
                embedding = embedding_service.embed(content)

                # Validate embedding dimension matches model
                if len(embedding) != settings.EMBEDDING_DIMENSION:
                    logger.warning(
                        f"Embedding dimension mismatch: got {len(embedding)}, "
                        f"expected {settings.EMBEDDING_DIMENSION}. Skipping."
                    )
                    continue

                # Create chunk
                chunk = DocumentChunk(
                    document_id=doc["document_id"],
                    chunk_index=idx,
                    content=content,
                    embedding=embedding,
                )
                session.add(chunk)
                count += 1

        session.commit()
        logger.info(f"Successfully seeded {count} sample chunks")
        return count

    except Exception as e:
        session.rollback()
        logger.error(f"Failed to seed sample data: {e}")
        raise
    finally:
        session.close()


if __name__ == "__main__":
    import sys

    logging.basicConfig(level=logging.INFO)
    try:
        count = seed_sample_data()
        print(f"Seeded {count} sample chunks")
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
