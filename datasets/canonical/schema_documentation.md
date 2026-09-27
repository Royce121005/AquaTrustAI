# AquaTrust AI — Canonical Wastewater Reading Schema Specification

**Status:** Authoritative Contract (v2.2.1)  
**Authority:** `MASTER/DATA_CONTRACTS.md`, `MASTER/DATABASE_SCHEMA.md`, `MASTER/VALIDATION_SPECIFICATION.md`  
**Purpose:** Provides a unified, uncoupled data interface governing ingestion, simulation, validation, AI anomaly inference, compliance evaluation, immutable treatment record assembly, and DLT anchoring.

---

## 1. Architectural Role

The Canonical Schema ensures that heterogeneous wastewater data from diverse real-world municipal datasets, historical research archives, and high-throughput multi-STP simulators share identical serialization, typing, and semantic validation rules throughout the entire AquaTrust trust-before-ledger pipeline:

```text
Raw Source Datasets (UCI / Melbourne / UP STP) OR Multi-STP Simulator (8 / 50 / 100 / 500)
                                      ↓
                         Canonical Standardized Reading
                                      ↓
                        FastAPI Ingestion Data Gateway
                                      ↓
                       Deterministic Validation (quality_status)
                                      ↓
                      AI Isolation Forest (anomaly_status)
                                      ↓
                       QA & Compliance (compliance_status)
                                      ↓
                         Finalized Treatment Record
                                      ↓
                        SHA-256 Digest + Digital Signature
                                      ↓
                  PostgreSQL Evidence + Hyperledger Fabric Anchor
```

---

## 2. Core Field Definitions & Specifications

| Field Name | Data Type / Format | Required | Allowed Values / Constraints | Description |
|---|---|:---:|---|---|
| `reading_id` | UUID (v4) | Optional (auto-gen) | Standard UUID v4 | Unique identifier for the reading instance. |
| `dataset_id` | String Enum | **YES** | `DATASET_01_UCI_WATER_TREATMENT`, `DATASET_02_MELBOURNE_ETP_INLET`, `DATASET_03_MELBOURNE_ETP_OUTLET`, `DATASET_04_CPCB_UP_STP`, `SIMULATION_MULTI_STP_GRID` | Registered identifier of the data source. |
| `source_record_id`| String | **YES** | Min length: 1 char | Original source line index, row key, or simulation step index. |
| `facility_id` | String | **YES** | Min length: 1 char | Standardized facility slug (e.g. `FAC_UCI_URBAN_ETP_01`, `STP_HEBBAL_01`). |
| `sensor_id` | String | **YES** | Min length: 1 char | Standardized sensor or laboratory assay slug. |
| `timestamp` | UTC ISO-8601 String | **YES** | `YYYY-MM-DDTHH:MM:SS.ffffffZ` | Microsecond-precision UTC timestamp. Non-UTC time is automatically normalized to UTC. |
| `measurement_stage`| String Enum | **YES** | `inlet`, `primary_settler`, `secondary_aeration`, `final_effluent`, `sludge_line`, `facility_metadata`, `unspecified` | Process stage where measurement was sampled. |
| `parameter` | String Enum | **YES** | `BOD`, `COD`, `TSS`, `pH`, `NH4_N`, `TN`, `COND`, `FLOW_RATE`, `TOTAL_COLIFORM`, `FECAL_COLIFORM`, `NOx_N`, `TKN`, `ZN`, `INSTALLED_CAPACITY`, `UTILIZED_CAPACITY` | Canonical parameter symbol. |
| `value` | `NUMERIC(20,6)` / Decimal / Null | **YES** | Numeric or `null` | Observed or simulated reading. Null represents an unmonitored parameter. |
| `unit` | String Enum | **YES** | `mg/L`, `pH units`, `µS/cm`, `m3/day`, `MLD`, `MPN/100mL`, `%`, `mL/L`, `dimensionless` | Standardized metric scientific unit. |
| `data_origin` | String Enum | **YES** | `observed`, `simulated` | Strict classification. **Never use 'real' or 'fake'**. |
| `quality_status` | String Enum | **YES** | `pending`, `valid`, `invalid`, `suspect`, `insufficient_data` | Deterministic validation status. |
| `anomaly_status` | String Enum | **YES** | `pending`, `normal`, `anomalous`, `insufficient_data` | Machine learning Isolation Forest anomaly outcome. |
| `compliance_status`| String Enum | **YES** | `pending`, `compliant`, `non_compliant`, `not_applicable` | Regulatory QA evaluation outcome. |
| `provenance_id` | String | **YES** | Min length: 1 char | SHA-256 hash or acquisition manifest reference. |
| `metadata` | JSON Object | No | Key-value dictionary | Contextual metadata (raw column name, temperature, etc.). |

---

## 3. Strict Non-Negotiable Contract Invariants

1. **Explicit Origin Declaration:** `data_origin` must strictly be `"observed"` or `"simulated"`. Ambiguous strings (`"real"`, `"fake"`, `"actual"`, `"synthetic"`) are rejected by schema validators.
2. **Status Independence:** `quality_status`, `anomaly_status`, and `compliance_status` must **never** be merged or collapsed into a single status field.
3. **No Fabrication of Unmonitored Data:** If a source dataset lacks a parameter (e.g. Nitrogen in UCI; pH in Melbourne), the parameter is either omitted or emitted with `value: null`. No artificial values are synthesized for observed records.
4. **Deterministic Serialization:** In preparation for cryptographic SHA-256 hashing and digital signatures, floating-point numeric values are formatted to a fixed 6-decimal precision decimal string (e.g. `45.200000`), eliminating floating-point rounding variance across platforms.
