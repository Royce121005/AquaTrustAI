# AquaTrust AI — Production Backend Dockerfile
# Multi-stage, unprivileged non-root container for FastAPI ASGI backend

FROM python:3.12-slim as builder

WORKDIR /build

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Final minimal runtime image
FROM python:3.12-slim as runner

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --home-dir /home/aquatrust --shell /bin/bash aquatrust

# Copy installed Python packages from builder
COPY --from=builder /root/.local /home/aquatrust/.local
ENV PATH=/home/aquatrust/.local/bin:$PATH
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Copy backend application code
COPY --chown=aquatrust:aquatrust . /app

USER aquatrust

EXPOSE 8000

# Docker healthcheck probe targeting live system health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Production multi-worker ASGI entrypoint
CMD ["gunicorn", "app.main:app", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000", "--access-logfile", "-", "--error-logfile", "-"]
