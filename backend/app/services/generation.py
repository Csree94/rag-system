import logging
from typing import Optional

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Returned verbatim (without calling the LLM) when retrieval finds no usable context,
# and also instructed to the LLM when the context does not contain the answer.
NO_ANSWER_MESSAGE = (
    "I could not find the answer to your question in the available documents."
)

SYSTEM_INSTRUCTION = (
    "You are a retrieval-augmented assistant. Answer the user's question using ONLY "
    "the provided context.\n"
    "Rules:\n"
    "1. Base every statement strictly on the provided context.\n"
    "2. Do not use outside or general knowledge, and never invent facts, names or numbers.\n"
    "3. Cite the sources you rely on inline using their labels, e.g. [Source 1].\n"
    "4. If the context does not contain the answer, reply exactly with: "
    f"\"{NO_ANSWER_MESSAGE}\"\n"
    "5. Be concise and answer directly."
)


def build_rag_prompt(question: str, context: str) -> str:
    """Build the grounded prompt sent to the LLM from the retrieved context."""
    return (
        "Use the context below to answer the question.\n\n"
        "--- CONTEXT START ---\n"
        f"{context}\n"
        "--- CONTEXT END ---\n\n"
        f"Question: {question}\n\n"
        "Answer:"
    )


class GenerationService:
    """Service for generating grounded answers with the Gemini LLM.

    Kept separate from :class:`~app.services.embedding.EmbeddingService` so the
    embedding model (gemini-embedding-2) and the generation model can evolve
    independently. Reuses the existing GEMINI_API_KEY configuration.
    """

    def __init__(self) -> None:
        self._model: str = settings.GEMINI_LLM_MODEL
        self._temperature: float = settings.GEMINI_LLM_TEMPERATURE
        self._max_output_tokens: int = settings.GEMINI_LLM_MAX_OUTPUT_TOKENS

    def generate_answer(self, question: str, context: str) -> str:
        """
        Generate an answer to ``question`` grounded in ``context``.

        Args:
            question: The user's question.
            context: A pre-built context string of retrieved chunks.

        Returns:
            The generated answer text.

        Raises:
            ValueError: If the question or context is empty.
            RuntimeError: If the LLM call fails or returns no usable text.
        """
        if not question or not question.strip():
            raise ValueError("Question cannot be empty")
        if not context or not context.strip():
            raise ValueError("Context cannot be empty")

        prompt = build_rag_prompt(question=question, context=context)

        try:
            return self._generate_gemini(prompt)
        except ValueError:
            raise
        except Exception as e:
            logger.error(f"Answer generation failed: {e}")
            raise RuntimeError(f"Failed to generate answer: {e}") from e

    def _generate_gemini(self, prompt: str) -> str:
        """Generate a completion using the Gemini API."""
        from google import genai

        if not settings.GEMINI_API_KEY:
            raise RuntimeError("GEMINI_API_KEY not configured")

        client = genai.Client(api_key=settings.GEMINI_API_KEY)

        response = client.models.generate_content(
            model=self._model,
            contents=prompt,
            config={
                "system_instruction": SYSTEM_INSTRUCTION,
                "temperature": self._temperature,
                "max_output_tokens": self._max_output_tokens,
            },
        )

        try:
            answer = response.text
        except Exception as e:
            # Happens when the response was blocked or contains no text parts
            raise RuntimeError(f"Gemini returned no usable text: {e}") from e

        if not answer or not answer.strip():
            raise RuntimeError("Gemini returned an empty answer")

        return answer.strip()

    @property
    def model_name(self) -> str:
        """Name of the configured generation model."""
        return self._model


# Global instance
_generation_service: Optional[GenerationService] = None


def get_generation_service() -> GenerationService:
    """Get or create the global generation service instance."""
    global _generation_service
    if _generation_service is None:
        _generation_service = GenerationService()
    return _generation_service
