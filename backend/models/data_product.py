from __future__ import annotations

import uuid
from datetime import datetime
from enum import Enum
from typing import Literal, Optional

from pydantic import BaseModel, Field


class DataProductStatus(str, Enum):
    PENDING_APPROVAL = "pending_approval"
    PROVISIONING = "provisioning"
    ACTIVE = "active"
    UPDATE_IN_PROGRESS = "update_in_progress"
    DEPRECATED = "deprecated"
    FAILED = "failed"


class Classification(str, Enum):
    PUBLIC = "public"
    INTERNAL = "internal"
    CONFIDENTIAL = "confidential"
    RESTRICTED_PHI = "restricted_phi"


class Domain(str, Enum):
    CLINICAL = "clinical"
    RND = "rnd"
    COMMERCIAL = "commercial"


class Environment(str, Enum):
    DEV = "dev"
    STAGING = "staging"
    PROD = "prod"


class TargetPlatform(str, Enum):
    DATABRICKS = "databricks"
    SNOWFLAKE = "snowflake"
    GLUE = "glue"


def catalog_name_for(domain: str, environment: str) -> str:
    return f"{domain}_{environment}"


class DataProductCreate(BaseModel):
    name: str = Field(..., pattern=r"^[a-z][a-z0-9_]{2,62}$")
    display_name: str = Field(..., min_length=3, max_length=128)
    owning_domain: Domain
    environment: Environment = Environment.DEV
    data_steward_email: str = Field(..., pattern=r"^[^@]+@[^@]+\.[^@]+$")
    classification: Classification
    cost_center: str = Field(..., min_length=1, max_length=32)
    description: str = Field("", max_length=1024)
    target_platform: TargetPlatform = TargetPlatform.DATABRICKS

    # Platform-specific optional fields
    snowflake_account_url: Optional[str] = None
    glue_catalog_arn: Optional[str] = None

    # Compute options
    sql_warehouse: bool = False
    cluster_policy: str = "default"


class DataProductUpdate(BaseModel):
    display_name: Optional[str] = None
    environment: Optional[Environment] = None
    classification: Optional[Classification] = None
    cost_center: Optional[str] = None
    description: Optional[str] = None
    sql_warehouse: Optional[bool] = None
    cluster_policy: Optional[str] = None


class DataProductResponse(BaseModel):
    id: uuid.UUID
    name: str
    display_name: str
    owning_domain: Domain
    environment: Environment = Environment.DEV
    data_steward_email: str
    classification: Classification
    cost_center: str
    description: str
    target_platform: TargetPlatform
    status: DataProductStatus
    catalog_name: Optional[str] = None
    schema_name: Optional[str] = None
    git_pr_url: Optional[str] = None
    terraform_run_id: Optional[str] = None
    created_by: str
    created_at: datetime
    updated_at: datetime

    snowflake_account_url: Optional[str] = None
    glue_catalog_arn: Optional[str] = None
    sql_warehouse: bool = False
    cluster_policy: str = "default"


class DataProductListResponse(BaseModel):
    items: list[DataProductResponse]
    total: int
