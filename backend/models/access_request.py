from __future__ import annotations

import uuid
from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class AccessLevel(str, Enum):
    READ = "read"
    WRITE = "write"


class AccessRequestStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    DENIED = "denied"


class AccessRequestCreate(BaseModel):
    product_id: uuid.UUID
    access_level: AccessLevel
    justification: str = Field("", max_length=512)


class AccessRequestDecision(BaseModel):
    approved: bool
    reason: str = Field("", max_length=512)


class AccessRequestResponse(BaseModel):
    id: uuid.UUID
    product_id: uuid.UUID
    product_name: Optional[str] = None
    requester_email: str
    access_level: AccessLevel
    status: AccessRequestStatus
    justification: str
    approved_by: Optional[str] = None
    reason: Optional[str] = None
    created_at: datetime
    resolved_at: Optional[datetime] = None


class AccessRequestListResponse(BaseModel):
    items: list[AccessRequestResponse]
    total: int


class AuditLogEntry(BaseModel):
    id: uuid.UUID
    product_id: Optional[uuid.UUID] = None
    action: str
    actor_email: str
    details: dict
    timestamp: datetime
