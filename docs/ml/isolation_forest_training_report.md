# AquaTrust AI — Isolation Forest Model Training Report (Phase 11)

**Execution Status:** `TRAINED_AND_FROZEN`
**Framework:** `scikit-learn v1.9.1`
**Model Architecture:** Parameter-Specific & Stream-Specific Isolation Forest Baseline
**Execution Timestamp:** `2026-09-27T16:02:42.758007+00:00`

---

## 1. Lineage & Training Input Integrity

The Isolation Forest models were fitted **strictly and exclusively** on the chronological training split (`train.csv`). Zero validation or test observations were consumed during training or threshold calculation.

| Artifact Property | Value / Verification |
| :--- | :--- |
| **Training File Path** | `datasets/anomaly_detection/splits/train.csv` |
| **Training SHA-256 Checksum** | `099b6d58d45adf1092c68cb8e4311eba80f18658209796099892edc2864cb444` |
| **Feature Set Version** | `v2.2.1` |
| **Preprocessing Version** | `v2.2.1` |
| **Zero-Leakage Invariant** | **VERIFIED:** `validation.csv` and `test.csv` were excluded with 0 samples seen. |
| **Feature Vectors Applied** | `["value_t_scaled", "delta_1_scaled", "rolling_mean_3_scaled", "rolling_std_3_scaled"]` |

---

## 2. Model Configuration & Hyperparameters

In strict adherence to the frozen project specification, the model architecture is configured as follows:

```json
{
  "n_estimators": 200,
  "contamination": 0.05,
  "random_state": 42,
  "bootstrap": false,
  "max_samples": "auto",
  "max_features": 1.0
}
```

---

## 3. Parameter-Level Model Training Summary

| Parameter | Canonical Name | Status | Training Samples | Streams Covered | Frozen Offset Threshold | Model Binary Artifact |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `BOD` | BOD | `TRAINED` | 1,706 | 6 | `-0.573017` | `isolation_forest_param_bod.joblib` |
| `COD` | COD | `TRAINED` | 2,607 | 5 | `-0.574702` | `isolation_forest_param_cod.joblib` |
| `TSS` | TSS | `TRAINED` | 1,452 | 4 | `-0.575759` | `isolation_forest_param_tss.joblib` |
| `PH` | PH | `TRAINED` | 1,461 | 4 | `-0.571168` | `isolation_forest_param_ph.joblib` |
| `NH4_N` | NH4_N | `TRAINED` | 2,158 | 2 | `-0.582334` | `isolation_forest_param_nh4_n.joblib` |
| `TKN` | TKN | `TRAINED` | 911 | 1 | `-0.550606` | `isolation_forest_param_tkn.joblib` |
| `TN` | TN | `NOT_AVAILABLE` | 0 | 0 | `N/A` | `None (No fake model trained)` |
| `NOX_N` | NOX_N | `NOT_AVAILABLE` | 0 | 0 | `N/A` | `None (No fake model trained)` |


---

## 4. Unavailable Parameters Documentation

Per strict project instructions:
1. **Total Nitrogen (`TN`) & Nitrate/Nitrite (`NOx-N`):** In the historical observation window of the training partition, nitrogen parameters in the raw public source datasets contained sporadic non-continuous measurements, resulting in 0 contiguous 3-period trailing observation windows in `train.csv`.
2. **Policy Adherence:** No synthetic or fake parameter data was fabricated. These parameters are explicitly flagged as `NOT_AVAILABLE` / `INSUFFICIENT_TRAINING_DATA` in `model_metadata.json` and will be handled gracefully by the downstream inference layer as `insufficient_data`.

---

## 5. Decision Threshold Methodology

1. **Threshold Formulation:** The anomaly score for an observation vector $\mathbf{x}$ is computed as $s(\mathbf{x}) = \text{decision\_function}(\mathbf{x})$.
2. **Decision Boundary:**
   - $\text{anomaly\_status} = \texttt{normal} \quad \text{if} \quad s(\mathbf{x}) \ge 0.0$
   - $\text{anomaly\_status} = \texttt{anomalous} \quad \text{if} \quad s(\mathbf{x}) < 0.0$
3. **Training Quantile Calibration:** The 5th percentile decision score on training data corresponds to the configured contamination parameter ($c = 0.05$) and is serialized in `frozen_thresholds.json`.

---

## 6. Generated Working Artifacts

All Phase 11 artifacts have been stored in the dedicated working directory `datasets/anomaly_detection/trained_models`:
- `models/isolation_forest_param_*.joblib` (6 parameter-level model binaries)
- `models/iforest_stream_*.joblib` (21 stream-specific model binaries)
- `frozen_thresholds.json`
- `model_metadata.json`

---
**Report Certified by:** AquaTrust AI Data + AI Workstream (Member 1 Lead)
