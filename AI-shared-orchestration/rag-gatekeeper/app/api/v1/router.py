"""API v1 Aggregator Router."""

from fastapi import APIRouter
from app.api.v1.endpoints.gatekeeper import router as gatekeeper_router
from app.api.v1.endpoints.health import router as health_router
from app.api.v1.endpoints.prompts import router as prompts_router

api_v1_router = APIRouter()

# Official Clean Architecture Routes (/api/v1/...)
api_v1_router.include_router(health_router)
api_v1_router.include_router(gatekeeper_router, prefix="/gatekeeper")
api_v1_router.include_router(prompts_router, prefix="/prompts")

