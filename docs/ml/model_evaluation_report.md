# AquaTrust AI — Isolation Forest Model Evaluation Report (Phases 12–13)

**Document Version:** `2.2.1`  
**Execution Timestamp:** `2026-09-27T10:33:42.562854+00:00`  
**Evaluated Architecture:** Parameter-Specific & Stream-Specific Unsupervised Isolation Forest  
**Evaluation Target:** Controlled Anomaly Detection Ground Truth & Score Stability  

---

## 1. Executive Summary & Objective

This report provides rigorous, leakage-free empirical evaluation of the AquaTrust AI Isolation Forest anomaly detection models. 

Evaluation is divided into two distinct testing tracks:
1. **Supervised Ground-Truth Benchmark (`test_with_injected_anomalies.csv`):** Evaluates detection accuracy (**Precision, Recall, F1 Score, Confusion Matrix, FPR**) against 7 controlled, domain-realistic wastewater failure scenarios.
2. **Unsupervised Stability Analysis (`test.csv` & `validation.csv`):** Evaluates natural anomaly score distributions, flag rates, and threshold stability across clean observed historical records without fabricating false labels.

---

## 2. Dataset Provenance & Lineage Checksums

| Partition Role | File Name | SHA-256 Checksum | Total Records | Role in Evaluation |
| :--- | :--- | :--- | :--- | :--- |
| **Training Partition** | `train.csv` | `099b6d58d45adf1092c68cb8e4311eba80f18658209796099892edc2864cb444` | 17,561 | Model & Scaler fitting (0% evaluation leakage) |
| **Validation Partition** | `validation.csv` | `5abdd51a953b08de523fc71afeb48260c24aa18e69cab8cf4b532c47db0b5350` | 3,762 | Unsupervised distribution stability audit |
| **Clean Test Partition** | `test.csv` | `e0563e069b71c14eb5f6bc6a7dca1fcace49c37e09ada010c6c1d2a1bef630ab` | 3,788 | Unsupervised nominal false-flag rate audit |
| **Evaluation Benchmark** | `test_with_injected_anomalies.csv` | `86fcedda120efd5605d5284cd05f7713bdf5f09f970c2cbbf6e07b775e245fa9` | 3,788 | Controlled ground-truth classification metrics |

---

## 3. Global Ground-Truth Classification Metrics

The global classification performance across all modeled wastewater parameters evaluated on the controlled injection benchmark is:

| Metric | Formula | Value | Interpretation |
| :--- | :--- | :--- | :--- |
| **Precision** | $\frac{\text{TP}}{\text{TP} + \text{FP}}$ | **`0.2635`** | Proportion of flagged anomalies that were true injected failures. |
| **Recall (TPR)** | $\frac{\text{TP}}{\text{TP} + \text{FN}}$ | **`0.5105`** | Proportion of injected failures successfully detected. |
| **F1 Score** | $2 \times \frac{\text{Prec} \times \text{Rec}}{\text{Prec} + \text{Rec}}$ | **`0.3476`** | Harmonic balance between precision and sensitivity. |
| **False Positive Rate** | $\frac{\text{FP}}{\text{FP} + \text{TN}}$ | **`0.1028`** | Proportion of nominal observed days incorrectly flagged ($< 5\%$ target). |

### Global Confusion Matrix

```
                        Actual Normal (0)      Actual Anomaly (1)
Predicted Normal (0)       TN = 1780              FN = 70   
Predicted Anomaly (1)      FP = 204               TP = 73   
```

---

## 4. Per-Parameter Performance Breakdown

| Parameter | Precision | Recall | F1 Score | FPR | TP | FP | FN | Mean Single Latency | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `BOD` | `0.2558` | `0.4400` | `0.3235` | `0.0749` | 11 | 32 | 14 | `5.6698 ms` | `EVALUATED` |
| `COD` | `0.2299` | `0.4878` | `0.3125` | `0.1447` | 20 | 67 | 21 | `5.4801 ms` | `EVALUATED` |
| `TSS` | `0.3889` | `0.3043` | `0.3415` | `0.0415` | 7 | 11 | 16 | `5.5237 ms` | `EVALUATED` |
| `PH` | `0.2909` | `0.6667` | `0.4051` | `0.1354` | 16 | 39 | 8 | `6.1996 ms` | `EVALUATED` |
| `NH4_N` | `0.2708` | `0.5652` | `0.3662` | `0.0902` | 13 | 35 | 10 | `6.1681 ms` | `EVALUATED` |
| `TKN` | `0.2308` | `0.8571` | `0.3636` | `0.1307` | 6 | 20 | 1 | `5.7074 ms` | `EVALUATED` |
| `TN` | `N/A` | `N/A` | `N/A` | `N/A` | `0` | `0` | `0` | `N/A` | `NOT_AVAILABLE` |
| `NOX_N` | `N/A` | `N/A` | `N/A` | `N/A` | `0` | `0` | `0` | `N/A` | `NOT_AVAILABLE` |


---

## 5. Injected Failure Scenario Detection Breakdown

| Failure Scenario | Evaluated Description | Detection Recall |
| :--- | :--- | :--- |
| `duplicate_observation` | Controlled injection test | `15.8%` (12/76 detected) |
| `extreme_cod` | Controlled injection test | `100.0%` (7/7 detected) |
| `extreme_ph` | Controlled injection test | `100.0%` (3/3 detected) |
| `multivariate_inconsistency` | Controlled injection test | `94.1%` (16/17 detected) |
| `sudden_decrease` | Controlled injection test | `72.2%` (13/18 detected) |
| `sudden_increase` | Controlled injection test | `100.0%` (22/22 detected) |


---

## 6. Score Distribution & Threshold Stability Across Partitions

| Parameter | Validation Mean Score | Clean Test Mean Score | Injected Test Mean Score | Clean Test Flagged % | Baseline Contamination |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `BOD` | `0.1477` | `0.1531` | `0.1349` | `2.29%` | `5.0%` |
| `COD` | `0.1282` | `0.128` | `0.0925` | `5.65%` | `5.0%` |
| `TSS` | `0.153` | `0.1597` | `0.1505` | `3.57%` | `5.0%` |
| `PH` | `0.1297` | `0.1119` | `0.0821` | `6.88%` | `5.0%` |
| `NH4_N` | `0.1845` | `0.1883` | `0.1659` | `4.82%` | `5.0%` |
| `TKN` | `0.122` | `0.0894` | `0.0752` | `8.93%` | `5.0%` |


---

## 7. Inference Latency Benchmarks

Inference latency was benchmarked using steady-state single-reading evaluation and batch processing:

| Metric | Single Reading Latency | Batch Size 10 (per-sample) | Batch Size 50 (per-sample) | Batch Size 100 (per-sample) |
| :--- | :--- | :--- | :--- | :--- |
| **Mean Latency** | `5.6698 ms` | `0.5477 ms` | `0.1117 ms` | `0.0609 ms` |
| **Median (p50)** | `5.4046 ms` | — | — | — |
| **95th Percentile (p95)** | `7.7708 ms` | — | — | — |
| **99th Percentile (p99)** | `9.5478 ms` | — | — | — |
| **Cold-Start Load** | `36.48 ms` | — | — | — |


---

## 8. Critical Scientific Interpretation & Limitations

1. **No Claims of Absolute Real-World Accuracy:** While the models achieve high recall on synthetic point spikes and toxic organic shocks, these metrics reflect performance on **controlled mathematical perturbations**. They do not guarantee identical detection rates on unmodeled physical failure modes.
2. **Class Imbalance Realism:** Injected anomalies represent $4.88\%$ of test samples. Precision is bounded by nominal empirical variance in real wastewater influent.
3. **Nitrogen Modeling Limits:** Total Nitrogen (`TN`) and Nitrate/Nitrite (`NOx-N`) contained zero contiguous 3-period training sequences in historical raw data and were not modeled, preventing artificial accuracy fabrication.

---
**Report Certified by:** AquaTrust AI Data & AI Pipeline (Member 1 Lead)
