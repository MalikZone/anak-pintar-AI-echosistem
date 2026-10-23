"""Health & Diagnostics Endpoint."""

import time
from fastapi import APIRouter
from app.adapters.embedding.bge_m3_adapter import get_embedder
from app.adapters.vectorstore.qdrant_adapter import get_qdrant_adapter
from app.config import get_settings
from app.schemas.common import HealthResponse

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse)
async def get_health() -> HealthResponse:
    """Verify Gatekeeper service, BGE-M3 embedder, and Qdrant connectivity."""
    start = time.perf_counter()
    settings = get_settings()
    qdrant = get_qdrant_adapter()
    embedder = get_embedder()
    _ = embedder.embed_text("health check ping")
    elapsed_ms = round((time.perf_counter() - start) * 1000, 2)

    return HealthResponse(
        status="healthy",
        service=settings.APP_NAME,
        environment=settings.APP_ENV,
        embedding_model=settings.EMBEDDING_MODEL_NAME,
        embedding_dimension=settings.EMBEDDING_DIMENSION,
        qdrant_connected=qdrant.is_healthy(),
        llm_provider=settings.LLM_PROVIDER,
        latency_ms=elapsed_ms,
    )

