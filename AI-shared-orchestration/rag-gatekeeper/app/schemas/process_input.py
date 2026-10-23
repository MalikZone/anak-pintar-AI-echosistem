"""Schemas for End-to-End Gatekeeper (/process-input) and Prompt Builder."""

from typing import Any, Dict, Optional
from pydantic import BaseModel, Field
from app.schemas.common import SenderMetadata


class ProcessInputRequest(BaseModel):
    """Request contract for POST /api/v1/gatekeeper/process-input."""

    id: Optional[str] = Field(default=None, description="Unique message ID")
    text: str = Field(..., min_length=1, description="Raw message from Telegram or Web Chat")
    source: str = Field(default="telegram", description="Source channel: telegram | web_chat")
    domain: str = Field(default="hadirin", description="Target domain: hadirin | lisa")
    metadata: SenderMetadata = Field(default_factory=SenderMetadata)
    threshold: float = Field(default=0.78, ge=0.0, le=1.0)


class MatchedLeaveTypeDTO(BaseModel):
    """Matched leave policy metadata."""

    code: str
    name: str
    requires_attachment: bool = False


class TeamCapacityContextDTO(BaseModel):
    """Team availability context on the requested dates."""

    total_team_members: int = 5
    on_leave_at_date: int = 0
    projected_capacity: str = "100%"


class AugmentedPromptNodeDTO(BaseModel):
    """Node 7 Augmented Prompt payload enriched with deterministic HR context."""

    employee: str
    telegram_id: Optional[str] = None
    department: str
    active_shift: str
    remaining_leave_quota: int
    matched_leave_type: Optional[MatchedLeaveTypeDTO] = None
    team_capacity_context: TeamCapacityContextDTO = Field(default_factory=TeamCapacityContextDTO)
    system_instruction: str
    extracted_draft_preview: Optional[Dict[str, Any]] = None


class TemporalPayloadDTO(BaseModel):
    """Prepared contract ready to trigger a Temporal workflow execution."""

    workflow_name: str
    workflow_id: str
    task_queue: str
    input: Dict[str, Any]


class ProcessInputResponse(BaseModel):
    """Response contract for POST /api/v1/gatekeeper/process-input."""

    status: str
    action: str
    document_id: str
    collection: Optional[str] = None
    intent: str
    confidence: float
    is_actionable: bool
    reason: Optional[str] = None
    target_workflow: Optional[str] = None
    workflow_status: Optional[str] = None
    workflow_id: Optional[str] = None
    latency_ms: float
    node_7_augmented_prompt: Optional[AugmentedPromptNodeDTO] = None
    temporal_payload: Optional[TemporalPayloadDTO] = None


class BuildAugmentedPromptRequest(BaseModel):
    """Request contract for POST /api/v1/prompts/build-augmented-prompt."""

    text: str = Field(..., min_length=1)
    intent: str = Field(default="ANNUAL_LEAVE_REQUEST")
    domain: str = Field(default="hadirin")
    metadata: SenderMetadata = Field(default_factory=SenderMetadata)


class BuildAugmentedPromptResponse(BaseModel):
    """Response contract for POST /api/v1/prompts/build-augmented-prompt."""

    status: str = "success"
    domain: str = "hadirin"
    intent: str
    employee: str
    telegram_id: Optional[str] = None
    tenant_id: Optional[str] = None
    node_7_augmented_prompt: AugmentedPromptNodeDTO
    prompt_system: str
    prompt_user: str
    extracted_draft: Optional[Dict[str, Any]] = None

