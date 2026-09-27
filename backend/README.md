# AquaTrust AI — Backend Service

Foundational backend infrastructure for the AquaTrust AI platform conforming strictly to the frozen v2.2.1 architecture.

## Architecture & Structure

```
backend/
├── app/
│   ├── api/
│   │   ├── router.py            # Central API v1 router
│   │   └── v1/
│   │       └── health.py        # /health and /api/v1/health endpoints
│   ├── core/
│   │   ├── config.py            # Pydantic Settings environment configuration
│   │   ├── errors.py            # Domain exceptions and structured error handlers
│   │   ├── logging.py           # Structured logging and secret sanitization
│   │   └── middleware.py        # RequestID tracking (X-Request-ID) and security headers
│   ├── db/
│   │   ├── base.py              # SQLAlchemy Declarative Base
│   │   └── session.py           # Persistence boundary and session factory
│   ├── schemas/
│   │   └── error.py             # Error response DTO {error_code, message, details, request_id}
│   └── main.py                  # Application entrypoint and lifespan management
├── tests/                       # Automated test suite
├── requirements.txt             # Locked foundational dependencies
├── requirements-dev.txt         # Testing and development dependencies
└── .env.example                 # Environment configuration template
```

## Running Locally

1. Create and activate a Python 3.10+ virtual environment:
   ```bash
   python -m venv .venv
   .venv\Scripts\activate  # Windows
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   pip install -r requirements-dev.txt
   ```

3. Run the development server:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```

4. Run the test suite:
   ```bash
   pytest
   ```
