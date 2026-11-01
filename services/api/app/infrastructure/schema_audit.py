"""Meaningful ORM-to-PostgreSQL compatibility checks for the ADORA baseline."""

from __future__ import annotations

from collections.abc import Collection
from dataclasses import dataclass
from typing import Any

from geoalchemy2 import Geography
from sqlalchemy import Connection, inspect, text
from sqlalchemy.ext.asyncio import AsyncConnection

from app.domain.models import SCHEMA_NAME, Base

EXPECTED_REVISION = "0001_adora"
EXPECTED_TABLE_COUNT = 24

CRITICAL_FOREIGN_KEYS: dict[str, set[tuple[tuple[str, ...], str, tuple[str, ...]]]] = {
    "bookings": {
        (("quote_id", "user_id"), "booking_quotes", ("id", "user_id")),
    },
    "booking_items": {
        (("booking_id", "quote_id"), "bookings", ("id", "quote_id")),
        (
            ("quote_item_id", "quote_id", "inventory_slot_id"),
            "booking_quote_items",
            ("id", "quote_id", "inventory_slot_id"),
        ),
    },
    "inventory_holds": {
        (("booking_item_id", "inventory_slot_id"), "booking_items", ("id", "inventory_slot_id")),
    },
}

CRITICAL_PARTIAL_INDEXES = {
    "uq_users_email_ci",
    "ix_refresh_sessions_user_active",
    "ix_places_destination_category",
    "ix_inventory_offer_date",
    "ix_bookings_status_expiry",
    "ix_holds_expiring",
    "ix_holds_slot_active",
    "uq_one_settled_payment_per_booking",
    "uq_gateway_transaction",
    "ix_outbox_pending",
}


class SchemaDriftError(RuntimeError):
    """Raised when reflected PostgreSQL structures diverge from ORM metadata."""

    def __init__(self, findings: Collection[str]) -> None:
        self.findings = tuple(findings)
        super().__init__("Schema drift detected:\n- " + "\n- ".join(self.findings))


@dataclass(frozen=True)
class SchemaAuditResult:
    table_count: int
    revision: str
    checked_columns: int
    checked_foreign_keys: int
    checked_partial_indexes: int


def _type_family(value: Any) -> type[Any]:
    return value._type_affinity  # type: ignore[no-any-return]


def _audit_sync(connection: Connection) -> SchemaAuditResult:
    inspector = inspect(connection)
    findings: list[str] = []
    model_tables = {table.name: table for table in Base.metadata.tables.values()}
    database_tables = set(inspector.get_table_names(schema=SCHEMA_NAME))

    if database_tables != set(model_tables):
        missing_tables = sorted(set(model_tables) - database_tables)
        unexpected = sorted(database_tables - set(model_tables))
        findings.append(f"table set differs; missing={missing_tables}, unexpected={unexpected}")
    if len(model_tables) != EXPECTED_TABLE_COUNT:
        findings.append(
            f"metadata maps {len(model_tables)} tables, expected {EXPECTED_TABLE_COUNT}"
        )

    checked_columns = 0
    for table_name, model_table in model_tables.items():
        if table_name not in database_tables:
            continue
        reflected_columns = {
            column["name"]: column
            for column in inspector.get_columns(table_name, schema=SCHEMA_NAME)
        }
        if set(reflected_columns) != set(model_table.columns.keys()):
            findings.append(f"{table_name}: column names differ")
            continue
        for model_column in model_table.columns:
            reflected = reflected_columns[model_column.name]
            checked_columns += 1
            # PostgreSQL reports generated columns as nullable even though their
            # expression is non-null for rows accepted by the baseline checks.
            if (
                bool(reflected["nullable"]) != bool(model_column.nullable)
                and model_column.name != "line_total_vnd"
            ):
                findings.append(f"{table_name}.{model_column.name}: nullability differs")
            if _type_family(reflected["type"]) is not _type_family(model_column.type):
                findings.append(
                    f"{table_name}.{model_column.name}: type differs "
                    f"({reflected['type']} vs {model_column.type})"
                )
            model_generated = model_column.server_default is not None
            reflected_generated = reflected.get("default") is not None or reflected.get("computed")
            if model_generated != bool(reflected_generated):
                findings.append(
                    f"{table_name}.{model_column.name}: generated/default state differs"
                )

        model_pk = tuple(column.name for column in model_table.primary_key.columns)
        reflected_pk = tuple(
            inspector.get_pk_constraint(table_name, schema=SCHEMA_NAME)["constrained_columns"]
        )
        if model_pk != reflected_pk:
            findings.append(f"{table_name}: primary key differs ({model_pk} vs {reflected_pk})")

    checked_foreign_keys = 0
    for table_name, expected_keys in CRITICAL_FOREIGN_KEYS.items():
        reflected_keys = {
            (
                tuple(item["constrained_columns"]),
                item["referred_table"],
                tuple(item["referred_columns"]),
            )
            for item in inspector.get_foreign_keys(table_name, schema=SCHEMA_NAME)
        }
        checked_foreign_keys += len(expected_keys)
        missing_keys = expected_keys - reflected_keys
        if missing_keys:
            findings.append(f"{table_name}: missing critical foreign keys {sorted(missing_keys)}")

    all_indexes: dict[str, Any] = {}
    for table_name in database_tables:
        for reflected_index in inspector.get_indexes(table_name, schema=SCHEMA_NAME):
            reflected_name = reflected_index["name"]
            if reflected_name is not None:
                all_indexes[reflected_name] = reflected_index
    for index_name in CRITICAL_PARTIAL_INDEXES:
        index_info: Any = all_indexes.get(index_name)
        if index_info is None:
            findings.append(f"missing critical index {index_name}")
            continue
        if index_name == "uq_users_email_ci":
            if not index_info.get("unique"):
                findings.append("uq_users_email_ci is not unique")
            continue
        predicate = index_info.get("dialect_options", {}).get("postgresql_where")
        if not predicate:
            findings.append(f"{index_name} is not reflected as a partial index")

    for table_name, column_name in (("destinations", "center"), ("places", "location")):
        column = next(
            item
            for item in inspector.get_columns(table_name, schema=SCHEMA_NAME)
            if item["name"] == column_name
        )
        column_type = column["type"]
        if not isinstance(column_type, Geography):
            findings.append(f"{table_name}.{column_name} is not Geography")
        elif column_type.geometry_type != "POINT" or column_type.srid != 4326:
            findings.append(f"{table_name}.{column_name} geography attributes differ")

    for table_name in ("booking_quote_items", "booking_items"):
        line_total = next(
            item
            for item in inspector.get_columns(table_name, schema=SCHEMA_NAME)
            if item["name"] == "line_total_vnd"
        )
        computed: Any = line_total.get("computed") or {}
        expression = str(computed.get("sqltext", "")).replace(" ", "")
        if "quantity" not in expression or "unit_price_vnd" not in expression:
            findings.append(f"{table_name}.line_total_vnd computed expression differs")

    revision = connection.execute(text("SELECT version_num FROM alembic_version")).scalar_one()
    if revision != EXPECTED_REVISION:
        findings.append(f"Alembic revision is {revision}, expected {EXPECTED_REVISION}")

    if findings:
        raise SchemaDriftError(findings)
    return SchemaAuditResult(
        table_count=len(database_tables),
        revision=revision,
        checked_columns=checked_columns,
        checked_foreign_keys=checked_foreign_keys,
        checked_partial_indexes=len(CRITICAL_PARTIAL_INDEXES),
    )


async def audit_schema(connection: AsyncConnection) -> SchemaAuditResult:
    """Reflect PostgreSQL and fail on meaningful baseline incompatibilities."""

    return await connection.run_sync(_audit_sync)
