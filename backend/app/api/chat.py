import logging

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services.retrieval import create_retrieval_service
from app.services.answer_generator import get_answer_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["chat"])


# --- Request/Response models ---

class ChatMessage(BaseModel):
    """A single message in the conversation history."""

    role: str = Field(..., description="Message role: 'user' or 'assistant'")
    content: str = Field(..., description="Message text content")


class ChatRequest(BaseModel):
    """Request model for the chat endpoint."""

    question: str = Field(..., description="The user's question")
    notebook_id: str | None = Field(
        default=None,
        description="Optional notebook scope for retrieval",
    )
    top_k: int = Field(default=5, ge=1, le=100, description="Max chunks to retrieve")
    history: list[ChatMessage] = Field(
        default_factory=list,
        description="Optional prior conversation history",
    )


class ChatSource(BaseModel):
    """A source document chunk used for the answer."""

    document_id: str | None = None
    page_number: int | None = None
    similarity_score: float | None = None


class ChatResponse(BaseModel):
    """Response model for the chat endpoint."""

    question: str
    answer: str
    sources: list[ChatSource]
    model: str
    retrieved_chunks: int


# --- Endpoint ---


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    db: Session = Depends(get_db),
) -> ChatResponse:
    """
    RAG chat: retrieve relevant chunks, then generate an answer with Gemini.

    Pipeline:
    1. Validate the question
    2. Embed the question and run vector similarity search (pgvector)
    3. Pass the retrieved chunks as context to Gemini
    4. Return the grounded answer with source citations

    - **question**: The user's question
    - **top_k**: Max chunks to retrieve (default: 5)
    - **history**: Optional conversation history for multi-turn chat
    """
    # --- Validation ---
    if not request.question or not request.question.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Question cannot be empty",
        )

    # --- Retrieval ---
    try:
        retrieval_service = create_retrieval_service(db)
        chunks = retrieval_service.retrieve(
            question=request.question,
            top_k=request.top_k,
        )
        logger.info(f"Retrieved {len(chunks)} chunks for chat question")
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except RuntimeError as e:
        logger.error(f"Retrieval failed during chat: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Retrieval failed: {str(e)}",
        )

    # --- Answer generation (Gemini) ---
    try:
        answer_service = get_answer_service()
        result = answer_service.generate_answer(
            question=request.question,
            context_chunks=chunks,
            history=[m.model_dump() for m in request.history],
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except RuntimeError as e:
        logger.error(f"Answer generation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Answer generation failed: {str(e)}",
        )

    # --- Response ---
    return ChatResponse(
        question=request.question,
        answer=result["answer"],
        sources=result["sources"],
        model=result["model"],
        retrieved_chunks=len(chunks),
    )
