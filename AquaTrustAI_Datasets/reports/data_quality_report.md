# Data Quality Report

Generated 2026-08-26 from the two source CSVs. Nothing was fabricated: every number in the
processed files traces back to a source cell, and every gap remains a gap.

## 1. Source inventory (audited with a corrected RFC-4180 parser)

| Dataset | Rows | Columns | Duplicate rows | Date coverage |
|---|---|---|---|---|
| `bangalore_clean.csv` | 1,382 | 85 | 0 | Daily, 2019-11-01 → 2023-08-13, **zero calendar gaps, zero duplicate dates** |
| `indian_water_clean.csv` | 194 | 21 | 0 (on STN+location+year) | Annual, 2021–2023 |

> Note: earlier tooling reported 84 / 20 columns due to a CSV-parsing bug that dropped the final
> field of CRLF lines (`Operational_Capacity_MLD` and nothing else). The corrected count is 85 / 21.
> The frontend currently reads these files with the same corrected algorithm.

## 2. Missing values — Bangalore

| Field group | Missing |
|---|---|
| All 9 STPs × (COD, BOD, pH, TSS, Ammoniacal-N, Total-N) | **0 of 8,292 cells per parameter** — fully complete |
| Temperature Avg/Max/Min, Date, capacities | 0 missing |

No imputation was needed or performed.

## 3. Missing values — Indian water

| Column | Missing | % | Handling |
|---|---|---|---|
| `Fecal - Min` | 62 / 194 | 32.0% | Left empty; sentinel values mapped to empty + qualifier |
| `Fecal - Max` | 102 / 194 | 52.6% | Same |
| All other columns | 0 | 0.0% | — |

Sentinels found in Fecal columns only: `BDL` (below detection limit), `-` (not recorded).
→ Numeric output empty; `fecal_coliform_qualifier = "BDL"` on 20 rows; plain `-` left unqualified.

## 4. Duplicates
- Bangalore: no duplicate dates, no duplicate full rows.
- Indian water: no duplicate STN+location+year keys.
- **Caveat:** 13 Indian-water STN codes appear under more than one location-name spelling
  (e.g., code 3051 with two spellings differing by punctuation/wording). These were **not merged**
  because it cannot be verified from the data alone whether they are identical stations.

## 5. Date quality — Bangalore
- Format ISO-parseable; normalized to `YYYY-MM-DD`.
- Perfect daily continuity across the full range (no gaps, no duplicates).
- No fabricated dates were added anywhere.

## 6. Outliers and suspicious values

### Bangalore
- No negative values; no zeros in COD/BOD/TSS; no pH outside [0, 14].
- Plausible extremes **preserved** for anomaly detection: K.R. Puram COD up to ~74.95 mg/L,
  Madiwala TSS up to ~39.99 mg/L, NH₃-N up to ~5.0 mg/L.
- ⚠️ **Structural observation (not altered):** every plant's pH sits inside exactly [6.50, 8.50] on
  all 1,382 days, and each plant's other parameters live inside tight round-number envelopes
  (e.g., Madiwala COD within 50–70). This strongly suggests upstream clipping/gating or
  derived/synthetic smoothing in the source. Consequence: true extremes may already have been cut
  off before this package existed. Values are preserved as-is; users should know detection models
  will operate on clipped distributions.

### Indian water
- **7 range inversions (min > max) found and PRESERVED, flagged in `range_check_failed`:**
  - conductivity ×5 (stations 2354, 2057-row? see file; e.g., row 33: 275 vs 75)
  - dissolved oxygen ×1 (station 2057, 2021: min 5.3 > max 1.4)
  - BOD ×1 (station 2073, 2022: min 1.8 > max 1.1)
- These look like column-swap/data-entry errors at source, but they could not be verified, so
  **nothing was swapped** per task rules.
- Min == Max occurs often (BOD 34×, fecal 30×, total coliform 7×, nitrate 6×) — plausible for
  stable annual aggregates; kept as-is.
- No physically impossible values (all pH within 0–14; max pH 11.2 is unusual but plausible for
  industrial drains).

## 7. Transformations (summary — details in transformation_log.md)
1. Wide → long normalization of 9 STPs (12,438 daily rows).
2. Header-name normalization (`avg_Ph`, `STP_ avg_…` spacing variants → single canonical names).
3. Stable slug ids assigned per plant; display names preserved.
4. Dates reformatted to YYYY-MM-DD (UTC-safe).
5. Floats rounded (measurements 4 dp, temperature 2 dp) purely to strip float artifacts — no value
   changes beyond the 5th decimal.
6. Treatment-facility strings whitespace-collapsed (one variant per plant).
7. COD ML features built strictly from past information (lags 1/7/28; rolling mean/std 7; rolling
   mean 28; plus calendar fields). Verified leak-free by re-computation on random samples.
8. Anomaly file = observations + past-only 28-day medians; **zero labels created**.
9. Indian water renamed to canonical columns; min/max pairs preserved separately; sentinels nulled;
   range inversions flagged, untouched.
10. Originals copied verbatim into `raw/`; checksums verified unchanged after build.

## 8. Remaining data-quality problems (open, intentionally unfixed)
- Bangalore clipping/envelope behavior described above (origin unknown).
- 7 Indian-water min/max inversions (unverifiable which side is wrong).
- 13 ambiguous STN-code/location-name pairs.
- Mojibake'd conductivity unit header in raw source (documented; output uses clean name).
- City-level `operational_capacity_mld` / `sewage_generation_mld` are constants repeated on every
  row — they carry no day-to-day signal.
- `temperature_c` is ambient city air temperature shared by all plants, not process temperature.
- No rainfall, flow, influent-load, or operational-event covariates exist anywhere in the sources.

## 9. ML suitability
- **Good:** complete daily panel (9 series × 1,382 points); leakage-free feature matrix ready;
  multiple correlated targets (COD/BOD/TSS/pH) enable multi-task or transfer experiments;
  static context (treatment type, capacity) available per plant.
- **Caveats:** clipped pH limits outlier modeling; ~28 warm-up rows per plant lack lag features
  (kept, must be dropped/handled by the model, never back-filled); class of models that need
  exogenous drivers (rainfall, flow) cannot reach high accuracy with these inputs alone.

## 10. Visualization suitability
- Long format is chart-ready (date × stp_id × parameter).
- Metadata sheet supports per-plant labels/capacity context.
- Water-quality ranges suit range-bar / small-multiple views by state, year, and water-body type.

## 11. Known limitations
- Two years of history end 2023-08-13; nothing more recent exists in the source.
- Indian-water records are annual min/max aggregates — not usable for time-series forecasting.
- No compliance thresholds included anywhere (none provided).
- The dataset generator script ran outside this package; all transformations are documented
  step-by-step in `transformation_log.md` so they can be re-implemented or audited.
