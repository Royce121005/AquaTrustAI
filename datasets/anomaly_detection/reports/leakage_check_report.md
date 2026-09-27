# AquaTrust AI — Data Leakage & Temporal Audit Report

**Audit Status:** `PASSED`  
**Framework Version:** `2.2.1`  
**Execution Timestamp:** `2026-09-27T06:06:07.902497+00:00`  

---

## 1. Executive Summary

This report provides mathematical verification that the dataset partitioning and feature engineering pipelines for AquaTrust AI Isolation Forest anomaly detection are **100% free of data leakage**.

| Audit Dimension | Invariant Requirement | Tested Checks | Passed Checks | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Temporal Boundary Separation** | $T_{\text{train, max}} < T_{\text{val, min}} < T_{\text{test, min}}$ | 26 streams | 26 streams | **PASS** |
| **Scaler Isolation** | StandardScaler parameters $(\mu, \sigma)$ computed strictly on Train | 92 features | 92 features | **PASS** |
| **Feature Directionality** | Rolling stats strictly trailing ($t, t-1, t-2$) without lookahead | Active | Active | **PASS** |
| **Anomaly Label Isolation** | Synthetic anomalies isolated exclusively to evaluation test copy | 4 partitions | 4 partitions | **PASS** |

---

## 2. Temporal Boundary Verification Matrix

Every continuous sensor stream was partitioned strictly along its chronological axis with 70% Train, 15% Validation, and 15% Test.

| Stream ID | Train Max Timestamp | Val Min Timestamp | Val Max Timestamp | Test Min Timestamp | Temporal Integrity |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `DATASET_01_UCI:FAC_UCI_URBAN_ETP_01:final_effluent:ph` | `1991-03-21` | `1991-03-22` | `1991-06-26` | `1991-06-27` | `VALID (NO OVERLAP)` |
| `DATASET_01_UCI:FAC_UCI_URBAN_ETP_01:final_effluent:bod` | `1991-03-21` | `1991-03-22` | `1991-06-26` | `1991-06-27` | `VALID (NO OVERLAP)` |
| `DATASET_01_UCI:FAC_UCI_URBAN_ETP_01:final_effluent:cod` | `1991-03-21` | `1991-03-22` | `1991-06-26` | `1991-06-27` | `VALID (NO OVERLAP)` |
| `DATASET_01_UCI:FAC_UCI_URBAN_ETP_01:final_effluent:tss` | `1991-03-21` | `1991-03-22` | `1991-06-26` | `1991-06-27` | `VALID (NO OVERLAP)` |
| `DATASET_01_UCI:FAC_UCI_URBAN_ETP_01:inlet:ph` | `1991-03-21` | `1991-03-22` | `1991-06-26` | `1991-06-27` | `VALID (NO OVERLAP)` |
| `DATASET_01_UCI:FAC_UCI_URBAN_ETP_01:inlet:bod` | `1991-03-21` | `1991-03-22` | `1991-06-26` | `1991-06-27` | `VALID (NO OVERLAP)` |
| `DATASET_01_UCI:FAC_UCI_URBAN_ETP_01:inlet:cod` | `1991-03-21` | `1991-03-22` | `1991-06-26` | `1991-06-27` | `VALID (NO OVERLAP)` |
| `DATASET_01_UCI:FAC_UCI_URBAN_ETP_01:inlet:tss` | `1991-03-21` | `1991-03-22` | `1991-06-26` | `1991-06-27` | `VALID (NO OVERLAP)` |
| `DATASET_01_UCI:FAC_UCI_URBAN_ETP_01:primary_settler:ph` | `1991-03-21` | `1991-03-22` | `1991-06-26` | `1991-06-27` | `VALID (NO OVERLAP)` |
| `DATASET_01_UCI:FAC_UCI_URBAN_ETP_01:primary_settler:bod` | `1991-03-21` | `1991-03-22` | `1991-06-26` | `1991-06-27` | `VALID (NO OVERLAP)` |
| `DATASET_01_UCI:FAC_UCI_URBAN_ETP_01:primary_settler:tss` | `1991-03-21` | `1991-03-22` | `1991-06-26` | `1991-06-27` | `VALID (NO OVERLAP)` |
| `DATASET_01_UCI:FAC_UCI_URBAN_ETP_01:secondary_settler:ph` | `1991-03-21` | `1991-03-22` | `1991-06-26` | `1991-06-27` | `VALID (NO OVERLAP)` |
| `DATASET_01_UCI:FAC_UCI_URBAN_ETP_01:secondary_settler:bod` | `1991-03-21` | `1991-03-22` | `1991-06-26` | `1991-06-27` | `VALID (NO OVERLAP)` |
| `DATASET_01_UCI:FAC_UCI_URBAN_ETP_01:secondary_settler:cod` | `1991-03-21` | `1991-03-22` | `1991-06-26` | `1991-06-27` | `VALID (NO OVERLAP)` |
| `DATASET_01_UCI:FAC_UCI_URBAN_ETP_01:secondary_settler:tss` | `1991-03-21` | `1991-03-22` | `1991-06-26` | `1991-06-27` | `VALID (NO OVERLAP)` |
| `DATASET_02_MELBOURNE_INLET:MWC_ETP_MELBOURNE:inlet:nh4_n` | `2017-10-19` | `2017-10-22` | `2018-08-13` | `2018-08-14` | `VALID (NO OVERLAP)` |
| `DATASET_02_MELBOURNE_INLET:MWC_ETP_MELBOURNE:inlet:bod` | `2017-10-19` | `2017-10-22` | `2018-08-13` | `2018-08-14` | `VALID (NO OVERLAP)` |
| `DATASET_02_MELBOURNE_INLET:MWC_ETP_MELBOURNE:inlet:cod` | `2017-10-19` | `2017-10-22` | `2018-08-13` | `2018-08-14` | `VALID (NO OVERLAP)` |
| `DATASET_02_MELBOURNE_INLET:MWC_ETP_MELBOURNE:inlet:tn` | `2017-10-19` | `2017-10-22` | `2018-08-13` | `2018-08-14` | `VALID (NO OVERLAP)` |
| `DATASET_02_MELBOURNE_INLET:MWC_ETP_MELBOURNE:inlet:nox_n` | `2017-10-19` | `2017-10-22` | `2018-08-13` | `2018-08-14` | `VALID (NO OVERLAP)` |
| `DATASET_03_MELBOURNE_OUTLET:MWC_ETP_MELBOURNE:final_effluent:cod` | `2018-01-02` | `2018-01-03` | `2018-10-29` | `2018-10-30` | `VALID (NO OVERLAP)` |
| `DATASET_03_MELBOURNE_OUTLET:MWC_ETP_MELBOURNE:final_effluent:bod` | `2018-01-02` | `2018-01-03` | `2018-10-29` | `2018-10-30` | `VALID (NO OVERLAP)` |
| `DATASET_03_MELBOURNE_OUTLET:MWC_ETP_MELBOURNE:final_effluent:nh4_n` | `2018-01-02` | `2018-01-03` | `2018-10-29` | `2018-10-30` | `VALID (NO OVERLAP)` |
| `DATASET_03_MELBOURNE_OUTLET:MWC_ETP_MELBOURNE:final_effluent:tn` | `2018-01-02` | `2018-01-03` | `2018-10-29` | `2018-10-30` | `VALID (NO OVERLAP)` |
| `DATASET_03_MELBOURNE_OUTLET:MWC_ETP_MELBOURNE:final_effluent:nox_n` | `2018-01-02` | `2018-01-03` | `2018-10-29` | `2018-10-30` | `VALID (NO OVERLAP)` |
| `DATASET_03_MELBOURNE_OUTLET:MWC_ETP_MELBOURNE:final_effluent:tkn` | `2018-01-02` | `2018-01-03` | `2018-10-29` | `2018-10-30` | `VALID (NO OVERLAP)` |


---

## 3. Scaler Purity & Lookahead Verification

1. **Training Partition Exclusivity:** For every logical stream and feature (`value_t`, `delta_1`, `rolling_mean_3`, `rolling_std_3`), the transformation parameters $\mu_{\text{train}}$ and $\sigma_{\text{train}}$ were computed exclusively from rows in the training split. Validation and test partitions were transformed using these frozen parameters.
2. **Trailing Rolling Windows:** Rolling aggregations require $k=3$ observations. Observations at $t=0$ and $t=1$ do not possess sufficient history and are tagged as `insufficient_data = True` and `quality_status = 'insufficient_data'`, preventing artificial data imputation or lookahead contamination.
3. **Zero Label Contamination:** `train.csv`, `validation.csv`, and `test.csv` contain zero synthetic anomaly markers. The controlled evaluation set (`test_with_injected_anomalies.csv`) is maintained as an isolated evaluation artifact.

---
**Certified by:** AquaTrust AI Automated Data Quality & Leakage Audit Engine
