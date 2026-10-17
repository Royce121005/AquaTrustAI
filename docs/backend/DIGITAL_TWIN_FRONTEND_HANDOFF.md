# AquaTrustAI — Digital Twin Frontend Integration Handoff Package

**Document Reference:** `DOC-DT-FRONTEND-001`  
**Author:** Senior Backend Engineer and Digital Twin Implementation Owner (Member 2 — Royce)  
**Status:** READY FOR FRONTEND IMPLEMENTATION  
**Date:** October 17, 2026  
**Target Audience:** Frontend Engineers (Member 1), UI/UX Designers, Integration Engineers  

---

## 1. Overview & Architecture Summary

The AquaTrustAI Digital Twin engine provides a persistent, stateful, virtual representation of decentralized Sewage Treatment Plants (STPs). It connects real-time telemetry, deterministic data-trust validation, Isolation Forest anomaly scoring, Monod/CSTR biological process modeling, held-out predictive inference, and what-if scenario simulations.

### Core Architecture Invariants for Frontend:
1. **Strict Data Taxonomy:** Telemetry and modeled data must NEVER be visually conflated. Every data point on the UI must carry its explicit origin tag (`observed`, `simulated`, `predicted`, `hypothetical`).
2. **Virtual State Overwrite Guard:** Invalid, suspect, or stale sensor observations NEVER overwrite accepted physical state. When a sensor fails, the state retains the last valid reading while flagging the sensor as invalid.
3. **No Autonomous Actuation:** All recommendations emitted by the digital twin are strictly **advisory**. The UI must display explicit human confirmation prompts and explainability metrics.
4. **DLT / Certificate Boundary:** What-if scenarios and forward predictions are hypothetical and cannot generate compliance certificates or anchor to Hyperledger Fabric.

---

## 2. Complete API Route Catalog

All endpoints are mounted under `/api/v1` and require HTTP Bearer JWT authentication. Facility-scoped plant operators can only access their assigned `facility_id` (enforced server-side with HTTP 403). Multi-facility oversight is granted to Admin, Auditor, and Regulatory Stakeholder roles.

| # | HTTP Method | Endpoint Path | Allowed Roles | Description |
|---|:-----------:|:--------------|:--------------|:------------|
| 1 | `GET` | `/api/v1/facilities/{facility_id}/twin` | Operator, Admin, Auditor, Regulator | Retrieve latest virtual plant state snapshot, stage variables, and data quality. |
| 2 | `GET` | `/api/v1/facilities/{facility_id}/twin/history` | Operator, Admin, Auditor, Regulator | Paginated audit trail of historical virtual state snapshots. |
| 3 | `POST` | `/api/v1/facilities/{facility_id}/twin/reconstruct` | Admin, Auditor | Reconstruct plant virtual state from immutable event logs up to a specific version. |
| 4 | `GET` | `/api/v1/facilities/{facility_id}/twin/config` | Operator, Admin, Auditor, Regulator | Retrieve active twin configuration (stages, sensors, operating setpoints). |
| 5 | `PUT` | `/api/v1/facilities/{facility_id}/twin/config` | Admin | Update facility twin configuration (increments monotonic version). |
| 6 | `POST` | `/api/v1/facilities/{facility_id}/twin/scenarios` | Operator, Admin | Define and execute an isolated what-if scenario simulation. |
| 7 | `GET` | `/api/v1/twin/scenarios/{scenario_id}` | Operator, Admin, Auditor, Regulator | Fetch complete scenario simulation results, comparative steps, and risk evaluation. |
| 8 | `GET` | `/api/v1/facilities/{facility_id}/twin/scenarios` | Operator, Admin, Auditor, Regulator | List past what-if scenarios executed for a facility. |
| 9 | `GET` | `/api/v1/facilities/{facility_id}/twin/predictions` | Operator, Admin, Auditor, Regulator | Retrieve evidence-gated forward water-quality predictions with uncertainty bounds. |
| 10 | `GET` | `/api/v1/facilities/{facility_id}/twin/recommendations` | Operator, Admin, Auditor, Regulator | Retrieve active operational advisory recommendations with evidence traces. |
| 11 | `GET` | `/api/v1/facilities/{facility_id}/twin/sustainability` | Operator, Admin, Auditor, Regulator | Water recycling accounting, freshwater displacement, and safe reuse gate. |
| 12 | `GET` | `/api/v1/twin/models` | Operator, Admin, Auditor, Regulator | List registered process models and predictive model versions with validation metrics. |
| 13 | `POST` | `/api/v1/twin/models/evaluate` | Admin, Auditor | Run offline benchmark evaluation against held-out datasets (e.g. UCI Water Treatment). |

---

## 3. Data Taxonomy, Badging & Styling Guidelines

Frontend screens must adhere strictly to these visual contracts:

```
+-----------------------------------------------------------------------------------------+
|                                DATA ORIGIN BADGE CONTRACT                               |
+-------------------+--------------------+------------------------+-----------------------+
| Origin Tag        | Visual Badge       | Line Chart Style       | Meaning               |
+-------------------+--------------------+------------------------+-----------------------+
| observed          | [OBSERVED] (Green) | Solid line             | Real sensor telemetry |
| simulated         | [SIMULATED](Blue)  | Dashed line            | Kinetic process model |
| predicted         | [PREDICTED](Purple)| Dotted line + 95% band | Machine learning      |
| hypothetical      | [WHAT-IF]  (Amber) | Dashed amber line      | Scenario simulation   |
+-------------------+--------------------+------------------------+-----------------------+
```

### 3.1 State Freshness Semantics
The API returns `state_freshness` on every state response:
- `fresh`: Telemetry received within the last 90 minutes. (Display green indicator `● Live Synchronized`).
- `stale`: Telemetry is 90 minutes to 6 hours old. (Display amber warning `▲ Telemetry Delayed`).
- `expired`: Telemetry is older than 6 hours. (Display red alert `✖ Offline / Disconnected`).

### 3.2 Data Quality Badges
- `valid`: All active sensors pass physical, rate-of-change, and stoichiometric validation.
- `suspect`: One or more sensors flagged for drift or high variance.
- `invalid`: Sensor telemetry violated physical limits or failed validation.
- `insufficient_data`: Mandatory parameters (`BOD`, `COD`, `TSS`, `pH`) are missing. The process model outputs an explicit `insufficient_data` state rather than fabricating values.

---

## 4. Endpoint Payloads and Response Schemas

### 4.1 Latest Virtual Plant State (`GET /api/v1/facilities/{id}/twin`)
**Response (200 OK):**
```json
{
  "state_id": "c1f7b045-8c01-443b-8418-dc62bb957b44",
  "facility_id": "e2a9b31d-8f92-493e-862d-091a1347072c",
  "state_version": 142,
  "observed_at": "2026-10-17T12:00:00Z",
  "source_mode": "live",
  "facility_profile_version": "profile-v1.0",
  "data_quality": "valid",
  "state_freshness": "fresh",
  "last_accepted_observation_at": "2026-10-17T12:00:00Z",
  "latest_received_observation_at": "2026-10-17T12:00:00Z",
  "latest_observations": {
    "bod": {"value": 185.0, "unit": "mg/L", "observed_at": "2026-10-17T12:00:00Z", "data_origin": "observed"},
    "cod": {"value": 410.0, "unit": "mg/L", "observed_at": "2026-10-17T12:00:00Z", "data_origin": "observed"},
    "tss": {"value": 210.0, "unit": "mg/L", "observed_at": "2026-10-17T12:00:00Z", "data_origin": "observed"},
    "ph": {"value": 7.4, "unit": "pH units", "observed_at": "2026-10-17T12:00:00Z", "data_origin": "observed"},
    "nh4_n": {"value": 28.0, "unit": "mg/L", "observed_at": "2026-10-17T12:00:00Z", "data_origin": "observed"}
  },
  "stage_states": {
    "inlet": {
      "stage_name": "Raw Influent",
      "parameters": {"bod": 185.0, "cod": 410.0, "tss": 210.0, "ph": 7.4, "nh4_n": 28.0}
    },
    "primary_clarifier": {
      "stage_name": "Primary Clarifier",
      "parameters": {"bod": 146.15, "cod": 336.2, "tss": 84.0, "ph": 7.4, "nh4_n": 28.0}
    },
    "biological_aeration": {
      "stage_name": "Biological Aeration Basin",
      "parameters": {"bod": 22.68, "cod": 78.5, "tss": 2587.7, "ph": 7.34, "nh4_n": 7.2}
    },
    "secondary_clarifier": {
      "stage_name": "Secondary Clarifier",
      "parameters": {"bod": 20.84, "cod": 70.65, "tss": 10.35, "ph": 7.34, "nh4_n": 7.2}
    },
    "final_effluent": {
      "stage_name": "Final Effluent",
      "parameters": {"bod": 20.84, "cod": 70.65, "tss": 10.35, "ph": 7.34, "nh4_n": 7.2}
    }
  },
  "operating_variables": {
    "hrt_hours": 8.0,
    "do_mg_l": 2.0,
    "temperature_c": 20.0
  },
  "process_model": {
    "version": "aquatrust-process-v1.0",
    "configuration_hash": "a4d3f5e8...",
    "overall_removal_efficiencies": {
      "bod_removal_percent": 88.7,
      "cod_removal_percent": 82.8,
      "tss_removal_percent": 95.1
    }
  }
}
```

---

### 4.2 What-If Scenario Execution (`POST /api/v1/facilities/{id}/twin/scenarios`)
**Request:**
```json
{
  "scenario_type": "influent_quality_change",
  "scenario_name": "Inflow BOD Spike +40%",
  "duration_minutes": 120,
  "time_step_seconds": 900,
  "parameters": {
    "bod_change_percent": 40.0
  },
  "seed": 42
}
```

**Response (201 Created):**
```json
{
  "scenario_id": "7f8b9a10-4c32-45a8-98e1-0a91176b509f",
  "facility_id": "e2a9b31d-8f92-493e-862d-091a1347072c",
  "status": "completed",
  "scenario_name": "Inflow BOD Spike +40%",
  "scenario_type": "influent_quality_change",
  "comparison_summary": {
    "total_steps": 8,
    "non_compliant_steps_count": 0,
    "compliance_risk_detected": false,
    "max_scenario_bod": 26.4,
    "max_baseline_bod": 20.8
  },
  "results": [
    {
      "step_index": 0,
      "simulation_timestamp": "2026-10-17T12:00:00Z",
      "treatment_stage": "final_effluent",
      "parameter": "bod",
      "baseline_value": 20.8,
      "scenario_value": 22.1,
      "unit": "mg/L",
      "estimated_compliance_status": "compliant",
      "uncertainty_interval": {"lower": 19.8, "upper": 24.4},
      "data_origin": "hypothetical"
    }
  ]
}
```

---

### 4.3 Forward Water Quality Predictions (`GET /api/v1/facilities/{id}/twin/predictions`)
**Response (200 OK):**
```json
{
  "prediction_id": "3b29c91f-0e42-4981-87a4-927167eb1c28",
  "facility_id": "e2a9b31d-8f92-493e-862d-091a1347072c",
  "horizon_hours": 24.0,
  "status": "ready",
  "predicted_values": {
    "bod": 21.4,
    "cod": 72.1,
    "tss": 11.2,
    "ph": 7.35,
    "nh4_n": 7.8
  },
  "uncertainty_bounds": {
    "bod": {"mae": 3.42, "lower": 17.98, "upper": 24.82},
    "cod": {"mae": 14.15, "lower": 57.95, "upper": 86.25},
    "tss": {"mae": 4.10, "lower": 7.10, "upper": 15.30},
    "ph": {"mae": 0.18, "lower": 7.17, "upper": 7.53}
  },
  "input_features": {
    "bod": 185.0,
    "cod": 410.0,
    "tss": 210.0,
    "ph": 7.4
  },
  "created_at": "2026-10-17T12:05:00Z"
}
```
*UI Note:* If `status` is `"insufficient_data"`, display an informative banner: `"Forward predictions paused: awaiting complete influent sensor observations (BOD/COD/TSS/pH)"`.

---

### 4.4 Operational Advisory Recommendations (`GET /api/v1/facilities/{id}/twin/recommendations`)
**Response (200 OK):**
```json
[
  {
    "recommendation_id": "5f9e8a12-8812-4c22-9901-b12976451e08",
    "facility_id": "e2a9b31d-8f92-493e-862d-091a1347072c",
    "recommendation_type": "aeration_do_setpoint_adjustment",
    "priority": "medium",
    "suggested_action": "Increase aeration blower VFD output to raise DO setpoint from 2.0 to 2.5 mg/L.",
    "expected_outcome": "Enhances biological nitrification rate by ~25% and suppresses effluent ammonia spike.",
    "evidence": [
      "Effluent NH4-N projected at 18.5 mg/L nearing CPCB limit (50 mg/L)",
      "Aeration DO concentration observed at 1.4 mg/L"
    ],
    "limitations": [
      "Advisory only: does not actuate physical blowers autonomously.",
      "Requires manual confirmation and field inspection."
    ],
    "requires_human_approval": true,
    "status": "active"
  }
]
```

---

### 4.5 Water Recycling & Sustainability Accounting (`GET /api/v1/facilities/{id}/twin/sustainability`)
**Response (200 OK):**
```json
{
  "facility_id": "e2a9b31d-8f92-493e-862d-091a1347072c",
  "evaluated_at": "2026-10-17T12:00:00Z",
  "capacity_mld": 25.0,
  "reuse_volume_m3_day": 18750.0,
  "freshwater_displacement_m3_day": 18750.0,
  "annual_freshwater_saved_m3": 6843750.0,
  "safe_reuse_gate": "PASSED",
  "safe_reuse_eligible": true,
  "reuse_applications": [
    "Landscape Irrigation (Parks & Green Belts)",
    "Industrial Cooling Water Recirculation",
    "Urban Construction & Dust Suppression",
    "Toilet Flushing (Dual-Plumbing Urban STPs)"
  ],
  "effluent_quality_summary": {
    "bod": 20.84,
    "cod": 70.65,
    "tss": 10.35,
    "ph": 7.34,
    "data_quality": "valid"
  }
}
```

---

## 5. Frontend Smoke Test Suite

Frontend engineers can execute these curl commands against a running local backend (`http://localhost:8000`) using the seeded accounts:

### 1. Authenticate as Plant Operator
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=operator1&password=OperatorPassword123!"
```
*Save `access_token` from response as `TOKEN`.*

### 2. Fetch Facility Digital Twin State
```bash
curl -X GET http://localhost:8000/api/v1/facilities/{FACILITY_ID}/twin \
  -H "Authorization: Bearer $TOKEN"
```

### 3. Run a What-If Scenario
```bash
curl -X POST http://localhost:8000/api/v1/facilities/{FACILITY_ID}/twin/scenarios \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "scenario_type": "influent_quality_change",
    "scenario_name": "Shock Load Test",
    "duration_minutes": 60,
    "time_step_seconds": 900,
    "parameters": {"bod_change_percent": 25.0}
  }'
```

### 4. Fetch Sustainability Metrics
```bash
curl -X GET http://localhost:8000/api/v1/facilities/{FACILITY_ID}/twin/sustainability \
  -H "Authorization: Bearer $TOKEN"
```
