# AquaTrust AI — Dataset Inventory Report

**Status:** Authoritative Foundation  
**Version:** 2.2.1  
**Generated:** 2026-09-27  

---

## 1. Summary Overview

AquaTrust AI operates under a **Versioned, Provenance-Controlled Dataset Portfolio** (`MASTER/DATASET_PORTFOLIO_SPECIFICATION.md`). The four registered source datasets represent diverse operational wastewater conditions across multiple countries, facilities, monitoring stages, and sampling frequencies.

---

## 2. Comprehensive Dataset Register

| Attribute | Dataset 01 (UCI) | Dataset 02 (Melbourne Inlet) | Dataset 03 (Melbourne Outlet) | Dataset 04 (CPCB / UP STP) |
|---|---|---|---|---|
| **Dataset ID** | `DATASET_01_UCI_WATER_TREATMENT` | `DATASET_02_MELBOURNE_ETP_INLET` | `DATASET_03_MELBOURNE_ETP_OUTLET` | `DATASET_04_CPCB_UP_STP` |
| **Source Name** | UCI Machine Learning Repository | Melbourne Water / DataVic | Melbourne Water / DataVic | CPCB / UPPCB & NMCG |
| **Original File** | `water-treatment.data` | `MWC_ETP_Daily_InfluentQuality_From2014...inlet.csv` | `MWC_ETP_Daily_EffluentQuality_From2014...outlet.csv` | `UP_STP_Operational_December_2023_CORRECTED.csv` |
| **Raw Storage Path** | `datasets/raw/dataset_01/` | `datasets/raw/dataset_02/` | `datasets/raw/dataset_03/` | `datasets/raw/dataset_04/` |
| **File Size (Bytes)**| 92,549 B | 53,767 B | 90,808 B | 19,307 B |
| **SHA-256 Hash** | `af2e632b370646ea9763b11aed54b30423f0c3b8a7fb1b7d23e1c922098a7a8a` | `1e60bff7f04397d81586dd79adf34393bb36d194331369edf54f993861987461` | `47948ae79b2e703e4c0d89e3bb62f4d8bdc4def6bf8452f69506dc59141e4b96` | `3c925b13cbc12cdc055b38d6bc9606fe84f37df17af1d04ed338d75e68375228` |
| **License** | CC BY 4.0 | CC BY 4.0 | CC BY 4.0 | Government Open Data License (GODL) |
| **Record Count** | 527 rows | 1,382 rows | 1,716 rows | 125 STP inspection rows |
| **Dimensions** | 527 × 39 | 1,382 × 7 | 1,716 × 8 | 125 × 21 |
| **Sampling Frequency**| Daily | Daily composite | Daily composite | Monthly snapshot |
| **Temporal Span** | 1990-03-01 to 1991-08-29 | 2014-07-31 to 2020-04-30 | 2014-12-04 to 2020-04-30 | December 2023 |
| **Facility Profile** | Urban ETP (Spain) | Eastern Treatment Plant (Melbourne, 330 MLD) | Eastern Treatment Plant (Melbourne, 330 MLD) | 125 Municipal STPs (UP, India, 0.15–345 MLD) |
| **Treatment Stage** | Multi-Stage (Inlet, Primary, Secondary, Effluent) | Raw Influent (Inlet) | Treated Final Effluent (Outlet) | Treated Final Effluent (Outlet) |
| **Core Parameters** | pH, BOD, COD, TSS | BOD, COD, NH4-N, TN | BOD, COD, NH4-N, TN | pH, BOD, COD, TSS |
| **Missing Parameters**| NH4-N, TN | pH, TSS | pH, TSS | NH4-N, TN |
| **Missing Encoding** | `?` | Blank cells | `NULL` and blank cells | Blank cells |
| **Assigned Role** | Primary ML Training Baseline | Influent Simulator Distribution Source | Effluent Nitrogen Dynamics & AI Generalization | Multi-Facility Topology & Technology Profiles |
