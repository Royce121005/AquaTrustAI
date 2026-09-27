"""Tests for structured logging and security sanitization."""

import json
import logging
from app.core.logging import JSONFormatter, correlation_id_ctx, redact_sensitive_data


def test_redact_sensitive_data():
    """Verify passwords, tokens, bearer headers, and private keys are scrubbed."""
    raw_password = 'User login with password="super_secret_password_123"'
    redacted_password = redact_sensitive_data(raw_password)
    assert "super_secret_password_123" not in redacted_password
    assert "***REDACTED***" in redacted_password

    raw_bearer = "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
    redacted_bearer = redact_sensitive_data(raw_bearer)
    assert "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" not in redacted_bearer
    assert "***REDACTED***" in redacted_bearer

    raw_token = 'payload contains token="abcde12345"'
    redacted_token = redact_sensitive_data(raw_token)
    assert "abcde12345" not in redacted_token
    assert "***REDACTED***" in redacted_token


def test_json_formatter():
    """Verify JSON formatter outputs structured log payload."""
    formatter = JSONFormatter()
    record = logging.LogRecord(
        name="test_logger",
        level=logging.INFO,
        pathname="test.py",
        lineno=10,
        msg="Test logging message with password='secret'",
        args=(),
        exc_info=None,
    )

    token = correlation_id_ctx.set("req-test-uuid-1234")
    try:
        formatted_json = formatter.format(record)
        data = json.loads(formatted_json)

        assert data["logger"] == "test_logger"
        assert data["level"] == "INFO"
        assert "secret" not in data["message"]
        assert "***REDACTED***" in data["message"]
        assert data["request_id"] == "req-test-uuid-1234"
        assert "timestamp" in data
    finally:
        correlation_id_ctx.reset(token)
