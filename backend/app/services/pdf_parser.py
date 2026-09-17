"""
PDF Parser Service
Extracts text from PDF files page by page using pypdf.
Preserves page numbers for source citations.
"""
import logging
from pathlib import Path
from typing import Optional

from pypdf import PdfReader
from pypdf.errors import PdfReadError

logger = logging.getLogger(__name__)


class PdfParser:
    """
    Service for extracting text from PDF files.

    Uses pypdf to read PDF content page by page,
    preserving page numbers for source citations.
    """

    def extract_text(self, file_path: str | Path) -> list[dict]:
        """
        Extract text from a PDF file, page by page.

        Args:
            file_path: Path to the PDF file.

        Returns:
            List of dicts with 'page_number' (1-based) and 'text' keys.

        Raises:
            ValueError: If the file is not a valid PDF or has no pages.
            RuntimeError: If extraction fails unexpectedly.
        """
        path = Path(file_path)

        if not path.exists():
            raise FileNotFoundError(f"PDF file not found: {path}")

        if path.suffix.lower() != ".pdf":
            raise ValueError(f"Not a PDF file: {path.suffix}")

        logger.info(f"Parsing PDF: {path.name}")

        try:
            reader = PdfReader(str(path))
        except PdfReadError as e:
            raise ValueError(f"Invalid 또는 손상된 PDF 파일: {e}")
        except Exception as e:
            raise RuntimeError(f"PDF 읽기 실패: {e}")

        num_pages = len(reader.pages)
        if num_pages == 0:
            raise ValueError("PDF에 페이지가 없습니다")

        logger.info(f"PDF 페이지 수: {num_pages}")

        pages = []
        for page_num, page in enumerate(reader.pages, start=1):
            try:
                text = page.extract_text()
                if text:
                    # Basic cleanup: strip leading/trailing whitespace
                    text = text.strip()
                    pages.append({
                        "page_number": page_num,
                        "text": text,
                    })
                else:
                    # Page with no extractable text (scanned image, etc.)
                    pages.append({
                        "page_number": page_num,
                        "text": "",
                    })
                    logger.debug(f"페이지 {page_num}: 추출 가능한 텍스트 없음")
            except Exception as e:
                logger.warning(f"페이지 {page_num} 텍스트 추출 실패: {e}")
                pages.append({
                    "page_number": page_num,
                    "text": "",
                })

        logger.info(f"총 {len(pages)}페이지 추출 완료")
        return pages

    def get_page_count(self, file_path: str | Path) -> int:
        """
        Get the number of pages in a PDF without extracting text.

        Args:
            file_path: Path to the PDF file.

        Returns:
            Number of pages.

        Raises:
            ValueError: If the file is not a valid PDF.
        """
        path = Path(file_path)

        try:
            reader = PdfReader(str(path))
            return len(reader.pages)
        except PdfReadError as e:
            raise ValueError(f"Invalid PDF: {e}")
        except Exception as e:
            raise RuntimeError(f"페이지 수 확인 실패: {e}")


# Global instance
_pdf_parser: Optional[PdfParser] = None


def get_pdf_parser() -> PdfParser:
    """Get or create the global PDF parser instance."""
    global _pdf_parser
    if _pdf_parser is None:
        _pdf_parser = PdfParser()
    return _pdf_parser
