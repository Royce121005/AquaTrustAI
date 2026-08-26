# API Integration Guide (FastAPI)

How the AquaTrust AI frontend connects to the future FastAPI backend, and what is
intentionally **not** implemented yet.

## 1. Base URL configuration

- Copy `frontend/.env.example` to `frontend/.env` and adjust:

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_USE_API=false
```

- `VITE_API_BASE_URL` — root URL of the FastAPI server (no trailing slash needed).
- Never hardcode URLs in service modules; they read `src/config/env.js`.
- Real `.env` files are git-ignored; only `.env.example` is committed.

## 2. Mock / API mode

| `VITE_USE_API` | Behaviour |
| --- | --- |
| `false` (default) | Public services resolve provisional mock data. No backend required. |
| `true` | Public services route to `src/services/api/*`, which currently reject with a clear `NOT_IMPLEMENTED` error until endpoints are wired. |

The flag lives in one place per domain (`src/services/<domain>.js`). When real
endpoints arrive, flip it per environment — or delete the selector entirely.

## 3. Dependency direction

```
UI (pages / features / components)
        ↓
public services   src/services/<domain>.js      ← the ONLY import point for UI
        ↓ chooses implementation
src/services/mock/*    or    src/services/api/*
                                  ↓
                          src/services/apiClient.js (Axios)
```

Rules already enforced by convention + grep checks:

- UI never imports `services/mock/*` or Axios directly.
- Raw FastAPI responses never reach React components.
- All response mapping happens inside `src/services/api/*.js`.

## 4. Frontend service contracts (stable)

These function names and resolved shapes are frozen from Stages 4–9. Backend
payloads must be mapped into them, not the other way around.

### 4.1 Bundled datasets (frontend-local, not backend data)

Two CSVs ship under `frontend/public/data/` and are parsed in the browser by
`src/utils/csv.js` + `src/data/*Dataset.js`. They are **dataset-derived** values,
clearly labelled in the UI — never presented as live sensor or AI output.

| File | Role | Processing module |
| --- | --- | --- |
| `bangalore_clean.csv` | Primary historical STP/treatment dataset (9 STPs, daily COD/BOD/pH/TSS/ammonical-N/total-N, capacities) · 2019-11-01 → 2023-08-13 | `src/data/bangaloreDataset.js` |
| `indian_water_clean.csv` | Supporting national water-quality reference records (station-year min/max ranges, 2021–2023) | `src/data/indianWaterDataset.js` |

The two datasets are intentionally NOT merged; they describe different things.

### 4.2 ML output contracts

Frontend interfaces for Member 2's model outputs (predictions, anomalies,
recommendations) are defined as JSDoc typedefs in `src/types/insights.js`.
Demo implementations in `src/services/mock/insights.js` conform to those shapes
and are labelled provisional everywhere they render.

## 5. Contract table

| Domain | Function | Frontend shape (summary) | Backend endpoint |
| --- | --- | --- | --- |
| Dashboard | `getDashboardOverview()` | `{ generatedAt, systemStatus, kpis[] }` | TBD |
| Dashboard | `getTreatmentStatus()` | `[{ id, name, stage, status, progressPct, startedAt }]` | TBD |
| Dashboard | `getRecentAlerts()` | `[{ id, timestamp, severity, source, description, acknowledged }]` | TBD |
| Monitoring (dataset) | `getStpOptions()` | `[{ id, name, installedCapacityMld, treatmentFacility }]` from bangalore_clean.csv | frontend-local today; TBD when served |
| Monitoring (dataset) | `getStpTrend(stpId, parameterId)` | `{ stp{id,name}, points[{timestamp,value}], sourceLabel }`; full daily series incl. null gaps | TODO: BACKEND CONTRACT REQUIRED |
| Monitoring (dataset) | `getStpHistory({stpId, parameterId, from?, to?})` | `{ points, pointCount, from, to, sourceLabel }`; empty from/to = full range | TODO: BACKEND CONTRACT REQUIRED |
| Monitoring (dataset) | `getStpSnapshot(stpId)` | Latest available record: `{ stp, recordedAt, readings{cod,bod,ph,tss,…}, city{sewageGenerationMld,…} }` | TODO: BACKEND CONTRACT REQUIRED |
| Monitoring (dataset) | `getBangaloreDatasetInfo()` | `{ recordCount, startDate, endDate, interval:'daily', stpCount }` | frontend-local metadata |
| Monitoring (sensors) | `getParameterTrend(parameterId?)` | `{ parameter{id,label,unit}, points[{timestamp,value}] }`; throws on unknown parameter | TBD |
| Monitoring (sensors) | `getSensors()` | `[{ id, name, parameterId, status, lastReadingAt, batteryPct }]` | TBD |
| Monitoring (sensors) | `getHistoricalData(filters?)` | `{ parameter, from, to, intervalMinutes, pointCount, points }`; filters `{parameterId?,from?,to?,intervalMinutes?}` | TBD |
| Insights | `getPredictions()` | `PredictionSeries` per `src/types/insights.js` (`points[{timestamp,predictedValue,actualValue?,confidenceLow?,confidenceHigh?}]`) | TBD |
| Insights | `getAnomalies()` | `[AnomalyRecord]` per `src/types/insights.js` (incl. optional observed/expected/explanation) | TBD |
| Insights | `getRecommendations()` | `[RecommendationRecord]` per `src/types/insights.js` (incl. optional reason/suggestedAction/relatedParameterId) | TBD |
| Compliance | `getComplianceSummary()` | `{ overallStatus, scorePct, openFindings, lastAuditAt, breakdown[] }` | TBD |
| Compliance | `getReports()` | `[{ id, title, periodStart, periodEnd, status, createdAt }]` | TBD |
| Compliance | `getReportById(reportId)` | summary fields + `{ generatedBy, summaryText, sections[], findings[] }`; **rejects** on missing ID (HTTP 404 analogue) | TBD |
| Compliance (dataset) | `getWaterQualityReference(filters?)` | `{ records[], meta{states,years,waterBodyTypes,totalCount}, sourceLabel }`; filters `{state?,year?,waterBodyType?}` from indian_water_clean.csv | frontend-local today; TBD when served |
| Blockchain | `getAnchoredRecords()` | `[{ id, recordType, anchorTime, txRef, status, network }]` | TBD |
| Blockchain | `verifyRecord(recordId)` | `{ recordId, verified, checkedAt, checks{recordExists,anchoringConfirmed}, message }`; **never rejects**, unknown ID → `verified:false` | TBD |
| Blockchain | `getTransactionById(txId)` | `{ hash, network, status, blockNumber, anchoredAt, recordIds }`; **rejects** on unknown ID (404 analogue) | TBD |

No regulatory thresholds are defined anywhere in this project yet — the
compliance UI therefore shows measured values with a "Reference unavailable"
stance and derives no pass/fail verdicts.

## 6. How future endpoints get connected

1. Get the OpenAPI spec / endpoint list from the backend team.
2. For each domain: replace the stubs in `src/services/api/<domain>.js`
   (`Promise.reject(notImplementedError(...))`) with `apiClient.get/post(...)` calls.
3. Map responses into the frontend shapes above **inside those files**
   (rename snake_case → camelCase, convert timestamps, etc.).
4. Preserve error semantics: not-found must reject with a message matching
   `/not found/i`; blockchain verification must resolve, never throw.
5. Set `VITE_USE_API=true` in `.env` and run both apps.
6. Remove the mock/API selector once the switch is permanent.

## 7. Error normalisation

`src/services/apiErrors.js` turns every failure into an `ApiError`
(`name`, `message`, `status`, `code`) via the shared interceptor in
`apiClient.js`. Handled cases: network unreachable, timeout, HTTP
400/401/403/404/500+, non-Axios errors. UI components only ever read
`error.message` (+ optional `status`/`code`); raw Axios errors never escape the
service layer.

## 8. Intentionally NOT implemented yet

- No real endpoints, schemas, auth/JWT, WebSockets, polling loops,
  React Query/Redux, blockchain SDKs.
- No fake API responses pretending to be backend data — API mode rejects loudly
  until the real contract exists.
- No ML model outputs: the CSVs are data, not a model. Prediction/anomaly/
  recommendation views stay on clearly-labelled provisional demo shapes
  (see `src/types/insights.js`) until Member 2's model is served via FastAPI.
- Provisional-data language across the UI stays until live data arrives.
