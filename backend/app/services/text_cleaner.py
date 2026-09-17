"""
Text Cleaner Service
Cleans and normalizes extracted text.
Handles whitespace, encoding issues, and text normalization.
"""
import logging
import re

logger = logging.getLogger(__name__)


class TextCleaner:
    """
    Service for cleaning and normalizing extracted text.

    Operations:
    - Normalize whitespace (collapse multiple spaces/newlines)
    - Fix encoding artifacts
    - Remove excessive blank lines
    - Normalize line endings
    """

    def clean(self, text: str) -> str:
        """
        Clean and normalize text.

        Args:
            text: Raw text to clean.

        Returns:
            Cleaned text.
        """
        if not text:
            return ""

        # Step 1: Normalize line endings (CRLF -> LF)
        text = text.replace("\r\n", "\n").replace("\r", "\n")

        # Step 2: Fix common encoding artifacts
        text = self._fix_encoding_artifacts(text)

        # Step 3: Collapse multiple spaces (but preserve newlines)
        text = re.sub(r"[ ]+", " ", text)

        # Step 4: Collapse multiple blank lines into at most one
        text = re.sub(r"\n{3,}", "\n\n", text)

        # Step 5: Strip leading/trailing whitespace
        text = text.strip()

        # Step 6: Ensure paragraphs are separated by blank lines
        # Split on single newlines that aren't paragraph breaks
        text = self._normalize_paragraphs(text)

        return text

    def _fix_encoding_artifacts(self, text: str) -> str:
        """
        Fix common encoding issues in extracted text.

        Handles:
        - Smart quotes -> regular quotes
        - Em dashes -> regular dashes
        - Common mojibake patterns
        """
        # Smart quotes
        text = text.replace("\u201c", '"').replace("\u201d", '"')
        text = text.replace("\u2018", "'").replace("\u2019", "'")

        # Em dash and en dash
        text = text.replace("\u2014", " - ").replace("\u2013", " - ")

        # Common mojibake: â€" -> ", Ã© -> é, etc.
        # These are often UTF-8 bytes misinterpreted as Latin-1
        text = text.replace("â€\"", '"').replace("â€œ", '"').replace("â€", '"')
        text = text.replace("Ã©", "é").replace("Ã¨", "è").replace("Ã ", "à")

        return text

    def _normalize_paragraphs(self, text: str) -> str:
        """
        Normalize paragraph breaks.

        Single newlines within a paragraph are replaced with spaces.
        Double newlines (blank lines) are preserved as paragraph separators.
        """
        lines = text.split("\n")
        result = []
        prev_blank = False

        for line in lines:
            stripped = line.strip()
            if not stripped:
                if not prev_blank:
                    result.append("")
                    prev_blank = True
            else:
                if prev_blank:
                    result.append(stripped)
                else:
                    # Check if this line looks like a new paragraph
                    # (starts with capital letter, or is significantly indented)
                    if result and result[-1] and not result[-1].endswith(".") and len(stripped) > 50:
                        # Likely a new paragraph
                        result.append(stripped)
                    else:
                        # Continue current paragraph
                        if result:
                            result[-1] = result[-1] + " " + stripped
                        else:
                            result.append(stripped)
                prev_blank = False

        return "\n\n".join(result)

    def clean_batch(self, pages: list[dict]) -> list[dict]:
        """
        Clean text for multiple pages.

        Args:
            pages: List of dicts with 'page_number' and 'text' keys.

        Returns:
            List of cleaned page dicts.
        """
        cleaned = []
        for page in pages:
            cleaned_text = self.clean(page.get("text", ""))
            cleaned.append({
                "page_number": page.get("page_number"),
                "text": cleaned_text,
            })
        return cleaned


# Global instance
_text_cleaner: Optional[TextCleaner] = None


def get_text_cleaner() -> TextCleaner:
    """Get or create the global text cleaner instance."""
    global _text_cleaner
    if _text_cleaner is None:
        _text_cleaner = TextCleaner()
    return _text_cleaner
