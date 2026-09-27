# AquaTrust AI — Simulator Data Contract & Integration Specification

**Document Version:** 1.0.0  
**Phase:** 16–17 — Simulator Statistical Profiles & Integration Support  
**Authors:** Member 1 (ML / Data Pipeline Lead)  
**Target Consumer:** Member 2 (Backend / Simulator / API Lead)  
**Target Runtime:** AquaTrust AI Synthetic Plant Telemetry Generator  

---

## 1. Purpose & Architectural Ownership

This contract establishes the formal integration interface between the empirical machine learning foundation (delivered by **Member 1**) and the synthetic streaming simulator (delivered by **Member 2**).

* **Member 1 Responsibility:** Provides empirical parameter distributions, operating ranges, lag autocorrelations, stoichiometric constraints, anomaly recipes, and data validation rules derived from historical observed datasets.
* **Member 2 Responsibility:** Implements the execution runtime, multi-facility clock/ticker, telemetry emitter, FastAPI endpoints, event loops, and simulated database persistence.

```
+-----------------------------------------------------------------------------------+
|                        MEMBER 1: STATISTICAL KNOWLEDGE BASE                       |
|  - parameter_distributions.json (Lognormal/Normal empirical fits)                |
|  - operating_ranges.yaml (Statistical vs Regulatory Boundaries)                   |
|  - temporal_profiles.json (Diurnal multipliers, AR(1) autocorrelation)            |
|  - correlation_profiles.json (COD/BOD, Nitrogen fractions, removal rates)         |
|  - anomaly_scenarios.yaml (8 Injection recipes for sensor & process upsets)       |
+-----------------------------------------------------------------------------------+
                                          |
                              Configuration Handoff
                                          v
+-----------------------------------------------------------------------------------+
|                        MEMBER 2: SIMULATOR RUNTIME ENGINE                         |
|  1. Multi-Facility Clock (e.g. 15-min simulated cadence)                          |
|  2. Baseline Concentration Generator (Stochastic AR(1) + Diurnal Curve)           |
|  3. Stoichiometric Coupled Sampler (Enforces COD >= BOD, TN >= TKN)              |
|  4. Anomaly Injector Module (Applies recipes from anomaly_scenarios.yaml)         |
|  5. Output Emitter with data_origin = "simulated"                                 |
+-----------------------------------------------------------------------------------+
                                          |
                                   Streaming Feed
                                          v
+-----------------------------------------------------------------------------------+
|                        DOWNSTREAM: AI INFERENCE ENGINE                            |
|             AquaTrustAnomalyInferenceEngine.predict(reading)                      |
|  Returns: anomaly_status, anomaly_score (preserving quality_status & compliance)   |
+-----------------------------------------------------------------------------------+
```

---

## 2. Telemetry Output Data Contract

Every record emitted by the simulator must conform to the canonical JSON data contract below:

### 2.1 Canonical Simulated Reading Schema

```json
{
  "facility_id": "SIM_STP_001",
  "sensor_id": "SENSOR_COD_01",
  "timestamp": "2026-01-01T10:15:00Z",
  "parameter": "COD",
  "value": 48.6,
  "unit": "mg/L",
  "measurement_stage": "final_effluent",
  "data_origin": "simulated",
  "quality_status": "valid",
  "compliance_status": "compliant",
  "simulation_metadata": {
    "profile_source": "DATASET_01_UCI_WATER_TREATMENT",
    "scenario_id": "NOMINAL_OPERATION",
    "noise_level_sigma": 0.05,
    "diurnal_factor": 1.40
  }
}
```

### 2.2 Schema Definitions & Constraints

| Field | Type | Required | Permissible Values | Description |
| :--- | :--- | :--- | :--- | :--- |
| `facility_id` | `str` | **Yes** | e.g. `SIM_STP_001`, `SIM_FAC_02` | Unique simulated facility identifier. |
| `sensor_id` | `str` | **Yes** | e.g. `SENSOR_PH_01`, `SENSOR_COD_01` | Unique sensor hardware tag. |
| `timestamp` | `str` | **Yes** | ISO-8601 UTC string (`YYYY-MM-DDTHH:MM:SSZ`) | Simulated measurement time. |
| `parameter` | `str` | **Yes** | `BOD`, `COD`, `TSS`, `pH`, `NH4-N`, `TN`, `TKN` | Water quality parameter. |
| `value` | `float` / `null` | **Yes** | Float $\ge 0.0$ (or `null` for missing packets) | Numeric concentration/value. |
| `unit` | `str` | **Yes** | `mg/L`, `pH_units`, `ppm` | Engineering unit. |
| `measurement_stage` | `str` | **Yes** | `inlet`, `primary_settler`, `secondary_settler`, `final_effluent` | Process stage. |
| `data_origin` | `str` | **Yes** | `"simulated"` (or `"observed"`, `"injected"`) | **Provenance tag.** Must NEVER be omitted. |
| `quality_status` | `str` | **Yes** | `"pending"`, `"valid"`, `"invalid"`, `"suspect"`, `"insufficient_data"` | Deterministic sensor quality status. |
| `compliance_status` | `str` | **Yes** | `"pending"`, `"compliant"`, `"non_compliant"`, `"not_applicable"` | Regulatory discharge limit flag. |

> [!IMPORTANT]
> **Authoritative Canonical Status Enum Specifications (Tier 1 Pydantic Model)**  
> Every emitted canonical reading payload MUST populate `quality_status`, `anomaly_status`, and `compliance_status` using ONLY valid canonical enum values defined in `datasets/canonical/models.py`:
> 
> * **`quality_status`**: `"pending"`, `"valid"`, `"invalid"`, `"suspect"`, `"insufficient_data"`
> * **`anomaly_status`**: `"pending"`, `"normal"`, `"anomalous"`, `"insufficient_data"`
> * **`compliance_status`**: `"pending"`, `"compliant"`, `"non_compliant"`, `"not_applicable"`
> 
> **Distinction Between Canonical Enums and Informal Reason Codes / Metadata:**  
> Informal scenario terms appearing in recipe documentation or prose — such as `"missing"`, `"range_violation"`, `"stuck"`, `"range_violation_or_stuck"`, `"duplicate_rejected"`, `"multivariate_inconsistency"`, `"insufficient_data_or_ignored"`, `"unknown"`, or `"warning"` — are **NOT** canonical status enum values.
> 
> These terms represent validation reason codes, scenario metadata, ground-truth metadata, or informal documentation labels. They MUST be stored in `metadata` (e.g., `metadata["quality_reason"] = "multivariate_inconsistency"` or `metadata["ground_truth"]["injection_details"]["quality_reason"] = "duplicate_rejected"`), while the top-level canonical status field takes its valid Pydantic enum value (e.g. `quality_status = "invalid"`, `"suspect"`, or `"insufficient_data"`). Serializing non-canonical terms directly into top-level status enum fields is strictly prohibited.

---

## 3. Strict Provenance Tracking Rules

To prevent data contamination across the AI and blockchain pipelines:

1. **Observed Historical Data:** Must strictly specify `"data_origin": "observed"`.
2. **Synthetic Simulator Streams:** Must strictly specify `"data_origin": "simulated"`.
3. **Controlled Injected Evaluation Datasets:** Must strictly specify `"data_origin": "injected"`.

> [!CAUTION]
> The simulator engine must NEVER emit simulated readings with `"data_origin": "observed"`. Any downstream consumer, audit log, or DLT ledger must be able to filter by `data_origin`.

---

## 4. Orthogonal Status Triad (Audit & Regulatory Invariant)

The simulator pipeline must maintain three strictly independent status fields on every observation:

```
                  +---------------------------------------------------+
                  |                 OBSERVATION PAYLOAD               |
                  +---------------------------------------------------+
                     /                       |                      \
                    /                        |                       \
   +------------------------+  +---------------------------+  +--------------------------+
   |     quality_status     |  |      anomaly_status       |  |    compliance_status     |
   | (Sensor/Telemetry QA)  |  |    (AI Isolation Forest)  |  |   (Regulatory Limits)    |
   +------------------------+  +---------------------------+  +--------------------------+
   | - "valid"              |  | - "normal"                |  | - "compliant"            |
   | - "missing"            |  | - "anomalous"             |  | - "non_compliant"        |
   | - "stuck"              |  | - "insufficient_data"     |  | - "warning"              |
   | - "range_violation"    |  +---------------------------+  +--------------------------+
   | - "inconsistent"       |
   +------------------------+
```

### Invariant Validation Table

| Scenario | `quality_status` | `anomaly_status` | `compliance_status` | Explanation |
| :--- | :--- | :--- | :--- | :--- |
| **Nominal Baseline** | `valid` | `normal` | `compliant` | All systems nominal. |
| **Operational Surge** | `valid` | `anomalous` | `compliant` | Sudden load increase, but still within legal discharge limits. |
| **Permit Violation** | `valid` | `anomalous` | `non_compliant` | Discharge exceeds statutory standard (e.g. COD > 250 mg/L). |
| **Sensor Disconnection**| `missing` | `insufficient_data` | `compliant` | Sensor packet lost (value = null); AI skips scoring. |
| **Stuck Optical Probe** | `stuck` | `anomalous` | `compliant` | Sensor frozen on single value; AI detects zero variance anomaly. |

---

## 5. Statistical Profile Consumption Guide for Member 2

### 5.1 Sampling Distributions (`parameter_distributions.json`)
For any facility and stage, Member 2 should generate nominal baseline observations by sampling from the empirical distribution fitted by Member 1:

```python
import numpy as np

# Example: Sampling Effluent COD using Lognormal Fit
mu_log = 4.35       # From parameter_distributions.json
sigma_log = 0.42    # From parameter_distributions.json
cod_baseline = np.random.lognormal(mean=mu_log, sigma=sigma_log)
```

### 5.2 Diurnal Load Multipliers (`temporal_profiles.json`)
Apply the hourly diurnal multiplier $F_h$ to reflect realistic municipal peak/off-peak sewage inflows:

$$\text{Value}(t) = \text{Baseline}(t) \times F_{\text{hour}(t)} + \epsilon_t$$

Where $F_{\text{hour}}$ peaks at $1.45$ around 08:00–10:00 (morning peak) and $1.42$ at 19:00–21:00 (evening peak), dropping to $0.48$ at 03:00 (night minimum).

### 5.3 Enforcing Physical Stoichiometry (`correlation_profiles.json`)
When generating multi-parameter readings at timestamp $t$:
1. **COD vs BOD Constraint:** Enforce $\text{COD}_t \ge 1.6 \times \text{BOD}_t$. Biological oxygen demand can never exceed chemical oxygen demand.
2. **Nitrogen Speciation Constraint:** Enforce $\text{TN}_t \ge \text{TKN}_t \ge \text{NH}_{4}\text{-N}_t$.
3. **Stage Removal Coupling:** When simulating multiple treatment units, calculate effluent from influent using empirical removal rates (e.g. Primary Settler TSS removal: 40–75%, Secondary Settler BOD removal: 85–98%).

---

## 6. Anomaly Injection Recipe Execution (`anomaly_scenarios.yaml`)

Member 2 can trigger any of the 8 standardized anomaly scenarios using the parameters documented in `anomaly_scenarios.yaml`:

| Scenario ID | Name | Duration | Target Parameters | Generation Rule |
| :--- | :--- | :--- | :--- | :--- |
| `SCENARIO_01` | Sensor Spike | 1 step | `pH`, `COD`, `TSS`, `NH4-N` | $x_{\text{inj}} = x_{\text{nominal}} \times 5.0$ or $\text{pH} = 13.5$ |
| `SCENARIO_02` | Sensor Drop | 3 steps | `COD`, `BOD`, `TSS`, `NH4-N` | $x_{\text{inj}} = 0.0$ |
| `SCENARIO_03` | Stuck Sensor | 8 steps | Any | $x_{t+k} = x_t$ (constant floating-point value) |
| `SCENARIO_04` | Sensor Drift | 24 steps | `pH`, `COD`, `NH4-N` | $x_{t+k} = x_{\text{nominal}} + 0.05 \cdot \sigma \cdot k$ |
| `SCENARIO_05` | Missing Reading| 4 steps | Any | $x_t = \text{null}$ |
| `SCENARIO_06` | Duplicate Reading| 1 step | Any | Re-transmit reading $t$ with identical timestamp |
| `SCENARIO_07` | Parameter Inconsistency | 2 steps | `BOD`, `COD` | Invert ratio ($\text{BOD} = 140.0, \text{COD} = 45.0$) |
| `SCENARIO_08` | Sudden Process Change | 16 steps | `COD`, `BOD`, `TSS`, `pH` | Influent surge ($3\times$), effluent degradation ($2.5\times$), $\text{pH} = 5.8$ |

---

## 7. Python Integration Template

```python
import time
from datetime import datetime, timezone
from ml.inference import AquaTrustAnomalyInferenceEngine

# 1. Initialize inference engine
ai_engine = AquaTrustAnomalyInferenceEngine()

# 2. Simulated reading generation loop
def emit_simulated_reading(facility_id, param, value, unit, stage="final_effluent", quality_status="valid", compliance_status="compliant"):
    payload = {
        "facility_id": facility_id,
        "sensor_id": f"SENSOR_{param.upper()}_01",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "parameter": param,
        "value": value,
        "unit": unit,
        "measurement_stage": stage,
        "data_origin": "simulated",
        "quality_status": quality_status,
        "compliance_status": compliance_status
    }
    
    # Run through Member 1 AI Inference Engine
    ai_output = ai_engine.predict(payload)
    
    # Merge AI anomaly result into emitted stream
    result = {
        **payload,
        "anomaly_status": ai_output.anomaly_status,
        "anomaly_score": ai_output.anomaly_score,
        "model_version": ai_output.model_version,
        "explanation": ai_output.explanation
    }
    return result
```
