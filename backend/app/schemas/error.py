"""AquaTrust AI — Standardized Error Response Schema.

Conforms strictly to MASTER/API_CONTRACT.md and MASTER/API_ENDPOINT_REGISTRY.md.
"""

from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field


class ErrorResponse(BaseModel):
    """Standardized error response payload."""

    error_code: str = Field(
        ...,
        description="Machine-readable error identifier in UPPER_SNAKE_CASE",
        examples=["NOT_FOUND", "VALIDATION_ERROR", "INTERNAL_SERVER_ERROR"],
    )
    message: str = Field(
        ...,
        description="Human-readable explanation of the error",
        examples=["Requested resource was not found."],
    )
    details: Optional[Union[Dict[str, Any], List[Any], str]] = Field(
        default=None,
        description="Optional detailed error context or field-level validation errors",
    )
    request_id: Optional[str] = Field(
        default=None,
        description="Correlation request identifier for tracing",
        examples=["d1a3c750-f5a0-4357-9d7b-bc41f92e5410"],
    )
