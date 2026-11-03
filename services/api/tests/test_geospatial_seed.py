"""Real PostGIS nearby-search and deterministic demo-seed tests."""

from __future__ import annotations

from uuid import UUID

import httpx
import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.models.catalog import Destination, Place
from app.modules.catalog.seed import demo_uuid, seed_demo_catalog
from app.modules.catalog.service import geography_point


@pytest.mark.asyncio
async def test_nearby_search_filters_sorts_bounds_and_uses_gist(
    api_client: httpx.AsyncClient,
    db_session: AsyncSession,
) -> None:
    destination_id = UUID("a1200000-0000-4000-8000-000000000001")
    near_ids = [
        UUID("a1200000-0000-4000-8000-000000000010"),
        UUID("a1200000-0000-4000-8000-000000000011"),
    ]
    outside_id = UUID("a1200000-0000-4000-8000-000000000099")
    async with db_session.begin():
        db_session.add(
            Destination(
                id=destination_id,
                slug="phase12-spatial-destination",
                name="Phase 1.2 Spatial Destination",
                center=geography_point(108.4583, 11.9404),
                status="active",
            )
        )
        db_session.add_all(
            [
                Place(
                    id=near_id,
                    destination_id=destination_id,
                    slug=f"phase12-near-{index}",
                    name=f"Near Place {index}",
                    category="attraction",
                    location=geography_point(108.4583, 11.9404),
                    status="active",
                )
                for index, near_id in enumerate(near_ids)
            ]
            + [
                Place(
                    id=outside_id,
                    destination_id=destination_id,
                    slug="phase12-outside-radius",
                    name="Outside Radius",
                    category="attraction",
                    location=geography_point(108.60, 12.10),
                    status="active",
                )
            ]
        )

    response = await api_client.get(
        "/api/v1/places/nearby",
        params={
            "latitude": 11.9404,
            "longitude": 108.4583,
            "radius_meters": 3000,
            "destination_id": str(destination_id),
            "category": "attraction",
            "limit": 20,
        },
    )
    assert response.status_code == 200
    items = response.json()["items"]
    assert [item["id"] for item in items] == [str(value) for value in near_ids]
    assert all(item["distance_meters"] == pytest.approx(0, abs=0.01) for item in items)
    assert str(outside_id) not in response.text
    assert response.json()["distance_semantics"] == "straight-line geodesic distance"

    await db_session.execute(text("SET LOCAL enable_seqscan = off"))
    plan_rows = await db_session.execute(
        text(
            """
            EXPLAIN (COSTS OFF)
            SELECT id
            FROM adora.places
            WHERE ST_DWithin(
                location,
                ST_SetSRID(ST_MakePoint(108.4583, 11.9404), 4326)::geography,
                3000
            )
            """
        )
    )
    plan = "\n".join(row[0] for row in plan_rows)
    assert "ix_places_location_gist" in plan


@pytest.mark.asyncio
async def test_nearby_search_rejects_invalid_inputs(api_client: httpx.AsyncClient) -> None:
    invalid_latitude = await api_client.get(
        "/api/v1/places/nearby",
        params={"latitude": 91, "longitude": 108.45, "radius_meters": 1000},
    )
    invalid_longitude = await api_client.get(
        "/api/v1/places/nearby",
        params={"latitude": 11.94, "longitude": 181, "radius_meters": 1000},
    )
    invalid_radius = await api_client.get(
        "/api/v1/places/nearby",
        params={"latitude": 11.94, "longitude": 108.45, "radius_meters": 50001},
    )
    invalid_category = await api_client.get(
        "/api/v1/places/nearby",
        params={
            "latitude": 11.94,
            "longitude": 108.45,
            "radius_meters": 1000,
            "category": "cafe",
        },
    )
    invalid_limit = await api_client.get(
        "/api/v1/places/nearby",
        params={"latitude": 11.94, "longitude": 108.45, "radius_meters": 1000, "limit": 101},
    )
    assert {
        invalid_latitude.status_code,
        invalid_longitude.status_code,
        invalid_radius.status_code,
        invalid_category.status_code,
        invalid_limit.status_code,
    } == {422}


@pytest.mark.asyncio
async def test_demo_seed_is_additive_and_idempotent(db_session: AsyncSession) -> None:
    first = await seed_demo_catalog(db_session)
    second = await seed_demo_catalog(db_session)

    assert first.created + first.existing == 12
    assert second.created == 0
    assert second.existing == 12
    destination = await db_session.get(Destination, demo_uuid("destination/da-lat"))
    assert destination is not None
    assert destination.name == "Da Lat (Demonstration Catalog)"
