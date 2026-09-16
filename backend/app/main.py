import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import chat_router, retrieval_router
from app.api.auth import router as auth_router
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
    logger.info(f"Embedding model: {settings.EMBEDDING_MODEL}")
    logger.info(f"Embedding dimension: {settings.EMBEDDING_DIMENSION}")
    logger.info(f"Database configured: {'Yes' if settings.is_database_configured else 'No'}")

    # Create database tables if they don't exist
    if settings.is_database_configured and engine is not None:
        logger.info("Creating database tables...")
        try:
            Base.metadata.create_all(bind=engine)
            logger.info("Database tables created successfully")

            # Seed sample data for testing if database is available
            if settings.EMBEDDING_MODEL == "simple-hash":
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

1. **POST /api/retrieve** - Submit a question and retrieve relevant document chunks
2. **GET /api/retrieve/sample** - Get a sample question for testing

The retrieval pipeline:
1. Takes a user question
2. Converts it to an embedding vector (Gemini Embedding 2, 768 dimensions)
3. Performs vector similarity search using pgvector
4. Returns the most relevant document chunks

## Chat API (end-to-end RAG)

3. **POST /api/chat** - Ask a question and get a Gemini-generated answer grounded in the retrieved chunks

The RAG pipeline:
1. Embeds the question with Gemini Embedding 2
2. Retrieves the Top-K chunks via pgvector cosine similarity
3. Builds a context string from those chunks
4. Asks Gemini to answer using only that context
5. Returns the answer, the sources used, and whether relevant context was found

All endpoints under `/api` require a JWT bearer token (see `POST /api/auth/login`).
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
app.include_router(auth_router)
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
