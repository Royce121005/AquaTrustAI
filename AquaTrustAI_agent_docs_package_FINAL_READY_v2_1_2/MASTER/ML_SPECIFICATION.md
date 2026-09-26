# AquaTrust AI — ML Anomaly Detection Specification

**Status:** AUTHORITATIVE / FROZEN
**Version:** 2.1.1

## Model scope
Isolation Forest is used for anomaly detection for exactly these parameters: BOD, COD, TSS, pH, ammoniacal nitrogen, and total nitrogen. The baseline implementation uses one independently versioned model per parameter.

## Baseline feature vector
For each parameter and sensor time series, the feature vector is exactly:
1. `value_t`
2. `delta_1 = value_t - value_(t-1)`
3. `rolling_mean_3` over the current and previous two observations
4. `rolling_std_3` over the current and previous two observations

The first two observations for a sensor/parameter do not have sufficient history for the full feature vector and must receive `INSUFFICIENT_DATA`; they must not be silently imputed for model inference.

## Preprocessing
- StandardScaler fitted only on the training partition.
- No future observations may influence training features or scaling.
- Training/evaluation split is chronological: 70% train, 15% validation, 15% test.
- Simulator-injected anomaly labels are used only for evaluation, never as training features.

## Isolation Forest baseline
- `n_estimators = 200`
- `contamination = 0.05`
- `random_state = 42`
- `max_samples = auto`
- `max_features = 1.0`
- `bootstrap = false`

The anomaly threshold is the fitted model's decision-function threshold corresponding to the configured contamination on the training partition.

## Required model artifact metadata
`model_version`, `feature_version`, `training_dataset_id`, `training_window`, `random_seed`, `parameter`, `training_row_count`, `scaler_version`, and package/library versions.

## Evaluation
Where injected anomaly ground truth exists, report precision, recall, F1, false-positive rate, and false-negative rate. Also report inference latency. If ground truth is unavailable for public historical data, do not fabricate accuracy; report only unsupervised/model diagnostics that are actually supported.
