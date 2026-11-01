"""Schema mapping, reflection, relationship, and transaction tests."""

from __future__ import annotations

from uuid import uuid4

import pytest
from geoalchemy2 import Geography
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncSession

from app.domain.models import Base, User, UserRole
from app.infrastructure.schema_audit import audit_schema


def test_all_24_tables_are_mapped() -> None:
    assert len(Base.metadata.tables) == 24
    assert {table.name for table in Base.metadata.tables.values()} == {
        "users",
        "user_roles",
        "refresh_sessions",
        "partners",
        "partner_memberships",
        "destinations",
        "places",
        "place_media",
        "service_offers",
        "inventory_slots",
        "itineraries",
        "itinerary_items",
        "ai_generation_logs",
        "booking_quotes",
        "booking_quote_items",
        "bookings",
        "booking_items",
        "inventory_holds",
        "payment_attempts",
        "payment_events",
        "vouchers",
        "idempotency_requests",
        "audit_logs",
        "outbox_events",
    }


def test_critical_composite_keys_are_mapped() -> None:
    bookings = Base.metadata.tables["adora.bookings"]
    booking_items = Base.metadata.tables["adora.booking_items"]
    holds = Base.metadata.tables["adora.inventory_holds"]

    booking_fk_columns = {tuple(fk.column_keys) for fk in bookings.foreign_key_constraints}
    item_fk_columns = {tuple(fk.column_keys) for fk in booking_items.foreign_key_constraints}
    hold_fk_columns = {tuple(fk.column_keys) for fk in holds.foreign_key_constraints}

    assert ("quote_id", "user_id") in booking_fk_columns
    assert ("booking_id", "quote_id") in item_fk_columns
    assert ("quote_item_id", "quote_id", "inventory_slot_id") in item_fk_columns
    assert ("booking_item_id", "inventory_slot_id") in hold_fk_columns


def test_postgis_and_computed_columns_are_mapped() -> None:
    destinations = Base.metadata.tables["adora.destinations"]
    places = Base.metadata.tables["adora.places"]
    quote_items = Base.metadata.tables["adora.booking_quote_items"]

    assert isinstance(destinations.c.center.type, Geography)
    assert destinations.c.center.type.srid == 4326
    assert isinstance(places.c.location.type, Geography)
    assert places.c.location.type.geometry_type == "POINT"
    assert quote_items.c.line_total_vnd.computed is not None
    assert quote_items.c.line_total_vnd.computed.persisted is True


@pytest.mark.asyncio
async def test_live_schema_has_zero_meaningful_drift(
    database_connection: AsyncConnection,
) -> None:
    result = await audit_schema(database_connection)
    assert result.table_count == 24
    assert result.revision == "0001_adora"
    assert result.checked_columns == 198
    assert result.checked_foreign_keys == 4


@pytest.mark.asyncio
async def test_insert_query_and_relationship_loading(db_session: AsyncSession) -> None:
    marker = uuid4().hex
    user = User(
        email=f"phase11-orm-{marker}@example.invalid",
        password_hash="not-a-real-login-hash",
        display_name="ORM Fixture",
    )
    user.roles.append(UserRole(role="traveler"))
    async with db_session.begin():
        db_session.add(user)
        await db_session.flush()

    db_session.expunge_all()
    result = await db_session.execute(select(User).where(User.id == user.id))
    loaded = result.scalar_one()
    await db_session.refresh(loaded, ["roles"])
    assert [role.role for role in loaded.roles] == ["traveler"]


@pytest.mark.asyncio
async def test_application_transaction_rollback(db_session: AsyncSession) -> None:
    marker = uuid4().hex
    email = f"phase11-rollback-{marker}@example.invalid"
    with pytest.raises(RuntimeError, match="rollback sentinel"):
        async with db_session.begin():
            db_session.add(
                User(
                    email=email,
                    password_hash="not-a-real-login-hash",
                    display_name="Rollback Fixture",
                )
            )
            await db_session.flush()
            raise RuntimeError("rollback sentinel")

    result = await db_session.execute(select(User).where(User.email == email))
    assert result.scalar_one_or_none() is None


@pytest.mark.asyncio
async def test_database_email_normalization_constraint_is_enforced(
    db_session: AsyncSession,
) -> None:
    with pytest.raises(IntegrityError):
        async with db_session.begin():
            db_session.add(
                User(
                    email=f"UPPER-{uuid4().hex}@example.com",
                    password_hash="unused",
                    display_name="Invalid Email Fixture",
                )
            )
            await db_session.flush()
