# AquaTrust AI — Member 1 Completion Report (Phase 4: Process Recommendations)

**Author:** Member 1 (AI / Machine Learning Lead)  
**Target Consumers:** Member 2 (Backend Lead), Member 3 (Blockchain & Frontend Lead)  
**Date:** November 2026  
**Status:** **COMPLETE & FULLY VERIFIED (21/21 Total New Tests Passed Across P2, P3 & P4)**

---

## 1. Executive Summary

In accordance with the **Revised Implementation Plan (Phase 4)**, Member 1 has implemented the **Process Recommendations Engine** (`AquaTrustProcessRecommendationEngine`).

This engine bridges:
1. **Phase 2 Sensor Trust Diagnostics** (stuck sensor, sensor failure, drift, stoichiometric inconsistency)
2. **Phase 3 Treatment Quality Predictions** (forward-looking BOD, COD, TSS, and pH forecasts relative to CPCB limits)
3. **Plant Operating States** (organic load, flow rate $Q$, energy consumption)

It translates analytical outputs into **prioritized, actionable, quantitative operating directives** with target setpoints for treatment plant operators.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        MEMBER 1 PROCESS RECOMMENDATIONS PIPELINE                       │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  [INPUT SIGNALS]                                                                       │
│  - Predicted Effluent Quality (BOD, COD, TSS, pH 6h ahead from Phase 3)                │
│  - Anomaly & Sensor Trust Results (Stuck probe, failure, drift from Phase 2)          │
│  - Current Inflow & Loading Parameters                                                 │
│                                           ↓                                            │
│  [PRESCRIPTIVE DECISION ENGINE (AquaTrustProcessRecommendationEngine)]                 │
│  - Prioritizes by Severity: CRITICAL -> HIGH -> MEDIUM -> LOW                          │
│  - Classifies by Domain: AERATION, CHEMICAL_DOSING, HYDRAULIC_CONTROL, MAINTENANCE     │
│  - Computes Quantitative Target Setpoints (e.g. DO: 1.5 -> 2.5 mg/L, PAC: +25%)        │
│                                           ↓                                            │
│  [STANDARDIZED API CONTRACT FOR MEMBER 2 & 3]                                          │
│  - RecommendationBatchOutput with title, action, reason, severity, target setpoints   │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Operational Categories & Prescriptive Rules

| Operational Category | Trigger Condition | Severity & Urgency | Action & Target Setpoint |
|---|---|:---:|---|
| **AERATION** | Forecasted Effluent $\text{BOD} > 30 \text{ mg/L}$ | **HIGH** <br>*(Within 1 hr)* | **Increase Blower Output:** Raise blower VFD speed (+20%). <br>• Setpoint: Dissolved Oxygen ($\text{DO}$) $\to 2.5 \text{ mg/L}$. |
| **AERATION** | Forecasted Effluent $\text{BOD} \in [24, 30] \text{ mg/L}$ | **MEDIUM** <br>*(Within 4 hrs)* | **Trim Blower Output (+10%):** Raise $\text{DO}$ from $1.6 \to 2.2 \text{ mg/L}$. |
| **HYDRAULIC_CONTROL** | Forecasted Effluent $\text{COD} > 250 \text{ mg/L}$ | **CRITICAL** <br>*(Within 1 hr)* | **Divert Flow & Increase RAS:** Open equalization gate by 20%; increase Return Activated Sludge ($\text{RAS}$) by +15%. |
| **CHEMICAL_DOSING** | Forecasted Effluent $\text{TSS} > 100 \text{ mg/L}$ | **HIGH** <br>*(Within 1 hr)* | **Increase Coagulant Dosing:** Increase PAC/Alum metering pump by +25% ($\text{PAC} \to 22.5 \text{ mg/L}$). Inspect clarifier scraper. |
| **CHEMICAL_DOSING** | Predicted Effluent $\text{pH} \notin [5.5, 9.0]$ | **HIGH** <br>*(Immediate)* | **Activate pH Neutralization:** Dose $\text{NaOH}$ (if acidic) or $\text{H}_2\text{SO}_4$ (if alkaline) to restore pH to $7.2$. |
| **MAINTENANCE** | Sensor Trust: `STUCK_SENSOR` | **HIGH** <br>*(Within 4 hrs)* | **Inspect & Clean Probe:** Dispatch technician to clear biofouling on optical face and verify transducer. |
| **MAINTENANCE** | Sensor Trust: `SENSOR_FAILURE` | **CRITICAL** <br>*(Immediate)* | **Isolate & Replace Sensor:** Switch SCADA control to manual setpoints; isolate and replace damaged probe. |
| **MAINTENANCE** | Sensor Trust: `SENSOR_DRIFT` | **MEDIUM** <br>*(Routine)* | **Recalibrate Sensor:** Schedule two-point buffer calibration at end of shift. |
| **MAINTENANCE** | Sensor Trust: `PARAMETER_INCONSISTENCY` | **HIGH** <br>*(Within 1 hr)* | **Re-Verify Analytical Measurements:** Quarantine sample; re-test spectrophotometer curve ($\text{COD} \ge \text{BOD}$). |
| **RESOURCE_SAVING** | Clean water / low load ($\text{BOD} < 14$, $\text{COD} < 75$) | **LOW** <br>*(Routine)* | **Throttle Blower VFD:** Reduce blowers by -20% (save ~140 kWh/day / ₹1,120/day) while keeping $\text{DO} \ge 1.8 \text{ mg/L}$. |

---

## 3. How Member 2 (Backend Lead) Integrates This

Member 2 can now expose `GET /api/v1/recommendations/active` and `GET /api/v1/recommendations/history` by simply calling Member 1's engine:

```python
from ml.recommendations import AquaTrustProcessRecommendationEngine

rec_engine = AquaTrustProcessRecommendationEngine()

# Pass current facility's predictions and latest anomalies
batch = rec_engine.generate_recommendations(
    facility_id="BHARWARA_STP",
    prediction_output=latest_prediction, # from Phase 3 engine
    anomaly_outputs=recent_anomalies     # from Phase 2 engine
)

# Return standard JSON payload directly to the frontend
return batch.to_dict()
```

---

## 4. How Member 3 (Frontend Lead) Displays This

Member 3 can now **replace the placeholder card** in `frontend/src/App.tsx` (*"Recommendations not available: backend does not expose a recommendation engine"*) with active cards showing:
* **Severity Badge:** `CRITICAL` (Red), `HIGH` (Orange), `MEDIUM` (Yellow), `LOW` (Green/Blue)
* **Urgency:** `IMMEDIATE`, `WITHIN_1_HOUR`, `WITHIN_4_HOURS`
* **Action Header:** e.g., *"Increase Aeration Basin Air Flow"*
* **Action Details:** Detailed operator instructions
* **Target Setpoint Badge:** e.g., *"DO: 1.5 → 2.5 mg/L"* or *"PAC: 15.0 → 22.5 mg/L"*
* **Estimated Impact:** e.g., *"Prevents statutory CPCB breach; projected BOD reduction of 8-12 mg/L."*

---

## 5. Automated Test Status

```
AquaTrustAI/datasets/tests/test_phase4_recommendations.py::test_nominal_state_no_critical_recommendations PASSED
AquaTrustAI/datasets/tests/test_phase4_recommendations.py::test_predicted_bod_breach_generates_aeration_rec PASSED
AquaTrustAI/datasets/tests/test_phase4_recommendations.py::test_stuck_sensor_generates_maintenance_rec PASSED
AquaTrustAI/datasets/tests/test_phase4_recommendations.py::test_sensor_failure_generates_critical_rec PASSED
AquaTrustAI/datasets/tests/test_phase4_recommendations.py::test_energy_throttling_during_low_load PASSED
AquaTrustAI/datasets/tests/test_phase4_recommendations.py::test_batch_serialization_contract PASSED

6 passed in 2.47s (100% PASS)
```
