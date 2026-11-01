"""System endpoint contract tests."""

from unittest.mock import AsyncMock

import httpx
import pytest

import app.api.routes.readiness as readiness_module


@pytest.mark.asyncio
async def test_health_endpoint(api_client: httpx.AsyncClient) -> None:
    response = await api_client.get("/api/v1/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "adora-api"}
    assert response.headers["x-request-id"]


@pytest.mark.asyncio
async def test_readiness_reports_healthy_dependencies(
    api_client: httpx.AsyncClient, monkeypatch: object
) -> None:
    monkeypatch.setattr(readiness_module, "check_database", AsyncMock())  # type: ignore[attr-defined]
    monkeypatch.setattr(readiness_module, "check_redis", AsyncMock())  # type: ignore[attr-defined]

    response = await api_client.get("/api/v1/ready")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ready",
        "checks": {"database": {"status": "ok"}, "redis": {"status": "ok"}},
    }


@pytest.mark.asyncio
async def test_openapi_includes_system_contract(api_client: httpx.AsyncClient) -> None:
    response = await api_client.get("/openapi.json")

    assert response.status_code == 200
    paths = response.json()["paths"]
    assert "/api/v1/health" in paths
    assert "/api/v1/ready" in paths
    assert "/api/v1/auth/register" in paths
    assert "/api/v1/auth/login" in paths
    assert "/api/v1/auth/refresh" in paths
    assert "/api/v1/auth/logout" in paths
    assert "/api/v1/auth/me" in paths
