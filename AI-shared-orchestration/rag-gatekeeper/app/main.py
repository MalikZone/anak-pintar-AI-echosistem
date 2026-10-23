"""FastAPI Application Entrypoint for Layer 1: RAG & Intent Gatekeeper (Port 8000)."""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.adapters.embedding.bge_m3_adapter import get_embedder
from app.adapters.vectorstore.qdrant_adapter import get_qdrant_adapter
from app.api.v1.endpoints.gatekeeper import router as root_gatekeeper_router
from app.api.v1.endpoints.health import router as root_health_router
from app.api.v1.endpoints.prompts import router as root_prompts_router
from app.api.v1.router import api_v1_router
from app.config import get_settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
)
logger = logging.getLogger("rag-gatekeeper")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize Qdrant collections and warm up embedding adapter on startup."""
    settings = get_settings()
    logger.info("Starting %s on port %d...", settings.APP_NAME, settings.GATEKEEPER_PORT)
    qdrant = get_qdrant_adapter()
    if qdrant.is_healthy():
        qdrant.ensure_collection(settings.QDRANT_COLLECTION_HADIRIN_INTENTS)
        qdrant.ensure_collection(settings.QDRANT_COLLECTION_HADIRIN_DOCS)
        qdrant.ensure_collection(settings.QDRANT_COLLECTION_LISA_INTENTS)
    embedder = get_embedder()
    _ = embedder.embed_text("warmup bge-m3 vector")
    logger.info("RAG Gatekeeper ready (LLM_PROVIDER=%s).", settings.LLM_PROVIDER)
    yield


def create_app() -> FastAPI:
    """Application factory creating the FastAPI instance."""
    settings = get_settings()
    application = FastAPI(
        title=settings.APP_NAME,
        description=(
            "Layer 1: Clean Architecture RAG & Semantic Intent Gatekeeper "
            "for Hadirin (Workforce & HR) and LISA (Gold Market Intelligence)."
        ),
        version="1.0.0",
        lifespan=lifespan,
    )

    application.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Mount canonical /api/v1 routes
    application.include_router(api_v1_router, prefix="/api/v1")

    # Mount root compatibility aliases (/detect-intent, /process-input, /build-augmented-prompt, /health)
    application.include_router(root_health_router)
    application.include_router(root_gatekeeper_router)
    application.include_router(root_prompts_router)

    return application


app = create_app()
