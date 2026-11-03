"""Destination, place, media, and public visibility integration tests."""

from __future__ import annotations

from uuid import uuid4

import httpx
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from tests.catalog_helpers import create_test_user, destination_payload, place_payload


@pytest.mark.asyncio
async def test_destination_admin_crud_visibility_and_conflicts(
    api_client: httpx.AsyncClient,
    db_session: AsyncSession,
) -> None:
    _admin, headers = await create_test_user(db_session, "admin")
    slug = f"phase12-destination-{uuid4().hex}"

    anonymous = await api_client.post(
        "/api/v1/admin/destinations", json=destination_payload(slug=slug)
    )
    created = await api_client.post(
        "/api/v1/admin/destinations",
        json=destination_payload(slug=slug, status="hidden"),
        headers=headers,
    )
    duplicate = await api_client.post(
        "/api/v1/admin/destinations",
        json=destination_payload(slug=slug),
        headers=headers,
    )

    assert anonymous.status_code == 401
    assert created.status_code == 201
    destination_id = created.json()["id"]
    assert duplicate.status_code == 409

    hidden_detail = await api_client.get(f"/api/v1/destinations/{destination_id}")
    hidden_list = await api_client.get("/api/v1/destinations")
    admin_list = await api_client.get("/api/v1/admin/destinations", headers=headers)
    assert hidden_detail.status_code == 404
    assert destination_id not in {item["id"] for item in hidden_list.json()["items"]}
    assert destination_id in {item["id"] for item in admin_list.json()["items"]}

    published = await api_client.patch(
        f"/api/v1/admin/destinations/{destination_id}",
        json={"status": "active", "name": "Published Phase 1.2 Destination"},
        headers=headers,
    )
    detail = await api_client.get(f"/api/v1/destinations/{destination_id}")
    assert published.status_code == 200
    assert detail.status_code == 200
    assert detail.json()["name"] == "Published Phase 1.2 Destination"


@pytest.mark.asyncio
async def test_place_crud_filter_validation_and_public_visibility(
    api_client: httpx.AsyncClient,
    db_session: AsyncSession,
) -> None:
    _admin, headers = await create_test_user(db_session, "admin")
    destination = await api_client.post(
        "/api/v1/admin/destinations", json=destination_payload(), headers=headers
    )
    destination_id = destination.json()["id"]
    slug = f"phase12-place-{uuid4().hex}"

    created = await api_client.post(
        "/api/v1/admin/places",
        json=place_payload(destination_id, slug=slug),
        headers=headers,
    )
    assert created.status_code == 201
    place_id = created.json()["id"]
    assert created.json()["longitude"] == pytest.approx(108.459)
    assert created.json()["latitude"] == pytest.approx(11.941)

    duplicate = await api_client.post(
        "/api/v1/admin/places",
        json=place_payload(destination_id, slug=slug),
        headers=headers,
    )
    invalid_coordinates = await api_client.post(
        "/api/v1/admin/places",
        json={**place_payload(destination_id), "latitude": 91},
        headers=headers,
    )
    missing_destination = await api_client.post(
        "/api/v1/admin/places",
        json=place_payload(str(uuid4())),
        headers=headers,
    )
    assert duplicate.status_code == 409
    assert invalid_coordinates.status_code == 422
    assert missing_destination.status_code == 404

    filtered = await api_client.get(
        "/api/v1/places",
        params={
            "destination_id": destination_id,
            "category": "attraction",
            "search": "Phase 1.2",
        },
    )
    assert filtered.status_code == 200
    assert place_id in {item["id"] for item in filtered.json()["items"]}

    archived = await api_client.patch(
        f"/api/v1/admin/places/{place_id}",
        json={"status": "archived"},
        headers=headers,
    )
    public_detail = await api_client.get(f"/api/v1/places/{place_id}")
    assert archived.status_code == 200
    assert public_detail.status_code == 404


@pytest.mark.asyncio
async def test_place_media_metadata_lifecycle(
    api_client: httpx.AsyncClient,
    db_session: AsyncSession,
) -> None:
    _admin, headers = await create_test_user(db_session, "admin")
    destination = await api_client.post(
        "/api/v1/admin/destinations", json=destination_payload(), headers=headers
    )
    place = await api_client.post(
        "/api/v1/admin/places",
        json=place_payload(destination.json()["id"]),
        headers=headers,
    )
    place_id = place.json()["id"]

    media = await api_client.post(
        f"/api/v1/admin/places/{place_id}/media",
        json={"media_key": "demo://phase12/cover", "media_kind": "image", "sort_order": 2},
        headers=headers,
    )
    assert media.status_code == 201
    media_id = media.json()["id"]

    duplicate = await api_client.post(
        f"/api/v1/admin/places/{place_id}/media",
        json={"media_key": "demo://phase12/cover", "media_kind": "image"},
        headers=headers,
    )
    listed = await api_client.get(f"/api/v1/places/{place_id}/media")
    updated = await api_client.patch(
        f"/api/v1/admin/place-media/{media_id}",
        json={"sort_order": 0},
        headers=headers,
    )
    removed = await api_client.delete(
        f"/api/v1/admin/place-media/{media_id}", headers=headers
    )
    listed_after = await api_client.get(f"/api/v1/places/{place_id}/media")

    assert duplicate.status_code == 409
    assert [item["id"] for item in listed.json()] == [media_id]
    assert updated.json()["sort_order"] == 0
    assert removed.status_code == 204
    assert listed_after.json() == []
