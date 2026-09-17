# Our RAG stack (Sreelakshmi) - canonical services
from app.services.embedding import get_embedding_service  # noqa: F401
from app.services.generation import GenerationService, get_generation_service  # noqa: F401
from app.services.rag import RAGService, create_rag_service  # noqa: F401
from app.services.retrieval import RetrievalService, create_retrieval_service  # noqa: F401

# Littu's document-ingestion stack
# NOTE: google_embeddings.get_embedding_service is aliased to avoid shadowing
# our canonical embedding service above.
from app.services.google_embeddings import (  # noqa: F401
    GoogleEmbeddingService,
    get_embedding_service as get_google_embedding_service,
)
from app.services.document_processor import DocumentProcessor, get_document_processor  # noqa: F401
from app.services.chunker import Chunker, get_chunker  # noqa: F401
