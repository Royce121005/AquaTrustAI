"""
AquaTrust AI — Treatment Quality Prediction Model Training (Phase 3)
Trains supervised ensemble regressors to predict effluent water quality
(Effluent BOD, COD, TSS, pH) from influent parameters.

Uses chronological 70/15/15 time-series split with zero future leakage.
"""

import os
import json
import hashlib
from datetime import datetime, timezone
import pandas as pd
import numpy as np
import joblib
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import r2_score, mean_squared_error, mean_absolute_error


def train_and_evaluate():
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    dataset_path = os.path.join(
        base_dir,
        "datasets",
        "processed",
        "DATASET_01_UCI_WATER_TREATMENT",
        "uci_water_treatment_processed.csv"
    )
    output_dir = os.path.join(base_dir, "ml", "models", "treatment_prediction")
    os.makedirs(output_dir, exist_ok=True)

    print(f"Loading dataset from: {dataset_path}")
    df = pd.read_csv(dataset_path)

    # Feature columns (Influent & Physical conditions)
    feature_cols = ["Q-E", "PH-E", "DBO-E", "DQO-E", "SS-E", "SED-E", "COND-E"]
    target_map = {
        "bod": "DBO-S",
        "cod": "DQO-S",
        "tss": "SS-S",
        "ph": "PH-S",
    }

    # Verify columns exist
    for col in feature_cols + list(target_map.values()):
        if col not in df.columns:
            raise ValueError(f"Required column {col} missing from dataset!")

    # Calculate dataset SHA-256 for provenance
    with open(dataset_path, "rb") as f:
        dataset_hash = hashlib.sha256(f.read()).hexdigest()

    # Chronological Split (70% Train, 15% Val, 15% Test)
    n = len(df)
    n_train = int(n * 0.70)
    n_val = int(n * 0.15)
    n_test = n - n_train - n_val

    df_train = df.iloc[:n_train].copy()
    df_val = df.iloc[n_train:n_train + n_val].copy()
    df_test = df.iloc[n_train + n_val:].copy()

    print(f"Total samples: {n} | Train: {len(df_train)} | Val: {len(df_val)} | Test: {len(df_test)}")

    # Clean missing values using train median only (zero future leakage)
    train_medians = df_train[feature_cols].median()
    X_train_raw = df_train[feature_cols].fillna(train_medians).values
    X_val_raw = df_val[feature_cols].fillna(train_medians).values
    X_test_raw = df_test[feature_cols].fillna(train_medians).values

    # Fit feature scaler strictly on training split
    scaler = StandardScaler()
    X_train = scaler.fit_transform(X_train_raw)
    X_val = scaler.transform(X_val_raw)
    X_test = scaler.transform(X_test_raw)

    trained_models = {}
    evaluation_results = {}

    for param, target_col in target_map.items():
        print(f"\n--- Training Regressor for Effluent {param.upper()} ({target_col}) ---")
        
        # Extract target vectors and drop rows where target is NaN
        y_train_full = df_train[target_col].values
        valid_train_idx = ~np.isnan(y_train_full)
        X_tr = X_train[valid_train_idx]
        y_tr = y_train_full[valid_train_idx]

        y_val_full = df_val[target_col].values
        valid_val_idx = ~np.isnan(y_val_full)
        X_va = X_val[valid_val_idx]
        y_va = y_val_full[valid_val_idx]

        y_test_full = df_test[target_col].values
        valid_test_idx = ~np.isnan(y_test_full)
        X_te = X_test[valid_test_idx]
        y_te = y_test_full[valid_test_idx]

        # Train Random Forest Regressor with regularized parameters
        rf = RandomForestRegressor(
            n_estimators=150,
            max_depth=8,
            min_samples_split=4,
            min_samples_leaf=2,
            random_state=42,
            n_jobs=-1
        )
        rf.fit(X_tr, y_tr)

        # Train Gradient Boosting Regressor
        gb = GradientBoostingRegressor(
            n_estimators=100,
            max_depth=3,
            learning_rate=0.08,
            random_state=42
        )
        gb.fit(X_tr, y_tr)

        # Compare on validation set and select best
        rf_val_preds = rf.predict(X_va)
        gb_val_preds = gb.predict(X_va)

        rf_val_rmse = np.sqrt(mean_squared_error(y_va, rf_val_preds))
        gb_val_rmse = np.sqrt(mean_squared_error(y_va, gb_val_preds))

        best_model = rf if rf_val_rmse <= gb_val_rmse else gb
        model_type = "RandomForest" if rf_val_rmse <= gb_val_rmse else "GradientBoosting"
        print(f"Selected {model_type} (Val RMSE: {min(rf_val_rmse, gb_val_rmse):.3f})")

        # Evaluate on Test Split
        test_preds = best_model.predict(X_te)
        train_preds = best_model.predict(X_tr)

        test_r2 = float(r2_score(y_te, test_preds))
        test_rmse = float(np.sqrt(mean_squared_error(y_te, test_preds)))
        test_mae = float(mean_absolute_error(y_te, test_preds))
        train_r2 = float(r2_score(y_tr, train_preds))

        # Calculate residual std for confidence intervals (95% CI = +/- 1.96 * std_residual)
        residuals = y_tr - train_preds
        residual_std = float(np.std(residuals))

        print(f"Test Evaluation -> R2: {test_r2:.4f} | RMSE: {test_rmse:.3f} | MAE: {test_mae:.3f} | Residual Std: {residual_std:.3f}")

        trained_models[param] = {
            "model": best_model,
            "model_type": model_type,
            "residual_std": residual_std,
            "test_rmse": test_rmse,
            "test_mae": test_mae,
            "test_r2": test_r2,
        }

        evaluation_results[param] = {
            "target_column": target_col,
            "model_type": model_type,
            "train_samples": int(len(y_tr)),
            "test_samples": int(len(y_te)),
            "train_r2": round(train_r2, 4),
            "test_r2": round(test_r2, 4),
            "test_rmse": round(test_rmse, 4),
            "test_mae": round(test_mae, 4),
            "residual_std": round(residual_std, 4),
            "mean_effluent_value": round(float(np.mean(y_te)), 2),
        }

    # Save artifacts
    predictor_bundle = {
        "models": {p: m["model"] for p, m in trained_models.items()},
        "model_types": {p: m["model_type"] for p, m in trained_models.items()},
        "residual_stds": {p: m["residual_std"] for p, m in trained_models.items()},
        "feature_cols": feature_cols,
        "train_medians": train_medians.to_dict(),
        "model_version": "treatment_predictor_v1.0.0",
        "dataset_hash": dataset_hash,
    }

    model_bundle_path = os.path.join(output_dir, "treatment_quality_predictor.joblib")
    scaler_path = os.path.join(output_dir, "feature_scaler.joblib")
    eval_path = os.path.join(output_dir, "evaluation.json")
    meta_path = os.path.join(output_dir, "model_metadata.json")

    joblib.dump(predictor_bundle, model_bundle_path)
    joblib.dump(scaler, scaler_path)

    with open(eval_path, "w", encoding="utf-8") as f:
        json.dump(evaluation_results, f, indent=2)

    # Compute checksums of saved model files
    with open(model_bundle_path, "rb") as f:
        model_hash = hashlib.sha256(f.read()).hexdigest()
    with open(scaler_path, "rb") as f:
        scaler_hash = hashlib.sha256(f.read()).hexdigest()

    metadata = {
        "model_version": "treatment_predictor_v1.0.0",
        "algorithm": "Ensemble Supervised Regressors (RandomForest / GradientBoosting)",
        "training_dataset": "DATASET_01_UCI_WATER_TREATMENT",
        "dataset_sha256": dataset_hash,
        "model_bundle_sha256": model_hash,
        "scaler_sha256": scaler_hash,
        "feature_columns": feature_cols,
        "target_parameters": list(target_map.keys()),
        "trained_at_utc": datetime.now(timezone.utc).isoformat(),
        "performance_summary": evaluation_results,
    }

    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    print(f"\nAll Phase 3 artifacts successfully exported to {output_dir}")
    print(f"Model Bundle SHA-256: {model_hash[:16]}...")
    print(f"Scaler SHA-256: {scaler_hash[:16]}...")


if __name__ == "__main__":
    train_and_evaluate()
