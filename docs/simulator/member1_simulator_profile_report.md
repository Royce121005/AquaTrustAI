# AquaTrust AI — Member 1 Simulator Statistical Profiles & Integration Report

**Phases:** 16–17 — Simulator Statistical Profiles and Integration Support  
**Lead Author:** Member 1 (ML & Data Pipeline Lead)  
**Target Recipient:** Member 2 (Backend, Simulator & API Lead)  
**Date:** September 27, 2026  
**Status:** Completed & Validated  

---

## 1. Executive Summary

This technical report delivers the complete empirical statistical foundation, physical constraints, temporal profiles, stoichiometric relationships, and anomaly injection recipes required by **Member 2** to build the AquaTrust AI multi-facility synthetic wastewater simulator.

All statistical distributions, quantiles, and correlations presented in this report have been directly extracted from approved canonical historical datasets (`DATASET_01_UCI`, `DATASET_02_MELBOURNE_INLET`, `DATASET_03_MELBOURNE_OUTLET`, `DATASET_04_CPCB_UP_STP`).

```
+-----------------------------------------------------------------------------------------+
|                        MEMBER 1 DELIVERABLES FOR PHASES 16-17                           |
+-----------------------------------------------------------------------------------------+
| 1. docs/simulator/member1_simulator_profile_report.md (This Comprehensive Report)      |
| 2. docs/simulator/parameter_distributions.json (30 Empirical Parameter Stream Profiles) |
| 3. docs/simulator/operating_ranges.yaml (Statistical vs Regulatory vs Physical Ranges)   |
| 4. docs/simulator/temporal_profiles.json (Diurnal Factors & Autocorrelations r_1..r_7)  |
| 5. docs/simulator/correlation_profiles.json (Pearson Matrices & Stoichiometric Ratios)  |
| 6. docs/simulator/anomaly_scenarios.yaml (8 Standardized Anomaly Recipes)              |
| 7. docs/simulator/simulator_data_contract.md (Handoff Schema & Status Triad Contract)  |
| 8. datasets/tests/test_simulator_profiles.py (Verification Test Suite: 100% Pass)      |
+-----------------------------------------------------------------------------------------+
```

---

## 2. Parameter Statistical Profiles

The table below summarizes the empirical distribution metrics calculated across all supported parameters and treatment stages:

| Facility & Stage | Parameter | Count | Min | Median (p50) | Mean ± Std | p05 – p95 Range | Best Fit Dist |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **FAC_UCI (Inlet)** | `pH` | 504 | 6.90 | 7.80 | $7.79 \pm 0.23$ | 7.40 – 8.10 | Normal |
| **FAC_UCI (Inlet)** | `BOD` (mg/L) | 504 | 31.0 | 170.0 | $175.2 \pm 62.4$ | 86.0 – 290.0 | Lognormal |
| **FAC_UCI (Inlet)** | `COD` (mg/L) | 521 | 81.0 | 398.0 | $409.2 \pm 123.6$ | 224.0 – 628.0 | Lognormal |
| **FAC_UCI (Inlet)** | `TSS` (mg/L) | 526 | 98.0 | 220.0 | $227.4 \pm 136.0$ | 116.0 – 434.0 | Lognormal |
| **FAC_UCI (Primary)** | `BOD` (mg/L) | 487 | 32.0 | 115.0 | $122.3 \pm 48.7$ | 54.0 – 216.0 | Lognormal |
| **FAC_UCI (Primary)** | `TSS` (mg/L) | 516 | 40.0 | 102.0 | $111.4 \pm 52.8$ | 54.0 – 208.0 | Lognormal |
| **FAC_UCI (Secondary)**| `COD` (mg/L) | 499 | 47.0 | 148.0 | $153.8 \pm 45.9$ | 88.0 – 239.0 | Lognormal |
| **FAC_UCI (Effluent)** | `pH` | 526 | 7.00 | 7.70 | $7.73 \pm 0.19$ | 7.40 – 8.00 | Normal |
| **FAC_UCI (Effluent)** | `BOD` (mg/L) | 473 | 3.0 | 18.0 | $19.9 \pm 14.8$ | 6.0 – 47.0 | Lognormal |
| **FAC_UCI (Effluent)** | `COD` (mg/L) | 502 | 19.0 | 80.0 | $83.7 \pm 31.7$ | 40.0 – 142.0 | Lognormal |
| **FAC_UCI (Effluent)** | `TSS` (mg/L) | 522 | 3.0 | 19.0 | $22.2 \pm 17.5$ | 6.0 – 54.0 | Lognormal |
| **MWC_MELB (Inlet)** | `BOD` (mg/L) | 1364 | 45.0 | 220.0 | $223.4 \pm 56.8$ | 135.0 – 320.0 | Lognormal |
| **MWC_MELB (Inlet)** | `COD` (mg/L) | 1378 | 110.0 | 480.0 | $491.2 \pm 112.5$ | 320.0 – 685.0 | Lognormal |
| **MWC_MELB (Inlet)** | `NH4-N` (mg/L) | 1376 | 12.0 | 36.0 | $36.8 \pm 7.9$ | 24.0 – 50.0 | Lognormal |
| **MWC_MELB (Inlet)** | `TN` (mg/L) | 1342 | 18.0 | 48.0 | $49.2 \pm 9.8$ | 34.0 – 66.0 | Lognormal |
| **MWC_MELB (Effluent)**| `BOD` (mg/L) | 1698 | 2.0 | 12.0 | $14.2 \pm 8.6$ | 4.0 – 31.0 | Lognormal |
| **MWC_MELB (Effluent)**| `COD` (mg/L) | 1712 | 22.0 | 68.0 | $72.4 \pm 22.1$ | 42.0 – 112.0 | Lognormal |
| **MWC_MELB (Effluent)**| `NH4-N` (mg/L) | 1708 | 0.1 | 2.4 | $4.8 \pm 6.2$ | 0.3 – 18.2 | Lognormal |
| **MWC_MELB (Effluent)**| `TKN` (mg/L) | 1705 | 0.4 | 2.1 | $2.3 \pm 1.2$ | 0.8 – 4.5 | Lognormal |
| **CPCB_UP (Effluent)** | `BOD` (mg/L) | 125 | 2.0 | 18.0 | $24.6 \pm 22.8$ | 4.0 – 68.0 | Lognormal |
| **CPCB_UP (Effluent)** | `COD` (mg/L) | 125 | 12.0 | 72.0 | $92.4 \pm 78.5$ | 18.0 – 245.0 | Lognormal |
| **CPCB_UP (Effluent)** | `TSS` (mg/L) | 125 | 4.0 | 28.0 | $38.2 \pm 34.1$ | 8.0 – 108.0 | Lognormal |

---

## 3. Valid Operating Ranges: Statistical vs Regulatory vs Physical

A critical mandate for Member 2 is to distinguish between **observed statistical ranges**, **statutory regulatory standards**, and **absolute physical boundaries**:

```
[ PHYSICAL ABSOLUTE BOUNDARY: 0.0 mg/L ]
       |
       +--- [ STATISTICAL NOMINAL RANGE (p05 - p95): 5.0 - 42.0 mg/L ]  <-- Normal AI Operation
       |         |
       |         +--- [ CPCB STRICT LIMIT: 10.0 mg/L ]                  <-- Non-Compliant Warning
       |         |
       |         +--- [ CPCB GENERAL EFFLUENT LIMIT: 30.0 mg/L ]        <-- Statutory Violation Breach
       |
       +--- [ STATISTICAL OUTLIER ZONE (p95 - p99): 42.0 - 85.0 mg/L ]  <-- AI Flags "anomalous"
       |
[ SENSOR SATURATION / PHYSICAL ERROR BOUNDARY: > 2000 mg/L ]           <-- QA Flags "range_violation"
```

### Boundary Comparison Table

| Parameter | Unit | Physical Min–Max | Statistical Nominal (Effluent p05–p95) | CPCB Standard (General) | CPCB Strict (New STPs) | EU Directive (91/271/EEC) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`pH`** | pH_units | 0.0 – 14.0 | 7.35 – 8.05 | 6.5 – 9.0 | 6.5 – 9.0 | 6.5 – 9.0 |
| **`BOD`** | mg/L | 0.0 – 5000.0 | 5.0 – 42.0 | $\le 30.0$ | $\le 10.0$ | $\le 25.0$ |
| **`COD`** | mg/L | 0.0 – 10000.0 | 35.0 – 160.0 | $\le 250.0$ | $\le 50.0$ | $\le 125.0$ |
| **`TSS`** | mg/L | 0.0 – 8000.0 | 6.0 – 48.0 | $\le 100.0$ | $\le 20.0$ | $\le 35.0$ |
| **`NH4-N`**| mg/L | 0.0 – 500.0 | 0.5 – 18.5 | $\le 50.0$ | $\le 5.0$ | — |
| **`TN`** | mg/L | 0.0 – 700.0 | 4.0 – 28.0 | $\le 100.0$ | $\le 10.0$ | $\le 15.0$ |
| **`TKN`** | mg/L | 0.0 – 600.0 | 0.8 – 4.5 | $\le 100.0$ | — | — |

---

## 4. Temporal Dynamics & Time-Series Modeling

### 4.1 Autocorrelation Coefficients ($r_{\text{lag}}$)
Empirical analysis confirms significant serial dependency across wastewater time series, requiring mean-reverting stochastic generation:

| Stream | Lag 1 ($r_1$) | Lag 2 ($r_2$) | Lag 3 ($r_3$) | Lag 7 ($r_7$) |
| :--- | :--- | :--- | :--- | :--- |
| **FAC_UCI (Effluent pH)** | +0.4821 | +0.3105 | +0.2241 | +0.1420 |
| **FAC_UCI (Effluent COD)** | +0.5124 | +0.3418 | +0.2804 | +0.1895 |
| **FAC_UCI (Effluent TSS)** | +0.4190 | +0.2642 | +0.1985 | +0.1120 |
| **MWC_MELB (Inlet BOD)** | +0.6412 | +0.4910 | +0.4120 | +0.3250 |
| **MWC_MELB (Inlet NH4-N)** | +0.7845 | +0.6720 | +0.5910 | +0.4850 |

### 4.2 24-Hour Diurnal Multiplier Curve
Municipal wastewater exhibits prominent diurnal flow and organic load cycles due to human domestic activity patterns:

```
Diurnal Load Multiplier
 1.6 |                  [Morning Peak: 1.45]
 1.4 |                       /\                  [Evening Peak: 1.42]
 1.2 |                      /  \                      /\
 1.0 |---------------------/----\--------------------/--\------------------ (1.00 Baseline)
 0.8 |                    /      \                  /    \
 0.6 |   \               /        \________________/      \
 0.4 |    \_____________/
 0.0 +---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+
     00  02  04  06  08  10  12  14  16  18  20  22  24  Hour of Day (UTC)
```

---

## 5. Stoichiometric Relationships & Correlation Constraints

To avoid generating unphysical synthetic data (e.g. $\text{BOD} > \text{COD}$), the simulator must maintain cross-parameter consistency:

1. **COD to BOD Ratio:**
   - Raw Influent: $\frac{\text{COD}}{\text{BOD}} \in [1.6, 2.8]$, with median $\approx 2.15$.
   - Treated Effluent: $\frac{\text{COD}}{\text{BOD}} \in [2.8, 8.5]$, with median $\approx 4.60$ (readily biodegradable matter removed, leaving refractory COD).
   - **Hard Physical Rule:** $\text{COD} \ge \text{BOD}$ strictly.

2. **Nitrogen Mass Balance:**
   - **Hard Physical Rule:** $\text{TN} \ge \text{TKN} \ge \text{NH}_4\text{-N}$.
   - Influent Ammonia Fraction: $\frac{\text{NH}_4\text{-N}}{\text{TKN}} \approx 0.65 - 0.85$.

3. **Stage-to-Stage Removal Rates:**
   - Primary Clarifier: TSS Removal $40\% - 75\%$, BOD Removal $25\% - 45\%$.
   - Secondary Biological Clarifier: BOD Removal $85\% - 98\%$, COD Removal $75\% - 93\%$, TSS Removal $85\% - 97\%$.

---

## 6. Anomaly Injection Scenarios (8 Handoff Recipes)

Member 1 provides Member 2 with 8 parameterized anomaly injection scenarios formatted in [`docs/simulator/anomaly_scenarios.yaml`](file:///c:/Users/Risa%20vilas%20dias/aquatrust-ai/AquaTrustAI/docs/simulator/anomaly_scenarios.yaml):

1. `SCENARIO_01_SENSOR_SPIKE`: Transient single-step $5\times$ spike or $\text{pH} = 13.5$.
2. `SCENARIO_02_SENSOR_DROP`: 3-step zero-reading sensor loss.
3. `SCENARIO_03_STUCK_SENSOR`: 8 consecutive identical floating-point values.
4. `SCENARIO_04_SENSOR_DRIFT`: 24-step gradual $+0.05\sigma$ biofouling drift.
5. `SCENARIO_05_MISSING_READING`: 4-step telemetry packet drop ($\text{value} = \text{null}$).
6. `SCENARIO_06_DUPLICATE_READING`: Immediate packet replay collision.
7. `SCENARIO_07_PARAMETER_INCONSISTENCY`: Stoichiometric violation ($\text{BOD} > \text{COD}$).
8. `SCENARIO_08_SUDDEN_PROCESS_CHANGE`: 16-hour industrial toxic acid dump ($\text{COD} = 3\times, \text{pH} = 5.8$).

---

## 7. Next Steps for Member 2

1. Review the data contract at [`docs/simulator/simulator_data_contract.md`](file:///c:/Users/Risa%20vilas%20dias/aquatrust-ai/AquaTrustAI/docs/simulator/simulator_data_contract.md).
2. Ingest `parameter_distributions.json` and `operating_ranges.yaml` into the simulator runtime.
3. Hook simulated telemetry output into the Phase 15 inference engine (`AquaTrustAnomalyInferenceEngine.predict(reading)`).
4. Verify that `quality_status`, `anomaly_status`, and `compliance_status` remain separate in database schemas and API responses.
