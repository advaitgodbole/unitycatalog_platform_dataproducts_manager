"""CRUD endpoints for ODCS data contracts on data products."""

from __future__ import annotations

import json
import logging
import uuid

from fastapi import APIRouter, HTTPException, Header
from fastapi.responses import Response

from backend.db.connection import get_cursor
from backend.models.data_contract import (
    ContractStatus,
    DataContractCreate,
    DataContractListResponse,
    DataContractResponse,
    DataContractUpdate,
)
from backend.services.contract_service import export_odcs_yaml, validate_contract_schema

logger = logging.getLogger(__name__)
router = APIRouter()


def _current_user(x_forwarded_email: str | None = Header(None)) -> str:
    return x_forwarded_email or "anonymous@local"


def _row_to_response(row: dict) -> DataContractResponse:
    """Convert a DB row dict into a DataContractResponse, parsing JSONB fields."""
    data = dict(row)
    for field in (
        "description_custom_properties",
        "description_authoritative_definitions",
        "schema_definition",
        "servers",
        "sla_properties",
        "quality_rules",
        "custom_properties",
    ):
        val = data.get(field)
        if isinstance(val, str):
            data[field] = json.loads(val)

    price_amount = data.pop("price_amount", None)
    price_currency = data.pop("price_currency", None)
    price_unit = data.pop("price_unit", None)
    if price_amount is not None:
        data["price"] = {
            "priceAmount": float(price_amount),
            "priceCurrency": price_currency or "USD",
            "priceUnit": price_unit or "monthly",
        }
    else:
        data["price"] = None

    return DataContractResponse(**data)


def _product_exists(product_id: uuid.UUID) -> dict:
    with get_cursor(commit=False) as cur:
        cur.execute("SELECT * FROM dpvm.products WHERE id = %s", (product_id,))
        row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Product not found")
    return dict(row)


@router.get("", response_model=DataContractListResponse)
async def list_contracts(product_id: uuid.UUID):
    _product_exists(product_id)
    with get_cursor(commit=False) as cur:
        cur.execute(
            "SELECT * FROM dpvm.data_contracts WHERE product_id = %s ORDER BY created_at DESC",
            (product_id,),
        )
        rows = cur.fetchall()
    return DataContractListResponse(
        items=[_row_to_response(r) for r in rows],
        total=len(rows),
    )


@router.get("/latest", response_model=DataContractResponse)
async def get_latest_contract(product_id: uuid.UUID):
    _product_exists(product_id)
    with get_cursor(commit=False) as cur:
        cur.execute(
            """SELECT * FROM dpvm.data_contracts
               WHERE product_id = %s AND status = %s
               ORDER BY created_at DESC LIMIT 1""",
            (product_id, ContractStatus.ACTIVE.value),
        )
        row = cur.fetchone()
    if not row:
        with get_cursor(commit=False) as cur:
            cur.execute(
                """SELECT * FROM dpvm.data_contracts
                   WHERE product_id = %s
                   ORDER BY created_at DESC LIMIT 1""",
                (product_id,),
            )
            row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="No contract found for this product")
    return _row_to_response(row)


@router.post("", response_model=DataContractResponse, status_code=201)
async def create_contract(
    product_id: uuid.UUID,
    body: DataContractCreate,
    x_forwarded_email: str | None = Header(None),
):
    product = _product_exists(product_id)
    actor = _current_user(x_forwarded_email)

    schema_errors = validate_contract_schema(
        [t.model_dump(by_alias=True) for t in body.schema_definition]
    )
    if schema_errors:
        raise HTTPException(status_code=422, detail={"schema_errors": schema_errors})

    with get_cursor() as cur:
        cur.execute(
            """
            INSERT INTO dpvm.data_contracts
                (product_id, version, status,
                 description_purpose, description_usage, description_limitations,
                 description_custom_properties, description_authoritative_definitions,
                 schema_definition, servers, sla_properties, quality_rules,
                 price_amount, price_currency, price_unit,
                 custom_properties, created_by)
            VALUES (%s,%s,%s, %s,%s,%s, %s,%s, %s,%s,%s,%s, %s,%s,%s, %s,%s)
            RETURNING *
            """,
            (
                product_id,
                body.version,
                ContractStatus.DRAFT.value,
                body.description_purpose,
                body.description_usage,
                body.description_limitations,
                json.dumps([cp.model_dump() for cp in body.description_custom_properties]),
                json.dumps([ad.model_dump() for ad in body.description_authoritative_definitions]),
                json.dumps([t.model_dump(by_alias=True) for t in body.schema_definition]),
                json.dumps([s.model_dump(by_alias=True) for s in body.servers]),
                json.dumps([sp.model_dump() for sp in body.sla_properties]),
                json.dumps([qr.model_dump(by_alias=True) for qr in body.quality_rules]),
                body.price.price_amount if body.price else 0,
                body.price.price_currency if body.price else "USD",
                body.price.price_unit if body.price else "monthly",
                json.dumps([cp.model_dump() for cp in body.custom_properties]),
                actor,
            ),
        )
        row = cur.fetchone()

        cur.execute(
            "INSERT INTO dpvm.audit_log (product_id, action, actor_email, details) VALUES (%s, %s, %s, %s)",
            (product_id, "create_contract", actor, json.dumps({"version": body.version})),
        )

    return _row_to_response(row)


@router.put("/{contract_id}", response_model=DataContractResponse)
async def update_contract(
    product_id: uuid.UUID,
    contract_id: uuid.UUID,
    body: DataContractUpdate,
    x_forwarded_email: str | None = Header(None),
):
    _product_exists(product_id)
    actor = _current_user(x_forwarded_email)

    with get_cursor(commit=False) as cur:
        cur.execute(
            "SELECT * FROM dpvm.data_contracts WHERE id = %s AND product_id = %s",
            (contract_id, product_id),
        )
        existing = cur.fetchone()

    if not existing:
        raise HTTPException(status_code=404, detail="Contract not found")
    if existing["status"] != ContractStatus.DRAFT.value:
        raise HTTPException(status_code=400, detail="Only draft contracts can be edited")

    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    if "schema_definition" in updates:
        schema_errors = validate_contract_schema(
            [t if isinstance(t, dict) else t.model_dump(by_alias=True) for t in updates["schema_definition"]]
        )
        if schema_errors:
            raise HTTPException(status_code=422, detail={"schema_errors": schema_errors})

    set_clauses = []
    values: list = []

    jsonb_fields = {
        "description_custom_properties",
        "description_authoritative_definitions",
        "schema_definition",
        "servers",
        "sla_properties",
        "quality_rules",
        "custom_properties",
    }

    for key, val in updates.items():
        if key == "price":
            price_data = val if isinstance(val, dict) else val.model_dump(by_alias=True)
            set_clauses.append("price_amount = %s")
            values.append(price_data.get("priceAmount", price_data.get("price_amount", 0)))
            set_clauses.append("price_currency = %s")
            values.append(price_data.get("priceCurrency", price_data.get("price_currency", "USD")))
            set_clauses.append("price_unit = %s")
            values.append(price_data.get("priceUnit", price_data.get("price_unit", "monthly")))
        elif key in jsonb_fields:
            set_clauses.append(f"{key} = %s")
            serialized = []
            for item in val:
                if isinstance(item, dict):
                    serialized.append(item)
                else:
                    serialized.append(item.model_dump(by_alias=True))
            values.append(json.dumps(serialized))
        else:
            set_clauses.append(f"{key} = %s")
            values.append(val)

    set_clauses.append("updated_at = NOW()")
    values.append(contract_id)
    values.append(product_id)

    with get_cursor() as cur:
        cur.execute(
            f"UPDATE dpvm.data_contracts SET {', '.join(set_clauses)} WHERE id = %s AND product_id = %s RETURNING *",
            values,
        )
        row = cur.fetchone()

        cur.execute(
            "INSERT INTO dpvm.audit_log (product_id, action, actor_email, details) VALUES (%s, %s, %s, %s)",
            (product_id, "update_contract", actor, json.dumps({"contract_id": str(contract_id)})),
        )

    return _row_to_response(row)


@router.post("/{contract_id}/activate", response_model=DataContractResponse)
async def activate_contract(
    product_id: uuid.UUID,
    contract_id: uuid.UUID,
    x_forwarded_email: str | None = Header(None),
):
    _product_exists(product_id)
    actor = _current_user(x_forwarded_email)

    with get_cursor(commit=False) as cur:
        cur.execute(
            "SELECT * FROM dpvm.data_contracts WHERE id = %s AND product_id = %s",
            (contract_id, product_id),
        )
        contract = cur.fetchone()

    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    if contract["status"] != ContractStatus.DRAFT.value:
        raise HTTPException(status_code=400, detail="Only draft contracts can be activated")

    with get_cursor() as cur:
        cur.execute(
            "UPDATE dpvm.data_contracts SET status = %s, updated_at = NOW() WHERE product_id = %s AND status = %s",
            (ContractStatus.DEPRECATED.value, product_id, ContractStatus.ACTIVE.value),
        )
        cur.execute(
            "UPDATE dpvm.data_contracts SET status = %s, updated_at = NOW() WHERE id = %s RETURNING *",
            (ContractStatus.ACTIVE.value, contract_id),
        )
        row = cur.fetchone()

        cur.execute(
            "INSERT INTO dpvm.audit_log (product_id, action, actor_email, details) VALUES (%s, %s, %s, %s)",
            (product_id, "activate_contract", actor, json.dumps({"contract_id": str(contract_id), "version": row["version"]})),
        )

    return _row_to_response(row)


@router.get("/{contract_id}/export")
async def export_contract(product_id: uuid.UUID, contract_id: uuid.UUID):
    product = _product_exists(product_id)

    with get_cursor(commit=False) as cur:
        cur.execute(
            "SELECT * FROM dpvm.data_contracts WHERE id = %s AND product_id = %s",
            (contract_id, product_id),
        )
        row = cur.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Contract not found")

    contract_resp = _row_to_response(row)
    yaml_content = export_odcs_yaml(product, contract_resp)

    return Response(
        content=yaml_content,
        media_type="application/x-yaml",
        headers={
            "Content-Disposition": f'attachment; filename="{product["name"]}_contract_v{contract_resp.version}.yaml"'
        },
    )
