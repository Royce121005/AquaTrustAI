# AquaTrust AI — Production Deployment & Hardening Guide

This document specifies the exact steps, architecture, and configurations required to take AquaTrust AI from local development to an enterprise-grade, hardened cloud production environment.

---

## 1. What Makes AquaTrust AI APIs Production-Ready?

To transition from local development to production, the backend implements the following security and reliability controls:

1. **OWASP Enterprise Security Headers:**
   Every outbound response includes:
   - `X-Content-Type-Options: nosniff` (prevents MIME-type sniffing)
   - `X-Frame-Options: DENY` (prevents clickjacking attacks)
   - `X-XSS-Protection: 1; mode=block` (cross-site scripting mitigation)
   - `Referrer-Policy: strict-origin-when-cross-origin`
   - `Permissions-Policy: geolocation=(), microphone=(), camera=()`
2. **Multi-Worker Concurrency (Gunicorn + Uvicorn):**
   Replaces single-threaded dev server with a pre-fork worker model:
   - 4 concurrent ASGI worker processes handling asynchronous I/O and WebSocket telemetry.
3. **Unprivileged Non-Root Docker Container:**
   - Dedicated unprivileged `aquatrust:aquatrust` system user.
   - Minimal attack surface using multi-stage `python:3.12-slim` image.
   - Built-in container `HEALTHCHECK` probe querying `/health`.
4. **Deterministic Database Migrations:**
   - Database schema is versioned via Alembic (`001_initial_schema`).
   - Automated startup migration execution (`alembic upgrade head`).
5. **Role-Based Access Control (RBAC) & Cryptographic Integrity:**
   - JWT tokens signed with NIST-standard HMAC-SHA256.
   - Data hashing via deterministic RFC 8785 canonical JSON bytes.
   - Digital signatures generated using NIST P-256 ECDSA keys (`ES256`).

---

## 2. Production Environment Variables Checklist

Copy `backend/.env.production.example` to `backend/.env` on your production server:

```ini
APP_NAME="AquaTrust AI Backend"
APP_ENV=production
DEBUG=false
APP_HOST=0.0.0.0
APP_PORT=8000
API_V1_STR=/api/v1

LOG_LEVEL=INFO
LOG_FORMAT=json

# Allowed origins: Replace with your actual production frontend URL
CORS_ORIGINS="https://aquatrust.yourdomain.com,https://aquatrust.vercel.app"

# Managed Cloud PostgreSQL (e.g. AWS RDS / Supabase / Neon / Cloud SQL)
DATABASE_URL=postgresql://postgres:STRONG_PASSWORD@db-host:5432/aquatrust_db?sslmode=require
DB_POOL_SIZE=10
DB_MAX_OVERFLOW=20
DB_ECHO=false

# High-entropy random JWT secret key (Generate via: python -c "import secrets; print(secrets.token_urlsafe(48))")
JWT_SECRET_KEY=generate_a_cryptographically_secure_random_key_here
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480

DLT_MODE=SIMULATION
```

---

## 3. Deployment Options

### Option A: 1-Click Containerized Deployment (Docker Compose)
Best for: **AWS EC2, DigitalOcean Droplet, Hetzner, or any Linux VPS**.

1. **Clone the repository on the server:**
   ```bash
   git clone https://github.com/Royce121005/AquaTrustAI.git
   cd AquaTrustAI
   ```
2. **Create the production environment file:**
   ```bash
   cp backend/.env.production.example backend/.env
   # Edit backend/.env with your production credentials
   ```
3. **Launch the stack in detached mode:**
   ```bash
   docker compose -f docker-compose.prod.yml up -d --build
   ```
4. **Verify container health:**
   ```bash
   docker compose -f docker-compose.prod.yml ps
   curl http://localhost:8000/health
   ```

---

### Option B: Cloud PaaS Deployment (Render / Railway / Fly.io)
Best for: **Zero server maintenance, automated HTTPS, and free/low-cost tiers**.

1. **PostgreSQL Database:**
   - Create a managed PostgreSQL 17 database on [Render](https://render.com) or [Neon](https://neon.tech).
   - Copy the provided `Internal Database URL`.
2. **Backend Web Service:**
   - Connect your GitHub repository to Render / Railway.
   - **Root Directory:** `backend`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT`
   - **Environment Variables:** Add the variables from Section 2 above.
3. **Frontend Static Site:**
   - Connect your GitHub repository to [Vercel](https://vercel.com).
   - Root directory is automatically handled by the included [`vercel.json`](file:///d:/AquaTrustAI/vercel.json).
   - Add environment variable: `VITE_API_BASE_URL=https://your-backend-service.onrender.com/api/v1`.

---

## 4. Post-Deployment Verification

Once deployed to production, run the automated verification suite against your live cloud domain:

```powershell
# Set your production URL as target
$env:BASE_URL = "https://your-backend-api.com"
python test_all_apis_live.py
```

Expected result:
```text
=====================================================================================
AQUATRUST AI — COMPLETE LIVE API VERIFICATION SUITE
Target: https://your-backend-api.com (PostgreSQL 17 Backend)
=====================================================================================
ALL ROUTE GROUPS TESTED: 32/32 ENDPOINTS PASSED (100.0%)
=====================================================================================
```
