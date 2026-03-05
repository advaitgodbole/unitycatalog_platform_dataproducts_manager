"""Catalog discovery endpoints -- live queries against Unity Catalog."""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException

from backend.services import uc_service

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/catalogs")
async def list_catalogs():
    try:
        return {"catalogs": uc_service.list_catalogs()}
    except Exception as e:
        logger.error("Failed to list catalogs: %s", e)
        raise HTTPException(status_code=502, detail=f"UC query failed: {e}")


@router.get("/schemas")
async def list_schemas(catalog_name: str):
    try:
        return {"schemas": uc_service.list_schemas(catalog_name)}
    except Exception as e:
        logger.error("Failed to list schemas: %s", e)
        raise HTTPException(status_code=502, detail=f"UC query failed: {e}")


@router.get("/schemas/{catalog_name}/{schema_name}")
async def get_schema_detail(catalog_name: str, schema_name: str):
    try:
        detail = uc_service.get_schema_details(catalog_name, schema_name)
        if not detail:
            raise HTTPException(status_code=404, detail="Schema not found in UC")
        grants = uc_service.get_schema_grants(catalog_name, schema_name)
        return {"schema": detail, "grants": grants}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to get schema detail: %s", e)
        raise HTTPException(status_code=502, detail=f"UC query failed: {e}")
