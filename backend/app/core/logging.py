"""AquaTrust AI — Structured Logging Foundation.

Provides structured, operational logging with request context propagation and
strict security redaction conforming to MASTER/SECURITY_RULES.md.
"""

import json
import logging
import re
import sys
from contextvars import ContextVar
from datetime import datetime, timezone
from typing import Any, Dict, Optional

# Context variable for request correlation ID
correlation_id_ctx: ContextVar[Optional[str]] = ContextVar("correlation_id", default=None)

# Patterns to identify and redact sensitive information
SENSITIVE_PATTERNS = [
    (re.compile(r'(password["\']?\s*[:=]\s*["\'])([^"\']+)(["\'])', re.IGNORECASE), r'\1***REDACTED***\3'),
    (re.compile(r'(token["\']?\s*[:=]\s*["\'])([^"\']+)(["\'])', re.IGNORECASE), r'\1***REDACTED***\3'),
    (re.compile(r'(private[_-]?key["\']?\s*[:=]\s*["\'])([^"\']+)(["\'])', re.IGNORECASE), r'\1***REDACTED***\3'),
    (re.compile(r'(secret["\']?\s*[:=]\s*["\'])([^"\']+)(["\'])', re.IGNORECASE), r'\1***REDACTED***\3'),
    (re.compile(r'(bearer\s+)([a-zA-Z0-9_\-\.]+)', re.IGNORECASE), r'\1***REDACTED***'),
]


def redact_sensitive_data(message: str) -> str:
    """Scrub sensitive credentials, tokens, and keys from log strings."""
    if not isinstance(message, str):
        return message
    for pattern, replacement in SENSITIVE_PATTERNS:
        message = pattern.sub(replacement, message)
    return message


class JSONFormatter(logging.Formatter):
    """Structured JSON log formatter for production observability."""

    def format(self, record: logging.LogRecord) -> str:
        log_obj: Dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": redact_sensitive_data(record.getMessage()),
        }

        # Include request ID if present in context or record
        request_id = getattr(record, "request_id", None) or correlation_id_ctx.get()
        if request_id:
            log_obj["request_id"] = request_id

        if record.exc_info:
            log_obj["exception"] = self.formatException(record.exc_info)

        # Include extra attributes
        for key, value in record.__dict__.items():
            if key not in (
                "args", "asctime", "created", "exc_info", "exc_text", "filename",
                "funcName", "levelname", "levelno", "lineno", "module", "msecs",
                "message", "msg", "name", "pathname", "process", "processName",
                "relativeCreated", "stack_info", "thread", "threadName", "request_id"
            ):
                if isinstance(value, (str, int, float, bool, list, dict, type(None))):
                    log_obj[key] = value

        return json.dumps(log_obj)


class TextFormatter(logging.Formatter):
    """Human-readable log formatter for local development."""

    def format(self, record: logging.LogRecord) -> str:
        request_id = getattr(record, "request_id", None) or correlation_id_ctx.get()
        req_part = f" [{request_id}]" if request_id else ""
        raw_msg = super().format(record)
        redacted_msg = redact_sensitive_data(raw_msg)
        return f"{self.formatTime(record)} [{record.levelname}]{req_part} {record.name}: {redacted_msg}"


def setup_logging(log_level: str = "INFO", log_format: str = "json") -> None:
    """Initialize root and application loggers."""
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, log_level.upper(), logging.INFO))

    # Clear existing handlers to prevent duplicate outputs
    for handler in list(root_logger.handlers):
        root_logger.removeHandler(handler)

    handler = logging.StreamHandler(sys.stdout)
    if log_format.lower() == "json":
        handler.setFormatter(JSONFormatter())
    else:
        handler.setFormatter(
            TextFormatter("%(asctime)s %(levelname)s %(name)s %(message)s", datefmt="%Y-%m-%dT%H:%M:%SZ")
        )

    root_logger.addHandler(handler)


def get_logger(name: str) -> logging.Logger:
    """Return a logger instance configured with application standards."""
    return logging.getLogger(name)
