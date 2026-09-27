"""
AquaTrust AI — Unit Tests for Phase 12 Controlled Anomaly Evaluation Dataset
Tests dataset immutability, ground-truth consistency, scenario tagging, and manifest lineage.
"""

import os
import json
import hashlib
import pandas as pd
import numpy as np

base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
splits_dir = os.path.join(base_dir, "datasets", "anomaly_detection", "splits")
eval_csv = os.path.join(splits_dir, "test_with_injected_anomalies.csv")
manifest_path = os.path.join(base_dir, "docs", "ml", "anomaly_injection_manifest.json")
report_path = os.path.join(base_dir, "docs", "ml", "anomaly_injection_report.md")


def compute_sha256(filepath: str) -> str:
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()


def test_clean_datasets_immutability():
    """Assert train.csv, validation.csv, and test.csv remain 100% unaltered."""
    train_hash = compute_sha256(os.path.join(splits_dir, "train.csv"))
    val_hash = compute_sha256(os.path.join(splits_dir, "validation.csv"))
    test_hash = compute_sha256(os.path.join(splits_dir, "test.csv"))
    
    assert train_hash == "099b6d58d45adf1092c68cb8e4311eba80f18658209796099892edc2864cb444", "train.csv was modified!"
    assert val_hash == "5abdd51a953b08de523fc71afeb48260c24aa18e69cab8cf4b532c47db0b5350", "validation.csv was modified!"
    assert test_hash == "e0563e069b71c14eb5f6bc6a7dca1fcace49c37e09ada010c6c1d2a1bef630ab", "test.csv was modified!"
    print("[TEST PASS] Source dataset immutability verified (zero contamination).")


def test_evaluation_dataset_structure_and_ground_truth():
    """Verify ground truth columns, anomaly origins, and scenario contracts."""
    assert os.path.exists(eval_csv), "test_with_injected_anomalies.csv missing"
    df = pd.read_csv(eval_csv, low_memory=False)
    
    # Check required columns
    req_cols = [
        "ground_truth_anomaly", "anomaly_origin", "injection_id",
        "scenario", "original_value", "injected_value",
        "value_t", "delta_1", "rolling_mean_3", "rolling_std_3",
        "value_t_scaled", "delta_1_scaled", "rolling_mean_3_scaled", "rolling_std_3_scaled"
    ]
    for c in req_cols:
        assert c in df.columns, f"Required evaluation column missing: {c}"
        
    injected_rows = df[df["ground_truth_anomaly"] == 1]
    normal_rows = df[df["ground_truth_anomaly"] == 0]
    
    assert len(injected_rows) > 0, "No injected anomalies found in evaluation dataset"
    assert len(normal_rows) > 0, "No normal observed rows found in evaluation dataset"
    
    # Invariant: Every injected anomaly has origin 'injected' and valid scenario
    assert (injected_rows["anomaly_origin"] == "injected").all(), "Injected rows must have anomaly_origin == 'injected'"
    assert (injected_rows["scenario"] != "none").all(), "Injected rows must have a valid scenario specified"
    assert (injected_rows["injection_id"] != "").all(), "Injected rows must have non-empty injection_id"
    
    # Invariant: Every normal row has origin 'observed' and scenario 'none'
    assert (normal_rows["anomaly_origin"] == "observed").all(), "Normal rows must have anomaly_origin == 'observed'"
    assert (normal_rows["scenario"] == "none").all(), "Normal rows must have scenario == 'none'"
    
    # Injected proportion should be approx 5%
    rate = len(injected_rows) / len(df)
    assert 0.04 <= rate <= 0.07, f"Anomaly rate {rate:.4f} outside expected [0.04, 0.07] window"
    print(f"[TEST PASS] Evaluation schema, ground-truth flags, and rate ({rate*100:.2f}%) validated.")


def test_manifest_and_report_integrity():
    """Verify manifest records valid source and evaluation dataset hashes."""
    assert os.path.exists(manifest_path), "anomaly_injection_manifest.json missing"
    assert os.path.exists(report_path), "anomaly_injection_report.md missing"
    
    with open(manifest_path, "r", encoding="utf-8") as f:
        meta = json.load(f)
        
    eval_hash = compute_sha256(eval_csv)
    test_hash = compute_sha256(os.path.join(splits_dir, "test.csv"))
    
    assert meta["source_test_dataset_hash"] == test_hash
    assert meta["generated_evaluation_dataset_hash"] == eval_hash
    assert meta["random_seed"] == 42
    assert meta["target_anomaly_rate"] == 0.05
    assert len(meta["scenarios_implemented"]) == 7
    print("[TEST PASS] Anomaly injection manifest and lineage hashes confirmed.")


if __name__ == "__main__":
    test_clean_datasets_immutability()
    test_evaluation_dataset_structure_and_ground_truth()
    test_manifest_and_report_integrity()
    print("\nAll Phase 12 Controlled Anomaly Evaluation tests passed 100%!")
