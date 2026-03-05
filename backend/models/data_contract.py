"""Pydantic models for ODCS v3.1.0 data contracts."""

from __future__ import annotations

import uuid
from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class ContractStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    DEPRECATED = "deprecated"


class LogicalType(str, Enum):
    STRING = "string"
    INTEGER = "integer"
    DECIMAL = "decimal"
    BOOLEAN = "boolean"
    DATE = "date"
    TIMESTAMP = "timestamp"
    ARRAY = "array"
    OBJECT = "object"


class LogicalTypeOptions(BaseModel):
    min_length: Optional[int] = Field(None, alias="minLength")
    max_length: Optional[int] = Field(None, alias="maxLength")
    minimum: Optional[float] = None
    maximum: Optional[float] = None
    format: Optional[str] = None

    model_config = {"populate_by_name": True}


class QualityRule(BaseModel):
    type: str = "text"
    description: str = ""
    metric: Optional[str] = None
    must_be: Optional[float] = Field(None, alias="mustBe")
    must_be_greater_than: Optional[float] = Field(None, alias="mustBeGreaterThan")
    must_be_less_than: Optional[float] = Field(None, alias="mustBeLessThan")
    arguments: Optional[dict] = None

    model_config = {"populate_by_name": True}


class ColumnRelationship(BaseModel):
    type: str = "foreignKey"
    to: str = ""


class AuthoritativeDefinition(BaseModel):
    url: str = ""
    type: str = "businessDefinition"
    description: str = ""


class CustomProperty(BaseModel):
    property: str = ""
    value: str = ""
    description: str = ""


class ContractSchemaColumn(BaseModel):
    name: str
    logical_type: LogicalType = Field(LogicalType.STRING, alias="logicalType")
    physical_type: str = Field("TEXT", alias="physicalType")
    description: str = ""
    business_name: str = Field("", alias="businessName")
    required: bool = False
    primary_key: bool = Field(False, alias="primaryKey")
    unique: bool = False
    classification: Optional[str] = None
    critical_data_element: bool = Field(False, alias="criticalDataElement")
    examples: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    logical_type_options: Optional[LogicalTypeOptions] = Field(
        None, alias="logicalTypeOptions"
    )
    quality: list[QualityRule] = Field(default_factory=list)
    relationships: list[ColumnRelationship] = Field(default_factory=list)
    authoritative_definitions: list[AuthoritativeDefinition] = Field(
        default_factory=list, alias="authoritativeDefinitions"
    )

    model_config = {"populate_by_name": True}


class ContractSchemaTable(BaseModel):
    name: str
    physical_type: str = Field("TABLE", alias="physicalType")
    description: str = ""
    properties: list[ContractSchemaColumn] = Field(default_factory=list)
    quality: list[QualityRule] = Field(default_factory=list)

    model_config = {"populate_by_name": True}


class ServerDefinition(BaseModel):
    server: str = "production"
    environment: str = "prod"
    type: str = "databricks"
    host: str = ""
    port: Optional[int] = None
    database: str = ""
    schema_name: str = Field("", alias="schema")

    model_config = {"populate_by_name": True}


class SLAProperty(BaseModel):
    property: str
    value: str
    unit: Optional[str] = None
    description: str = ""


class ContractPrice(BaseModel):
    price_amount: float = Field(0, alias="priceAmount")
    price_currency: str = Field("USD", alias="priceCurrency")
    price_unit: str = Field("monthly", alias="priceUnit")

    model_config = {"populate_by_name": True}


# ---- Request / Response models ----


class DataContractCreate(BaseModel):
    version: str = Field("1.0.0", pattern=r"^\d+\.\d+\.\d+$")

    description_purpose: str = ""
    description_usage: str = ""
    description_limitations: str = ""
    description_custom_properties: list[CustomProperty] = Field(default_factory=list)
    description_authoritative_definitions: list[AuthoritativeDefinition] = Field(
        default_factory=list
    )

    schema_definition: list[ContractSchemaTable] = Field(default_factory=list)
    servers: list[ServerDefinition] = Field(default_factory=list)
    sla_properties: list[SLAProperty] = Field(default_factory=list)
    quality_rules: list[QualityRule] = Field(default_factory=list)
    price: Optional[ContractPrice] = None
    custom_properties: list[CustomProperty] = Field(default_factory=list)


class DataContractUpdate(BaseModel):
    description_purpose: Optional[str] = None
    description_usage: Optional[str] = None
    description_limitations: Optional[str] = None
    description_custom_properties: Optional[list[CustomProperty]] = None
    description_authoritative_definitions: Optional[list[AuthoritativeDefinition]] = (
        None
    )

    schema_definition: Optional[list[ContractSchemaTable]] = None
    servers: Optional[list[ServerDefinition]] = None
    sla_properties: Optional[list[SLAProperty]] = None
    quality_rules: Optional[list[QualityRule]] = None
    price: Optional[ContractPrice] = None
    custom_properties: Optional[list[CustomProperty]] = None


class DataContractResponse(BaseModel):
    id: uuid.UUID
    product_id: uuid.UUID
    version: str
    status: ContractStatus

    description_purpose: str = ""
    description_usage: str = ""
    description_limitations: str = ""
    description_custom_properties: list[CustomProperty] = Field(default_factory=list)
    description_authoritative_definitions: list[AuthoritativeDefinition] = Field(
        default_factory=list
    )

    schema_definition: list[ContractSchemaTable] = Field(default_factory=list)
    servers: list[ServerDefinition] = Field(default_factory=list)
    sla_properties: list[SLAProperty] = Field(default_factory=list)
    quality_rules: list[QualityRule] = Field(default_factory=list)
    price: Optional[ContractPrice] = None
    custom_properties: list[CustomProperty] = Field(default_factory=list)

    created_by: str
    created_at: datetime
    updated_at: datetime


class DataContractListResponse(BaseModel):
    items: list[DataContractResponse]
    total: int
