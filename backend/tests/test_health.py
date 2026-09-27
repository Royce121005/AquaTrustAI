"""Tests for health check endpoints conforming to MASTER/API_ENDPOINT_REGISTRY.md."""

from datetime import datetime
from fastapi.testclient import TestClient


def test_root_health_endpoint(sync_client: TestClient):
    """Verify GET /health returns expected operational payload."""
    response = sync_client.get("/health")
    assert response.status_code == 200
    data = response.json()

    assert data["status"] in ("healthy", "degraded")
    assert "app_name" in data
    assert data["environment"] == "test"
    assert data["version"] == "0.1.0"
    assert "database" in data
    assert "timestamp" in data

    # Validate ISO-8601 UTC timestamp format
    parsed_dt = datetime.fromisoformat(data["timestamp"])
    assert parsed_dt is not None


def test_v1_health_endpoint(sync_client: TestClient):
    """Verify GET /api/v1/health conforms to API endpoint registry."""
    response = sync_client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()

    assert data["status"] in ("healthy", "degraded")
    assert data["environment"] == "test"
