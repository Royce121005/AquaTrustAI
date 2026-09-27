"""Tests for structured error handling conforming to MASTER/API_CONTRACT.md."""

import pytest
from fastapi import APIRouter
from fastapi.testclient import TestClient

from app.core.errors import (
    AquaTrustException,
    ConflictException,
    ResourceNotFoundException,
    ValidationException,
)
from app.main import create_application


@pytest.fixture
def error_test_app():
    """Application configured with routes specifically testing error triggering."""
    application = create_application()
    test_router = APIRouter(prefix="/test-errors")

    @test_router.get("/not-found")
    def trigger_not_found():
        raise ResourceNotFoundException("Target sensor was not found.")

    @test_router.get("/validation")
    def trigger_validation():
        raise ValidationException("Reading value out of acceptable bounds.", details={"field": "value"})

    @test_router.get("/conflict")
    def trigger_conflict():
        raise ConflictException("Idempotency key conflict detected.")

    @test_router.get("/unhandled")
    def trigger_unhandled():
        raise RuntimeError("Database connection password=super_secret_internal_pw failed!")

    application.include_router(test_router)
    return application


def test_404_not_found_structure(error_test_app):
    """Verify 404 response conforms to error contract."""
    client = TestClient(error_test_app)
    response = client.get("/test-errors/not-found")

    assert response.status_code == 404
    data = response.json()
    assert data["error_code"] == "NOT_FOUND"
    assert data["message"] == "Target sensor was not found."
    assert "request_id" in data
    assert response.headers.get("X-Request-ID") == data["request_id"]


def test_422_validation_error_structure(error_test_app):
    """Verify 422 response conforms to error contract."""
    client = TestClient(error_test_app)
    response = client.get("/test-errors/validation")

    assert response.status_code == 422
    data = response.json()
    assert data["error_code"] == "VALIDATION_ERROR"
    assert data["details"] == {"field": "value"}
    assert "request_id" in data


def test_409_conflict_structure(error_test_app):
    """Verify 409 response conforms to error contract."""
    client = TestClient(error_test_app)
    response = client.get("/test-errors/conflict")

    assert response.status_code == 409
    data = response.json()
    assert data["error_code"] == "CONFLICT"
    assert "request_id" in data


def test_500_unhandled_exception_no_leakage(error_test_app):
    """Verify 500 error hides stack traces and internal secrets."""
    client = TestClient(error_test_app, raise_server_exceptions=False)
    response = client.get("/test-errors/unhandled")

    assert response.status_code == 500
    data = response.json()
    assert data["error_code"] == "INTERNAL_SERVER_ERROR"
    assert data["message"] == "An unexpected internal server error occurred."
    assert data["details"] is None
    assert "super_secret_internal_pw" not in response.text
    assert "Traceback" not in response.text
    assert "request_id" in data
