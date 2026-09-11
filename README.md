# RAG System - Retrieval-Augmented Generation

This is a RAG (Retrieval-Augmented Generation) system project.

## Tech Stack
- Frontend: React
- Backend: FastAPI + Python
- Database: Neon PostgreSQL
- Vector search/storage: pgvector
- Primary LLM: Gemini
- Fallback AI: OpenRouter

## Project Structure

```
rag-system/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI app entry point
│   │   ├── core/
│   │   │   ├── __init__.py
│   │   │   ├── config.py        # Environment configuration
│   │   │   └── database.py      # Database connection
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   └── chunk.py         # Document chunk model (pgvector)
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── embedding.py     # Embedding generation service
│   │   │   └── retrieval.py     # Vector retrieval service
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   └── retrieval.py     # Retrieval API endpoints
│   │   └── utils/
│   │       ├── __init__.py
│   │       └── seed.py          # Sample data seeding
│   ├── alembic/                 # Database migrations
│   │   ├── env.py
│   │   └── versions/
│   ├── .env.example
│   └── requirements.txt
├── .env.example
└── README.md
```

## Quick Start

1. Copy `.env.example` to `.env` and fill in your values
2. Install dependencies: `pip install -r backend/requirements.txt`
3. Run the server: `uvicorn backend.app.main:app --reload`
4. Open Swagger UI at http://127.0.0.1:8000/docs

## API Endpoints

### POST /api/retrieve
Submit a question and get relevant document chunks.

Request body:
```json
{
  "question": "your question here",
  "top_k": 5
}
```

Response:
```json
{
  "question": "your question here",
  "retrieved_chunks": [
    {
      "id": 1,
      "document_id": "doc_123",
      "chunk_index": 0,
      "content": "chunk text...",
      "similarity_score": 0.95
    }
  ],
  "total_chunks": 1
}
```
