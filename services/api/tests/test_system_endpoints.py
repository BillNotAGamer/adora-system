"""System endpoint contract tests."""

from unittest.mock import AsyncMock

from fastapi.testclient import TestClient

import app.api.routes.readiness as readiness_module
from app.main import app

client = TestClient(app)


def test_health_endpoint() -> None:
    response = client.get("/api/v1/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "adora-api"}
    assert response.headers["x-request-id"]


def test_readiness_reports_healthy_dependencies(monkeypatch: object) -> None:
    monkeypatch.setattr(readiness_module, "check_database", AsyncMock())  # type: ignore[attr-defined]
    monkeypatch.setattr(readiness_module, "check_redis", AsyncMock())  # type: ignore[attr-defined]

    response = client.get("/api/v1/ready")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ready",
        "checks": {"database": {"status": "ok"}, "redis": {"status": "ok"}},
    }


def test_openapi_includes_system_contract() -> None:
    response = client.get("/openapi.json")

    assert response.status_code == 200
    paths = response.json()["paths"]
    assert "/api/v1/health" in paths
    assert "/api/v1/ready" in paths
