"""Database schema migrations for DPVM Lakebase Autoscaling Postgres."""

from __future__ import annotations

import logging

from backend.db.connection import get_cursor

logger = logging.getLogger(__name__)

MIGRATIONS: list[str] = [
    # V1: core tables
    """
    CREATE SCHEMA IF NOT EXISTS dpvm;
    """,
    """
    CREATE TABLE IF NOT EXISTS dpvm.products (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name            VARCHAR(64) NOT NULL UNIQUE,
        display_name    VARCHAR(128) NOT NULL,
        owning_domain   VARCHAR(32) NOT NULL,
        data_steward_email VARCHAR(256) NOT NULL,
        classification  VARCHAR(32) NOT NULL,
        cost_center     VARCHAR(32) NOT NULL,
        description     TEXT NOT NULL DEFAULT '',
        target_platform VARCHAR(32) NOT NULL DEFAULT 'databricks',
        status          VARCHAR(32) NOT NULL DEFAULT 'pending_approval',
        catalog_name    VARCHAR(128),
        schema_name     VARCHAR(128),
        git_pr_url      TEXT,
        terraform_run_id TEXT,
        created_by      VARCHAR(256) NOT NULL,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

        snowflake_account_url TEXT,
        glue_catalog_arn      TEXT,
        sql_warehouse         BOOLEAN NOT NULL DEFAULT FALSE,
        cluster_policy        VARCHAR(64) NOT NULL DEFAULT 'default'
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS dpvm.access_requests (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id      UUID NOT NULL REFERENCES dpvm.products(id),
        requester_email VARCHAR(256) NOT NULL,
        access_level    VARCHAR(16) NOT NULL,
        status          VARCHAR(16) NOT NULL DEFAULT 'pending',
        justification   TEXT NOT NULL DEFAULT '',
        approved_by     VARCHAR(256),
        reason          TEXT,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        resolved_at     TIMESTAMPTZ
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS dpvm.audit_log (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id  UUID,
        action      VARCHAR(64) NOT NULL,
        actor_email VARCHAR(256) NOT NULL,
        details     JSONB NOT NULL DEFAULT '{}',
        timestamp   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_products_domain ON dpvm.products(owning_domain);
    CREATE INDEX IF NOT EXISTS idx_products_status ON dpvm.products(status);
    CREATE INDEX IF NOT EXISTS idx_access_requests_product ON dpvm.access_requests(product_id);
    CREATE INDEX IF NOT EXISTS idx_access_requests_status ON dpvm.access_requests(status);
    CREATE INDEX IF NOT EXISTS idx_audit_log_product ON dpvm.audit_log(product_id);
    CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON dpvm.audit_log(timestamp);
    """,
    # V2: environment column for catalog suffix parameterisation
    """
    ALTER TABLE dpvm.products ADD COLUMN IF NOT EXISTS environment VARCHAR(16) NOT NULL DEFAULT 'dev';
    CREATE INDEX IF NOT EXISTS idx_products_environment ON dpvm.products(environment);
    """,
    # V2b: make (name, environment) unique instead of name alone
    """
    ALTER TABLE dpvm.products DROP CONSTRAINT IF EXISTS products_name_key;
    DO $$ BEGIN
        ALTER TABLE dpvm.products ADD CONSTRAINT products_name_env_key UNIQUE (name, environment);
    EXCEPTION WHEN duplicate_table THEN
        NULL;
    END $$;
    """,
]


def run_migrations():
    """Execute all migrations sequentially."""
    logger.info("Running database migrations...")
    with get_cursor() as cur:
        for i, migration in enumerate(MIGRATIONS):
            logger.info("Applying migration %d", i)
            cur.execute(migration)
    logger.info("All migrations applied successfully.")
