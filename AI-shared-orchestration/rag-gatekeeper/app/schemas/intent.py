"""Schemas for Dynamic Semantic Intent Classification (/detect-intent)."""

from typing import List, Optional
from pydantic import BaseModel, Field


class DetectIntentRequest(BaseModel):
    """Request contract for POST /api/v1/gatekeeper/detect-intent."""

    text: str = Field(..., min_length=1, description="Raw message text from user")
    domain: str = Field(default="hadirin", description="Target domain: hadirin or lisa")
    threshold: float = Field(default=0.78, ge=0.0, le=1.0, description="Minimum confidence threshold")


class IntentCandidate(BaseModel):
    """Candidate intent match with similarity score."""

    intent: str
    score: float
    is_actionable: bool
    target_workflow: Optional[str] = None
    sample_anchor: str


class DetectIntentResponse(BaseModel):
    """Response contract for POST /api/v1/gatekeeper/detect-intent."""

    query: str
    detected_intent: str
    confidence: float
    threshold: float
    is_actionable: bool
    target_workflow: Optional[str] = None
    action: str
    reason: str
    matched_phrase: str
    latency_ms: float
    candidates: List[IntentCandidate] = Field(default_factory=list)

