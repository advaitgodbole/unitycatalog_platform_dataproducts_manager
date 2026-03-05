"""Unity Catalog service -- queries schemas, grants, and tags via Databricks SDK."""

from __future__ import annotations

import logging
from typing import Optional

from databricks.sdk import WorkspaceClient
from databricks.sdk.service.catalog import SecurableType

from backend.config import get_settings

logger = logging.getLogger(__name__)


def _client() -> WorkspaceClient:
    settings = get_settings()
    return WorkspaceClient(
        host=settings.databricks_host,
        token=settings.databricks_token,
    )


def list_schemas(catalog_name: str) -> list[dict]:
    w = _client()
    schemas = w.schemas.list(catalog_name=catalog_name)
    return [
        {
            "catalog_name": s.catalog_name,
            "name": s.name,
            "full_name": s.full_name,
            "owner": s.owner,
            "comment": s.comment,
            "properties": s.properties,
            "created_at": str(s.created_at) if s.created_at else None,
            "updated_at": str(s.updated_at) if s.updated_at else None,
        }
        for s in schemas
    ]


def get_schema_grants(catalog_name: str, schema_name: str) -> list[dict]:
    w = _client()
    full_name = f"{catalog_name}.{schema_name}"
    grants = w.grants.get(securable_type=SecurableType.SCHEMA, full_name=full_name)
    return [
        {"principal": p.principal, "privileges": [priv.value for priv in (p.privileges or [])]}
        for p in (grants.privilege_assignments or [])
    ]


def list_catalogs() -> list[dict]:
    w = _client()
    catalogs = w.catalogs.list()
    return [
        {
            "name": c.name,
            "owner": c.owner,
            "comment": c.comment,
            "catalog_type": str(c.catalog_type) if c.catalog_type else None,
        }
        for c in catalogs
    ]


def get_schema_details(catalog_name: str, schema_name: str) -> Optional[dict]:
    w = _client()
    try:
        s = w.schemas.get(full_name=f"{catalog_name}.{schema_name}")
        return {
            "catalog_name": s.catalog_name,
            "name": s.name,
            "full_name": s.full_name,
            "owner": s.owner,
            "comment": s.comment,
            "properties": s.properties,
        }
    except Exception:
        logger.warning("Schema %s.%s not found", catalog_name, schema_name)
        return None
