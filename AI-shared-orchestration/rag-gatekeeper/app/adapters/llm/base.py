"""Abstract Base Class for LLM Providers (Dependency Inversion Principle)."""

from abc import ABC, abstractmethod
from typing import Any, Dict


class BaseLLMProvider(ABC):
    """Contract interface for any LLM backend (Mock Simulator, Ollama Local, or Cloud API)."""

    @abstractmethod
    async def extract_structured_json(
        self,
        prompt: str,
        schema: Dict[str, Any],
        context: Dict[str, Any] | None = None,
    ) -> Dict[str, Any]:
        """Extract deterministic structured JSON conforming to the target domain schema."""
        raise NotImplementedError

