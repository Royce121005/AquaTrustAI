# AquaTrustAI frontend

React 19, TypeScript, Vite and CSS application. The interface uses repository CSVs for the Dataset Explorer and the FastAPI API for operational measurements, analysis, compliance, records and DLT.

## Local development

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

Set `VITE_DEV_API_PROXY_TARGET` to the AquaTrustAI backend origin. The Vite server proxies `/api` to that origin. Configure `VITE_API_BASE_URL` for the backend API prefix (defaults to `/api/v1`). No API credentials are stored in source. Sign in with an account provisioned in the backend.

## Build and tests

```powershell
npm run build
npm test
```

The current frontend contract does not expose a dataset resource, PDF report export, recommendations, a general risk score or dataset comparison. CSV preview/profile is local; importing supported measurements is an explicit, persistent backend operation using the ingestion API. Fabric and simulation status are displayed separately according to the DLT API response.
