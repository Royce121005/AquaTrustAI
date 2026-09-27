"""AquaTrust AI — Structured Exception Hierarchy and Handlers.

Enforces MASTER/API_CONTRACT.md and MASTER/SECURITY_RULES.md by returning
consistent, machine-readable error responses and preventing internal leakages.
"""

import uuid
from typing import Any, Dict, List, Optional, Union
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.core.logging import correlation_id_ctx, get_logger
from app.schemas.error import ErrorResponse

logger = get_logger("aquatrust.errors")


class AquaTrustException(Exception):
    """Base domain exception for AquaTrust AI backend."""

    def __init__(
        self,
        message: str,
        error_code: str = "INTERNAL_ERROR",
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        details: Optional[Union[Dict[str, Any], List[Any], str]] = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        self.details = details


class ValidationException(AquaTrustException):
    """Semantic validation failure."""

    def __init__(
        self,
        message: str = "Semantic validation failed.",
        details: Optional[Union[Dict[str, Any], List[Any], str]] = None,
    ) -> None:
        super().__init__(
            message=message,
            error_code="VALIDATION_ERROR",
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            details=details,
        )


class ResourceNotFoundException(AquaTrustException):
    """Requested resource not found."""

    def __init__(
        self,
        message: str = "Resource not found.",
        details: Optional[Union[Dict[str, Any], List[Any], str]] = None,
    ) -> None:
        super().__init__(
            message=message,
            error_code="NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND,
            details=details,
        )


class AuthenticationException(AquaTrustException):
    """Unauthenticated request."""

    def __init__(
        self,
        message: str = "Authentication required.",
        details: Optional[Union[Dict[str, Any], List[Any], str]] = None,
    ) -> None:
        super().__init__(
            message=message,
            error_code="UNAUTHENTICATED",
            status_code=status.HTTP_401_UNAUTHORIZED,
            details=details,
        )


class AuthorizationException(AquaTrustException):
    """Unauthorized / forbidden request."""

    def __init__(
        self,
        message: str = "Permission denied.",
        details: Optional[Union[Dict[str, Any], List[Any], str]] = None,
    ) -> None:
        super().__init__(
            message=message,
            error_code="UNAUTHORIZED",
            status_code=status.HTTP_403_FORBIDDEN,
            details=details,
        )


class ConflictException(AquaTrustException):
    """State conflict or idempotency key mismatch."""

    def __init__(
        self,
        message: str = "Resource state conflict.",
        details: Optional[Union[Dict[str, Any], List[Any], str]] = None,
    ) -> None:
        super().__init__(
            message=message,
            error_code="CONFLICT",
            status_code=status.HTTP_409_CONFLICT,
            details=details,
        )


class MalformedRequestException(AquaTrustException):
    """Malformed or invalid request structure."""

    def __init__(
        self,
        message: str = "Malformed request payload.",
        details: Optional[Union[Dict[str, Any], List[Any], str]] = None,
    ) -> None:
        super().__init__(
            message=message,
            error_code="MALFORMED_REQUEST",
            status_code=status.HTTP_400_BAD_REQUEST,
            details=details,
        )


class ServiceUnavailableException(AquaTrustException):
    """Downstream dependency or service unavailable."""

    def __init__(
        self,
        message: str = "Service or dependency temporarily unavailable.",
        details: Optional[Union[Dict[str, Any], List[Any], str]] = None,
    ) -> None:
        super().__init__(
            message=message,
            error_code="SERVICE_UNAVAILABLE",
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            details=details,
        )


def get_request_id(request: Request) -> str:
    """Extract or resolve the active request correlation ID."""
    return getattr(request.state, "request_id", None) or correlation_id_ctx.get() or str(uuid.uuid4())


async def aquatrust_exception_handler(request: Request, exc: AquaTrustException) -> JSONResponse:
    """Handle custom AquaTrustException instances."""
    req_id = get_request_id(request)
    logger.warning(
        f"Domain exception [{exc.error_code}]: {exc.message}",
        extra={"request_id": req_id, "error_code": exc.error_code, "status_code": exc.status_code},
    )
    payload = ErrorResponse(
        error_code=exc.error_code,
        message=exc.message,
        details=exc.details,
        request_id=req_id,
    )
    return JSONResponse(status_code=exc.status_code, content=payload.model_dump())


async def request_validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Handle Pydantic request validation errors."""
    req_id = get_request_id(request)
    logger.warning(
        f"Request validation error: {exc.errors()}",
        extra={"request_id": req_id, "error_code": "VALIDATION_ERROR"},
    )
    payload = ErrorResponse(
        error_code="VALIDATION_ERROR",
        message="Request payload failed schema validation.",
        details=exc.errors(),
        request_id=req_id,
    )
    return JSONResponse(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, content=payload.model_dump())


async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """Handle FastAPI / Starlette HTTPException."""
    req_id = get_request_id(request)
    error_code_map = {
        400: "MALFORMED_REQUEST",
        401: "UNAUTHENTICATED",
        403: "UNAUTHORIZED",
        404: "NOT_FOUND",
        409: "CONFLICT",
        422: "VALIDATION_ERROR",
        429: "RATE_LIMITED",
        503: "SERVICE_UNAVAILABLE",
    }
    error_code = error_code_map.get(exc.status_code, "HTTP_ERROR")
    logger.warning(
        f"HTTP exception [{exc.status_code}]: {exc.detail}",
        extra={"request_id": req_id, "status_code": exc.status_code},
    )
    payload = ErrorResponse(
        error_code=error_code,
        message=str(exc.detail),
        details=None,
        request_id=req_id,
    )
    return JSONResponse(status_code=exc.status_code, content=payload.model_dump())


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle unexpected server errors without exposing stack traces or credentials."""
    req_id = get_request_id(request)
    logger.error(
        f"Unhandled exception during request processing: {str(exc)}",
        exc_info=True,
        extra={"request_id": req_id, "error_code": "INTERNAL_SERVER_ERROR"},
    )
    payload = ErrorResponse(
        error_code="INTERNAL_SERVER_ERROR",
        message="An unexpected internal server error occurred.",
        details=None,
        request_id=req_id,
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=payload.model_dump(),
    )


def register_exception_handlers(app: FastAPI) -> None:
    """Register all structured error handlers on the FastAPI application."""
    app.add_exception_handler(AquaTrustException, aquatrust_exception_handler)
    app.add_exception_handler(RequestValidationError, request_validation_exception_handler)
    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)
