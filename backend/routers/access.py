"""Access request endpoints -- request, approve/deny access to data products."""

from __future__ import annotations

import json
import logging
import uuid

from fastapi import APIRouter, HTTPException, Header

from backend.db.connection import get_cursor
from backend.models.access_request import (
    AccessRequestCreate,
    AccessRequestDecision,
    AccessRequestListResponse,
    AccessRequestResponse,
)
from backend.services.config_generator import update_config_access
from backend.services.git_service import get_config_content, update_product_pr

logger = logging.getLogger(__name__)
router = APIRouter()


def _current_user(x_forwarded_email: str | None = Header(None)) -> str:
    return x_forwarded_email or "anonymous@local"


@router.post("", response_model=AccessRequestResponse, status_code=201)
async def request_access(
    body: AccessRequestCreate,
    x_forwarded_email: str | None = Header(None),
):
    actor = _current_user(x_forwarded_email)

    with get_cursor(commit=False) as cur:
        cur.execute("SELECT * FROM dpvm.products WHERE id = %s", (body.product_id,))
        product = cur.fetchone()

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    with get_cursor() as cur:
        cur.execute(
            """
            INSERT INTO dpvm.access_requests
                (product_id, requester_email, access_level, justification)
            VALUES (%s, %s, %s, %s)
            RETURNING *
            """,
            (body.product_id, actor, body.access_level.value, body.justification),
        )
        row = cur.fetchone()

        cur.execute(
            "INSERT INTO dpvm.audit_log (product_id, action, actor_email, details) VALUES (%s, %s, %s, %s)",
            (
                body.product_id,
                "access_request",
                actor,
                json.dumps({"access_level": body.access_level.value}),
            ),
        )

    return AccessRequestResponse(**row, product_name=product["name"])


@router.get("", response_model=AccessRequestListResponse)
async def list_access_requests(
    product_id: uuid.UUID | None = None,
    status: str | None = None,
):
    conditions = []
    params: list = []

    if product_id:
        conditions.append("ar.product_id = %s")
        params.append(product_id)
    if status:
        conditions.append("ar.status = %s")
        params.append(status)

    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    with get_cursor(commit=False) as cur:
        cur.execute(
            f"""
            SELECT ar.*, p.name as product_name
            FROM dpvm.access_requests ar
            JOIN dpvm.products p ON ar.product_id = p.id
            {where}
            ORDER BY ar.created_at DESC
            """,
            params,
        )
        rows = cur.fetchall()

    return AccessRequestListResponse(
        items=[AccessRequestResponse(**r) for r in rows], total=len(rows)
    )


@router.post("/{request_id}/approve", response_model=AccessRequestResponse)
async def decide_access_request(
    request_id: uuid.UUID,
    body: AccessRequestDecision,
    x_forwarded_email: str | None = Header(None),
):
    actor = _current_user(x_forwarded_email)

    with get_cursor(commit=False) as cur:
        cur.execute(
            """
            SELECT ar.*, p.name as product_name, p.owning_domain
            FROM dpvm.access_requests ar
            JOIN dpvm.products p ON ar.product_id = p.id
            WHERE ar.id = %s
            """,
            (request_id,),
        )
        row = cur.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Access request not found")
    if row["status"] != "pending":
        raise HTTPException(status_code=400, detail="Request already resolved")

    new_status = "approved" if body.approved else "denied"

    if body.approved:
        current_yaml = get_config_content(row["owning_domain"], row["product_name"])
        if current_yaml:
            updated_yaml = update_config_access(
                current_yaml, row["access_level"], row["requester_email"]
            )
            try:
                update_product_pr(
                    product_name=row["product_name"],
                    domain=row["owning_domain"],
                    yaml_content=updated_yaml,
                    commit_message=f"dpvm: grant {row['access_level']} access to {row['requester_email']}",
                    pr_title=f"[DPVM] Grant {row['access_level']} on {row['product_name']} to {row['requester_email']}",
                    pr_body=(
                        f"## Access Grant\n\n"
                        f"- **Product:** {row['product_name']}\n"
                        f"- **User:** {row['requester_email']}\n"
                        f"- **Level:** {row['access_level']}\n"
                        f"- **Approved by:** {actor}\n"
                    ),
                )
            except Exception as e:
                logger.error("Failed to create access grant PR: %s", e)

    with get_cursor() as cur:
        cur.execute(
            """
            UPDATE dpvm.access_requests
            SET status = %s, approved_by = %s, reason = %s, resolved_at = NOW()
            WHERE id = %s
            RETURNING *
            """,
            (new_status, actor, body.reason, request_id),
        )
        updated = cur.fetchone()

        cur.execute(
            "INSERT INTO dpvm.audit_log (product_id, action, actor_email, details) VALUES (%s, %s, %s, %s)",
            (
                row["product_id"],
                f"access_{new_status}",
                actor,
                json.dumps(
                    {
                        "requester": row["requester_email"],
                        "access_level": row["access_level"],
                        "reason": body.reason,
                    }
                ),
            ),
        )

    return AccessRequestResponse(**updated, product_name=row["product_name"])
