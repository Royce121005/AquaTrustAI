# AquaTrust AI — Controlled Anomaly Evaluation Dataset Report (Phase 12)

**Phase Status:** `COMPLETED_AND_VERIFIED`  
**Execution Timestamp:** `2026-09-27T10:23:44.026918+00:00`  
**Random Seed:** `42`  
**Target Anomaly Rate:** `5.0%` (Actual: `4.88%`)  

---

## 1. Executive Summary & Provenance

To evaluate the unsupervised Isolation Forest anomaly detector without corrupting real-world observations or fabricating historical data, a dedicated **Controlled Evaluation Dataset** (`test_with_injected_anomalies.csv`) was generated exclusively from `test.csv`.

| Invariant / Check | Value | Verification |
| :--- | :--- | :--- |
| **Clean Source File** | `test.csv` | SHA-256: `e0563e069b71c14eb5f6bc6a7dca1fcace49c37e09ada010c6c1d2a1bef630ab` (Unchanged) |
| **Clean Train Split** | `train.csv` | **100% UNCHANGED (0% Contamination)** |
| **Clean Validation Split** | `validation.csv` | **100% UNCHANGED (0% Contamination)** |
| **Raw Datasets** | `datasets/raw/` | **100% IMMUTABLE & UNTOUCHED** |
| **Generated Evaluation File** | `test_with_injected_anomalies.csv` | SHA-256: `86fcedda120efd5605d5284cd05f7713bdf5f09f970c2cbbf6e07b775e245fa9` |
| **Total Evaluation Rows** | `3,788` | `3,603` Observed, `185` Injected |

---

## 2. Injected Scenario Distribution

Seven distinct, domain-accurate wastewater operational anomaly scenarios were injected across the test streams:

| Scenario ID | Scenario Name | Description | Injected Rows |
| :--- | :--- | :--- | :--- |
| **Scenario A** | `extreme_ph` | Unphysical acidic shock ($	ext{pH} < 4.0$) or alkaline shock ($	ext{pH} > 11.5$) | `3` |
| **Scenario B** | `extreme_cod` | Massive organic loading overload ($+5.0\sigma$ to $+8.0\sigma$) | `9` |
| **Scenario C** | `sudden_increase` | Sharp temporal jump ($+4.5\sigma$ to $+6.5\sigma$ relative to $t-1$) | `29` |
| **Scenario D** | `sudden_decrease` | Sharp drop ($-4.5\sigma$ to $-6.5\sigma$ relative to $t-1$) | `21` |
| **Scenario E** | `multivariate_inconsistency` | Sudden extreme variance explosion / local oscillation | `20` |
| **Scenario F** | `duplicate_observation` | Sensor flatline / stuck frozen value across 3 consecutive steps | `83` |
| **Scenario G** | `missing_context` | Unannounced sensor blackout / telemetry loss | `20` |
| **Nominal** | `none` | Untouched, natural observed wastewater measurements | `3603` |

---

## 3. Parameter Coverage

| Parameter | Injected Anomalies Count | Target Model Evaluated in Phase 13 |
| :--- | :--- | :--- |
| `BOD` | 36 | `IsolationForest` (Param / Stream) |
| `COD` | 50 | `IsolationForest` (Param / Stream) |
| `NH4_N` | 30 | `IsolationForest` (Param / Stream) |
| `NOX_N` | 2 | `IsolationForest` (Param / Stream) |
| `PH` | 24 | `IsolationForest` (Param / Stream) |
| `TKN` | 13 | `IsolationForest` (Param / Stream) |
| `TN` | 2 | `IsolationForest` (Param / Stream) |
| `TSS` | 28 | `IsolationForest` (Param / Stream) |


---

## 4. Evaluation Schema Contract

The evaluation dataset extends the canonical schema with dedicated, explicit ground-truth flags:

- `ground_truth_anomaly`: `0` (Normal) vs. `1` (Injected Anomaly).
- `anomaly_origin`: `"observed"` (Real Historical) vs. `"injected"` (Controlled Simulation).
- `injection_id`: Unique identifier (e.g., `INJ_0042`) mapped to the manifest.
- `scenario`: Exact scenario name matching one of the 7 evaluated protocols.
- `original_value`: Pre-injection measurement.
- `injected_value`: Post-injection measurement.

---
**Certified by:** AquaTrust AI Data + AI Workstream (Member 1 Lead)
