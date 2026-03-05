"""Generates YAML config files from data product definitions."""

from __future__ import annotations

import yaml

from backend.models.data_product import DataProductCreate, catalog_name_for


def generate_config(product: DataProductCreate, created_by: str) -> str:
    catalog_name = catalog_name_for(product.owning_domain.value, product.environment.value)

    config = {
        "data_product": {
            "name": product.name,
            "display_name": product.display_name,
            "owning_domain": product.owning_domain.value,
            "environment": product.environment.value,
            "catalog": catalog_name,
            "schema": product.name,
            "classification": product.classification.value,
            "cost_center": product.cost_center,
            "description": product.description,
            "target_platform": product.target_platform.value,
            "created_by": created_by,
            "iam": {
                "owner_service_principal": f"spn-{product.name}",
                "groups": {
                    "read": f"{product.name}_read",
                    "write": f"{product.name}_write",
                },
                "members": {
                    "read": [],
                    "write": [],
                },
            },
            "compute": {
                "cluster_policy": product.cluster_policy,
                "sql_warehouse": product.sql_warehouse,
            },
            "tags": {
                "domain": product.owning_domain.value,
                "classification": product.classification.value,
                "cost_center": product.cost_center,
            },
            "status": "active",
        }
    }

    if product.target_platform.value == "snowflake" and product.snowflake_account_url:
        config["data_product"]["snowflake_account_url"] = product.snowflake_account_url
    if product.target_platform.value == "glue" and product.glue_catalog_arn:
        config["data_product"]["glue_catalog_arn"] = product.glue_catalog_arn

    return yaml.dump(config, default_flow_style=False, sort_keys=False)


def update_config_access(
    existing_yaml: str, access_level: str, member_email: str
) -> str:
    """Add a member to the read or write list in an existing config."""
    config = yaml.safe_load(existing_yaml)
    members_list = config["data_product"]["iam"]["members"][access_level]
    if member_email not in members_list:
        members_list.append(member_email)
    return yaml.dump(config, default_flow_style=False, sort_keys=False)


def deprecate_config(existing_yaml: str) -> str:
    """Mark a data product config as deprecated."""
    config = yaml.safe_load(existing_yaml)
    config["data_product"]["status"] = "deprecated"
    config["data_product"]["iam"]["members"]["read"] = []
    config["data_product"]["iam"]["members"]["write"] = []
    return yaml.dump(config, default_flow_style=False, sort_keys=False)
