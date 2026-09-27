# AquaTrust AI — Dataset to Canonical Schema Mapping Guide

**Document Version:** 2.2.1  
**Scope:** Transformation rules for mapping all four raw datasets into canonical readings.

---

## 1. Dataset 01: UCI Water Treatment Plant (`DATASET_01_UCI_WATER_TREATMENT`)

- **Facility Mapping:** `facility_id = "FAC_UCI_URBAN_ETP_01"`
- **Data Origin:** `data_origin = "observed"`
- **Timestamp Construction:** Extract day, month, year from `DATE` (e.g. `D-1/3/90` -> `1990-03-01T12:00:00.000000Z`).
- **Provenance:** `provenance_id = "SHA256:af2e632b370646ea9763b11aed54b30423f0c3b8a7fb1b7d23e1c922098a7a8a"`
- **Column-to-Stage Mapping:**
  - `PH-E`, `DBO-E`, `DQO-E`, `SS-E`, `COND-E`, `Q-E` -> `measurement_stage = "inlet"`
  - `PH-P`, `DBO-P`, `SS-P`, `COND-P` -> `measurement_stage = "primary_settler"`
  - `PH-D`, `DBO-D`, `DQO-D`, `SS-D`, `COND-D` -> `measurement_stage = "secondary_aeration"`
  - `PH-S`, `DBO-S`, `DQO-S`, `SS-S`, `COND-S` -> `measurement_stage = "final_effluent"`
- **Missing Value Handling:** Replace `?` with `value: null`.

---

## 2. Dataset 02: Melbourne ETP Raw Influent (`DATASET_02_MELBOURNE_ETP_INLET`)

- **Facility Mapping:** `facility_id = "MWC_ETP_MELBOURNE"`
- **Data Origin:** `data_origin = "observed"`
- **Measurement Stage:** `measurement_stage = "inlet"`
- **Timestamp Construction:** Parse `recorddate` to UTC ISO 8601 string.
- **Provenance:** `provenance_id = "SHA256:1e60bff7f04397d81586dd79adf34393bb36d194331369edf54f993861987461"`
- **Column Mapping:**
  - `Ammonia_mg.L-1` -> `parameter = "NH4_N"`, `unit = "mg/L"`
  - `BOD_mg.L-1` -> `parameter = "BOD"`, `unit = "mg/L"`
  - `COD_mg.L-1` -> `parameter = "COD"`, `unit = "mg/L"`
  - `Nitrogentotal_mg.L-1` -> `parameter = "TN"`, `unit = "mg/L"`
  - `NitrateplusNitrite_mg.L-1` -> `parameter = "NOx_N"`, `unit = "mg/L"`
- **Missing Parameters:** `pH` and `TSS` are unmonitored; **never** synthesize values for them.

---

## 3. Dataset 03: Melbourne ETP Treated Effluent (`DATASET_03_MELBOURNE_ETP_OUTLET`)

- **Facility Mapping:** `facility_id = "MWC_ETP_MELBOURNE"`
- **Data Origin:** `data_origin = "observed"`
- **Measurement Stage:** `measurement_stage = "final_effluent"`
- **Timestamp Construction:** Parse `recorddate` to UTC ISO 8601 string.
- **Provenance:** `provenance_id = "SHA256:47948ae79b2e703e4c0d89e3bb62f4d8bdc4def6bf8452f69506dc59141e4b96"`
- **Column Mapping:**
  - `COD_mg.L-1` -> `parameter = "COD"`, `unit = "mg/L"`
  - `BOD_mg.L-1` -> `parameter = "BOD"`, `unit = "mg/L"`
  - `Ammonia_mg.L-1` -> `parameter = "NH4_N"`, `unit = "mg/L"`
  - `Nitrogentotal_mg.L-1` -> `parameter = "TN"`, `unit = "mg/L"`
  - `Total_KjeldahlNitrogen_mg.L-1` -> `parameter = "TKN"`, `unit = "mg/L"`
  - `NitrateplusNitrite_mg.L-1` -> `parameter = "NOx_N"`, `unit = "mg/L"`
- **Missing Value Handling:** Map literal `"NULL"` and blank strings to `value: null`.

---

## 4. Dataset 04: CPCB / UP STP Operational Bulletin (`DATASET_04_CPCB_UP_STP`)

- **Facility Mapping:** Generate stable slug from `stp_name` (e.g. `10.445 MLD STP near Tixi Tempel` -> `STP_UP_ETAWAH_TIXI_01`).
- **Data Origin:** `data_origin = "observed"`
- **Measurement Stage:** `measurement_stage = "final_effluent"`
- **Timestamp Construction:** Parse `measurement_date` (format `DD.MM.YYYY`) to `YYYY-MM-DDT00:00:00.000000Z`.
- **Provenance:** `provenance_id = "SHA256:3c925b13cbc12cdc055b38d6bc9606fe84f37df17af1d04ed338d75e68375228"`
- **Column Mapping:**
  - `ph` -> `parameter = "pH"`, `unit = "pH units"`
  - `bod_mg_l` -> `parameter = "BOD"`, `unit = "mg/L"`
  - `cod_mg_l` -> `parameter = "COD"`, `unit = "mg/L"`
  - `tss_mg_l` -> `parameter = "TSS"`, `unit = "mg/L"`
  - `total_coliform_mpn_100ml` -> `parameter = "TOTAL_COLIFORM"`, `unit = "MPN/100mL"`
  - `fecal_coliform_mpn_100ml` -> `parameter = "FECAL_COLIFORM"`, `unit = "MPN/100mL"`
  - `installed_capacity_mld` -> `parameter = "INSTALLED_CAPACITY"`, `unit = "MLD"`, `measurement_stage = "facility_metadata"`
  - `utilized_capacity_mld` -> `parameter = "UTILIZED_CAPACITY"`, `unit = "MLD"`, `measurement_stage = "facility_metadata"`
- **Missing Parameters:** `NH4_N` and `TN` are unmonitored; **never** synthesize values for them.
