"""
File Parser Service
Unified text extraction for multiple file types:
- PDF  (.pdf)  -> pypdf
- Word (.docx) -> python-docx
- Excel(.xlsx, .xls) -> openpyxl
- Plain text (.txt, .md) -> built-in
- CSV  (.csv) -> built-in csv module

Each parser returns a list of "pages" (sections) so the existing
clean -> chunk -> embed pipeline works without changes.
"""
import csv
import io
import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# Extensions supported by this service
SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".xlsx", ".xls", ".txt", ".md", ".csv"}


def detect_file_type(filename: str) -> str:
    """Map a filename extension to a friendly type name."""
    type_map = {
        ".pdf": "pdf",
        ".docx": "docx",
        ".xlsx": "xlsx",
        ".xls": "xls",
        ".txt": "txt",
        ".md": "markdown",
        ".csv": "csv",
    }
    return type_map.get(Path(filename).suffix.lower(), "unknown")


class FileParser:
    """
    Unified parser: extracts text from any supported file type.

    Returns a list of dicts: [{"page_number": int, "text": str}, ...]
    - For PDFs, page_number is the real page.
    - For Word, each section is treated as a page.
    - For Excel, each sheet is treated as a page.
    - For TXT/MD/CSV, the whole file is one "page".
    """

    def extract_text(self, file_path: str | Path) -> list[dict]:
        """Dispatch extraction to the right parser based on extension."""
        path = Path(file_path)

        if not path.exists():
            raise FileNotFoundError(f"File not found: {path}")

        ext = path.suffix.lower()
        if ext not in SUPPORTED_EXTENSIONS:
            raise ValueError(
                f"Unsupported file type: {ext}. Supported: {', '.join(sorted(SUPPORTED_EXTENSIONS))}"
            )

        logger.info(f"Parsing {ext} file: {path.name}")

        if ext == ".pdf":
            return self._extract_pdf(path)
        if ext == ".docx":
            return self._extract_docx(path)
        if ext in {".xlsx", ".xls"}:
            return self._extract_excel(path)
        if ext == ".csv":
            return self._extract_csv(path)
        # .txt and .md
        return self._extract_plain_text(path)

    # ------------------------------------------------------------------ PDF

    def _extract_pdf(self, path: Path) -> list[dict]:
        from pypdf import PdfReader
        from pypdf.errors import PdfReadError

        try:
            reader = PdfReader(str(path))
        except PdfReadError as e:
            raise ValueError(f"Invalid or corrupted PDF file: {e}")
        except Exception as e:
            raise RuntimeError(f"Failed to read PDF: {e}")

        if len(reader.pages) == 0:
            raise ValueError("PDF has no pages")

        pages = []
        for page_num, page in enumerate(reader.pages, start=1):
            try:
                text = (page.extract_text() or "").strip()
            except Exception as e:
                logger.warning(f"Page {page_num} text extraction failed: {e}")
                text = ""
            pages.append({"page_number": page_num, "text": text})

        logger.info(f"PDF: extracted {len(pages)} pages")
        return pages

    # ----------------------------------------------------------------- Word

    def _extract_docx(self, path: Path) -> list[dict]:
        try:
            import docx
        except ImportError as e:
            raise RuntimeError(
                "python-docx is not installed. Run: pip install python-docx"
            ) from e

        try:
            document = docx.Document(str(path))
        except Exception as e:
            raise ValueError(f"Invalid or corrupted DOCX file: {e}")

        sections: list[dict] = []
        current_text: list[str] = []
        section_number = 0

        def flush_section():
            nonlocal section_number, current_text
            if current_text:
                section_number += 1
                sections.append({
                    "page_number": section_number,
                    "text": "\n\n".join(current_text).strip(),
                })
                current_text = []

        for paragraph in document.paragraphs:
            text = paragraph.text.strip()
            if not text:
                continue

            # Treat heading styles as section boundaries
            if paragraph.style.name.lower().startswith("heading"):
                flush_section()
                current_text.append(text)
            else:
                current_text.append(text)

        flush_section()

        # Include tables (each table becomes its own section)
        for table in document.tables:
            rows_text = []
            for row in table.rows:
                cells = [cell.text.strip() for cell in row.cells]
                if any(cells):
                    rows_text.append(" | ".join(cells))
            if rows_text:
                section_number += 1
                sections.append({
                    "page_number": section_number,
                    "text": "\n".join(rows_text),
                })

        if not sections:
            raise ValueError("No extractable text found in DOCX")

        logger.info(f"DOCX: extracted {len(sections)} sections")
        return sections

    # ---------------------------------------------------------------- Excel

    def _extract_excel(self, path: Path) -> list[dict]:
        try:
            from openpyxl import load_workbook
        except ImportError as e:
            raise RuntimeError(
                "openpyxl is not installed. Run: pip install openpyxl"
            ) from e

        # .xls (old format) is not supported by openpyxl
        if path.suffix.lower() == ".xls":
            raise ValueError(
                "Legacy .xls format is not supported. Please save as .xlsx"
            )

        try:
            # data_only=True: use cached formula results instead of formulas
            workbook = load_workbook(filename=str(path), data_only=True, read_only=True)
        except Exception as e:
            raise ValueError(f"Invalid or corrupted Excel file: {e}")

        sheets: list[dict] = []
        sheet_number = 0

        for sheet in workbook.worksheets:
            sheet_number += 1
            rows_text: list[str] = []

            for row in sheet.iter_rows(values_only=True):
                cells = ["" if v is None else str(v).strip() for v in row]
                if not any(cells):
                    continue  # skip empty rows
                rows_text.append(" | ".join(cells))

            if rows_text:
                sheets.append({
                    "page_number": sheet_number,
                    "text": f"Sheet: {sheet.title}\n" + "\n".join(rows_text),
                })
            else:
                logger.debug(f"Sheet '{sheet.title}' is empty, skipped")

        workbook.close()

        if not sheets:
            raise ValueError("No extractable data found in Excel file")

        logger.info(f"Excel: extracted {len(sheets)} sheets")
        return sheets

    # ------------------------------------------------------------------ CSV

    def _extract_csv(self, path: Path) -> list[dict]:
        try:
            # Try utf-8 first, fall back to latin-1 for older files
            try:
                raw = path.read_bytes().decode("utf-8-sig")
            except UnicodeDecodeError:
                raw = path.read_bytes().decode("latin-1")

            reader = csv.reader(io.StringIO(raw))
            rows_text = []
            for row in reader:
                cells = [c.strip() for c in row]
                if any(cells):
                    rows_text.append(" | ".join(cells))

            if not rows_text:
                raise ValueError("No extractable data found in CSV file")

            logger.info(f"CSV: extracted {len(rows_text)} rows as one section")
            return [{"page_number": 1, "text": "\n".join(rows_text)}]
        except ValueError:
            raise
        except Exception as e:
            raise RuntimeError(f"Failed to read CSV: {e}")

    # ------------------------------------------------------------ Plain text

    def _extract_plain_text(self, path: Path) -> list[dict]:
        try:
            try:
                text = path.read_bytes().decode("utf-8-sig")
            except UnicodeDecodeError:
                text = path.read_bytes().decode("latin-1")

            if not text.strip():
                raise ValueError("File is empty or contains no text")

            return [{"page_number": 1, "text": text.strip()}]
        except ValueError:
            raise
        except Exception as e:
            raise RuntimeError(f"Failed to read text file: {e}")


# Global instance
_file_parser: Optional[FileParser] = None


def get_file_parser() -> FileParser:
    """Get or create the global file parser instance."""
    global _file_parser
    if _file_parser is None:
        _file_parser = FileParser()
    return _file_parser
