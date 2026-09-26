# AquaTrust AI — ML Anomaly Detection Specification

**Status:** AUTHORITATIVE / FROZEN  
**Version:** 2.2.1

## 1. Model scope

Isolation Forest is used for anomaly detection for exactly these parameters:

- BOD
- COD
- TSS
- pH
- ammoniacal nitrogen
- total nitrogen

The baseline implementation uses one independently versioned model per parameter.

A parameter model must never be trained on regulatory limits, narrative values or other non-measurement records.

## 2. Time-series identity

Feature history must be constructed independently for each logical stream:

```text
facility_id + sensor_id + treatment_stage + parameter
```

When a source has no reliable sensor identifier, preprocessing must create a deterministic source-stream identifier or equivalent stable grouping key. The implementation must not mix unrelated stages/facilities into one time series.

## 3. Baseline feature vector

For each parameter and logical sensor stream, the feature vector is exactly:

1. `value_t`
2. `delta_1 = value_t - value_(t-1)`
3. `rolling_mean_3` over the current and previous two observations
4. `rolling_std_3` over the current and previous two observations

The first two observations for a stream do not have sufficient history for the full feature vector and must receive `insufficient_data`; they must not be silently imputed for model inference.

## 4. Preprocessing and leakage control

- StandardScaler is fitted only on the training partition.
- No future observations may influence training features or scaling.
- Training/evaluation split is chronological: 70% train, 15% validation, 15% test.
- Simulator-injected anomaly labels are used only for evaluation, never as training features.
- Source-record types `regulatory_limit` and `narrative_or_metadata` are excluded from training and evaluation observations.
- If the same source observation is transformed into simulator fixtures, test-derived variants must not enter the training partition.
- Any distribution/profile learned from a held-out test source or time period must be excluded from training.
- When enough facilities/sources exist, report an additional grouped/source-holdout diagnostic to expose source/facility overfitting. This does not replace the frozen chronological baseline.

## 5. Isolation Forest baseline

- `n_estimators = 200`
- `contamination = 0.05`
- `random_state = 42`
- `max_samples = auto`
- `max_features = 1.0`
- `bootstrap = false`

The anomaly threshold is the fitted model's decision-function threshold corresponding to the configured contamination on the training partition.

## 6. Missing-feature semantics

`insufficient_data` is an explicit anomaly status meaning that the model could not produce a valid inference for the required feature history. It is not equivalent to `normal` and must not be used as a negative anomaly label.

## 7. Required model artifact metadata

`model_version`, `feature_version`, `training_dataset_id` or approved dataset-lineage manifest identifier, exact dataset-portfolio/processed-data snapshot, `training_window`, `random_seed`, `parameter`, `training_row_count`, `scaler_version`, and package/library versions.

Where multiple source datasets contribute to a model, the artifact must retain the complete source manifest/checksum set rather than a misleading single-source label.

## 8. Evaluation

Where injected anomaly ground truth exists, report precision, recall, F1, false-positive rate and false-negative rate. Also report inference latency.

If ground truth is unavailable for public historical data, do not fabricate accuracy; report only unsupervised/model diagnostics actually supported by the data.

## 9. Dataset lineage requirements

The training dataset must be identified by the exact dataset-portfolio/processed-data snapshot used for the run. Source provenance and processing version must be retained with the model artifact.

Public datasets from different physical sources must not be row-wise merged into synthetic complete observations merely to fill missing parameters. Parameter-specific training or distributional pooling is permitted only when the training methodology explicitly defines it and source lineage remains recoverable.
