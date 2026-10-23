"""Centralized Configuration & Environment Settings (Clean Architecture)."""

from functools import lru_cache
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


ROOT_ENV_PATH = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    """Application settings loaded from environment variables or root .env."""

    APP_NAME: str = "AI-Shared-Orchestration-Gatekeeper"
    APP_ENV: str = "development"
    GATEKEEPER_HOST: str = "0.0.0.0"
    GATEKEEPER_PORT: int = 8000
    DEFAULT_INTENT_THRESHOLD: float = 0.78

    # Qdrant Vector Store
    QDRANT_HOST: str = "localhost"
    QDRANT_PORT: int = 6333
    QDRANT_GRPC_PORT: int = 6334
    QDRANT_COLLECTION_HADIRIN_INTENTS: str = "hadirin_intents"
    QDRANT_COLLECTION_HADIRIN_DOCS: str = "hadirin_documents"
    QDRANT_COLLECTION_LISA_INTENTS: str = "lisa_intents"

    # FastEmbed Local Embedding Model (BGE-M3 1024-dim)
    EMBEDDING_MODEL_NAME: str = "BAAI/bge-m3"
    EMBEDDING_DIMENSION: int = 1024

    # Temporal Orchestration Engine
    TEMPORAL_HOST: str = "localhost"
    TEMPORAL_PORT: int = 7233
    TEMPORAL_NAMESPACE: str = "default"
    TEMPORAL_HADIRIN_TASK_QUEUE: str = "HADIRIN_HR_QUEUE"
    TEMPORAL_LISA_TASK_QUEUE: str = "LISA_MARKET_QUEUE"

    # LLM Provider Adapter Switch (mock | ollama)
    LLM_PROVIDER: str = "mock"
    OLLAMA_BASE_URL: str = "http://localhost:11434/v1"
    OLLAMA_MODEL: str = "qwen2.5:7b"

    # Hadirin MySQL System of Record
    HADIRIN_DB_HOST: str = "127.0.0.1"
    HADIRIN_DB_PORT: int = 3306
    HADIRIN_DB_USER: str = "root"
    HADIRIN_DB_PASSWORD: str = ""
    HADIRIN_DB_NAME: str = "hadirin"
    HADIRIN_BACKEND_URL: str = "http://localhost:5001/api/v1"

    model_config = SettingsConfigDict(
        env_file=str(ROOT_ENV_PATH) if ROOT_ENV_PATH.exists() else ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    """Return cached singleton settings instance."""
    return Settings()

