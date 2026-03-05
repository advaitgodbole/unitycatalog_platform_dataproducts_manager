from __future__ import annotations

import os
from functools import lru_cache

from pydantic_settings import BaseSettings

IS_DATABRICKS_APP = bool(os.environ.get("DATABRICKS_APP_NAME"))


class Settings(BaseSettings):
    app_env: str = "development"

    # Databricks
    databricks_host: str = ""
    databricks_token: str = ""
    databricks_warehouse_id: str = ""
    databricks_profile: str = "e2-demo-field-eng"

    # GitHub (GitOps)
    github_token: str = ""
    github_repo: str = ""
    github_base_branch: str = "main"

    # Lakebase Autoscaling Postgres (individual PG vars injected by Databricks Apps)
    pghost: str = ""
    pgport: str = "5432"
    pgdatabase: str = "postgres"
    pguser: str = ""

    # Fallback DSN for fully custom local setups
    lakebase_dsn: str = ""

    # App
    app_title: str = "Data Product Vending Machine"
    cors_origins: list[str] = ["*"]

    model_config = {"env_prefix": "", "env_file": ".env", "extra": "ignore"}

    @property
    def has_lakebase(self) -> bool:
        return bool(self.pghost) or bool(self.lakebase_dsn)


def get_workspace_client():
    from databricks.sdk import WorkspaceClient

    if IS_DATABRICKS_APP:
        return WorkspaceClient()
    settings = get_settings()
    if settings.databricks_token:
        return WorkspaceClient(
            host=settings.databricks_host, token=settings.databricks_token
        )
    return WorkspaceClient(profile=settings.databricks_profile)


def get_oauth_token() -> str:
    """Get an OAuth token for Lakebase authentication."""
    client = get_workspace_client()
    auth_headers = client.config.authenticate()
    if auth_headers and "Authorization" in auth_headers:
        return auth_headers["Authorization"].replace("Bearer ", "")
    raise RuntimeError("Failed to obtain OAuth token for Lakebase")


@lru_cache
def get_local_user_email() -> str:
    """Resolve the current user's email from the Databricks workspace via SCIM.

    Uses the SDK's existing auth (CLI profile or token). Called once and
    cached for the lifetime of the process.
    """
    try:
        client = get_workspace_client()
        me = client.current_user.me()
        return me.user_name or "anonymous@local"
    except Exception:
        return "anonymous@local"


@lru_cache
def get_settings() -> Settings:
    return Settings()
