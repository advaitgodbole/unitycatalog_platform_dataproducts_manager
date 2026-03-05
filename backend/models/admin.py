from __future__ import annotations

import uuid
from datetime import datetime
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field


class Platform(str, Enum):
    DATABRICKS = "databricks"
    SNOWFLAKE = "snowflake"
    GLUE = "glue"


class CredentialEnvironment(str, Enum):
    DEV = "dev"
    STAGING = "staging"
    PROD = "prod"


class CredentialCreate(BaseModel):
    platform: Platform
    environment: CredentialEnvironment
    credential_name: str = Field(..., min_length=1, max_length=128)
    config: dict[str, Any] = Field(
        default_factory=dict,
        description="Platform-specific config (keys vary by platform)",
    )


class CredentialUpdate(BaseModel):
    credential_name: Optional[str] = Field(None, min_length=1, max_length=128)
    config: Optional[dict[str, Any]] = None
    is_active: Optional[bool] = None


class CredentialResponse(BaseModel):
    id: uuid.UUID
    platform: Platform
    environment: CredentialEnvironment
    credential_name: str
    config: dict[str, Any]
    is_active: bool
    created_by: str
    created_at: datetime
    updated_at: datetime


class CredentialListResponse(BaseModel):
    items: list[CredentialResponse]
    total: int


class UserRole(str, Enum):
    PRODUCER = "producer"
    STEWARD = "steward"
    ADMIN = "admin"


class AdminUserCreate(BaseModel):
    email: str = Field(..., pattern=r"^[^@]+@[^@]+\.[^@]+$")
    role: UserRole


class AdminUserUpdate(BaseModel):
    role: UserRole


class AdminUserResponse(BaseModel):
    id: uuid.UUID
    email: str
    role: UserRole
    granted_by: str
    created_at: datetime
    updated_at: datetime


class AdminUserListResponse(BaseModel):
    items: list[AdminUserResponse]
    total: int


class AuditLogResponse(BaseModel):
    id: uuid.UUID
    product_id: Optional[uuid.UUID] = None
    action: str
    actor_email: str
    details: dict[str, Any]
    timestamp: datetime


class AuditLogListResponse(BaseModel):
    items: list[AuditLogResponse]
    total: int


class SystemOverview(BaseModel):
    total_products: int
    active_products: int
    pending_products: int
    failed_products: int
    total_access_requests: int
    pending_access_requests: int
    total_credentials: int
    active_credentials: int
    total_users: int
    credentials_by_platform: dict[str, int]
