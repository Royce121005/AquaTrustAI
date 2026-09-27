"""Tests for request correlation and middleware behavior."""

import uuid
from fastapi.testclient import TestClient


def test_request_id_generated_when_absent(sync_client: TestClient):
    """Verify X-Request-ID is generated and attached to response header."""
    response = sync_client.get("/health")
    assert response.status_code == 200
    assert "X-Request-ID" in response.headers
    generated_id = response.headers["X-Request-ID"]
    # Ensure it is a valid UUID
    uuid_obj = uuid.UUID(generated_id)
    assert str(uuid_obj) == generated_id


def test_request_id_propagated_when_supplied(sync_client: TestClient):
    """Verify provided X-Request-ID is preserved and returned."""
    custom_id = "test-correlation-id-998877"
    response = sync_client.get("/health", headers={"X-Request-ID": custom_id})
    assert response.status_code == 200
    assert response.headers["X-Request-ID"] == custom_id
