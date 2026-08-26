# AquaTrust AI

Water treatment intelligence platform.

- `frontend/` — React + Vite application (this is what deploys to Vercel)
- Backend (FastAPI), database, AI services: planned — see `frontend/docs/api-integration.md`

Data sources:

- `frontend/public/data/bangalore_clean.csv` — primary historical STP dataset
  (9 Bangalore STPs, daily COD/BOD/pH/TSS/nitrogen + capacities, 2019–2023);
  drives the Monitoring trends/history views and the Dashboard snapshot.
- `frontend/public/data/indian_water_clean.csv` — national water-quality
  reference records (2021–2023); drives the Compliance reference explorer.

Operational pages (sensors, alerts, treatment status) and AI Insights remain on
provisional mock services until the FastAPI backend and the ML model land.
