"""AquaTrust AI — Thread-Safe Sliding Window Rate Limiter.

Protects authentication and compute-intensive cryptographic endpoints against
brute-force attacks, CPU exhaustion, and denial-of-service attempts.
"""

import time
import threading
from typing import Dict, List, Optional
from fastapi import Request, HTTPException, status

from app.core.config import settings


class RateLimiter:
    """In-memory sliding-window rate limiter per client IP address.

    Thread-safe and automatically bypassed in 'test' environment to avoid
    throttling automated test suites.
    """

    def __init__(self, max_requests: int = 30, window_seconds: int = 60, enabled: Optional[bool] = None):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        # Automatically disable in test environment unless explicitly overridden
        if enabled is not None:
            self.enabled = enabled
        else:
            self.enabled = settings.APP_ENV != "test"
        self._lock = threading.RLock()
        self._clients: Dict[str, List[float]] = {}

    def __call__(self, request: Request) -> bool:
        if not self.enabled:
            return True

        # Extract client IP (respecting forward proxies if present)
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            client_ip = forwarded.split(",")[0].strip()
        else:
            client_ip = request.client.host if request.client else "unknown"

        now = time.time()
        cutoff = now - self.window_seconds

        with self._lock:
            # Clean expired timestamps for this IP
            timestamps = self._clients.get(client_ip, [])
            valid_timestamps = [t for t in timestamps if t > cutoff]

            if len(valid_timestamps) >= self.max_requests:
                oldest = valid_timestamps[0]
                retry_after = int(max(1, self.window_seconds - (now - oldest)))
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Rate limit exceeded. Maximum {self.max_requests} requests per {self.window_seconds}s.",
                    headers={"Retry-After": str(retry_after)},
                )

            valid_timestamps.append(now)
            self._clients[client_ip] = valid_timestamps

            # Housekeeping: periodically prune stale IPs
            if len(self._clients) > 10000:
                stale_keys = [k for k, v in self._clients.items() if not v or v[-1] <= cutoff]
                for k in stale_keys:
                    del self._clients[k]

        return True


# Pre-configured rate limiters for sensitive endpoints
login_rate_limiter = RateLimiter(max_requests=10, window_seconds=60)
verification_rate_limiter = RateLimiter(max_requests=60, window_seconds=60)
