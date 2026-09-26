# AquaTrust AI — Dataset Manifest Template

Copy this file once per source dataset and populate every field. Do not leave verified-looking placeholders in a released manifest.

## Identity

- `dataset_id`: `<immutable UUID>`
- `dataset_name`: `<official dataset name>`
- `source_name`: `<publisher/organization>`
- `source_reference`: `<official URL/publication/repository>`
- `retrieval_date`: `<UTC date>`
- `license`: `<verified license or unknown>`
- `original_filename`: `<downloaded filename>`
- `source_sha256`: `<SHA-256 of downloaded source artifact>`

## Source classification

- `source_type`: `public_dataset | report | legacy_repository_asset`
- `record_types_present`: `measurement | regulatory_limit | narrative_or_metadata`
- `data_origin`: `observed`
- `facility_identity`: `<source facility or unknown>`
- `treatment_stage_semantics`: `<documented mapping>`
- `timestamp_semantics`: `<documented sampling/measurement window>`

## Parameter coverage

| Canonical parameter | Source field(s) | Unit | Stage/context | Coverage | Notes |
|---|---|---|---|---|---|
| BOD | | | | | |
| COD | | | | | |
| TSS | | | | | |
| pH | | | | | |
| ammoniacal_nitrogen | | | | | |
| total_nitrogen | | | | | |

## Processing

- `processing_version`: `<version>`
- `processing_timestamp`: `<UTC timestamp>`
- `transformations_applied`: `<ordered list>`
- `excluded_record_count`: `<integer>`
- `exclusion_reasons`: `<structured list>`
- `processed_output_sha256`: `<SHA-256>`
- `known_limitations`: `<list>`

## Provenance checks

- source identity verified: `<yes/no>`
- official retrieval path verified: `<yes/no>`
- license/reuse condition verified: `<yes/no>`
- checksum recorded: `<yes/no>`
- parameter mapping verified: `<yes/no>`
- units verified: `<yes/no>`
- timestamp semantics verified: `<yes/no>`
- facility/stage semantics verified: `<yes/no>`
- measurement vs regulatory-limit classification verified: `<yes/no>`
- reproducibility test passed: `<yes/no>`

## Selection decision

- `selected_for_experiments`: `<yes/no>`
- `selection_rationale`: `<text>`
- `experiment_manifest_version`: `<version or null>`
