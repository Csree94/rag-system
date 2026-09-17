import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import chat_router, documents_router, retrieval_router
from app.core.config import get_settings
from app.core.database import engine, Base
from app.models.chunk import DocumentChunk  # noqa: F401 - imported for table registration
from app.utils.seed import seed_sample_data

logger = logging.getLogger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan event handler for startup and shutdown."""
    logger.info("Starting RAG System backend...")

    # Log configuration (without secrets)
    logger.info(f"Embedding model: {settings.GOOGLE_EMBEDDING_MODEL}")
    logger.info(f"Embedding dimension: {settings.GOOGLE_EMBEDDING_DIMENSION}")
    logger.info(f"Gemini model: {settings.GOOGLE_GEMINI_MODEL}")
    logger.info(f"Database configured: {'Yes' if settings.is_database_configured else 'No'}")
    logger.info(f"Google API configured: {'Yes' if settings.google_api_configured else 'No'}")

    # Create database tables if they don't exist
    if settings.is_database_configured and engine is not None:
        logger.info("Creating database tables...")
        try:
            Base.metadata.create_all(bind=engine)
            logger.info("Database tables created successfully")

            # Seed sample data for testing if database is available
            if settings.DEBUG and settings.is_database_configured:
                logger.info("Seeding sample data for testing...")
                try:
                    seed_sample_data()
                except Exception as e:
                    logger.warning(f"Sample data seeding skipped: {e}")
        except Exception as e:
            logger.warning(f"Database table creation failed: {e}")
            logger.warning("Application will start but retrieval may not work without database")

    yield

    logger.info("Shutting down RAG System backend...")


# Create FastAPI application
app = FastAPI(
    title="RAG System API",
    description="""
Retrieval-Augmented Generation system backend.

## Retrieval API

This API provides the retrieval pipeline for the RAG system:

1. **POST /api/documents/upload** - Upload a PDF, process it, and store chunks
2. **GET /api/documents** - List uploaded documents
3. **POST /api/retrieve** - Submit a question and retrieve relevant document chunks
4. **GET /api/retrieve/sample** - Get a sample question for testing
5. **POST /api/chat** - RAG chat: retrieve chunks and generate a Gemini answer

The retrieval pipeline:
1. Takes a user question
2. Converts it to an embedding vector
3. Performs vector similarity search using pgvector
4. Returns the most relevant document chunks

**Note:** This is the basic retrieval pipeline. Gemini answer generation and WebSocket chat will be added in later milestones.
    """,
    version="0.1.0",
    lifespan=lifespan,
)

# Configure CORS - adjust origins for production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(documents_router)
app.include_router(retrieval_router)
app.include_router(chat_router)


@app.get("/")
async def root():
    """Root endpoint - health check."""
    return {
        "message": "RAG System API is running",
        "version": "0.1.0",
        "docs_url": "/docs",
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}
