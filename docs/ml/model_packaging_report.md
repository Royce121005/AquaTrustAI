# AquaTrust AI — Model Packaging and Serialization Report (Phase 14)

**Package Status:** `PACKAGED_AND_VERIFIED`
**Model Version:** `iforest_v2.2.1`
**Feature Set Version:** `v2.2.1`
**Preprocessing Version:** `v2.2.1`
**Packaging Timestamp:** `2026-09-27T16:03:12.131364+00:00`

---

## 1. Production Package Directory Structure

All production model artifacts have been serialized in `ml/models/anomaly_detection/`:

```
ml/models/anomaly_detection/
├── isolation_forest.joblib        # Master serialized dictionary bundle of all parameter models
├── scaler.joblib                  # Serialized dictionary of training-fitted StandardScaler objects
├── feature_config.yaml            # Machine-readable feature definitions and ordering
├── model_metadata.json            # Lineage, training timestamps, dataset hashes, thresholds
├── evaluation.json                # Complete benchmark metrics and latency results
└── models/                        # Individual parameter & stream model binaries
    ├── isolation_forest_bod.joblib
    ├── isolation_forest_cod.joblib
    ├── isolation_forest_tss.joblib
    ├── isolation_forest_ph.joblib
    ├── isolation_forest_nh4_n.joblib
    ├── isolation_forest_tkn.joblib
    └── iforest_stream_*.joblib (21 stream models)
```

---

## 2. Artifact Checksums & Integrity (SHA-256)

| Artifact File | Role in Pipeline | SHA-256 Checksum |
| :--- | :--- | :--- |
| **`isolation_forest.joblib`** | Primary Model Bundle | `c92cad23ff69ed139632b1d72159f3325bf62f3cdd2c83fb1543ecde93544dab` |
| **`scaler.joblib`** | Preprocessing Scalers | `2f2456e9d5bb100277974a651242742d96234f057eb1941a60d0543cdfb8b482` |
| **`feature_config.yaml`** | Feature Configuration | `0177a4cf6c94fa3b8289ba0562a0d9230ff4404920aab7313d7c73c19ea8351c` |
| **`model_metadata.json`** | Production Metadata | `3e5d57034fe539223d8cdc9d540583771e67c63089fc7c8bb5108ec49c7ae467` |
| **`evaluation.json`** | Benchmark Metrics | `6c85eefa660865a8e0de585d08e41743ab8689606e987e74c0b48f14f6bd06b7` |

---

## 3. Dataset Lineage & Training Provenance

| Pipeline Component | Source File Reference | SHA-256 Checksum |
| :--- | :--- | :--- |
| **Training Split** | `datasets/anomaly_detection/splits/train.csv` | `099b6d58d45adf1092c68cb8e4311eba80f18658209796099892edc2864cb444` |
| **Validation Split** | `datasets/anomaly_detection/splits/validation.csv` | `5abdd51a953b08de523fc71afeb48260c24aa18e69cab8cf4b532c47db0b5350` |
| **Clean Test Split** | `datasets/anomaly_detection/splits/test.csv` | `e0563e069b71c14eb5f6bc6a7dca1fcace49c37e09ada010c6c1d2a1bef630ab` |
| **Injected Test Split** | `datasets/anomaly_detection/splits/test_with_injected_anomalies.csv` | `86fcedda120efd5605d5284cd05f7713bdf5f09f970c2cbbf6e07b775e245fa9` |

---

## 4. Loading & Consumption Instructions

### Python Inference Example:

```python
import joblib
import yaml
import numpy as np

# 1. Load Feature Configuration
with open("ml/models/anomaly_detection/feature_config.yaml", "r") as f:
    config = yaml.safe_load(f)

# 2. Load Model Bundle
models = joblib.load("ml/models/anomaly_detection/isolation_forest.joblib")
bod_model = models["bod"]

# 3. Load Scalers
scalers = joblib.load("ml/models/anomaly_detection/scaler.joblib")

# 4. Predict
# Vector: [value_t_scaled, delta_1_scaled, rolling_mean_3_scaled, rolling_std_3_scaled]
sample_vector = np.array([[0.25, 0.10, 0.22, 0.04]])
score = bod_model.decision_function(sample_vector)[0]
anomaly_status = "normal" if score >= 0.0 else "anomalous"
```

---

## 5. Compatibility & Environment Requirements

- **Python Version:** `>= 3.10`
- **scikit-learn:** `1.7.2`
- **joblib:** `1.5.2`
- **pandas:** `2.2.3`
- **PyYAML:** `6.0.2`

---
**Report Certified by:** AquaTrust AI Data + AI Workstream (Member 1 Lead)
