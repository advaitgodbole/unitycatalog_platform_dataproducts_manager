"""ODCS v3.1.0 YAML export and contract validation."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import yaml

from backend.models.data_contract import (
    ContractSchemaColumn,
    ContractSchemaTable,
    DataContractResponse,
    QualityRule,
    SLAProperty,
    ServerDefinition,
)


def _quality_rule_to_dict(rule: QualityRule) -> dict[str, Any]:
    d: dict[str, Any] = {"type": rule.type, "description": rule.description}
    if rule.metric:
        d["metric"] = rule.metric
    if rule.must_be is not None:
        d["mustBe"] = rule.must_be
    if rule.must_be_greater_than is not None:
        d["mustBeGreaterThan"] = rule.must_be_greater_than
    if rule.must_be_less_than is not None:
        d["mustBeLessThan"] = rule.must_be_less_than
    if rule.arguments:
        d["arguments"] = rule.arguments
    return d


def _column_to_dict(col: ContractSchemaColumn) -> dict[str, Any]:
    d: dict[str, Any] = {
        "name": col.name,
        "logicalType": col.logical_type.value,
        "physicalType": col.physical_type,
        "description": col.description,
    }
    if col.business_name:
        d["businessName"] = col.business_name
    if col.required:
        d["required"] = True
    if col.primary_key:
        d["primaryKey"] = True
    if col.unique:
        d["unique"] = True
    if col.classification:
        d["classification"] = col.classification
    if col.critical_data_element:
        d["criticalDataElement"] = True
    if col.examples:
        d["examples"] = col.examples
    if col.tags:
        d["tags"] = col.tags
    if col.logical_type_options:
        opts: dict[str, Any] = {}
        if col.logical_type_options.min_length is not None:
            opts["minLength"] = col.logical_type_options.min_length
        if col.logical_type_options.max_length is not None:
            opts["maxLength"] = col.logical_type_options.max_length
        if col.logical_type_options.minimum is not None:
            opts["minimum"] = col.logical_type_options.minimum
        if col.logical_type_options.maximum is not None:
            opts["maximum"] = col.logical_type_options.maximum
        if col.logical_type_options.format:
            opts["format"] = col.logical_type_options.format
        if opts:
            d["logicalTypeOptions"] = opts
    if col.quality:
        d["quality"] = [_quality_rule_to_dict(q) for q in col.quality]
    if col.relationships:
        d["relationships"] = [
            {"type": r.type, "to": r.to} for r in col.relationships
        ]
    if col.authoritative_definitions:
        d["authoritativeDefinitions"] = [
            {"url": a.url, "type": a.type, "description": a.description}
            for a in col.authoritative_definitions
        ]
    return d


def _table_to_dict(table: ContractSchemaTable) -> dict[str, Any]:
    d: dict[str, Any] = {
        "name": table.name,
        "physicalType": table.physical_type,
        "description": table.description,
        "properties": [_column_to_dict(c) for c in table.properties],
    }
    if table.quality:
        d["quality"] = [_quality_rule_to_dict(q) for q in table.quality]
    return d


def _server_to_dict(s: ServerDefinition) -> dict[str, Any]:
    d: dict[str, Any] = {
        "server": s.server,
        "environment": s.environment,
        "type": s.type,
    }
    if s.host:
        d["host"] = s.host
    if s.port:
        d["port"] = s.port
    if s.database:
        d["database"] = s.database
    if s.schema_name:
        d["schema"] = s.schema_name
    return d


def export_odcs_yaml(
    product: dict[str, Any],
    contract: DataContractResponse,
) -> str:
    """Build a complete ODCS v3.1.0 YAML document from product + contract."""

    doc: dict[str, Any] = {
        "apiVersion": "v3.1.0",
        "kind": "DataContract",
        "id": product["name"],
        "name": product["display_name"],
        "version": contract.version,
        "status": contract.status.value,
    }

    # description
    desc: dict[str, Any] = {}
    if contract.description_purpose:
        desc["purpose"] = contract.description_purpose
    if contract.description_usage:
        desc["usage"] = contract.description_usage
    if contract.description_limitations:
        desc["limitations"] = contract.description_limitations
    if contract.description_custom_properties:
        desc["customProperties"] = [
            {"property": cp.property, "value": cp.value, "description": cp.description}
            for cp in contract.description_custom_properties
        ]
    if contract.description_authoritative_definitions:
        desc["authoritativeDefinitions"] = [
            {"url": ad.url, "type": ad.type, "description": ad.description}
            for ad in contract.description_authoritative_definitions
        ]
    if desc:
        doc["description"] = desc

    # schema
    if contract.schema_definition:
        doc["schema"] = [_table_to_dict(t) for t in contract.schema_definition]

    # servers -- merge contract-level servers with product defaults
    servers_out: list[dict[str, Any]] = []
    if contract.servers:
        servers_out = [_server_to_dict(s) for s in contract.servers]
    else:
        default_server: dict[str, Any] = {
            "server": product.get("environment", "prod"),
            "environment": product.get("environment", "prod"),
            "type": product.get("target_platform", "databricks"),
        }
        if product.get("catalog_name"):
            default_server["database"] = product["catalog_name"]
        if product.get("schema_name"):
            default_server["schema"] = product["schema_name"]
        if product.get("snowflake_account_url"):
            default_server["host"] = product["snowflake_account_url"]
            default_server["type"] = "snowflake"
        servers_out = [default_server]
    doc["servers"] = servers_out

    # team (auto-derived from product)
    team: dict[str, Any] = {
        "name": product.get("owning_domain", ""),
        "description": f"Owned by the {product.get('owning_domain', '')} domain",
        "members": [],
    }
    if product.get("data_steward_email"):
        team["members"].append(
            {"username": product["data_steward_email"], "role": "Owner"}
        )
    if product.get("created_by"):
        team["members"].append(
            {"username": product["created_by"], "role": "Creator"}
        )
    doc["team"] = team

    # roles (auto-derived from product IAM naming)
    product_name = product["name"]
    doc["roles"] = [
        {"role": f"{product_name}_read", "description": "Read access to the data product"},
        {"role": f"{product_name}_write", "description": "Write access to the data product"},
    ]

    # slaProperties
    if contract.sla_properties:
        sla_out = []
        for sp in contract.sla_properties:
            entry: dict[str, Any] = {"property": sp.property, "value": sp.value}
            if sp.unit:
                entry["unit"] = sp.unit
            if sp.description:
                entry["description"] = sp.description
            sla_out.append(entry)
        doc["slaProperties"] = sla_out

    # price
    if contract.price:
        doc["price"] = {
            "priceAmount": contract.price.price_amount,
            "priceCurrency": contract.price.price_currency,
            "priceUnit": contract.price.price_unit,
        }

    # tags (auto-derived + contract custom)
    tags = [
        product.get("owning_domain", ""),
        product.get("classification", ""),
    ]
    if product.get("cost_center"):
        tags.append(product["cost_center"])
    doc["tags"] = [t for t in tags if t]

    # top-level customProperties
    if contract.custom_properties:
        doc["customProperties"] = [
            {"property": cp.property, "value": cp.value}
            for cp in contract.custom_properties
        ]

    doc["contractCreatedTs"] = contract.created_at.astimezone(timezone.utc).isoformat()

    return yaml.dump(doc, default_flow_style=False, sort_keys=False, allow_unicode=True)


def validate_contract_schema(schema_definition: list[dict]) -> list[str]:
    """Return a list of validation error messages (empty = valid)."""
    errors: list[str] = []
    if not schema_definition:
        return errors
    table_names: set[str] = set()
    for i, table in enumerate(schema_definition):
        name = table.get("name", "")
        if not name:
            errors.append(f"Table {i}: name is required")
        if name in table_names:
            errors.append(f"Table {i}: duplicate table name '{name}'")
        table_names.add(name)

        col_names: set[str] = set()
        for j, col in enumerate(table.get("properties", [])):
            cname = col.get("name", "")
            if not cname:
                errors.append(f"Table '{name}' column {j}: name is required")
            if cname in col_names:
                errors.append(f"Table '{name}': duplicate column name '{cname}'")
            col_names.add(cname)
    return errors
