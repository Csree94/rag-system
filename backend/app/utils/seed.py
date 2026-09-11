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
        "document_id": "doc_wonders",
        "title": "Seven Wonders of the Ancient World",
        "chunks": [
            "The Great Pyramid of Giza is the oldest and largest of the three pyramids in the Giza pyramid complex.",
            "The Hanging Gardens of Babylon were said to have been built by Nebuchadnezzar II for his median wife.",
            "The Statue of Zeus at Olympia was a giant seated figure of the god Zeus, made by the Greek sculptor Phidias.",
            "The Temple of Artemis at Ephesus was a Greek temple dedicated to the goddess Artemis.",
            "The Mausoleum at Halicarnassus was a tomb built for Mausolus, a Persian satrap.",
            "The Colossus of Rhodes was a statue of the Greek sun-god Helios.",
            "The Lighthouse of Alexandria was a tower built by the Ptolemaic Kingdom.",
        ],
    },
    {
        "document_id": "doc_planets",
        "title": "Solar System Facts",
        "chunks": [
            "Mercury is the smallest planet in our solar system and the closest to the Sun.",
            "Venus is the second planet from the Sun and is often called Earth's twin due to similar size.",
            "Earth is the third planet from the Sun and the only astronomical object known to harbor life.",
            "Mars is the fourth planet from the Sun and is known as the Red Planet due to iron oxide.",
            "Jupiter is the fifth planet from the Sun and the largest planet in our solar system.",
            "Saturn is the sixth planet from the Sun, known for its prominent ring system.",
            "Uranus is the seventh planet from the Sun, rotating on its side with an axial tilt of 98 degrees.",
            "Neptune is the eighth and farthest known planet from the Sun in our solar system.",
        ],
    },
    {
        "document_id": "doc_geography",
        "title": "World Geography",
        "chunks": [
            "France is a country in Western Europe with a population of approximately 67 million people.",
            "The capital of France is Paris, known for the Eiffel Tower and Louvre Museum.",
            "Germany is a country in Central Europe with a population of approximately 83 million.",
            "The capital of Germany is Berlin, known for its historical significance and modern culture.",
            "Japan is an island country in East Asia with a population of approximately 125 million.",
            "The capital of Japan is Tokyo, which is the most populous metropolitan area in the world.",
            "Brazil is the largest country in South America and the fifth largest in the world.",
            "The capital of Brazil is Brasilia, a planned city built in the 1960s.",
        ],
    },
    {
        "document_id": "doc_science",
        "title": "Basic Science Facts",
        "chunks": [
            "Water freezes at 0 degrees Celsius or 32 degrees Fahrenheit at standard atmospheric pressure.",
            "The speed of light in vacuum is approximately 299,792 kilometers per second.",
            "The chemical symbol for water is H2O, consisting of two hydrogen atoms and one oxygen atom.",
            "Gravity on Earth causes objects to accelerate at approximately 9.8 meters per second squared.",
            "The human body contains approximately 60% water in adult males.",
            "DNA stands for deoxyribonucleic acid and contains the genetic instructions for life.",
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
    db_url = db_url or settings.DATABASE_URL

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
