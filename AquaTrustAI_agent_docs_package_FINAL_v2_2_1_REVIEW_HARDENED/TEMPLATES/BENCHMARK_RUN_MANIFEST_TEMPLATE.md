# AquaTrust AI — Benchmark Run Manifest Template

## Run identity

- `workload_id`:
- `architecture_variant`: `centralized | blockchain_centric | hybrid`
- `facility_count`: `8 | 50 | 100 | 500`
- `scenario_id`:
- `simulation_seed`:
- `repetition_index`:

## Dataset snapshot

- `dataset_manifest_checksum`:
- `source_checksums`:
- `processed_data_checksums`:
- `processing_version`:

## Workload definition

- `time_window`:
- `sampling_interval`:
- `parameter_profile`:
- `stage_profile`:
- `expected_record_count`:
- `actual_record_count`:
- `injection_config`:

## Environment

- `application_commit_sha`:
- `os`:
- `cpu`:
- `ram`:
- `storage`:
- `python_version`:
- `postgresql_version`:
- `fabric_version`:
- `runtime/container_versions`:

## Measurement policy

- `warmup_policy`:
- `latency_boundaries`:
- `throughput_window`:
- `storage_measurement_method`:
- `verification_measurement_method`:
- `cpu_memory_measurement_method`:

## Outcome

- `status`: `success | failed | unsupported`
- `failure_stage`:
- `failure_code`:
- `failure_summary`:
- `retry_attempts`:
- `exclusion_reason`:
