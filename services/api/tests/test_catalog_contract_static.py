"""Catalog transport contracts verified without a database or external mutation."""

import httpx
import pytest

from app.main import app
from app.modules.catalog.schemas import DestinationListResponse, OfferListResponse


def test_catalog_openapi_registration_and_response_models() -> None:
    schema = app.openapi()
    for path, model in (
        ("/api/v1/destinations", "DestinationListResponse"),
        ("/api/v1/offers", "OfferListResponse"),
    ):
        response = schema["paths"][path]["get"]["responses"]["200"]
        assert response["content"]["application/json"]["schema"]["$ref"].endswith(model)
    assert "/api/v1/destinations/{destination_id}" in schema["paths"]
    assert DestinationListResponse(items=[], count=0, limit=1, offset=0).items == []
    assert OfferListResponse(items=[], count=0, limit=3, offset=0).count == 0


@pytest.mark.asyncio
async def test_asgi_health_and_openapi_without_database() -> None:
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        assert (await client.get("/api/v1/health")).status_code == 200
        response = await client.get("/openapi.json")
        assert response.status_code == 200
        assert "/api/v1/places" in response.json()["paths"]
