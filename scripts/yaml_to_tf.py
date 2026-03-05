#!/usr/bin/env python3
"""Convert YAML data product configs into Terraform .tfvars.json files.

Usage:
    python scripts/yaml_to_tf.py [--config-dir configs] [--output-dir terraform/data-products]

For each YAML file found under config-dir (recursively, skipping _template.yaml),
produces a corresponding .tfvars.json consumed by the data-product Terraform module.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import yaml


def yaml_to_tfvars(config: dict) -> dict:
    """Transform a data product YAML config into Terraform variable values."""
    dp = config["data_product"]

    tfvars = {
        "product_name": dp["name"],
        "display_name": dp["display_name"],
        "owning_domain": dp["owning_domain"],
        "environment": dp.get("environment", "dev"),
        "catalog_name": dp["catalog"],
        "schema_name": dp["schema"],
        "classification": dp["classification"],
        "cost_center": dp["cost_center"],
        "description": dp.get("description", ""),
        "target_platform": dp.get("target_platform", "databricks"),
        "status": dp.get("status", "active"),
        "service_principal_name": dp["iam"]["owner_service_principal"],
        "read_group_name": dp["iam"]["groups"]["read"],
        "write_group_name": dp["iam"]["groups"]["write"],
        "read_members": dp["iam"]["members"].get("read", []),
        "write_members": dp["iam"]["members"].get("write", []),
        "cluster_policy": dp["compute"].get("cluster_policy", "default"),
        "sql_warehouse": dp["compute"].get("sql_warehouse", False),
        "tags": dp.get("tags", {}),
    }

    if dp.get("snowflake_account_url"):
        tfvars["snowflake_account_url"] = dp["snowflake_account_url"]
    if dp.get("glue_catalog_arn"):
        tfvars["glue_catalog_arn"] = dp["glue_catalog_arn"]

    return tfvars


def main():
    parser = argparse.ArgumentParser(description="Convert YAML configs to TF vars")
    parser.add_argument("--config-dir", default="configs", help="YAML config directory")
    parser.add_argument("--output-dir", default="terraform/data-products", help="Output tfvars directory")
    args = parser.parse_args()

    config_dir = Path(args.config_dir)
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    yaml_files = [
        f for f in config_dir.rglob("*.yaml")
        if f.name != "_template.yaml"
    ]

    if not yaml_files:
        print("No YAML configs found. Nothing to generate.")
        return

    for yaml_file in yaml_files:
        print(f"Processing: {yaml_file}")
        with open(yaml_file) as fh:
            config = yaml.safe_load(fh)

        if not config or "data_product" not in config:
            print(f"  Skipping {yaml_file} -- missing data_product key")
            continue

        tfvars = yaml_to_tfvars(config)
        product_name = tfvars["product_name"]
        output_file = output_dir / f"{product_name}.tfvars.json"

        with open(output_file, "w") as fh:
            json.dump(tfvars, fh, indent=2)

        print(f"  -> {output_file}")

    print(f"\nGenerated {len(yaml_files)} tfvars file(s).")


if __name__ == "__main__":
    main()
