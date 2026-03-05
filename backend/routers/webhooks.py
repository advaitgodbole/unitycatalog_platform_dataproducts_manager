"""Webhook endpoints -- receives callbacks from GitHub Actions on TF completion."""

from __future__ import annotations

import json
import logging

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel

from backend.db.connection import get_cursor
from backend.models.data_product import DataProductStatus

logger = logging.getLogger(__name__)
router = APIRouter()


class TerraformCallback(BaseModel):
    product_id: str
    status: str  # "success" or "failure"
    run_id: str | None = None
    details: str | None = None


@router.post("/github")
async def github_terraform_callback(
    body: TerraformCallback,
    x_webhook_secret: str | None = Header(None),
):
    if body.status == "success":
        new_status = DataProductStatus.ACTIVE.value
    else:
        new_status = DataProductStatus.FAILED.value

    with get_cursor() as cur:
        cur.execute(
            """
            UPDATE dpvm.products
            SET status = %s, terraform_run_id = COALESCE(%s, terraform_run_id), updated_at = NOW()
            WHERE id = %s
            RETURNING id, name
            """,
            (new_status, body.run_id, body.product_id),
        )
        row = cur.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Product not found")

        cur.execute(
            "INSERT INTO dpvm.audit_log (product_id, action, actor_email, details) VALUES (%s, %s, %s, %s)",
            (
                body.product_id,
                f"terraform_{body.status}",
                "github-actions",
                json.dumps({"run_id": body.run_id, "details": body.details}),
            ),
        )

    logger.info(
        "Terraform %s for product %s (%s)", body.status, row["name"], row["id"]
    )
    return {"status": "ok", "product_id": row["id"], "new_status": new_status}
