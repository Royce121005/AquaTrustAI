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

## 5. Contract table

| Domain | Function | Frontend shape (summary) | Backend endpoint |
| --- | --- | --- | --- |
| Dashboard | `getDashboardOverview()` | `{ generatedAt, systemStatus, kpis[] }` | TBD |
| Dashboard | `getTreatmentStatus()` | `[{ id, name, stage, status, progressPct, startedAt }]` | TBD |
| Dashboard | `getRecentAlerts()` | `[{ id, timestamp, severity, source, description, acknowledged }]` | TBD |
| Monitoring | `getParameterTrend(parameterId?)` | `{ parameter{id,label,unit}, points[{timestamp,value}] }`; throws on unknown parameter | TBD |
| Monitoring | `getSensors()` | `[{ id, name, parameterId, status, lastReadingAt, batteryPct }]` | TBD |
| Monitoring | `getHistoricalData(filters?)` | `{ parameter, from, to, intervalMinutes, pointCount, points }`; filters `{parameterId?,from?,to?,intervalMinutes?}` | TBD |
| Insights | `getPredictions()` | `{ modelVersion, generatedAt, parameterId, horizonHours, points[{timestamp,predictedValue,confidenceLow,confidenceHigh}] }` | TBD |
| Insights | `getAnomalies()` | `[{ id, timestamp, severity, score, parameterId, description }]` | TBD |
| Insights | `getRecommendations()` | `[{ id, priority, message }]` | TBD |
| Compliance | `getComplianceSummary()` | `{ overallStatus, scorePct, openFindings, lastAuditAt, breakdown[] }` | TBD |
| Compliance | `getReports()` | `[{ id, title, periodStart, periodEnd, status, createdAt }]` | TBD |
| Compliance | `getReportById(reportId)` | summary fields + `{ generatedBy, summaryText, sections[], findings[] }`; **rejects** on missing ID (HTTP 404 analogue) | TBD |
| Blockchain | `getAnchoredRecords()` | `[{ id, recordType, anchorTime, txRef, status, network }]` | TBD |
| Blockchain | `verifyRecord(recordId)` | `{ recordId, verified, checkedAt, checks{recordExists,anchoringConfirmed}, message }`; **never rejects**, unknown ID → `verified:false` | TBD |
| Blockchain | `getTransactionById(txId)` | `{ hash, network, status, blockNumber, anchoredAt, recordIds }`; **rejects** on unknown ID (404 analogue) | TBD |

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
  React Query/Redux, blockchain SDKs, or production datasets.
- No fake API responses pretending to be backend data — API mode rejects loudly
  until the real contract exists.
- Provisional-data language across the UI stays until live data arrives.
