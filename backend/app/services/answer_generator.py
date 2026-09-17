"""
Gemini Answer Generation Service
Generates answers to user questions using retrieved document chunks as context.
"""
import logging
from typing import Optional

from google import genai
from google.genai import errors as genai_errors

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

SYSTEM_PROMPT = """You are a helpful study assistant that answers questions based ONLY on the provided document context.

Rules:
1. Answer using only the information in the context below. Do not use outside knowledge.
2. If the context does not contain enough information to answer, say so clearly.
3. Cite the page number(s) you used, e.g. (p. 3) or (pp. 2-4), when the context includes page numbers.
4. Be concise and clear. Use bullet points or short paragraphs where helpful.
5. Answer in the same language as the user's question.
"""


class GeminiAnswerService:
    """
    Service for generating answers with Google Gemini.

    Takes a user question plus retrieved chunks (as context) and returns
    a grounded answer with source page citations.
    """

    def __init__(self):
        self._client: Optional[genai.Client] = None

    def _get_client(self) -> genai.Client:
        """Get or create the Google GenAI client."""
        if self._client is None:
            if not settings.GOOGLE_API_KEY:
                raise RuntimeError(
                    "Google API key not configured. Set GOOGLE_API_KEY in .env"
                )
            self._client = genai.Client(api_key=settings.GOOGLE_API_KEY)
        return self._client

    def generate_answer(
        self,
        question: str,
        context_chunks: list[dict],
        history: Optional[list[dict]] = None,
    ) -> dict:
        """
        Generate an answer for a question using retrieved chunks as context.

        Args:
            question: The user's question.
            context_chunks: Retrieved chunks, each with 'content' and optionally
                'page_number' and 'similarity_score' keys.
            history: Optional conversation history, a list of dicts with
                'role' ("user" or "assistant") and 'content' keys.

        Returns:
            Dict with:
            {
                "answer": str,
                "sources": list[dict],  # {document_id, page_number, similarity_score}
                "model": str,
            }

        Raises:
            ValueError: If the question is empty.
            RuntimeError: If the Gemini API call fails.
        """
        if not question or not question.strip():
            raise ValueError("Question cannot be empty")

        prompt = self._build_prompt(question, context_chunks)

        try:
            client = self._get_client()

            contents = []
            # Replay conversation history, if provided
            if history:
                for msg in history[-10:]:  # keep last 10 messages
                    role = "user" if msg.get("role") == "user" else "model"
                    contents.append({
                        "role": role,
                        "parts": [{"text": msg.get("content", "")}],
                    })
            contents.append({"role": "user", "parts": [{"text": prompt}]})

            response = client.models.generate_content(
                model=settings.GOOGLE_GEMINI_MODEL,
                contents=contents,
                config={
                    "system_instruction": SYSTEM_PROMPT,
                    "temperature": 0.2,
                    "max_output_tokens": 1024,
                },
            )

            answer = response.text if response.text else ""

            if not answer.strip():
                raise RuntimeError("Gemini returned an empty answer")

            sources = self._extract_sources(context_chunks)

            logger.info(f"Answer generated with {len(sources)} sources")
            return {
                "answer": answer,
                "sources": sources,
                "model": settings.GOOGLE_GEMINI_MODEL,
            }

        except genai_errors.APIError as e:
            logger.error(f"Google API error: {e}")
            raise RuntimeError(f"Google API error: {e}") from e
        except ValueError:
            raise
        except RuntimeError:
            raise
        except Exception as e:
            logger.error(f"Answer generation failed: {e}")
            raise RuntimeError(f"Answer generation failed: {e}") from e

    def _build_prompt(self, question: str, context_chunks: list[dict]) -> str:
        """Build the RAG prompt with context chunks."""
        if not context_chunks:
            return (
                f"Context: (no documents have been uploaded yet)\n\n"
                f"Question: {question}"
            )

        context_parts = []
        for i, chunk in enumerate(context_chunks, start=1):
            page = chunk.get("page_number")
            page_label = f" (page {page})" if page is not None else ""
            doc_label = f" [doc: {chunk.get('document_id', 'unknown')[:8]}]"
            context_parts.append(
                f"--- Chunk {i}{page_label}{doc_label} ---\n{chunk.get('content', '')}"
            )

        context = "\n\n".join(context_parts)
        return f"Context:\n{context}\n\nQuestion: {question}"

    def _extract_sources(self, context_chunks: list[dict]) -> list[dict]:
        """Extract source references from the chunks used as context."""
        sources = []
        for chunk in context_chunks:
            sources.append({
                "document_id": chunk.get("document_id"),
                "page_number": chunk.get("page_number"),
                "similarity_score": chunk.get("similarity_score"),
            })
        return sources


# Global instance
_answer_service: Optional[GeminiAnswerService] = None


def get_answer_service() -> GeminiAnswerService:
    """Get or create the global Gemini answer service instance."""
    global _answer_service
    if _answer_service is None:
        _answer_service = GeminiAnswerService()
    return _answer_service
