"""AquaTrust AI — Security & Rate Limiting Engine.

Protects authentication, ingestion, and public verification endpoints from brute-force attacks
and high-frequency floods per AUDIT FINDING-HIGH-01 and FINDING-CRIT-01.
"""

import time
from collections import defaultdict
from threading import Lock
from typing import Dict, List
from fastapi import Request, HTTPException, status


class SlidingWindowRateLimiter:
    """Thread-safe in-memory sliding window rate limiter."""

    def __init__(self, requests_per_minute: int = 120):
        self.limit = requests_per_minute
        self.window = 60.0  # seconds
        self._history: Dict[str, List[float]] = defaultdict(list)
        self._lock = Lock()

    def check(self, key: str) -> bool:
        now = time.time()
        with self._lock:
            cutoff = now - self.window
            # Purge timestamps older than the sliding window
            self._history[key] = [t for t in self._history[key] if t > cutoff]
            if len(self._history[key]) >= self.limit:
                return False
            self._history[key].append(now)
            return True


class RateLimiter:
    """Configurable sliding-window rate limiter callable for endpoint/test dependency injection."""

    def __init__(self, max_requests: int = 120, window_seconds: float = 60.0, enabled: bool = True):
        self.max_requests = max_requests
        self.window_seconds = float(window_seconds)
        self.enabled = enabled
        self._history: Dict[str, List[float]] = defaultdict(list)
        self._lock = Lock()

    def __call__(self, request: Request) -> bool:
        if not self.enabled:
            return True
        forwarded = request.headers.get("X-Forwarded-For")
        client_ip = forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else "127.0.0.1")
        now = time.time()
        with self._lock:
            cutoff = now - self.window_seconds
            self._history[client_ip] = [t for t in self._history[client_ip] if t > cutoff]
            if len(self._history[client_ip]) >= self.max_requests:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Rate limit exceeded: maximum {self.max_requests} requests per {int(self.window_seconds)}s.",
                    headers={"Retry-After": str(int(self.window_seconds))},
                )
            self._history[client_ip].append(now)
            return True


# Global rate limiter instances:
# 1. Telemetry Ingestion: 120 requests per minute per client/gateway
ingestion_limiter = SlidingWindowRateLimiter(requests_per_minute=120)

# 2. Public Verification: 60 requests per minute per client IP
verification_limiter = SlidingWindowRateLimiter(requests_per_minute=60)

# 3. Authentication Login: 30 requests per minute per IP (Brute-force protection)
login_limiter = SlidingWindowRateLimiter(requests_per_minute=30)


def rate_limit_ingestion(request: Request) -> None:
    """FastAPI dependency enforcing rate limits on telemetry ingestion."""
    forwarded = request.headers.get("X-Forwarded-For")
    client_ip = forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else "127.0.0.1")
    
    if not ingestion_limiter.check(client_ip):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded: Telemetry ingestion is limited to 120 requests per minute.",
            headers={"Retry-After": "60"},
        )


def verification_rate_limiter(request: Request) -> None:
    """FastAPI dependency enforcing rate limits on public verification."""
    forwarded = request.headers.get("X-Forwarded-For")
    client_ip = forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else "127.0.0.1")
    
    if not verification_limiter.check(client_ip):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded: Verification requests are limited to 60 requests per minute.",
            headers={"Retry-After": "60"},
        )


def login_rate_limiter(request: Request) -> None:
    """FastAPI dependency enforcing brute-force protection on authentication logins."""
    forwarded = request.headers.get("X-Forwarded-For")
    client_ip = forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else "127.0.0.1")
    
    if not login_limiter.check(client_ip):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded: Too many login attempts. Please wait a minute before retrying.",
            headers={"Retry-After": "60"},
        )
