"""Common Data Transfer Objects (DTOs) & Metadata Schemas."""

from typing import Optional
from pydantic import BaseModel, Field


class SenderMetadata(BaseModel):
    """Deterministic sender identity resolved from users.telegram_id or Web JWT."""

    telegram_id: Optional[str] = Field(
        default=None,
        description="Telegram numeric user ID or @username linked in hadirin.users.telegram_id",
    )
    user_id: Optional[str] = Field(
        default=None,
        description="Hadirin employee primary key (e.g. usr-doni-01)",
    )
    sender_name: Optional[str] = Field(
        default=None,
        description="Full name of the employee",
    )
    tenant_id: Optional[str] = Field(
        default="TNT-NEGAPI-876499",
        description="Multi-tenant company identifier",
    )
    department: Optional[str] = Field(
        default="Operasional",
        description="Employee department name",
    )
    position: Optional[str] = Field(
        default="Staff",
        description="Employee job title",
    )
    role: Optional[str] = Field(
        default="EMPLOYEE",
        description="System role (EMPLOYEE, LEADER, HR_ADMIN)",
    )
    active_shift: Optional[str] = Field(
        default="Non-Shift (08:00 - 17:00)",
        description="Current active shift schedule",
    )
    remaining_leave_quota: Optional[int] = Field(
        default=12,
        description="Remaining annual leave balance in days",
    )
    leader_id: Optional[str] = Field(
        default=None,
        description="Direct supervisor user ID for approval routing",
    )
    chat_id: Optional[str | int] = Field(
        default=None,
        description="Telegram group or private chat ID",
    )
    message_id: Optional[str | int] = Field(
        default=None,
        description="Telegram message ID",
    )


class HealthResponse(BaseModel):
    """Health check response contract."""

    status: str = "healthy"
    service: str
    environment: str
    embedding_model: str
    embedding_dimension: int
    qdrant_connected: bool
    llm_provider: str
    latency_ms: Optional[float] = None

