"""
AquaTrust AI — Unit Tests for Phase 14 Model Packaging and Serialization
Tests loadability of packaged models, scalers, YAML/JSON configs, and version consistency.
"""

import os
import json
import yaml
import joblib
import hashlib
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
prod_dir = os.path.join(base_dir, "ml", "models", "anomaly_detection")


def compute_sha256(filepath: str) -> str:
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()


def test_packaged_artifacts_exist():
    """Verify all production files exist in ml/models/anomaly_detection/."""
    expected_files = [
        "isolation_forest.joblib",
        "scaler.joblib",
        "feature_config.yaml",
        "model_metadata.json",
        "evaluation.json"
    ]
    for f in expected_files:
        p = os.path.join(prod_dir, f)
        assert os.path.exists(p), f"Packaged file missing: {p}"
        assert os.path.getsize(p) > 0, f"Packaged file is empty: {p}"

    # Verify individual parameter models subfolder
    for p in ["bod", "cod", "tss", "ph", "nh4_n", "tkn"]:
        model_path = os.path.join(prod_dir, "models", f"isolation_forest_{p}.joblib")
        assert os.path.exists(model_path), f"Parameter model missing: {model_path}"

    print("[TEST PASS] All production package artifacts exist.")


def test_model_and_scaler_loadability():
    """Verify that isolation_forest.joblib and scaler.joblib deserialize cleanly."""
    bundle = joblib.load(os.path.join(prod_dir, "isolation_forest.joblib"))
    assert isinstance(bundle, dict), "isolation_forest.joblib must be a parameter-to-model dictionary"
    
    for p in ["bod", "cod", "tss", "ph", "nh4_n", "tkn"]:
        assert p in bundle, f"Parameter '{p}' missing from model bundle"
        model = bundle[p]
        assert isinstance(model, IsolationForest)
        assert model.n_estimators == 200
        assert model.contamination == 0.05
        assert model.random_state == 42
        assert model.bootstrap == False
        
        # Test inference
        sample_x = np.array([[0.1, 0.05, 0.1, 0.02]])
        score = model.decision_function(sample_x)
        assert len(score) == 1
        assert not np.isnan(score[0])

    # Test scaler loadability
    scalers = joblib.load(os.path.join(prod_dir, "scaler.joblib"))
    assert "stream_scalers" in scalers
    assert "scaler_parameters_json" in scalers
    assert len(scalers["stream_scalers"]) > 0

    print("[TEST PASS] Model bundle and scaler registry loadability and inference confirmed.")


def test_version_and_metadata_consistency():
    """Verify version numbers and dataset hashes match across all configuration files."""
    # 1. Load feature_config.yaml
    with open(os.path.join(prod_dir, "feature_config.yaml"), "r", encoding="utf-8") as f:
        f_cfg = yaml.safe_load(f)

    # 2. Load model_metadata.json
    with open(os.path.join(prod_dir, "model_metadata.json"), "r", encoding="utf-8") as f:
        m_meta = json.load(f)

    # 3. Load evaluation.json
    with open(os.path.join(prod_dir, "evaluation.json"), "r", encoding="utf-8") as f:
        eval_meta = json.load(f)

    # Cross-verify versions
    assert f_cfg["feature_set_version"] == "v2.2.1"
    assert f_cfg["preprocessing_version"] == "v2.2.1"
    assert m_meta["feature_set_version"] == "v2.2.1"
    assert m_meta["preprocessing_version"] == "v2.2.1"
    assert eval_meta["feature_set_version"] == "v2.2.1"
    assert eval_meta["preprocessing_version"] == "v2.2.1"
    assert m_meta["model_version"] == eval_meta["model_version"] == "iforest_v2.2.1"

    # Verify dataset hashes
    train_csv_hash = "099b6d58d45adf1092c68cb8e4311eba80f18658209796099892edc2864cb444"
    assert m_meta["training_dataset_hash"] == train_csv_hash
    assert eval_meta["dataset_lineage"]["training_dataset_hash"] == train_csv_hash

    # Verify SHA-256 integrity of production artifacts recorded in metadata
    for fname, exp_hash in m_meta["production_artifacts_sha256"].items():
        actual_hash = compute_sha256(os.path.join(prod_dir, fname))
        assert actual_hash == exp_hash, f"Checksum mismatch for {fname}: {actual_hash} vs {exp_hash}"

    print("[TEST PASS] Version consistency, dataset hashes, and artifact integrity validated.")


if __name__ == "__main__":
    test_packaged_artifacts_exist()
    test_model_and_scaler_loadability()
    test_version_and_metadata_consistency()
    print("\nAll Phase 14 Model Packaging tests passed 100%!")
