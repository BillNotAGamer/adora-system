"""Partner membership, ownership, and service-offer integration tests."""

from __future__ import annotations

from uuid import uuid4

import httpx
import pytest
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncSession

from app.domain.models.catalog import ServiceOffer
from app.domain.models.identity import User
from tests.catalog_helpers import create_test_user, destination_payload, place_payload


async def create_partner(
    client: httpx.AsyncClient,
    headers: dict[str, str],
    name: str,
) -> str:
    response = await client.post(
        "/api/v1/admin/partners",
        json={
            "legal_name": f"{name} Legal Company",
            "public_name": name,
            "status": "approved",
        },
        headers=headers,
    )
    assert response.status_code == 201
    return response.json()["id"]


@pytest.mark.asyncio
async def test_admin_partner_and_membership_management_is_restricted(
    api_client: httpx.AsyncClient,
    db_session: AsyncSession,
) -> None:
    admin, admin_headers = await create_test_user(db_session, "admin")
    traveler, traveler_headers = await create_test_user(db_session, "traveler")
    partner_id = await create_partner(api_client, admin_headers, "Phase 1.2 Partner")

    denied_create = await api_client.post(
        "/api/v1/admin/partners",
        json={"legal_name": "Denied", "public_name": "Denied"},
        headers=traveler_headers,
    )
    self_escalation = await api_client.put(
        f"/api/v1/admin/partners/{partner_id}/members/{traveler.id}",
        json={"membership_role": "owner"},
        headers=traveler_headers,
    )
    assigned = await api_client.put(
        f"/api/v1/admin/partners/{partner_id}/members/{traveler.id}",
        json={"membership_role": "owner"},
        headers=admin_headers,
    )
    assert admin.id != traveler.id
    assert denied_create.status_code == 403
    assert self_escalation.status_code == 403
    assert assigned.status_code == 200

    # Roles are reloaded from PostgreSQL; a newly issued token has no trusted role payload.
    _same_user, partner_headers = traveler, traveler_headers
    mine = await api_client.get("/api/v1/partners/me", headers=partner_headers)
    updated = await api_client.patch(
        f"/api/v1/partners/{partner_id}",
        json={"public_name": "Partner Managed Name"},
        headers=partner_headers,
    )
    status_escalation = await api_client.patch(
        f"/api/v1/partners/{partner_id}",
        json={"status": "approved"},
        headers=partner_headers,
    )
    assert mine.status_code == 200
    assert mine.json()["memberships"][0]["partner_id"] == partner_id
    assert updated.status_code == 200
    assert updated.json()["public_name"] == "Partner Managed Name"
    assert status_escalation.status_code == 422


@pytest.mark.asyncio
async def test_partner_offer_ownership_visibility_and_transaction_rollback(
    api_client: httpx.AsyncClient,
    db_session: AsyncSession,
) -> None:
    _admin, admin_headers = await create_test_user(db_session, "admin")
    owner, owner_headers = await create_test_user(db_session, "traveler")
    outsider, outsider_headers = await create_test_user(db_session, "traveler")
    owned_partner = await create_partner(api_client, admin_headers, "Owned Partner")
    other_partner = await create_partner(api_client, admin_headers, "Other Partner")
    await api_client.put(
        f"/api/v1/admin/partners/{owned_partner}/members/{owner.id}",
        json={"membership_role": "owner"},
        headers=admin_headers,
    )
    await api_client.put(
        f"/api/v1/admin/partners/{other_partner}/members/{outsider.id}",
        json={"membership_role": "owner"},
        headers=admin_headers,
    )
    destination = await api_client.post(
        "/api/v1/admin/destinations", json=destination_payload(), headers=admin_headers
    )
    place = await api_client.post(
        "/api/v1/admin/places",
        json=place_payload(destination.json()["id"]),
        headers=admin_headers,
    )
    place_id = place.json()["id"]
    offer_payload = {
        "place_id": place_id,
        "title": "Phase 1.2 Experience",
        "kind": "experience",
        "base_price_vnd": 350000,
        "attributes": {"phase": "1.2"},
        "status": "active",
    }

    created = await api_client.post(
        f"/api/v1/partners/{owned_partner}/offers",
        json=offer_payload,
        headers=owner_headers,
    )
    assert created.status_code == 201
    offer_id = created.json()["id"]
    assert isinstance(created.json()["base_price_vnd"], int)
    draft = await api_client.post(
        f"/api/v1/partners/{owned_partner}/offers",
        json={**offer_payload, "title": "Private Draft", "status": "draft"},
        headers=owner_headers,
    )
    admin_override = await api_client.post(
        f"/api/v1/partners/{other_partner}/offers",
        json={**offer_payload, "title": "Admin Override Offer"},
        headers=admin_headers,
    )
    assert draft.status_code == 201
    assert admin_override.status_code == 201

    cross_read = await api_client.get(
        f"/api/v1/partners/{other_partner}/offers", headers=owner_headers
    )
    cross_update = await api_client.patch(
        f"/api/v1/partners/{other_partner}/offers/{offer_id}",
        json={"title": "Cross-partner attempt"},
        headers=owner_headers,
    )
    traveler_denied = await api_client.post(
        f"/api/v1/partners/{owned_partner}/offers",
        json=offer_payload,
        headers=outsider_headers,
    )
    assert cross_read.status_code == 403
    assert cross_update.status_code == 403
    assert traveler_denied.status_code == 403

    public = await api_client.get("/api/v1/offers", params={"partner_id": owned_partner})
    private = await api_client.get(
        f"/api/v1/partners/{owned_partner}/offers", headers=owner_headers
    )
    assert [item["id"] for item in public.json()["items"]] == [offer_id]
    assert {item["id"] for item in private.json()["items"]} == {
        offer_id,
        draft.json()["id"],
    }

    before = await db_session.scalar(select(func.count()).select_from(ServiceOffer))
    invalid_fk = await api_client.post(
        f"/api/v1/partners/{owned_partner}/offers",
        json={**offer_payload, "place_id": str(uuid4()), "title": "Must Roll Back"},
        headers=owner_headers,
    )
    invalid_price = await api_client.post(
        f"/api/v1/partners/{owned_partner}/offers",
        json={**offer_payload, "base_price_vnd": -1},
        headers=owner_headers,
    )
    after = await db_session.scalar(select(func.count()).select_from(ServiceOffer))
    assert invalid_fk.status_code == 404
    assert invalid_price.status_code == 422
    assert after == before


@pytest.mark.asyncio
async def test_staff_and_suspended_partner_users_cannot_mutate(
    api_client: httpx.AsyncClient,
    db_session: AsyncSession,
    database_connection: AsyncConnection,
) -> None:
    _admin, admin_headers = await create_test_user(db_session, "admin")
    staff, staff_headers = await create_test_user(db_session, "traveler")
    partner_id = await create_partner(api_client, admin_headers, "Staff Scoped Partner")
    await api_client.put(
        f"/api/v1/admin/partners/{partner_id}/members/{staff.id}",
        json={"membership_role": "staff"},
        headers=admin_headers,
    )

    staff_update = await api_client.patch(
        f"/api/v1/partners/{partner_id}",
        json={"public_name": "Denied Staff Update"},
        headers=staff_headers,
    )
    assert staff_update.status_code == 403

    await database_connection.execute(
        update(User).where(User.id == staff.id).values(status="suspended")
    )
    suspended_read = await api_client.get(
        f"/api/v1/partners/{partner_id}/offers", headers=staff_headers
    )
    assert suspended_read.status_code == 403
