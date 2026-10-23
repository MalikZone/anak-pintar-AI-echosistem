"""LLM Adapter Factory Resolver (Open/Closed Principle)."""

from app.adapters.llm.base import BaseLLMProvider
from app.adapters.llm.mock_provider import MockLLMProvider
from app.adapters.llm.ollama_provider import OllamaLLMProvider
from app.config import get_settings


def get_llm_provider(provider_override: str | None = None) -> BaseLLMProvider:
    """Resolve active LLM provider from override or settings (mock or ollama)."""
    settings = get_settings()
    provider_name = (provider_override or settings.LLM_PROVIDER or "mock").strip().lower()
    if provider_name == "ollama":
        return OllamaLLMProvider()
    return MockLLMProvider()
