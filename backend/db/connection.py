"""Lakebase Autoscaling Postgres connection with credential refresh."""

from __future__ import annotations

import logging
import time
from contextlib import contextmanager
from typing import Generator

import psycopg2
import psycopg2.extras

from backend.config import IS_DATABRICKS_APP, get_settings

logger = logging.getLogger(__name__)

psycopg2.extras.register_uuid()

_token_cache: dict = {"token": None, "username": None, "expires_at": 0}

LAKEBASE_CREDENTIAL_ENDPOINT = "projects/advait-apps/branches/production/endpoints/primary"


def _get_lakebase_credential() -> tuple[str, str]:
    """Get a Lakebase Autoscaling credential via the REST API.

    In Databricks Apps: SDK auto-authenticates via service principal.
    Locally: SDK authenticates via CLI profile.
    """
    now = time.time()
    if _token_cache["token"] and now < _token_cache["expires_at"]:
        return _token_cache["token"], _token_cache["username"]

    logger.info("Refreshing Lakebase credential")
    settings = get_settings()
    from backend.config import get_workspace_client

    w = get_workspace_client()
    import httpx

    host = w.config.host.rstrip("/")
    headers = w.config.authenticate()

    resp = httpx.post(
        f"{host}/api/2.0/postgres/credentials",
        headers=headers,
        json={"endpoint": LAKEBASE_CREDENTIAL_ENDPOINT},
    )
    resp.raise_for_status()
    data = resp.json()

    lb_token = data["token"]
    username = settings.pguser

    _token_cache["token"] = lb_token
    _token_cache["username"] = username
    _token_cache["expires_at"] = now + (55 * 60)
    return lb_token, username


def get_connection():
    settings = get_settings()

    if settings.lakebase_dsn:
        return psycopg2.connect(settings.lakebase_dsn)

    token, username = _get_lakebase_credential()
    return psycopg2.connect(
        host=settings.pghost,
        port=int(settings.pgport),
        dbname=settings.pgdatabase,
        user=username,
        password=token,
        sslmode="require",
    )


@contextmanager
def get_cursor(commit: bool = True) -> Generator:
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            yield cur
            if commit:
                conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
