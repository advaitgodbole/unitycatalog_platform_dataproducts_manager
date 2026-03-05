"""Authentication and RBAC middleware for the DPVM backend.

Extracts the authenticated user from Databricks App OAuth headers.
Enforces role-based access on protected endpoints.
"""

from __future__ import annotations

import logging
from enum import Enum

from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import Response

logger = logging.getLogger(__name__)


class Role(str, Enum):
    PRODUCER = "producer"
    STEWARD = "steward"
    ADMIN = "admin"


ROLE_DISPLAY: dict[Role, str] = {
    Role.PRODUCER: "Data Engineer",
    Role.STEWARD: "Data Steward",
    Role.ADMIN: "Platform Admin",
}


ROLE_PERMISSIONS: dict[Role, set[str]] = {
    Role.PRODUCER: {
        "GET /api/me",
        "POST /api/products",
        "GET /api/products",
        "GET /api/products/{id}",
        "PATCH /api/products/{id}",
        "POST /api/access",
        "GET /api/access",
        "GET /api/catalog/catalogs",
        "GET /api/catalog/schemas",
        "GET /api/health",
    },
    Role.STEWARD: {
        "GET /api/me",
        "POST /api/products",
        "GET /api/products",
        "GET /api/products/{id}",
        "PATCH /api/products/{id}",
        "POST /api/products/{id}/deprecate",
        "POST /api/access",
        "GET /api/access",
        "POST /api/access/{id}/approve",
        "GET /api/catalog/catalogs",
        "GET /api/catalog/schemas",
        "GET /api/catalog/schemas/{catalog_name}/{schema_name}",
        "GET /api/health",
    },
    Role.ADMIN: {"*"},
}


def _resolve_role(_email: str) -> Role:
    """Resolve user role from email. In production, look up from a groups/directory service."""
    return Role.ADMIN


def _matches_permission(method: str, path: str, permissions: set[str]) -> bool:
    if "*" in permissions:
        return True
    exact = f"{method} {path}"
    if exact in permissions:
        return True
    for perm in permissions:
        perm_method, perm_path = perm.split(" ", 1)
        if perm_method != method:
            continue
        perm_parts = perm_path.strip("/").split("/")
        path_parts = path.strip("/").split("/")
        if len(perm_parts) != len(path_parts):
            continue
        if all(
            pp.startswith("{") or pp == rp
            for pp, rp in zip(perm_parts, path_parts)
        ):
            return True
    return False


class AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        if request.url.path.startswith("/api/docs") or request.url.path.startswith("/api/openapi"):
            return await call_next(request)

        if request.url.path == "/api/health":
            return await call_next(request)

        if request.url.path == "/api/webhooks/github":
            return await call_next(request)

        if not request.url.path.startswith("/api/"):
            return await call_next(request)

        email = (
            request.headers.get("x-forwarded-email")
            or request.headers.get("x-forwarded-user")
            or "anonymous@local"
        )

        request.state.user_email = email
        role = _resolve_role(email)
        request.state.user_role = role

        permissions = ROLE_PERMISSIONS.get(role, set())
        if not _matches_permission(request.method, request.url.path, permissions):
            logger.warning(
                "RBAC denied: %s %s for %s (role=%s)",
                request.method,
                request.url.path,
                email,
                role.value,
            )
            raise HTTPException(status_code=403, detail="Insufficient permissions")

        return await call_next(request)
