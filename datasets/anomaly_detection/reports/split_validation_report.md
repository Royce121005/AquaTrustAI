# AquaTrust AI — Dataset Partitioning Validation Rationale

**Document Status:** FROZEN & VERIFIED  
**Version:** 2.2.1  
**Target Model:** Unsupervised Isolation Forest  

---

## 1. Split Strategy & Mathematical Justification

In industrial wastewater treatment facilities, biological and chemical dynamics are non-stationary and autocorrelated. Random K-Fold cross-validation or uniform random sampling destroys time dependency and introduces severe lookahead leakage (future observations predicting past events).

AquaTrust AI enforces a **strict chronological partition strategy**:
$$\mathcal{D} = \mathcal{D}_{\text{train}} \cup \mathcal{D}_{\text{val}} \cup \mathcal{D}_{\text{test}}$$
$$\max(T_{\text{train}}) < \min(T_{\text{val}}) \quad \text{and} \quad \max(T_{\text{val}}) < \min(T_{\text{test}})$$

### Partition Allocation:
- **Train (70%):** Learns baseline operational distributions, natural variance, and nominal multivariate relationships.
- **Validation (15%):** Tunes Isolation Forest contamination thresholds and evaluates stability against seasonal shift.
- **Test (15%):** Unseen final holdout partition evaluated under both nominal conditions and controlled anomaly injections.

---

## 2. Ineligible Datasets for Temporal Autoregressive Partitioning

- **Dataset 04 (`DATASET_04_CPCB_UP_STP`):**  
  Contains cross-sectional compliance records from 125 distinct STPs across Uttar Pradesh sampled on single observation dates in Dec 2023. Because there are no sequential time series for any single facility, computing trailing differences (`delta_1`) and rolling statistics (`rolling_mean_3`, `rolling_std_3`) across different physical plants is scientifically invalid. It is therefore classified as `INELIGIBLE_FOR_TIME_SERIES_SPLIT` and excluded from chronological sequence modeling.

---

## 3. Unsupervised Ground-Truth & Evaluation Protocol

1. **Unsupervised Formulation:** Historical industrial wastewater records lack exhaustive ground-truth fault labels. All models are trained in an unsupervised manner using `IsolationForest(n_estimators=200, contamination=0.05, random_state=42)`.
2. **Controlled Evaluation Injection:** To rigorously evaluate anomaly detection precision, recall, and F1 score without compromising dataset integrity, a controlled evaluation copy (`test_with_injected_anomalies.csv`) is generated with point spikes ($+3.5\sigma$ to $+5.5\sigma$), sensor flatlines, and biological process drifts. This file is strictly isolated from model training.

---
**Approved by:** AquaTrust AI Data & AI Pipeline Architecture
