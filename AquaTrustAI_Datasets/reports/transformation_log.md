# Transformation Log — original → package

Scope: exactly what changed between `raw/*.csv` and `processed/` + `ml/` outputs.
Everything not listed here is unchanged.

## Global rules applied
- Parser: RFC-4180 (quoted commas/newlines/escaped quotes; CRLF-safe). An earlier parser dropped
  the last field of CRLF lines; the corrected parser recovers `Operational_Capacity_MLD`
  (Bangalore) and `Fecal - Max` bookkeeping (Indian water).
- Encoding: files read as UTF-8. The Indian-water conductivity header contains a mojibake micro
  sign (`Conductivity (¬µmho/cm)`); matched by normalized-prefix fallback, never edited in raw.
- Missing policy: empty source cell, or non-numeric sentinel (`BDL`, `-`) → **empty output cell**.
  No mean/median/zero/backward filling anywhere.
- Rounding policy: measurements → 4 decimal places; ambient temperature → 2 dp. This only strips
  float artifacts (e.g., `30.630000000000003`); no other value modification.
- Output format: UTF-8, LF line endings, `,` separator, minimal quoting.
- Row preservation: **no rows dropped** in any output (12,438 = 1,382 × 9; 194).

## Bangalore: bangalore_clean.csv → processed/aqua_stp_timeseries.csv

### Structure
- Wide (85 columns, one row per date) → long (15 columns, one row per date × STP).
- Rows per date: 9 (source column order preserved as STP ordering within each date).
- Sort: `date` ascending, then source STP order.

### Column mapping
| Output | Source | Change |
|---|---|---|
| `date` | `Date` | `YYYY-MM-DD` (already ISO-prefixed in source; validated) |
| `stp_id` | header prefix `<Name> STP_…` | New stable slugs: nagasandra, madiwala, hebbal, yelahanka, jakkur, rajacanal, kr-puram, cubbon-park, lalbagh |
| `stp_name` | header prefix | Verbatim (`Nagasandra STP`, …, `K.R. Puram STP`) |
| `city` | `City/Town` | Trimmed only ("Bangaluru" spelling kept) |
| `treatment_type` | `<Name> STP_Treatment Facility` | Trimmed + internal whitespace collapsed; constant per plant |
| `installed_capacity_mld` | `<Name> STP_Installed_Capacity_MLD` | Per-plant value |
| `operational_capacity_mld` | `Operational_Capacity_MLD` | City-level constant (600) repeated per row |
| `sewage_generation_mld` | `Sewage_Generation_MLD` | City-level constant (1440) repeated per row |
| `temperature_c` | `Temperature (Avg)` | Ambient city temperature, 2 dp |
| `ph` | `<Name> STP_avg_pH` / `_avg_Ph` / `_avg_ph` | Header case variants unified |
| `cod_mg_l` | `<Name> STP_avg_COD` | Renamed to include unit |
| `bod_mg_l` | `<Name> STP_avg_BOD` | Renamed |
| `tss_mg_l` | `<Name> STP_avg_TSS` | Renamed |
| `ammoniacal_nitrogen_mg_l` | `<Name> STP_avg_Ammonical_Nitrogen` | Source misspelling "Ammonical" corrected in name |
| `total_nitrogen_mg_l` | `<Name> STP_ avg_Total_Nitrogen` (irregular space) | Header spacing normalized |

Dropped (not carried over): `S.NO` (row index), text-form capacity columns
(`"1,440 MLD"`, `"721 MLD"`, `"600 MLD"` — superseded by numeric columns), `State`
(constant "Karnataka"), `Max Temperature`, `Min Temperature` (kept out of the requested schema;
still available in raw).

### Name normalization examples
| Raw header | Normalized key |
|---|---|
| `Hebbal STP_avg_Ph` | hebbal stp → `avg_ph` |
| `Nagasandra STP_ avg_Total_Nitrogen` | whitespace stripped before matching |
| `Yelahanka STP_avg_Total_Nitrogen` | matches same canonical key |

## processed/aqua_stp_metadata.csv
Aggregated from the timeseries: one row per plant with record counts, first/last dates, and
per-parameter missing counts (all zero). No source information altered.

## ml/aqua_cod_model_data.csv (from the timeseries)
Per-plant chronological computation; all windows end at t−1:

```
cod_lag_k            = cod[t-k]                       k ∈ {1,7,28}
bod_lag_k            = bod[t-k]                       k ∈ {1,7}
ph_lag_k             = ph[t-k]                        k ∈ {1,7}
tss_lag_k            = tss[t-k]                       k ∈ {1,7}
*_lag_1              = nh3 / total-N / temperature at t-1
cod_rolling_mean_w   = mean(cod[t-w … t-1])           w ∈ {7,28}
cod_rolling_std_7    = sample std (n-1) of cod[t-7 … t-1]
month, day_of_year   = UTC calendar fields of `date` (no leakage)
```

- If any observation inside a window is missing → window emitted empty (never partial-filled).
- First ≤28 rows per plant have empty features by construction (verified).
- Target `cod_mg_l` is copied verbatim from the timeseries.

## ml/aqua_anomaly_data.csv (from the timeseries)
- Observations copied verbatim (no smoothing, no filtering).
- Added past-only reference medians: `median(observation[t-28 … t-1])` for COD/BOD/pH/TSS;
  empty when fewer than 28 prior observations exist.
- **No anomaly labels, scores, or flags were generated** — none exist in the source.

## indian_water_clean.csv → processed/aqua_water_quality.csv

### Column mapping (21 → 24 columns; min/max pairs kept separate)
| Output | Source |
|---|---|
| `stn_code` ← `STN code`; `monitoring_location` ← `Monitoring Location` (trimmed); `state` ← `State Name`; `water_body_type` ← `Type Water Body`; `year` ← `Year` |
| `temperature_c_min/_max` ← `Temperature (C) - Min/Max` |
| `dissolved_oxygen_mg_l_min/_max` ← `Dissolved - Min/Max` |
| `ph_min/_max` ← `pH - Min/Max` |
| `conductivity_umho_cm_min/_max` ← `Conductivity (¬µmho/cm) - Min/Max` |
| `bod_mg_l_min/_max` ← `BOD (mg/L) - Min/Max` |
| `nitrate_mg_l_min/_max` ← `NitrateN (mg/L) - Min/Max` |
| `total_coliform_mpn_100ml_min/_max` ← `Total Coliform (MPN/100ml) - Min/Max` |
| `fecal_coliform_mpn_100ml_min/_max` ← `Fecal - Min/Max` |

### Derived fields (factual bookkeeping only)
- `fecal_coliform_qualifier`: `"BDL"` when any Fecal bound equals `BDL` (20 rows); `-` treated as
  not recorded (numeric empty, no qualifier).
- `range_check_failed`: parameter list where numeric min > max in source — **7 rows**
  (conductivity ×5: stations 2354/2057? see data_quality_report §6; dissolved oxygen ×1 station
  2057; BOD ×1 station 2073). Values deliberately NOT swapped.

### Sorting
`state` → `monitoring_location` → `year`, ascending.

## Integrity verification performed after build
- MD5 of both originals and both `raw/` copies identical before/after build:
  - bangalore_clean.csv `91a01da97a4b5d3179d396aa50f6c46b`
  - indian_water_clean.csv `26b2d7784bde8e4fcbcec131d7b3a26f`
- 25 random measurement cells re-checked against source cells (tolerance = rounding only).
- Leakage re-verification on 200 random ML rows: every lag/window recomputed from earlier rows of
  the same plant matched the stored feature; first-row-per-plant features confirmed empty.
- All numeric columns parse as numbers or are legitimately empty; all dates match `YYYY-MM-DD`.
