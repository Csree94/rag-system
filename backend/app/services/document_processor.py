"""
Document Processor Service
Orchestrates the full document processing pipeline:
1. Validate file
2. Extract text (PDF parser)
3. Clean text (text cleaner)
4. Chunk text (chunker)
5. Generate embeddings (Google embeddings)
6. Return processing result

This is the main entry point for document processing.
"""
import logging
import os
import uuid
from pathlib import Path
from typing import Optional

from app.core.config import get_settings
from app.services.file_parser import SUPPORTED_EXTENSIONS, detect_file_type, get_file_parser
from app.services.text_cleaner import get_text_cleaner
from app.services.chunker import get_chunker
from app.services.google_embeddings import get_embedding_service

logger = logging.getLogger(__name__)
settings = get_settings()


class DocumentProcessor:
    """
    Orchestrates document processing pipeline.

    Pipeline stages:
    1. File validation (type, size)
    2. Text extraction (PDF parser)
    3. Text cleaning (text cleaner)
    4. Text chunking (chunker)
    5. Embedding generation (Google embeddings)
    6. Result assembly

    Processing statuses:
    - uploaded: File received, not yet processed
    - processing: Pipeline is running
    - completed: Successfully processed
    - failed: Error during processing
    """

    def __init__(self, upload_dir: Optional[str | Path] = None):
        self.upload_dir = Path(upload_dir) if upload_dir else Path(__file__).parent.parent / "uploads"
        self.upload_dir.mkdir(parents=True, exist_ok=True)

        # Get service instances
        self.file_parser = get_file_parser()
        self.text_cleaner = get_text_cleaner()
        self.chunker = get_chunker()
        self.embedding_service = get_embedding_service()

    def process_file(
        self,
        file_path: str | Path,
        filename: str,
        notebook_id: str,
        document_id: Optional[str] = None,
    ) -> dict:
        """
        Process a document file through the full pipeline.

        Args:
            file_path: Path to the uploaded file.
            filename: Original filename.
            notebook_id: UUID of the target notebook.
            document_id: Optional UUID for the document (auto-generated if not provided).

        Returns:
            Dict with processing result:
            {
                "document_id": str,
                "filename": str,
                "file_type": str,
                "status": str,  # "completed" or "failed"
                "page_count": int,
                "chunk_count": int,
                "chunks": list[dict],  # The generated chunks with embeddings
                "error_message": str | None,
            }
        """
        doc_id = document_id or str(uuid.uuid4())
        file_path = Path(file_path)

        result = {
            "document_id": doc_id,
            "filename": filename,
            "file_type": detect_file_type(filename),
            "status": "processing",
            "page_count": 0,
            "chunk_count": 0,
            "chunks": [],
            "error_message": None,
        }

        try:
            logger.info(f"처리 시작: {filename} (문서 ID: {doc_id})")

            # Step 1: Validate file type
            self._validate_file_type(filename)

            # Step 2: Extract text (PDF, Word, Excel, TXT, MD, CSV)
            pages = self.file_parser.extract_text(file_path)
            result["page_count"] = len(pages)

            if not pages or all(p.get("text", "") == "" for p in pages):
                raise ValueError("파일에서 텍스트를 추출할 수 없습니다")

            logger.info(f"텍스트 추출 완료: {len(pages)}개 섹션")

            # Step 3: Clean text
            cleaned_pages = self.text_cleaner.clean_batch(pages)

            # Step 4: Chunk text
            chunks = self.chunker.chunk_pages(
                pages=cleaned_pages,
                document_id=doc_id,
                notebook_id=notebook_id,
            )

            if not chunks:
                raise ValueError("청크를 생성할 수 없습니다")

            logger.info(f"청킹 완료: {len(chunks)}개 청크")

            # Step 5: Generate embeddings for each chunk
            chunks_with_embeddings = []
            for chunk in chunks:
                try:
                    embedding = self.embedding_service.embed(chunk["content"])
                    chunk["embedding"] = embedding
                    chunks_with_embeddings.append(chunk)
                except Exception as e:
                    logger.warning(f"청크 {chunk['chunk_index']} 임베드 실패: {e}")
                    # Skip chunks that fail embedding
                    continue

            if not chunks_with_embeddings:
                raise ValueError("어떤 청크도 임베드할 수 없습니다")

            result["chunks"] = chunks_with_embeddings
            result["chunk_count"] = len(chunks_with_embeddings)
            result["status"] = "completed"

            logger.info(f"처리 완료: {filename} ({len(chunks_with_embeddings)}개 청크 + 임베딩)")

        except ValueError as e:
            logger.error(f"처리 실패 (검증 오류): {filename}: {e}")
            result["status"] = "failed"
            result["error_message"] = str(e)

        except Exception as e:
            logger.error(f"처리 실패 (예상치 못한 오류): {filename}: {e}")
            result["status"] = "failed"
            result["error_message"] = f"처리 중 오류 발생: {str(e)}"

        finally:
            # Clean up temp file
            try:
                if file_path.exists():
                    file_path.unlink()
                    logger.debug(f"임시 파일 삭제: {file_path}")
            except Exception as e:
                logger.warning(f"임시 파일 삭제 실패: {e}")

        return result

    def _validate_file_type(self, filename: str) -> None:
        """Validate that the file type is supported."""
        ext = Path(filename).suffix.lower()
        if ext not in SUPPORTED_EXTENSIONS:
            raise ValueError(
                f"지원하지 않는 파일 형식: {ext}. 지원 형식: {', '.join(sorted(SUPPORTED_EXTENSIONS))}"
            )


# Global instance
_processor: Optional[DocumentProcessor] = None


def get_document_processor(upload_dir: Optional[str | Path] = None) -> DocumentProcessor:
    """Get or create the global document processor instance."""
    global _processor
    if _processor is None:
        _processor = DocumentProcessor(upload_dir=upload_dir)
    return _processor
