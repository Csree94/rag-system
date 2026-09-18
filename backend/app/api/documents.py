import logging
import os
import tempfile
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.models.chunk import DocumentChunk
from app.models.notebook import DocumentMeta, Notebook
from app.services.auth import get_current_user
from app.services.document_processor import get_document_processor

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter(prefix="/api/documents", tags=["documents"])

# Max upload size: 20 MB
MAX_UPLOAD_SIZE = 20 * 1024 * 1024

SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".xlsx", ".xls", ".txt", ".md", ".csv"}


class UploadResponse(BaseModel):
    """Response model for the document upload endpoint."""

    document_id: str
    filename: str
    file_type: str
    status: str
    page_count: int
    chunk_count: int
    chunks_stored: int
    error_message: str | None = None


@router.post("/upload", response_model=UploadResponse)
async def upload_document(
    file: UploadFile = File(..., description="Document file to process (PDF, DOCX, XLSX, TXT, MD, CSV)"),
    notebook_id: str = Form(default="default"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> UploadResponse:
    """
    Upload a document, process it through the pipeline, and store the chunks.

    Supported types: PDF, Word (.docx), Excel (.xlsx), TXT, Markdown, CSV

    Pipeline:
    1. Validate file type and size (max 20 MB)
    2. Save to a temp file
    3. Extract text -> clean -> chunk -> embed (Google text-embedding-004)
    4. Persist chunks with embeddings to the document_chunks table
    5. Return a summary of the processing result

    - **file**: The document file to upload
    - **notebook_id**: Optional notebook identifier (default: "default")
    """
    # --- Validation ---

    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename is required",
        )

    ext = Path(file.filename).suffix.lower()
    if ext not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type: {ext}. Supported: PDF, DOCX, XLSX, TXT, MD, CSV",
        )

    # Read file into memory with size check
    contents = await file.read()
    if len(contents) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty",
        )
    if len(contents) > MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Max size: {MAX_UPLOAD_SIZE // (1024 * 1024)} MB",
        )

    # Check Google API is configured before doing any work
    if not settings.google_api_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="GOOGLE_API_KEY is not configured. Embeddings cannot be generated.",
        )

    # --- Save to temp file ---

    temp_dir = tempfile.mkdtemp(prefix="rag_upload_")
    safe_name = f"{uuid.uuid4().hex}{ext}"
    temp_path = Path(temp_dir) / safe_name

    try:
        temp_path.write_bytes(contents)
    except Exception as e:
        logger.error(f"Failed to write temp file: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save uploaded file",
        )
    finally:
        await file.close()

    # --- Process through the pipeline ---

    processor = get_document_processor(upload_dir=temp_dir)
    result = processor.process_file(
        file_path=temp_path,
        filename=file.filename,
        notebook_id=notebook_id,
    )

    # --- Handle failure ---

    if result["status"] == "failed":
        logger.warning(f"Processing failed for {file.filename}: {result['error_message']}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Document processing failed: {result['error_message']}",
        )

    # --- Persist chunks to DB ---

    chunks_stored = 0
    try:
        for chunk in result["chunks"]:
            db_chunk = DocumentChunk(
                document_id=chunk["document_id"],
                chunk_index=chunk["chunk_index"],
                content=chunk["content"],
                embedding=chunk["embedding"],
            )
            db.add(db_chunk)
        db.commit()
        chunks_stored = len(result["chunks"])
        logger.info(f"Stored {chunks_stored} chunks for document {result['document_id']}")
    except Exception as e:
        db.rollback()
        logger.error(f"DB persistence failed for {result['document_id']}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Processing succeeded but storing chunks failed: {str(e)}",
        )

    # --- Persist document metadata for the dashboard ---

    try:
        # Resolve notebook: numeric id => owned notebook, otherwise the user's
        # default notebook (created on first upload) keeps legacy behaviour.
        notebook: Notebook | None = None
        if notebook_id.isdigit():
            notebook = (
                db.query(Notebook)
                .filter(Notebook.id == int(notebook_id), Notebook.user_id == current_user.id)
                .first()
            )
        if notebook is None:
            notebook = (
                db.query(Notebook)
                .filter(Notebook.user_id == current_user.id)
                .order_by(Notebook.created_at.asc())
                .first()
            )
        if notebook is None:
            notebook = Notebook(
                user_id=current_user.id,
                name="My Notebook",
                description="Created automatically from your first upload.",
            )
            db.add(notebook)
            db.flush()

        db.add(
            DocumentMeta(
                notebook_id=notebook.id,
                document_uuid=result["document_id"],
                filename=result["filename"],
                file_type=result["file_type"],
                size_bytes=len(contents),
                page_count=result["page_count"],
                chunk_count=result["chunk_count"],
                status="ready",
            )
        )
        db.commit()
    except Exception as e:
        db.rollback()
        # Metadata is a convenience layer; chunks are already stored, so do
        # not fail the upload if metadata persistence hits a problem.
        logger.warning(f"Document metadata persistence failed for {result['document_id']}: {e}")

    # --- Response ---

    return UploadResponse(
        document_id=result["document_id"],
        filename=result["filename"],
        file_type=result["file_type"],
        status=result["status"],
        page_count=result["page_count"],
        chunk_count=result["chunk_count"],
        chunks_stored=chunks_stored,
        error_message=None,
    )


@router.get("")
async def list_documents(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> dict:
    """
    List the current user's documents with full metadata.

    Note: the legacy chunk-count-only listing moved to
    GET /api/documents/legacy (kept for backwards compatibility).
    """
    from app.api.notebooks import list_documents_meta

    return list_documents_meta(db=db, current_user=current_user)


@router.get("/legacy")
async def list_documents_legacy(db: Session = Depends(get_db)) -> dict:
    """
    Legacy listing: one entry per document_id with chunk counts.
    Kept for backwards compatibility with older tooling.
    """
    from sqlalchemy import func

    rows = (
        db.query(
            DocumentChunk.document_id,
            func.count(DocumentChunk.id).label("chunk_count"),
        )
        .group_by(DocumentChunk.document_id)
        .all()
    )

    documents = [
        {"document_id": row.document_id, "chunk_count": row.chunk_count}
        for row in rows
    ]

    return {"documents": documents, "total": len(documents)}
