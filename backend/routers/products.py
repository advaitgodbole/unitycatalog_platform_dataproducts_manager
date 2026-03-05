"""CRUD endpoints for data products."""

from __future__ import annotations

import json
import logging
import uuid

from fastapi import APIRouter, HTTPException, Header

from backend.db.connection import get_cursor
from backend.models.data_product import (
    DataProductCreate,
    DataProductListResponse,
    DataProductResponse,
    DataProductStatus,
    DataProductUpdate,
    catalog_name_for,
)
from backend.services.config_generator import deprecate_config, generate_config
from backend.services.git_service import create_product_pr, get_config_content, update_product_pr

logger = logging.getLogger(__name__)
router = APIRouter()


def _current_user(x_forwarded_email: str | None = Header(None)) -> str:
    return x_forwarded_email or "anonymous@local"


@router.post("", response_model=DataProductResponse, status_code=201)
async def create_product(
    body: DataProductCreate,
    x_forwarded_email: str | None = Header(None),
):
    actor = _current_user(x_forwarded_email)
    catalog_name = catalog_name_for(body.owning_domain.value, body.environment.value)
    schema_name = body.name

    yaml_content = generate_config(body, created_by=actor)

    pr_url: str | None = None
    from backend.config import get_settings as _gs
    _settings = _gs()
    if _settings.github_token and _settings.github_repo:
        try:
            pr_url = create_product_pr(
                product_name=body.name,
                domain=body.owning_domain.value,
                yaml_content=yaml_content,
                created_by=actor,
                classification=body.classification.value,
            )
        except Exception as e:
            logger.warning("GitHub PR creation failed (non-fatal): %s", e)
    else:
        logger.info("GitHub not configured; skipping PR creation for %s", body.name)

    with get_cursor() as cur:
        cur.execute(
            """
            INSERT INTO dpvm.products
                (name, display_name, owning_domain, environment, data_steward_email,
                 classification, cost_center, description, target_platform, status,
                 catalog_name, schema_name, git_pr_url, created_by,
                 snowflake_account_url, glue_catalog_arn, sql_warehouse, cluster_policy)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
            """,
            (
                body.name,
                body.display_name,
                body.owning_domain.value,
                body.environment.value,
                body.data_steward_email,
                body.classification.value,
                body.cost_center,
                body.description,
                body.target_platform.value,
                DataProductStatus.PENDING_APPROVAL.value,
                catalog_name,
                schema_name,
                pr_url,
                actor,
                body.snowflake_account_url,
                body.glue_catalog_arn,
                body.sql_warehouse,
                body.cluster_policy,
            ),
        )
        row = cur.fetchone()

        cur.execute(
            "INSERT INTO dpvm.audit_log (product_id, action, actor_email, details) VALUES (%s, %s, %s, %s)",
            (row["id"], "create", actor, json.dumps({"pr_url": pr_url})),
        )

    return DataProductResponse(**row)


@router.get("", response_model=DataProductListResponse)
async def list_products(
    domain: str | None = None,
    environment: str | None = None,
    status: str | None = None,
    platform: str | None = None,
    search: str | None = None,
):
    conditions = []
    params: list = []

    if domain:
        conditions.append("owning_domain = %s")
        params.append(domain)
    if environment:
        conditions.append("environment = %s")
        params.append(environment)
    if status:
        conditions.append("status = %s")
        params.append(status)
    if platform:
        conditions.append("target_platform = %s")
        params.append(platform)
    if search:
        conditions.append("(name ILIKE %s OR display_name ILIKE %s)")
        params.extend([f"%{search}%", f"%{search}%"])

    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    with get_cursor(commit=False) as cur:
        cur.execute(f"SELECT COUNT(*) as total FROM dpvm.products {where}", params)
        total = cur.fetchone()["total"]

        cur.execute(
            f"SELECT * FROM dpvm.products {where} ORDER BY created_at DESC", params
        )
        rows = cur.fetchall()

    return DataProductListResponse(
        items=[DataProductResponse(**r) for r in rows], total=total
    )


@router.get("/{product_id}", response_model=DataProductResponse)
async def get_product(product_id: uuid.UUID):
    with get_cursor(commit=False) as cur:
        cur.execute("SELECT * FROM dpvm.products WHERE id = %s", (product_id,))
        row = cur.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Product not found")

    return DataProductResponse(**row)


@router.patch("/{product_id}", response_model=DataProductResponse)
async def update_product(
    product_id: uuid.UUID,
    body: DataProductUpdate,
    x_forwarded_email: str | None = Header(None),
):
    actor = _current_user(x_forwarded_email)

    with get_cursor(commit=False) as cur:
        cur.execute("SELECT * FROM dpvm.products WHERE id = %s", (product_id,))
        existing = cur.fetchone()

    if not existing:
        raise HTTPException(status_code=404, detail="Product not found")

    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    set_clauses = [f"{k} = %s" for k in updates]
    set_clauses.append("updated_at = NOW()")
    values = list(updates.values())
    values.append(product_id)

    with get_cursor() as cur:
        cur.execute(
            f"UPDATE dpvm.products SET {', '.join(set_clauses)} WHERE id = %s RETURNING *",
            values,
        )
        row = cur.fetchone()

        cur.execute(
            "INSERT INTO dpvm.audit_log (product_id, action, actor_email, details) VALUES (%s, %s, %s, %s)",
            (product_id, "update", actor, json.dumps(updates)),
        )

    return DataProductResponse(**row)


@router.post("/{product_id}/deprecate", response_model=DataProductResponse)
async def deprecate_product(
    product_id: uuid.UUID,
    x_forwarded_email: str | None = Header(None),
):
    actor = _current_user(x_forwarded_email)

    with get_cursor(commit=False) as cur:
        cur.execute("SELECT * FROM dpvm.products WHERE id = %s", (product_id,))
        existing = cur.fetchone()

    if not existing:
        raise HTTPException(status_code=404, detail="Product not found")
    if existing["status"] == DataProductStatus.DEPRECATED.value:
        raise HTTPException(status_code=400, detail="Product is already deprecated")

    current_yaml = get_config_content(existing["owning_domain"], existing["name"])
    if current_yaml:
        updated_yaml = deprecate_config(current_yaml)
        try:
            pr_url = update_product_pr(
                product_name=existing["name"],
                domain=existing["owning_domain"],
                yaml_content=updated_yaml,
                commit_message=f"dpvm: deprecate data product '{existing['name']}'",
                pr_title=f"[DPVM] Deprecate: {existing['name']}",
                pr_body=(
                    f"## Deprecation Request\n\n"
                    f"- **Product:** {existing['name']}\n"
                    f"- **Requested by:** {actor}\n\n"
                    f"This will revoke all access and mark the schema as deprecated."
                ),
            )
        except Exception as e:
            logger.error("Failed to create deprecation PR: %s", e)
            pr_url = existing.get("git_pr_url")
    else:
        pr_url = existing.get("git_pr_url")

    with get_cursor() as cur:
        cur.execute(
            """
            UPDATE dpvm.products
            SET status = %s, git_pr_url = COALESCE(%s, git_pr_url), updated_at = NOW()
            WHERE id = %s RETURNING *
            """,
            (DataProductStatus.DEPRECATED.value, pr_url, product_id),
        )
        row = cur.fetchone()

        cur.execute(
            "INSERT INTO dpvm.audit_log (product_id, action, actor_email, details) VALUES (%s, %s, %s, %s)",
            (product_id, "deprecate", actor, json.dumps({"pr_url": pr_url})),
        )

    return DataProductResponse(**row)
