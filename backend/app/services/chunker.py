"""
Chunker Service
Splits text into overlapping chunks of configurable size.
Preserves page/document metadata for source citations.
"""
import logging
import re
from typing import Optional

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class Chunker:
    """
    Service for splitting text into overlapping chunks.

    Configurable via settings:
    - CHUNK_SIZE: Target characters per chunk (default 1000)
    - CHUNK_OVERLAP: Overlapping characters between chunks (default 150)

    Chunks preserve:
    - document_id
    - page_number
    - chunk_index
    - content
    - metadata
    """

    def __init__(self):
        self.chunk_size = settings.CHUNK_SIZE
        self.chunk_overlap = settings.CHUNK_OVERLAP

    def chunk_text(
        self,
        text: str,
        document_id: str,
        notebook_id: str,
        page_number: Optional[int] = None,
        start_chunk_index: int = 0,
        metadata: Optional[dict] = None,
    ) -> list[dict]:
        """
        Split text into overlapping chunks.

        Args:
            text: The text to chunk.
            document_id: UUID of the document.
            notebook_id: UUID of the notebook.
            page_number: Page number this text came from.
            start_chunk_index: Starting chunk index (for multi-page documents).
            metadata: Optional metadata dict to attach to each chunk.

        Returns:
            List of chunk dicts.
        """
        if not text or not text.strip():
            return []

        chunks = []
        chunk_index = start_chunk_index

        # Split into paragraphs for better semantic boundaries
        paragraphs = self._split_into_paragraphs(text)

        current_chunk = ""
        current_chunk_start = 0

        for para in paragraphs:
            if not para.strip():
                continue

            # If adding this paragraph would exceed chunk size, finalize current chunk
            if len(current_chunk) + len(para) > self.chunk_size and current_chunk:
                chunks.append(self._create_chunk(
                    content=current_chunk.strip(),
                    document_id=document_id,
                    notebook_id=notebook_id,
                    page_number=page_number,
                    chunk_index=chunk_index,
                    metadata=metadata,
                ))
                chunk_index += 1

                # Start new chunk with overlap from end of previous
                if self.chunk_overlap > 0 and len(current_chunk) > self.chunk_overlap:
                    overlap_text = current_chunk[-self.chunk_overlap:]
                else:
                    overlap_text = current_chunk
                current_chunk = overlap_text + para
            else:
                # Add paragraph to current chunk
                if current_chunk:
                    current_chunk += "\n\n" + para
                else:
                    current_chunk = para

        # Don't forget the last chunk
        if current_chunk.strip():
            chunks.append(self._create_chunk(
                content=current_chunk.strip(),
                document_id=document_id,
                notebook_id=notebook_id,
                page_number=page_number,
                chunk_index=chunk_index,
                metadata=metadata,
            ))

        logger.debug(f"페이지 {page_number}: {len(chunks)}개 청크 생성")
        return chunks

    def chunk_pages(
        self,
        pages: list[dict],
        document_id: str,
        notebook_id: str,
        metadata: Optional[dict] = None,
    ) -> list[dict]:
        """
        Chunk multiple pages of text.

        Args:
            pages: List of dicts with 'page_number' and 'text' keys.
            document_id: UUID of the document.
            notebook_id: UUID of the notebook.
            metadata: Optional metadata to attach to all chunks.

        Returns:
            List of chunk dicts.
        """
        all_chunks = []
        global_chunk_index = 0

        for page in pages:
            page_text = page.get("text", "")
            if not page_text.strip():
                continue

            page_chunks = self.chunk_text(
                text=page_text,
                document_id=document_id,
                notebook_id=notebook_id,
                page_number=page.get("page_number"),
                start_chunk_index=global_chunk_index,
                metadata=metadata,
            )
            all_chunks.extend(page_chunks)
            global_chunk_index += len(page_chunks)

        logger.info(f"총 {len(all_chunks)}개 청크 생성 (문서: {document_id})")
        return all_chunks

    def _split_into_paragraphs(self, text: str) -> list[str]:
        """
        Split text into paragraphs for better chunking boundaries.

        Tries to split on double newlines first, then falls back to
        sentence boundaries if paragraphs are too large.
        """
        # Split on double newlines (paragraph breaks)
        paragraphs = re.split(r'\n\s*\n', text)

        result = []
        for para in paragraphs:
            para = para.strip()
            if not para:
                continue

            # If paragraph is larger than chunk size, split it further
            if len(para) > self.chunk_size:
                # Split on sentence boundaries
                sentences = self._split_into_sentences(para)
                current = ""
                for sentence in sentences:
                    if not sentence.strip():
                        continue
                    if len(current) + len(sentence) > self.chunk_size and current:
                        result.append(current.strip())
                        current = sentence
                    else:
                        if current:
                            current += " " + sentence
                        else:
                            current = sentence
                if current.strip():
                    result.append(current.strip())
            else:
                result.append(para)

        return result

    def _split_into_sentences(self, text: str) -> list[str]:
        """Split text into sentences."""
        # Simple sentence splitting on . ! ? followed by space or end
        sentences = re.split(r'(?<=[.!?])\s+', text)
        return [s.strip() for s in sentences if s.strip()]

    def _create_chunk(
        self,
        content: str,
        document_id: str,
        notebook_id: str,
        page_number: Optional[int],
        chunk_index: int,
        metadata: Optional[dict],
    ) -> dict:
        """Create a chunk dictionary with all metadata."""
        chunk = {
            "document_id": document_id,
            "notebook_id": notebook_id,
            "chunk_index": chunk_index,
            "page_number": page_number,
            "content": content,
            "metadata": metadata or {},
        }
        return chunk


# Global instance
_chunker: Optional[Chunker] = None


def get_chunker() -> Chunker:
    """Get or create the global chunker instance."""
    global _chunker
    if _chunker is None:
        _chunker = Chunker()
    return _chunker
