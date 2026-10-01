"""AquaTrust AI — Custom Application Middlewares.

Handles request correlation tracking (X-Request-ID) and security headers.
"""

import re
import time
import uuid
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.logging import correlation_id_ctx, get_logger

logger = get_logger("aquatrust.middleware")

SAFE_REQUEST_ID_REGEX = re.compile(r"^[a-zA-Z0-9_\-\.]{1,64}$")


class RequestIDMiddleware(BaseHTTPMiddleware):
    """Middleware to enforce and propagate X-Request-ID header and logging context."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Extract and sanitize X-Request-ID or generate a new UUID4
        raw_request_id = request.headers.get("X-Request-ID")
        if raw_request_id and SAFE_REQUEST_ID_REGEX.match(raw_request_id):
            request_id = raw_request_id
        else:
            request_id = str(uuid.uuid4())

        # Store in request state and context var
        request.state.request_id = request_id
        token = correlation_id_ctx.set(request_id)

        start_time = time.perf_counter()
        try:
            response: Response = await call_next(request)
            duration_ms = (time.perf_counter() - start_time) * 1000.0
            response.headers["X-Request-ID"] = request_id

            logger.info(
                f"{request.method} {request.url.path} completed with status {response.status_code} in {duration_ms:.2f}ms",
                extra={
                    "request_id": request_id,
                    "method": request.method,
                    "path": request.url.path,
                    "status_code": response.status_code,
                    "duration_ms": round(duration_ms, 2),
                },
            )
            return response
        except Exception as exc:
            duration_ms = (time.perf_counter() - start_time) * 1000.0
            logger.error(
                f"{request.method} {request.url.path} failed after {duration_ms:.2f}ms: {str(exc)}",
                extra={
                    "request_id": request_id,
                    "method": request.method,
                    "path": request.url.path,
                    "duration_ms": round(duration_ms, 2),
                },
                exc_info=True,
            )
            raise exc
        finally:
            correlation_id_ctx.reset(token)
