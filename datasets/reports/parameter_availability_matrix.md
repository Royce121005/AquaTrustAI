# AquaTrust AI — Dataset × Canonical Parameter Availability Matrix

**Specification Authority:** `MASTER/DATA_CONTRACTS.md` & `MASTER/DATASET_PORTFOLIO_SPECIFICATION.md`  
**Version:** 2.2.1  
**Generated:** 2026-09-27  

---

## 1. Core Parameter Availability Matrix

| Dataset ID | BOD | COD | TSS | pH | NH4-N (Ammonia) | TN (Total Nitrogen) |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **`DATASET_01_UCI_WATER_TREATMENT`** | **AVAILABLE** | **AVAILABLE** | **AVAILABLE** | **AVAILABLE** | **UNAVAILABLE** | **UNAVAILABLE** |
| **`DATASET_02_MELBOURNE_ETP_INLET`** | **AVAILABLE** | **AVAILABLE** | **UNAVAILABLE** | **UNAVAILABLE** | **AVAILABLE** | **AVAILABLE** |
| **`DATASET_03_MELBOURNE_ETP_OUTLET`** | **AVAILABLE** | **AVAILABLE** | **UNAVAILABLE** | **UNAVAILABLE** | **AVAILABLE** | **AVAILABLE** |
| **`DATASET_04_CPCB_UP_STP`** | **AVAILABLE** | **AVAILABLE** | **AVAILABLE** | **AVAILABLE** | **UNAVAILABLE** | **UNAVAILABLE** |

*Legend:*
- **AVAILABLE:** Verified empirical source column with documented analytical methodology exists.
- **UNAVAILABLE:** Parameter was unmonitored / not present in source exports. (Explicitly recorded as unavailable; never fabricated or cross-joined).
- **UNCERTAIN:** 0 parameters. All mappings have been verified against authoritative source documentation.

---

## 2. Parameter Mapping & Source Verification Detail

### 2.1 Dataset 01: UCI Water Treatment Plant
| Canonical Parameter | Source Columns | Measurement Stage(s) | Source Unit | Canonical Unit | Conversion Factor | Scientific Validity |
|---|---|---|---|---|---|:---:|
| **BOD** | `DBO-E`, `DBO-P`, `DBO-D`, `DBO-S` | Inlet, Primary, Secondary, Final Effluent | mg/L | mg/L | 1.0 (None) | **VALID** |
| **COD** | `DQO-E`, `DQO-D`, `DQO-S` | Inlet, Secondary, Final Effluent | mg/L | mg/L | 1.0 (None) | **VALID** |
| **TSS** | `SS-E`, `SS-P`, `SS-D`, `SS-S` | Inlet, Primary, Secondary, Final Effluent | mg/L | mg/L | 1.0 (None) | **VALID** |
| **pH** | `PH-E`, `PH-P`, `PH-D`, `PH-S` | Inlet, Primary, Secondary, Final Effluent | pH units | pH units | 1.0 (None) | **VALID** |
| **NH4-N** | *None* | N/A | N/A | N/A | N/A | **UNAVAILABLE** |
| **TN** | *None* | N/A | N/A | N/A | N/A | **UNAVAILABLE** |

### 2.2 Dataset 02: Melbourne ETP Raw Influent Wastewater
| Canonical Parameter | Source Column | Measurement Stage | Source Unit | Canonical Unit | Conversion Factor | Scientific Validity |
|---|---|---|---|---|---|:---:|
| **BOD** | `BOD_mg.L-1` | Inlet (Raw Influent) | mg.L-1 | mg/L | 1.0 (Formatting) | **VALID** |
| **COD** | `COD_mg.L-1` | Inlet (Raw Influent) | mg.L-1 | mg/L | 1.0 (Formatting) | **VALID** |
| **TSS** | *None* | N/A | N/A | N/A | N/A | **UNAVAILABLE** |
| **pH** | *None* | N/A | N/A | N/A | N/A | **UNAVAILABLE** |
| **NH4-N** | `Ammonia_mg.L-1` | Inlet (Raw Influent) | mg.L-1 | mg/L | 1.0 (as N) | **VALID** |
| **TN** | `Nitrogentotal_mg.L-1` | Inlet (Raw Influent) | mg.L-1 | mg/L | 1.0 (as N) | **VALID** |

### 2.3 Dataset 03: Melbourne ETP Treated Effluent Wastewater
| Canonical Parameter | Source Column | Measurement Stage | Source Unit | Canonical Unit | Conversion Factor | Scientific Validity |
|---|---|---|---|---|---|:---:|
| **BOD** | `BOD_mg.L-1` | Final Effluent (`outlet`) | mg.L-1 | mg/L | 1.0 (Formatting) | **VALID** |
| **COD** | `COD_mg.L-1` | Final Effluent (`outlet`) | mg.L-1 | mg/L | 1.0 (Formatting) | **VALID** |
| **TSS** | *None* | N/A | N/A | N/A | N/A | **UNAVAILABLE** |
| **pH** | *None* | N/A | N/A | N/A | N/A | **UNAVAILABLE** |
| **NH4-N** | `Ammonia_mg.L-1` | Final Effluent (`outlet`) | mg.L-1 | mg/L | 1.0 (as N) | **VALID** |
| **TN** | `Nitrogentotal_mg.L-1` | Final Effluent (`outlet`) | mg.L-1 | mg/L | 1.0 (as N) | **VALID** |

### 2.4 Dataset 04: CPCB / UP STP Operational Bulletin
| Canonical Parameter | Source Column | Measurement Stage | Source Unit | Canonical Unit | Conversion Factor | Scientific Validity |
|---|---|---|---|---|---|:---:|
| **BOD** | `bod_mg_l` | Final Effluent (`outlet`) | mg/l | mg/L | 1.0 (Formatting) | **VALID** |
| **COD** | `cod_mg_l` | Final Effluent (`outlet`) | mg/l | mg/L | 1.0 (Formatting) | **VALID** |
| **TSS** | `tss_mg_l` | Final Effluent (`outlet`) | mg/l | mg/L | 1.0 (Formatting) | **VALID** |
| **pH** | `ph` | Final Effluent (`outlet`) | pH units | pH units | 1.0 (None) | **VALID** |
| **NH4-N** | *None* | N/A | N/A | N/A | N/A | **UNAVAILABLE** |
| **TN** | *None* | N/A | N/A | N/A | N/A | **UNAVAILABLE** |

---

## 3. Strict Non-Negotiable Rules Applied

1. **Zero Guesswork Mapping:** No parameter was mapped purely based on lexical similarity without examining physical definitions (e.g., `Total_KjeldahlNitrogen` is preserved as `TKN` and NOT mapped to `TN` or `NH4-N`).
2. **Explicit Non-Availability:** Unmonitored parameters are explicitly documented with `availability: false` and are never artificially populated.
3. **Scientifically Verified Unit Conversion:** All concentration units are mapped to standard metric $mg/L$ with exact conversion factors ($1.0$).
