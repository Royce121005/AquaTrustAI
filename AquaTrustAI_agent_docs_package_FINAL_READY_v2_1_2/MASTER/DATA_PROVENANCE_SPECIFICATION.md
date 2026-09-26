# AquaTrust AI — Data Provenance Specification

**Status:** AUTHORITATIVE / FROZEN
**Version:** 2.1.1

Every imported public dataset and every simulator output must be traceable to its source and processing lineage.

## Dataset provenance fields
- `dataset_id`: immutable UUID
- `dataset_name`
- `source_name`
- `source_reference` (URL, publication, repository reference, or supplied source identifier)
- `retrieval_date`: ISO-8601 UTC date
- `license`
- `original_filename`
- `source_sha256`
- `processing_version`
- `processing_timestamp`
- `transformations_applied`
- `excluded_record_count`
- `exclusion_reasons`

## Record lineage
Every standardized reading must retain `dataset_id`, `facility_id`, `sensor_id`, `source_row_reference` (when available), and `processing_version`. Simulator-generated readings additionally retain `scenario_id` and `simulation_seed`.

## Reproducibility
A processing run is reproducible when the same source checksum, processing version, transformation configuration, simulator scenario, and seed produce the same standardized output.

## Prohibition
Agents must not invent dataset URLs, licenses, retrieval dates, or provenance claims. Unknown provenance must be explicitly recorded as unknown and must not be represented as verified.
