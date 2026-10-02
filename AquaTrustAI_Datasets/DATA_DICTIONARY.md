# AquaTrustAI Dataset Package — Data Dictionary

Generated from `DATASET_04_CPCB_UP_STP` (Bharwara STP Lucknow) and `raw/indian_water_clean.csv`.
No values were invented, imputed, or removed; genuine missing values are empty cells.
Non-numeric sentinels (`BDL`, `-`) were mapped to empty cells and flagged where applicable.

---

## 1. processed/aqua_stp_timeseries.csv

Normalized daily STP observations. **12,438 rows** (1,382 days × 9 STPs), sorted by `date`, then source STP order.

| Column | Type | Unit | Meaning | Source column(s) | Transformation | ML | Viz |
|---|---|---|---|---|---|---|---|
| `date` | date (YYYY-MM-DD) | — | Observation day | `Date` | Reformatted to ISO date | Yes (time index) | Yes |
| `stp_id` | string (slug) | — | Stable plant identifier | `<Name> STP_*` column prefixes | Derived, see mapping below | Yes (group key) | Yes |
| `stp_name` | string | — | Plant display name | Header prefixes | Verbatim prefix | Label | Yes |
| `city` | string | — | City | `City/Town` | Trimmed ("Lucknow" — source spelling preserved) | Context | Context |
| `treatment_type` | string | — | Process description | `<Name> STP_Treatment Facility` | Trimmed, internal whitespace collapsed | Categorical feature | Yes |
| `installed_capacity_mld` | float | MLD | **Per-plant** installed capacity | `<Name> STP_Installed_Capacity_MLD` | Numeric parse | Feature | Yes |
| `operational_capacity_mld` | float | MLD | **City-level** operational capacity (constant 600) | `Operational_Capacity_MLD` | Numeric parse | Context (repeated per row) | Context |
| `sewage_generation_mld` | float | MLD | **City-level** sewage generation (constant 1440) | `Sewage_Generation_MLD` | Numeric parse | Context (repeated per row) | Context |
| `temperature_c` | float | °C | **Ambient city** air temperature (avg), not process temperature | `Temperature (Avg)` | Rounded to 2 dp | Feature | Yes |
| `ph` | float | pH scale | Daily average pH | `<Name> STP_avg_pH` / `_avg_Ph` / `_avg_ph` | Name-normalized; rounded 4 dp | Feature/target | Yes |
| `cod_mg_l` | float | mg/L | Chemical oxygen demand (daily avg) | `<Name> STP_avg_COD` | Rounded 4 dp | **Primary ML target** | Yes |
| `bod_mg_l` | float | mg/L | Biochemical oxygen demand (daily avg) | `<Name> STP_avg_BOD` | Rounded 4 dp | Target candidate | Yes |
| `tss_mg_l` | float | mg/L | Total suspended solids (daily avg) | `<Name> STP_avg_TSS` | Rounded 4 dp | Target candidate | Yes |
| `ammoniacal_nitrogen_mg_l` | float | mg/L | Ammoniacal nitrogen (daily avg). Source spells it "Ammonical" | `<Name> STP_avg_Ammonical_Nitrogen` | Renamed to standard spelling; rounded 4 dp | Feature | Yes |
| `total_nitrogen_mg_l` | float | mg/L | Total nitrogen (daily avg) | `<Name> STP_ avg_Total_Nitrogen` variants | Name-normalized; rounded 4 dp | Feature | Yes |

### STP id mapping (stable)

| stp_id | stp_name | treatment_type | installed_capacity_mld |
|---|---|---|---|
| nagasandra | Nagasandra STP | Secondary -Extended aeration | 20 |
| madiwala | Madiwala STP | Secondary: UASB + oxidation ponds+ constructed wetlands | 4 |
| hebbal | Hebbal STP | Secondary: Activated sludge process | 60 |
| yelahanka | Yelahanka STP | Activated sludge process +filtration+chlorination(Tertiary) | 10 |
| jakkur | Jakkur STP | Secondary – UASB +Extended aeration | 10 |
| rajacanal | Rajacanal STP | Secondary- Extended aeration | 40 |
| kr-puram | K.R. Puram STP | Secondary – UASB +Extended aeration | 20 |
| cubbon-park | Cubbon Park STP | Membrane | 1.5 |
| lalbagh | Lalbagh STP | Extended Aeration + Plate Settlers + UV disinfection | 1.5 |

---

## 2. processed/aqua_stp_metadata.csv

One row per plant (**9 rows**).

| Column | Type | Meaning |
|---|---|---|
| `stp_id`, `stp_name`, `city`, `treatment_type` | string | As in timeseries (see mapping above) |
| `installed_capacity_mld` | float | Per-plant capacity, MLD |
| `record_count` | int | Daily records available for the plant (all 1,382) |
| `first_date` / `last_date` | date | Coverage window (2019-11-01 → 2023-08-13 for every plant) |
| `missing_<parameter>` | int | Count of missing values per parameter in the timeseries (all 0) |

---

## 3. ml/aqua_cod_model_data.csv

Leakage-free time-series dataset for COD forecasting. **12,438 rows** (same keys as the timeseries).
Rows near each plant's series start have empty lag/rolling cells — this is intentional; do not back-fill them.

| Column | Type | Definition (all windows use ONLY past observations of the same plant) |
|---|---|---|
| `date`, `stp_id`, `treatment_type`, `installed_capacity_mld` | — | Keys/context, as above |
| `month` | int 1–12 | Calendar month (UTC) |
| `day_of_year` | int 1–366 | Day-of-year (UTC) |
| `cod_mg_l` | float | **Target**: COD on `date` |
| `cod_lag_1` / `cod_lag_7` / `cod_lag_28` | float | COD 1 / 7 / 28 days earlier |
| `bod_lag_1`, `bod_lag_7` | float | BOD 1 / 7 days earlier |
| `ph_lag_1`, `ph_lag_7` | float | pH 1 / 7 days earlier |
| `tss_lag_1`, `tss_lag_7` | float | TSS 1 / 7 days earlier |
| `ammoniacal_nitrogen_mg_l_lag_1` | float | NH₃-N 1 day earlier |
| `total_nitrogen_mg_l_lag_1` | float | Total N 1 day earlier |
| `temperature_c_lag_1` | float | Ambient temperature 1 day earlier |
| `cod_rolling_mean_7` | float | Mean of COD over previous 7 days (t−7 … t−1) |
| `cod_rolling_std_7` | float | Sample standard deviation (n−1) over same window; null when <2 values |
| `cod_rolling_mean_28` | float | Mean of COD over previous 28 days |

**Leakage guarantee:** every lag/window is computed strictly within each plant's own chronologically
sorted series using information from before `date`. Verified programmatically (200 random rows +
first-row-per-plant checks). Recommended split: chronological per plant (e.g., train ≤ 2022-12-31,
validate 2023-H1, test 2023-H1+), never random across time.

---

## 4. ml/aqua_anomaly_data.csv

Clean historical observations prepared for future anomaly detection. **12,438 rows**.
**Contains NO anomaly labels — the source has none, and none were invented.**

| Column | Type | Meaning |
|---|---|---|
| `date`, `stp_id` | — | Keys |
| `temperature_c`, `ph`, `cod_mg_l`, `bod_mg_l`, `tss_mg_l`, `ammoniacal_nitrogen_mg_l`, `total_nitrogen_mg_l` | float | Raw observations (identical values to the timeseries file) |
| `cod_baseline_median_28_past` | float | Median COD of previous 28 days (past-only reference for deviation analysis) |
| `bod_baseline_median_28_past` | float | Same, for BOD |
| `ph_baseline_median_28_past` | float | Same, for pH |
| `tss_baseline_median_28_past` | float | Same, for TSS |

The baseline columns are deterministic statistics of real past observations — provided as a convenience;
anomaly-detection authors may ignore them and compute their own baselines.

---

## 5. processed/aqua_water_quality.csv

National surface-water quality reference records (station-year aggregates). **194 rows**, one per
station × year. Kept fully separate from the STP dataset.

| Column | Type | Unit | Source column | Notes |
|---|---|---|---|---|
| `stn_code` | string | — | `STN code` | Station identifier. **13 codes appear with >1 location-name spelling — left unmerged** |
| `monitoring_location` | string | — | `Monitoring Location` | Trimmed |
| `state` | string | — | `State Name` | Uppercased in source; preserved |
| `water_body_type` | string | — | `Type Water Body` | 11 categories (RIVER, LAKE, DRAIN, …) |
| `year` | int | — | `Year` | 2021–2023 |
| `temperature_c_min` / `_max` | float | °C | `Temperature (C) - Min/Max` | Annual observed range |
| `dissolved_oxygen_mg_l_min` / `_max` | float | mg/L | `Dissolved - Min/Max` | Source does not spell out "oxygen"; unit inferred as mg/L (standard for DO) |
| `ph_min` / `_max` | float | pH | `pH - Min/Max` | Range observed 5.7–11.2 |
| `conductivity_umho_cm_min` / `_max` | float | µmho/cm | `Conductivity (<mojibake>mho/cm) - Min/Max` | Header micro-sign is encoding-damaged in source; unit recorded here as µmho/cm |
| `bod_mg_l_min` / `_max` | float | mg/L | `BOD (mg/L) - Min/Max` | |
| `nitrate_mg_l_min` / `_max` | float | mg/L (as N) | `NitrateN (mg/L) - Min/Max` | Nitrate-nitrogen |
| `total_coliform_mpn_100ml_min` / `_max` | float | MPN/100 mL | `Total Coliform (MPN/100ml) - Min/Max` | |
| `fecal_coliform_mpn_100ml_min` / `_max` | float | MPN/100 mL | `Fecal - Min/Max` | Empty when missing or sentinel |
| `fecal_coliform_qualifier` | string | — | derived | `BDL` when any bound was reported as "below detection limit"; empty otherwise (`-` = not recorded → plain empty) |
| `range_check_failed` | string | — | derived | Semicolon-separated parameter names where numeric min > max in the source (7 rows). Values were **not swapped or altered** |

**No regulatory thresholds or compliance labels exist in this package** (none existed in the source).
