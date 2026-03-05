"""Terraform service -- triggers GitHub Actions workflows and tracks runs."""

from __future__ import annotations

import logging

from github import Github

from backend.config import get_settings

logger = logging.getLogger(__name__)


def _repo():
    settings = get_settings()
    g = Github(settings.github_token)
    return g.get_repo(settings.github_repo)


def trigger_apply_workflow(product_name: str, product_id: str) -> str | None:
    """Dispatch the terraform-apply workflow via GitHub API. Returns the run URL if successful."""
    repo = _repo()
    settings = get_settings()

    try:
        workflow = repo.get_workflow("terraform-apply.yml")
        success = workflow.create_dispatch(
            ref=settings.github_base_branch,
            inputs={
                "product_name": product_name,
                "product_id": product_id,
            },
        )
        if success:
            logger.info("Dispatched terraform-apply for product %s", product_name)
            return f"https://github.com/{settings.github_repo}/actions"
        return None
    except Exception as e:
        logger.error("Failed to dispatch workflow: %s", e)
        return None


def get_workflow_runs(workflow_name: str = "terraform-apply.yml", count: int = 10) -> list[dict]:
    """List recent workflow runs."""
    repo = _repo()
    try:
        workflow = repo.get_workflow(workflow_name)
        runs = workflow.get_runs()[:count]
        return [
            {
                "id": run.id,
                "status": run.status,
                "conclusion": run.conclusion,
                "created_at": str(run.created_at),
                "html_url": run.html_url,
            }
            for run in runs
        ]
    except Exception as e:
        logger.error("Failed to fetch workflow runs: %s", e)
        return []
