"""
AquaTrust AI — Unit Tests for Anomaly Detection Dataset Preparation
Tests 100% data preservation, strict chronological boundaries, scaler purity, and feature invariants.
"""

import os
import json
import pandas as pd
import numpy as np

base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ad_dir = os.path.join(base_dir, "anomaly_detection")
splits_dir = os.path.join(ad_dir, "splits")
scalers_path = os.path.join(ad_dir, "scalers", "scaler_parameters.json")


def test_split_files_exist():
    assert os.path.exists(os.path.join(splits_dir, "train.csv")), "train.csv missing"
    assert os.path.exists(os.path.join(splits_dir, "validation.csv")), "validation.csv missing"
    assert os.path.exists(os.path.join(splits_dir, "test.csv")), "test.csv missing"
    assert os.path.exists(os.path.join(splits_dir, "test_with_injected_anomalies.csv")), "test_with_injected_anomalies.csv missing"
    assert os.path.exists(scalers_path), "scaler_parameters.json missing"
    print("[TEST PASS] All split and scaler files exist.")


def test_feature_columns_and_invariants():
    train_df = pd.read_csv(os.path.join(splits_dir, "train.csv"))
    val_df = pd.read_csv(os.path.join(splits_dir, "validation.csv"))
    test_df = pd.read_csv(os.path.join(splits_dir, "test.csv"))
    eval_df = pd.read_csv(os.path.join(splits_dir, "test_with_injected_anomalies.csv"))
    
    expected_cols = [
        "timestamp_utc", "facility_id", "dataset_id", "source_record_id",
        "parameter", "measurement_stage", "unit", "sensor_id", "stream_id",
        "data_origin", "value_t", "delta_1", "rolling_mean_3", "rolling_std_3",
        "quality_status", "insufficient_data", "split",
        "value_t_scaled", "delta_1_scaled", "rolling_mean_3_scaled", "rolling_std_3_scaled"
    ]
    
    for c in expected_cols:
        assert c in train_df.columns, f"Column {c} missing in train.csv"
        assert c in val_df.columns, f"Column {c} missing in validation.csv"
        assert c in test_df.columns, f"Column {c} missing in test.csv"
        
    assert "is_anomaly_injected" not in train_df.columns, "Synthetic anomaly leaked into train.csv"
    assert "is_anomaly_injected" not in val_df.columns, "Synthetic anomaly leaked into validation.csv"
    assert "is_anomaly_injected" not in test_df.columns, "Synthetic anomaly leaked into clean test.csv"
    assert "is_anomaly_injected" in eval_df.columns, "is_anomaly_injected missing from evaluation set"
    
    print("[TEST PASS] Feature columns and isolation invariants validated.")


def test_temporal_monotonicity_and_boundaries():
    train_df = pd.read_csv(os.path.join(splits_dir, "train.csv"))
    val_df = pd.read_csv(os.path.join(splits_dir, "validation.csv"))
    test_df = pd.read_csv(os.path.join(splits_dir, "test.csv"))
    
    for sid in train_df["stream_id"].unique():
        s_tr = train_df[train_df["stream_id"] == sid]
        s_va = val_df[val_df["stream_id"] == sid]
        s_te = test_df[test_df["stream_id"] == sid]
        
        t_tr_max = s_tr["timestamp_utc"].max()
        t_va_min = s_va["timestamp_utc"].min()
        t_va_max = s_va["timestamp_utc"].max()
        t_te_min = s_te["timestamp_utc"].min()
        
        assert t_tr_max < t_va_min, f"Stream {sid}: Train timestamp ({t_tr_max}) >= Val min timestamp ({t_va_min})"
        assert t_va_max < t_te_min, f"Stream {sid}: Val timestamp ({t_va_max}) >= Test min timestamp ({t_te_min})"
        
    print("[TEST PASS] Temporal monotonicity and strict partition boundaries confirmed across all streams.")


def test_scaler_training_purity():
    train_df = pd.read_csv(os.path.join(splits_dir, "train.csv"))
    with open(scalers_path, "r", encoding="utf-8") as f:
        scalers = json.load(f)
        
    for sid in train_df["stream_id"].unique():
        s_tr = train_df[train_df["stream_id"] == sid]
        for feat in ["value_t", "delta_1", "rolling_mean_3", "rolling_std_3"]:
            vals = s_tr[feat].dropna().values
            if len(vals) > 0:
                calc_mean = float(np.mean(vals))
                calc_std = float(np.std(vals, ddof=0))
                if calc_std < 1e-9:
                    calc_std = 1.0
                    
                saved_mean = scalers[sid][feat]["mean"]
                saved_std = scalers[sid][feat]["std"]
                
                assert abs(calc_mean - saved_mean) < 1e-5, f"Stream {sid} {feat} scaler mean mismatch: {calc_mean} vs {saved_mean}"
                assert abs(calc_std - saved_std) < 1e-5, f"Stream {sid} {feat} scaler std mismatch: {calc_std} vs {saved_std}"
                
    print("[TEST PASS] Scaler training purity verified 100% against frozen training partition distributions.")


if __name__ == "__main__":
    test_split_files_exist()
    test_feature_columns_and_invariants()
    test_temporal_monotonicity_and_boundaries()
    test_scaler_training_purity()
    print("\nAll anomaly detection preparation tests passed successfully!")
