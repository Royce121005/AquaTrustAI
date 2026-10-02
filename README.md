# AquaTrustAI

A wastewater monitoring and trusted-data project. Operational readings, AI inference, compliance, treatment records, cryptographic verification and the DLT gateway are provided by the FastAPI backend; the browser presents those results without fabricating values.

## Repository layout

- `frontend/` — React, TypeScript and Vite application.
- `backend/` — FastAPI API, persistence, validation, AI, compliance, records, verification and DLT integration.
- `ml/` — model and inference implementation.
- `dlt/` — Fabric network, chaincode and client resources.
- `datasets/` — source manifests and processed project datasets.

## Run the frontend

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```

Set `VITE_DEV_API_PROXY_TARGET` in `frontend/.env` to the running AquaTrustAI FastAPI origin. The default development proxy target is `http://127.0.0.1:8000`. Set `VITE_API_BASE_URL` to the backend API prefix for deployment (default `/api/v1`). Vercel builds from `frontend/` using the existing root configuration.

## Validation

```powershell
cd frontend
npm test
npm run build
```

See [FRONTEND_IMPLEMENTATION_REPORT.md](FRONTEND_IMPLEMENTATION_REPORT.md) for the dataset audit, API boundaries and validation status. Dataset files and metadata are catalogued under `datasets/`; older README references to a Bangalore CSV are obsolete.
