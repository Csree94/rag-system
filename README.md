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
│   │   │   ├── embedding.py     # Embedding generation service (Gemini Embedding 2)
│   │   │   ├── generation.py    # Gemini LLM answer generation service
│   │   │   ├── rag.py           # End-to-end RAG pipeline (retrieval + generation)
│   │   │   └── retrieval.py     # Vector retrieval service
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py          # Auth request/response schemas
│   │   │   └── chat.py          # Chat (RAG) request/response schemas
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── chat.py          # RAG question answering endpoint
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

All endpoints require a JWT bearer token obtained from `POST /api/auth/login`.

### POST /api/chat

Ask a question and get a Gemini-generated answer grounded in the retrieved chunks.

Request body:
```json
{
  "question": "What is the capital of France?",
  "top_k": 5,
  "min_similarity": 0.3
}
```

`top_k` and `min_similarity` are optional and default to the `RAG_TOP_K` and
`RAG_MIN_SIMILARITY` environment settings.

Response:
```json
{
  "question": "What is the capital of France?",
  "answer": "The capital of France is Paris [Source 1].",
  "sources": [
    {
      "chunk_id": 12,
      "document_id": "doc_france",
      "chunk_index": 1,
      "similarity_score": 0.87,
      "snippet": "The capital of France is Paris, known for the Eiffel Tower..."
    }
  ],
  "found_context": true,
  "model": "gemini-3.8-flash"
}
```

When no chunk clears the minimum similarity threshold, the LLM is not called and
the response is `{"answer": "I could not find the answer to your question in the available documents.", "sources": [], "found_context": false, ...}`.

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
