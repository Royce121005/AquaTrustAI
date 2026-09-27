# AquaTrust AI — AI Inference Engine & Member 2 Integration Contract

**Document Version:** 1.0.0  
**Phase:** 15 — AI Inference Engine + Member 2 Contract  
**Model Version:** `iforest_v2.2.1`  
**Feature Set Version:** `v2.2.1`  
**Target Audience:** Member 2 (Backend / Simulator / API Integration Lead), System Architects, Compliance Auditors  

---

## 1. Executive Summary & Purpose

This contract specifies the stable, decoupled interface provided by **Member 1 (ML / Data Pipeline Lead)** to **Member 2 (Backend / Simulator / API Lead)** for running real-time anomaly detection across canonical wastewater streams.

The interface encapsulates all machine learning logic, feature engineering, trailing sliding windows, artifact loading, scaling, and scoring. Member 2 does not need to know the internal scikit-learn mechanics, model parameters, or directory structures.

```
+-------------------------------------------------------------------------------+
|                             MEMBER 2 (CONSUMER)                              |
|           Simulator / Stream Ingestion / REST API / Event Bus                 |
+-------------------------------------------------------------------------------+
                                      |
                           Canonical Measurement Payload
                                      v
+-------------------------------------------------------------------------------+
|                       MEMBER 1: AI INFERENCE ENGINE                           |
|                                                                               |
|   1. Canonicalize parameter ('pH' -> 'ph', 'NH4-N' -> 'nh4_n')                |
|   2. Update Stream Context Cache (per stream_key)                             |
|   3. Check Trailing History Window (k >= 3):                                  |
|        - If k < 3: Return anomaly_status = "insufficient_data" (score = None) |
|        - If k >= 3: Compute [x_t, delta_1, rolling_mean_3, rolling_std_3]     |
|   4. Apply Training-Fitted StandardScaler (mu_train, sigma_train)             |
|   5. Isolation Forest Decision Function: s(x)                                 |
|   6. Threshold Evaluation: s(x) < 0.0 => "anomalous", >= 0.0 => "normal"     |
|   7. Return Decoupled AnomalyInferenceOutput (Preserving Quality/Compliance)  |
+-------------------------------------------------------------------------------+
```

---

## 2. Parameter Support Matrix

| Canonical Parameter | Aliases Accepted | Canonical Unit | Anomaly Detection Status | Production Model Artifact |
| :--- | :--- | :--- | :--- | :--- |
| **`bod`** | `BOD`, `BOD5`, `Biochemical_Oxygen_Demand` | `mg/L` | **SUPPORTED** | `isolation_forest_bod.joblib` |
| **`cod`** | `COD`, `Chemical_Oxygen_Demand` | `mg/L` | **SUPPORTED** | `isolation_forest_cod.joblib` |
| **`tss`** | `TSS`, `Total_Suspended_Solids` | `mg/L` | **SUPPORTED** | `isolation_forest_tss.joblib` |
| **`ph`** | `pH`, `PH`, `pH_units` | `pH_units` | **SUPPORTED** | `isolation_forest_ph.joblib` |
| **`nh4_n`** | `NH4`, `NH4-N`, `Ammonia`, `Ammonia_Nitrogen` | `mg/L` | **SUPPORTED** | `isolation_forest_nh4_n.joblib` |
| **`tkn`** | `TKN`, `Total_Kjeldahl_Nitrogen` | `mg/L` | **SUPPORTED** | `isolation_forest_tkn.joblib` |
| **`tn`** | `TN`, `Total_Nitrogen` | `mg/L` | **NOT AVAILABLE** | *Insufficient contiguous historical data (<10 samples)* |
| **`nox_n`** | `NOX`, `NOX-N`, `Nitrate_Nitrite` | `mg/L` | **NOT AVAILABLE** | *Insufficient contiguous historical data (<10 samples)* |

> [!NOTE]
> When inference is requested for `tn` or `nox_n`, the engine raises `UnsupportedParameterError` explaining the data limitation without crashing the host process.

---

## 3. Input Contract

### 3.1 JSON / Dict Schema

```json
{
  "facility_id": "STP_001",
  "timestamp": "2026-01-01T10:00:00Z",
  "parameter": "COD",
  "value": 45.2,
  "unit": "mg/L",
  "measurement_stage": "final_effluent",
  "sensor_id": "SENSOR_COD_01",
  "dataset_source": "SIMULATOR",
  "quality_status": "valid",
  "compliance_status": "compliant",
  "metadata": {}
}
```

### 3.2 Field Definitions

| Field | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `facility_id` | `str` | **Yes** | — | Unique identifier of the sewage/effluent treatment plant (e.g. `STP_001`, `FAC_UCI_URBAN_ETP_01`). |
| `timestamp` | `str` / `datetime` | **Yes** | — | ISO-8601 UTC timestamp of observation (e.g. `2026-01-01T10:00:00Z`). |
| `parameter` | `str` | **Yes** | — | Raw parameter name (e.g. `COD`, `pH`, `NH4-N`). Canonicalized automatically. |
| `value` | `float` | **Yes** | — | Numeric sensor measurement value. |
| `unit` | `str` | **Yes** | — | Unit of measurement (e.g. `mg/L`, `pH_units`). |
| `measurement_stage` | `str` | No | `"final_effluent"` | Treatment stage: `inlet`, `primary_settler`, `secondary_settler`, `final_effluent`. |
| `sensor_id` | `str` | No | `None` | Physical or simulated sensor identifier. |
| `dataset_source` | `str` | No | `"SIMULATOR"` | Data provenance tag (`SIMULATOR`, `SCADA`, `LAB`). |
| `quality_status` | `str` | No | `"valid"` | Deterministic data quality flag (`valid`, `missing`, `range_violation`). |
| `compliance_status`| `str` | No | `None` | Regulatory threshold flag (`compliant`, `non_compliant`). |
| `metadata` | `dict` | No | `{}` | Extensible telemetry metadata. |

---

## 4. Output Contract

### 4.1 JSON / Dict Schema

```json
{
  "facility_id": "STP_001",
  "timestamp": "2026-01-01T10:10:00Z",
  "parameter": "COD",
  "value": 45.2,
  "unit": "mg/L",
  "measurement_stage": "final_effluent",
  "anomaly_status": "normal",
  "anomaly_score": 0.142851,
  "model_version": "iforest_v2.2.1",
  "feature_set_version": "v2.2.1",
  "threshold": 0.0,
  "quality_status": "valid",
  "compliance_status": "compliant",
  "features_used": {
    "value_t": 45.2,
    "delta_1": 1.2,
    "rolling_mean_3": 44.5,
    "rolling_std_3": 0.8544
  },
  "explanation": "Normal observation (score=0.1429 >= 0.0). Value 45.2 mg/L aligns with baseline pattern.",
  "inference_latency_ms": 5.42
}
```

### 4.2 Output Field Definitions

| Field | Type | Possible Values | Description |
| :--- | :--- | :--- | :--- |
| `anomaly_status` | `str` | `"normal"`, `"anomalous"`, `"insufficient_data"` | Core inference classification result. |
| `anomaly_score` | `float` or `null` | Real number $[-0.5, +0.5]$ | Raw decision score ($<0.0 \implies$ anomaly, $\ge 0.0 \implies$ normal). `null` when insufficient data. |
| `model_version` | `str` | `"iforest_v2.2.1"` | Traceable model version. |
| `feature_set_version` | `str` | `"v2.2.1"` | Traceable feature engineering version. |
| `threshold` | `float` | `0.0` | Frozen decision boundary threshold. |
| `quality_status` | `str` | As provided in input | **Preserved untouched** from upstream data validation. |
| `compliance_status`| `str` | As provided in input | **Preserved untouched** from upstream regulatory checks. |
| `features_used` | `dict` or `null` | Unscaled features | Unscaled feature vector values computed over sliding window. |
| `explanation` | `str` | Human-readable string | Explainability summary for dashboard logs or alert messages. |
| `inference_latency_ms` | `float` | $>0.0$ | Inference execution time in milliseconds (typically $<10\text{ ms}$). |

---

## 5. Critical Invariants & Rules

### 5.1 Strict Status Separation (Audit Requirement)
AquaTrust AI maintains strict orthogonal separation between three independent statuses:
1. `quality_status`: Deterministic sensor integrity (e.g. range checks, stuck values, null checks).
2. `anomaly_status`: Statistical behavioral detection via Isolation Forest.
3. `compliance_status`: Environmental discharge limit compliance (e.g. CPCB norms).

> [!IMPORTANT]
> The AI inference engine **NEVER** mutates, merges, or overwrites `quality_status` or `compliance_status`. An observation can be simultaneously `quality_status = "valid"`, `compliance_status = "compliant"`, and `anomaly_status = "anomalous"` (e.g. an unexpected operational surge within legal discharge limits).

### 5.2 Insufficient Data Protocol (Zero Imputation Invariant)
* Feature extraction requires a trailing context window of $k=3$ observations ($x_t, x_{t-1}, x_{t-2}$).
* For the first 2 observations in a stream, the engine returns `anomaly_status = "insufficient_data"` and `anomaly_score = None`.
* Artificial zeros, forward-fills, or synthetic variance estimations are **strictly prohibited**.

---

## 6. Python Integration Guide

### 6.1 Installation & Import

```python
from ml.inference import (
    AquaTrustAnomalyInferenceEngine,
    CanonicalReadingInput,
    UnsupportedParameterError,
    InferenceEngineError
)

# Initialize engine (loads serialized models and scalers once at startup)
engine = AquaTrustAnomalyInferenceEngine()
```

### 6.2 Streaming Prediction Example

```python
# 1. First reading in stream (k=1)
res1 = engine.predict({
    "facility_id": "STP_001",
    "timestamp": "2026-01-01T10:00:00Z",
    "parameter": "COD",
    "value": 42.0,
    "unit": "mg/L"
})
print(res1.anomaly_status)  # Output: 'insufficient_data'
print(res1.anomaly_score)   # Output: None

# 2. Second reading in stream (k=2)
res2 = engine.predict({
    "facility_id": "STP_001",
    "timestamp": "2026-01-01T10:05:00Z",
    "parameter": "COD",
    "value": 44.0,
    "unit": "mg/L"
})
print(res2.anomaly_status)  # Output: 'insufficient_data'

# 3. Third reading in stream (k=3 -> full inference ready)
res3 = engine.predict({
    "facility_id": "STP_001",
    "timestamp": "2026-01-01T10:10:00Z",
    "parameter": "COD",
    "value": 45.0,
    "unit": "mg/L"
})
print(res3.anomaly_status)  # Output: 'normal'
print(res3.anomaly_score)   # Output: 0.142851

# 4. Sudden surge anomaly (k=4)
res4 = engine.predict({
    "facility_id": "STP_001",
    "timestamp": "2026-01-01T10:15:00Z",
    "parameter": "COD",
    "value": 350.0,
    "unit": "mg/L"
})
print(res4.anomaly_status)  # Output: 'anomalous'
print(res4.anomaly_score)   # Output: -0.2185
```

### 6.3 Batch Processing

```python
readings = [
    {"facility_id": "STP_001", "timestamp": "2026-01-01T10:00:00Z", "parameter": "pH", "value": 7.4, "unit": "pH_units"},
    {"facility_id": "STP_001", "timestamp": "2026-01-01T10:05:00Z", "parameter": "pH", "value": 7.5, "unit": "pH_units"},
    {"facility_id": "STP_001", "timestamp": "2026-01-01T10:10:00Z", "parameter": "pH", "value": 7.6, "unit": "pH_units"},
]

results = engine.predict_batch(readings)
for r in results:
    print(r.timestamp, r.parameter, r.anomaly_status, r.anomaly_score)
```

### 6.4 Handling Exceptions

```python
try:
    res = engine.predict({
        "facility_id": "STP_001",
        "timestamp": "2026-01-01T10:00:00Z",
        "parameter": "TN",  # Total Nitrogen is not available in baseline model
        "value": 15.0,
        "unit": "mg/L"
    })
except UnsupportedParameterError as e:
    print(f"Handled unsupported parameter: {e.parameter}")
    print(f"Supported parameters are: {e.supported_parameters}")
```

### 6.5 Managing Stream Cache

```python
# Reset sliding window for a single stream when restarting sensor or simulator
engine.reset_stream_cache("STP_001:final_effluent:cod")

# Reset all active stream histories
engine.reset_stream_cache()
```

---

## 7. Fast API Endpoint Integration Example

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
from ml.inference import AquaTrustAnomalyInferenceEngine, UnsupportedParameterError

app = FastAPI(title="AquaTrust AI Anomaly Service")
engine = AquaTrustAnomalyInferenceEngine()

class MeasurementRequest(BaseModel):
    facility_id: str
    timestamp: str
    parameter: str
    value: float
    unit: str
    measurement_stage: Optional[str] = "final_effluent"
    quality_status: Optional[str] = "valid"
    compliance_status: Optional[str] = None

@app.post("/api/v1/ml/anomaly/predict")
def predict_anomaly(payload: MeasurementRequest):
    try:
        output = engine.predict(payload.dict())
        return output.to_dict()
    except UnsupportedParameterError as e:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "UNSUPPORTED_PARAMETER",
                "message": str(e),
                "parameter": e.parameter,
                "supported": e.supported_parameters
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail={"error": "INFERENCE_ERROR", "message": str(e)})
```

---

## 8. Summary of Contract Deliverables

1. Python Module: `ml/inference/`
2. Core Class: `AquaTrustAnomalyInferenceEngine`
3. Schemas: `CanonicalReadingInput`, `AnomalyInferenceOutput`
4. State Manager: `StreamContextCache`
5. Exceptions: `UnsupportedParameterError`, `InvalidReadingError`, `InvalidUnitError`
6. Verified Models: `ml/models/anomaly_detection/` (`isolation_forest.joblib`, `scaler.joblib`)
