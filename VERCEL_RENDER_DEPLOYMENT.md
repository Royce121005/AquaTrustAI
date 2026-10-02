# AquaTrust AI — Production Deployment Guide: Vercel + Render

This guide details the exact step-by-step process to deploy AquaTrust AI to production using **Vercel** (Edge Frontend CDN) and **Render** (FastAPI Backend + PostgreSQL 17 Database).

Once deployed, the platform is globally accessible on **any device** (iPhone, Android, iPad, Mac, Windows, Linux) with zero local setup.

---

## Architecture Overview

```
[ Any Device: Phone / Tablet / Laptop ]
                   │
                   ▼  (HTTPS - Global Edge CDN)
       ┌────────────────────────┐
       │   Vercel Frontend      │
       │   (React 18 + Vite)    │
       │   aquatrust.vercel.app │
       └───────────┬────────────┘
                   │
                   │  REST API Calls (/api/v1/...)
                   ▼  (HTTPS)
       ┌────────────────────────┐
       │     Render Backend     │
       │   (FastAPI + Uvicorn)  │
       │   aquatrust.onrender   │
       └───────────┬────────────┘
                   │
                   │  Internal DB Connection
                   ▼
       ┌────────────────────────┐
       │   Render PostgreSQL    │
       │   (aquatrust_db)       │
       │   Bharwara STP Lucknow │
       └────────────────────────┘
```

---

## Phase 1: Deploy Backend & Database to Render

### Option A: 1-Click Blueprint (Fastest)
1. Commit and push this repository to GitHub:
   ```bash
   git add .
   git commit -m "feat: production configuration for Vercel and Render"
   git push origin royce
   ```
2. Log in to [Render.com](https://render.com).
3. Click **New +** -> **Blueprint**.
4. Connect your GitHub repository (`Royce121005/AquaTrustAI`).
5. Render reads `render.yaml` automatically and configures:
   - **`aquatrust-postgres`**: Managed PostgreSQL Database.
   - **`aquatrust-backend`**: FastAPI Python Web Service.
6. Click **Apply**. Render will provision both services.

### Option B: Manual Setup on Render
1. **Create Database**:
   - Go to **New +** -> **PostgreSQL**.
   - Name: `aquatrust-postgres`
   - Database: `aquatrust_db`
   - User: `aquatrust_user`
   - Plan: Free or Starter
   - Copy the **Internal Database URL** and **External Database URL**.
2. **Create Web Service**:
   - Go to **New +** -> **Web Service**.
   - Connect your GitHub repo.
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Environment Variables**:
     | Variable | Value |
     | :--- | :--- |
     | `APP_NAME` | `AquaTrust AI Backend` |
     | `APP_ENV` | `production` |
     | `DEBUG` | `false` |
     | `API_V1_STR` | `/api/v1` |
     | `DATABASE_URL` | *(Paste Internal Database URL from step 1)* |
     | `JWT_SECRET_KEY` | *(Generate a random 32+ character string)* |
     | `CORS_ORIGINS` | `*` *(or your Vercel domain)* |
     | `LOG_LEVEL` | `INFO` |
   - Click **Create Web Service**.
   - Note your backend URL: e.g. `https://aquatrust-backend.onrender.com`.

---

## Phase 2: Seed the Render Database with Canonical Data

Once your Render database is live, run the realignment script from your terminal to populate Bharwara STP Lucknow and the 6 canonical parameters:

```powershell
# In PowerShell (replace with your Render EXTERNAL Database URL):
$env:DATABASE_URL="postgresql://aquatrust_user:PASSWORD@dpg-xxxxxx.oregon-postgres.render.com/aquatrust_db"
python backend/scripts/reseed_realignment.py
```

This single command:
1. Creates all tables (`facilities`, `sensors`, `readings`, `compliance_rules`, `treatment_records`, `certificates`, `dlt_anchors`, etc.).
2. Creates core user accounts (`admin`, `operator`, `auditor`, `regulator`).
3. Inserts **Bharwara STP Lucknow (345 MLD)** and secondary STPs.
4. Activates the 6 canonical sensors: `BOD`, `COD`, `TSS`, `PH`, `NH4_N`, and `TKN`.
5. Establishes CPCB 2021 statutory limits.
6. Ingests initial telemetry, executes Isolation Forest anomaly scans, and seals the first cryptographic batch with NIST P-256 ECDSA signatures and DLT anchors.

---

## Phase 3: Deploy Frontend to Vercel

1. Log in to [Vercel.com](https://vercel.com).
2. Click **Add New...** -> **Project**.
3. Import your GitHub repository (`Royce121005/AquaTrustAI`).
4. In the configuration screen, set:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click *Edit* and select **`frontend`** *(Very Important)*.
   - **Build Command**: `npm run build` *(auto-detected)*.
   - **Output Directory**: `dist` *(auto-detected)*.
5. Expand **Environment Variables** and add:
   | Key | Value |
   | :--- | :--- |
   | `VITE_API_BASE_URL` | `https://aquatrust-backend.onrender.com/api/v1` |
   *(Replace with your actual Render backend URL)*
6. Click **Deploy**.
7. In ~45 seconds, Vercel will give you a live production URL:
   `https://aquatrust-ai.vercel.app`

---

## Phase 4: Verification on Any Device

Open `https://aquatrust-ai.vercel.app` on:
- Any mobile phone (iPhone Safari, Android Chrome)
- Any tablet (iPad, Android Tablet)
- Any desktop (Mac, Windows, Linux)

### Login Credentials:
- **Operator**: `operator` / `operator123`
- **Auditor**: `auditor` / `auditor123`
- **Regulator**: `regulator` / `regulator123`
- **Admin**: `admin` / `admin123`

### Key Pages to Verify:
1. **Dashboard** (`/`): Real-time facility metrics for Bharwara STP Lucknow.
2. **Telemetry** (`/telemetry`): 6 active sensors including TKN.
3. **Compliance** (`/compliance`): CPCB 2021 statutory checks.
4. **Verification** (`/verification`): NIST P-256 signatures & DLT anchoring verification.
5. **Public Portal** (`/public/verify`): Zero-auth public cryptographic audit.
