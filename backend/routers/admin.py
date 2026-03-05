"""Admin endpoints for platform credential management, user roles, and audit log."""

from __future__ import annotations

import json
import logging
import uuid

from fastapi import APIRouter, HTTPException, Header, Request

from backend.db.connection import get_cursor
from backend.models.admin import (
    AdminUserCreate,
    AdminUserListResponse,
    AdminUserResponse,
    AdminUserUpdate,
    AuditLogListResponse,
    AuditLogResponse,
    CredentialCreate,
    CredentialListResponse,
    CredentialResponse,
    CredentialUpdate,
    SystemOverview,
)

logger = logging.getLogger(__name__)
router = APIRouter()


def _current_user(request: Request) -> str:
    return getattr(request.state, "user_email", "anonymous@local")


# ---------------------------------------------------------------------------
# Platform Credentials
# ---------------------------------------------------------------------------


@router.get("/credentials", response_model=CredentialListResponse)
async def list_credentials(
    platform: str | None = None,
    environment: str | None = None,
):
    conditions: list[str] = []
    params: list = []

    if platform:
        conditions.append("platform = %s")
        params.append(platform)
    if environment:
        conditions.append("environment = %s")
        params.append(environment)

    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    with get_cursor(commit=False) as cur:
        cur.execute(
            f"SELECT COUNT(*) as total FROM dpvm.platform_credentials {where}",
            params,
        )
        total = cur.fetchone()["total"]

        cur.execute(
            f"SELECT * FROM dpvm.platform_credentials {where} ORDER BY platform, environment, credential_name",
            params,
        )
        rows = cur.fetchall()

    return CredentialListResponse(
        items=[CredentialResponse(**_mask_secrets(r)) for r in rows],
        total=total,
    )


@router.get("/credentials/{credential_id}", response_model=CredentialResponse)
async def get_credential(credential_id: uuid.UUID):
    with get_cursor(commit=False) as cur:
        cur.execute(
            "SELECT * FROM dpvm.platform_credentials WHERE id = %s",
            (credential_id,),
        )
        row = cur.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Credential not found")

    return CredentialResponse(**_mask_secrets(row))


@router.post("/credentials", response_model=CredentialResponse, status_code=201)
async def create_credential(body: CredentialCreate, request: Request):
    actor = _current_user(request)

    with get_cursor() as cur:
        cur.execute(
            """
            INSERT INTO dpvm.platform_credentials
                (platform, environment, credential_name, config, created_by)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING *
            """,
            (
                body.platform.value,
                body.environment.value,
                body.credential_name,
                json.dumps(body.config),
                actor,
            ),
        )
        row = cur.fetchone()

        cur.execute(
            "INSERT INTO dpvm.audit_log (action, actor_email, details) VALUES (%s, %s, %s)",
            (
                "credential_create",
                actor,
                json.dumps({
                    "credential_id": str(row["id"]),
                    "platform": body.platform.value,
                    "environment": body.environment.value,
                    "credential_name": body.credential_name,
                }),
            ),
        )

    return CredentialResponse(**_mask_secrets(row))


@router.patch("/credentials/{credential_id}", response_model=CredentialResponse)
async def update_credential(
    credential_id: uuid.UUID,
    body: CredentialUpdate,
    request: Request,
):
    actor = _current_user(request)

    with get_cursor(commit=False) as cur:
        cur.execute(
            "SELECT * FROM dpvm.platform_credentials WHERE id = %s",
            (credential_id,),
        )
        existing = cur.fetchone()

    if not existing:
        raise HTTPException(status_code=404, detail="Credential not found")

    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    if "config" in updates:
        updates["config"] = json.dumps(updates["config"])

    set_clauses = [f"{k} = %s" for k in updates]
    set_clauses.append("updated_at = NOW()")
    values = list(updates.values())
    values.append(credential_id)

    with get_cursor() as cur:
        cur.execute(
            f"UPDATE dpvm.platform_credentials SET {', '.join(set_clauses)} WHERE id = %s RETURNING *",
            values,
        )
        row = cur.fetchone()

        cur.execute(
            "INSERT INTO dpvm.audit_log (action, actor_email, details) VALUES (%s, %s, %s)",
            (
                "credential_update",
                actor,
                json.dumps({
                    "credential_id": str(credential_id),
                    "fields_updated": list(body.model_dump(exclude_none=True).keys()),
                }),
            ),
        )

    return CredentialResponse(**_mask_secrets(row))


@router.delete("/credentials/{credential_id}", status_code=204)
async def delete_credential(credential_id: uuid.UUID, request: Request):
    actor = _current_user(request)

    with get_cursor() as cur:
        cur.execute(
            "DELETE FROM dpvm.platform_credentials WHERE id = %s RETURNING id, platform, credential_name",
            (credential_id,),
        )
        row = cur.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Credential not found")

        cur.execute(
            "INSERT INTO dpvm.audit_log (action, actor_email, details) VALUES (%s, %s, %s)",
            (
                "credential_delete",
                actor,
                json.dumps({
                    "credential_id": str(credential_id),
                    "platform": row["platform"],
                    "credential_name": row["credential_name"],
                }),
            ),
        )


@router.post("/credentials/{credential_id}/test")
async def test_credential(credential_id: uuid.UUID, request: Request):
    """Connectivity test stub - validates that the credential config has required fields."""
    actor = _current_user(request)

    with get_cursor(commit=False) as cur:
        cur.execute(
            "SELECT * FROM dpvm.platform_credentials WHERE id = %s",
            (credential_id,),
        )
        row = cur.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Credential not found")

    platform = row["platform"]
    config = row["config"] if isinstance(row["config"], dict) else json.loads(row["config"])
    errors: list[str] = []

    required_keys = _platform_required_keys(platform)
    for key in required_keys:
        if key not in config or not config[key]:
            errors.append(f"Missing required field: {key}")

    success = len(errors) == 0

    with get_cursor() as cur:
        cur.execute(
            "INSERT INTO dpvm.audit_log (action, actor_email, details) VALUES (%s, %s, %s)",
            (
                "credential_test",
                actor,
                json.dumps({
                    "credential_id": str(credential_id),
                    "success": success,
                    "errors": errors,
                }),
            ),
        )

    return {"success": success, "errors": errors}


# ---------------------------------------------------------------------------
# User Role Management
# ---------------------------------------------------------------------------


@router.get("/users", response_model=AdminUserListResponse)
async def list_users(role: str | None = None):
    conditions: list[str] = []
    params: list = []

    if role:
        conditions.append("role = %s")
        params.append(role)

    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    with get_cursor(commit=False) as cur:
        cur.execute(f"SELECT COUNT(*) as total FROM dpvm.admin_users {where}", params)
        total = cur.fetchone()["total"]

        cur.execute(
            f"SELECT * FROM dpvm.admin_users {where} ORDER BY created_at DESC",
            params,
        )
        rows = cur.fetchall()

    return AdminUserListResponse(
        items=[AdminUserResponse(**r) for r in rows],
        total=total,
    )


@router.post("/users", response_model=AdminUserResponse, status_code=201)
async def create_user(body: AdminUserCreate, request: Request):
    actor = _current_user(request)

    with get_cursor() as cur:
        cur.execute("SELECT id FROM dpvm.admin_users WHERE email = %s", (body.email,))
        if cur.fetchone():
            raise HTTPException(status_code=409, detail="User already exists")

        cur.execute(
            """
            INSERT INTO dpvm.admin_users (email, role, granted_by)
            VALUES (%s, %s, %s)
            RETURNING *
            """,
            (body.email, body.role.value, actor),
        )
        row = cur.fetchone()

        cur.execute(
            "INSERT INTO dpvm.audit_log (action, actor_email, details) VALUES (%s, %s, %s)",
            (
                "user_create",
                actor,
                json.dumps({"email": body.email, "role": body.role.value}),
            ),
        )

    return AdminUserResponse(**row)


@router.patch("/users/{user_id}", response_model=AdminUserResponse)
async def update_user(user_id: uuid.UUID, body: AdminUserUpdate, request: Request):
    actor = _current_user(request)

    with get_cursor() as cur:
        cur.execute(
            "UPDATE dpvm.admin_users SET role = %s, updated_at = NOW() WHERE id = %s RETURNING *",
            (body.role.value, user_id),
        )
        row = cur.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="User not found")

        cur.execute(
            "INSERT INTO dpvm.audit_log (action, actor_email, details) VALUES (%s, %s, %s)",
            (
                "user_role_update",
                actor,
                json.dumps({
                    "user_id": str(user_id),
                    "email": row["email"],
                    "new_role": body.role.value,
                }),
            ),
        )

    return AdminUserResponse(**row)


@router.delete("/users/{user_id}", status_code=204)
async def delete_user(user_id: uuid.UUID, request: Request):
    actor = _current_user(request)

    with get_cursor() as cur:
        cur.execute(
            "DELETE FROM dpvm.admin_users WHERE id = %s RETURNING email",
            (user_id,),
        )
        row = cur.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="User not found")

        cur.execute(
            "INSERT INTO dpvm.audit_log (action, actor_email, details) VALUES (%s, %s, %s)",
            (
                "user_delete",
                actor,
                json.dumps({"user_id": str(user_id), "email": row["email"]}),
            ),
        )


# ---------------------------------------------------------------------------
# Audit Log
# ---------------------------------------------------------------------------


@router.get("/audit-log", response_model=AuditLogListResponse)
async def list_audit_log(
    action: str | None = None,
    actor: str | None = None,
    limit: int = 100,
    offset: int = 0,
):
    conditions: list[str] = []
    params: list = []

    if action:
        conditions.append("action = %s")
        params.append(action)
    if actor:
        conditions.append("actor_email ILIKE %s")
        params.append(f"%{actor}%")

    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    with get_cursor(commit=False) as cur:
        cur.execute(f"SELECT COUNT(*) as total FROM dpvm.audit_log {where}", params)
        total = cur.fetchone()["total"]

        cur.execute(
            f"SELECT * FROM dpvm.audit_log {where} ORDER BY timestamp DESC LIMIT %s OFFSET %s",
            [*params, limit, offset],
        )
        rows = cur.fetchall()

    return AuditLogListResponse(
        items=[AuditLogResponse(**r) for r in rows],
        total=total,
    )


# ---------------------------------------------------------------------------
# System Overview
# ---------------------------------------------------------------------------


@router.get("/overview", response_model=SystemOverview)
async def system_overview():
    with get_cursor(commit=False) as cur:
        cur.execute("SELECT COUNT(*) as c FROM dpvm.products")
        total_products = cur.fetchone()["c"]

        cur.execute("SELECT COUNT(*) as c FROM dpvm.products WHERE status = 'active'")
        active_products = cur.fetchone()["c"]

        cur.execute("SELECT COUNT(*) as c FROM dpvm.products WHERE status = 'pending_approval'")
        pending_products = cur.fetchone()["c"]

        cur.execute("SELECT COUNT(*) as c FROM dpvm.products WHERE status = 'failed'")
        failed_products = cur.fetchone()["c"]

        cur.execute("SELECT COUNT(*) as c FROM dpvm.access_requests")
        total_access = cur.fetchone()["c"]

        cur.execute("SELECT COUNT(*) as c FROM dpvm.access_requests WHERE status = 'pending'")
        pending_access = cur.fetchone()["c"]

        cur.execute("SELECT COUNT(*) as c FROM dpvm.platform_credentials")
        total_creds = cur.fetchone()["c"]

        cur.execute("SELECT COUNT(*) as c FROM dpvm.platform_credentials WHERE is_active = TRUE")
        active_creds = cur.fetchone()["c"]

        cur.execute("SELECT COUNT(*) as c FROM dpvm.admin_users")
        total_users = cur.fetchone()["c"]

        cur.execute(
            "SELECT platform, COUNT(*) as c FROM dpvm.platform_credentials GROUP BY platform"
        )
        creds_by_platform = {row["platform"]: row["c"] for row in cur.fetchall()}

    return SystemOverview(
        total_products=total_products,
        active_products=active_products,
        pending_products=pending_products,
        failed_products=failed_products,
        total_access_requests=total_access,
        pending_access_requests=pending_access,
        total_credentials=total_creds,
        active_credentials=active_creds,
        total_users=total_users,
        credentials_by_platform=creds_by_platform,
    )


# ---------------------------------------------------------------------------
# Settings / Config (read-only view of non-secret config)
# ---------------------------------------------------------------------------


@router.get("/settings")
async def get_settings():
    from backend.config import get_settings as _get_settings, IS_DATABRICKS_APP

    s = _get_settings()
    return {
        "app_env": s.app_env,
        "app_title": s.app_title,
        "is_databricks_app": IS_DATABRICKS_APP,
        "has_lakebase": s.has_lakebase,
        "databricks_host": s.databricks_host or "(not set)",
        "github_repo": s.github_repo or "(not set)",
        "github_base_branch": s.github_base_branch,
        "cors_origins": s.cors_origins,
    }


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


_SECRET_KEYS = {"password", "token", "secret", "secret_key", "api_key", "private_key"}


def _mask_secrets(row: dict) -> dict:
    """Mask sensitive values in the config JSONB so they're never returned in full."""
    row = dict(row)
    config = row.get("config")
    if config and isinstance(config, dict):
        masked = {}
        for k, v in config.items():
            if any(sk in k.lower() for sk in _SECRET_KEYS) and v:
                masked[k] = f"{'*' * 4}{str(v)[-4:]}" if len(str(v)) > 4 else "****"
            else:
                masked[k] = v
        row["config"] = masked
    return row


def _platform_required_keys(platform: str) -> list[str]:
    """Return required config keys per platform for validation."""
    if platform == "databricks":
        return ["host", "token"]
    if platform == "snowflake":
        return ["account_url", "username", "password", "warehouse", "database"]
    if platform == "glue":
        return ["aws_region", "aws_access_key_id", "aws_secret_access_key", "catalog_id"]
    return []
