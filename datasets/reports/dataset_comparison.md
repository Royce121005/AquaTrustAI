# AquaTrust AI — Four-Dataset Comparison & Strategy Matrix

**Status:** Authoritative Decision Record  
**Version:** 2.2.1  
**Generated:** 2026-09-27  

---

## 1. Parameter Availability Matrix

| Parameter | Canonical Unit | Dataset 01 (UCI) | Dataset 02 (Melbourne Inlet) | Dataset 03 (Melbourne Outlet) | Dataset 04 (CPCB UP STP) |
|---|---|:---:|:---:|:---:|:---:|
| **pH** | pH units | **YES** (4 stages) | NO | NO | **YES** |
| **BOD** | mg/L | **YES** (4 stages) | **YES** | **YES** | **YES** |
| **COD** | mg/L | **YES** (3 stages) | **YES** | **YES** | **YES** |
| **TSS** | mg/L | **YES** (4 stages) | NO | NO | **YES** |
| **Ammoniacal Nitrogen (NH4-N)** | mg/L | NO | **YES** | **YES** | NO |
| **Total Nitrogen (TN)** | mg/L | NO | **YES** | **YES** | NO |
| **Conductivity** | µS/cm | **YES** | NO | NO | NO |
| **Flow Rate** | m3/day / MLD | **YES** | NO | NO | **YES** (Capacity) |
| **Total / Fecal Coliform** | MPN/100mL | NO | NO | NO | **YES** |

---

## 2. Dataset Role & Combination Decision Matrix

| Dataset | Primary Assigned Role | Secondary Role | Combine Row-Wise? | Rationale & Invariants |
|---|---|---|:---:|---|
| **Dataset 01 (UCI)** | **Primary AI Anomaly Training Baseline** | Multi-stage process efficiency profiling | **NO** | Contains sequential 4-stage organic and physical measurements; ideal for multi-stage Isolation Forest training. |
| **Dataset 02 (Melbourne Inlet)** | **Simulator Influent Distribution Source** | Baseline raw load variation modeling | **NO** | Provides high-fidelity Australian municipal influent Nitrogen and COD distributions. |
| **Dataset 03 (Melbourne Outlet)** | **Effluent Nitrogen AI Generalization** | Regulatory compliance verification test | **NO** | Provides 5+ years of daily effluent Nitrogen dynamics; used to test anomaly model robustness on nitrogen compounds. |
| **Dataset 04 (CPCB UP STP)** | **Multi-Facility Topology & Technology Diversity** | Indian STP compliance benchmarks | **NO** | Provides 125 physical plant profiles across 8 treatment technologies (SBR, ASP, MBBR, UASB, WSP, FAB) for the 8/50/100/500 STP simulation grid. |

> **Critical Non-Negotiable Rule:** Records from distinct facilities and geographic origins must **NEVER** be merged row-wise to fabricate synthetic observations. Each dataset serves a distinct, scientifically justified function in the AquaTrust pipeline.
