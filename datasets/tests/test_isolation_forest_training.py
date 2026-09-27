"""
AquaTrust AI — Unit Tests for Phase 11 Isolation Forest Training
Tests model hyperparameters, zero-leakage training dataset isolation, reproducibility,
feature vector consistency, and frozen threshold persistence.
"""

import os
import sys
import json
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest

base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
src_dir = os.path.join(base_dir, "datasets", "src")
sys.path.insert(0, src_dir)

from anomaly_detection.training.data_loader import AnomalyTrainingDataLoader
from anomaly_detection.training.model_factory import IsolationForestFactory
from anomaly_detection.training.threshold_manager import ThresholdManager
from anomaly_detection.training.trainer import IsolationForestTrainer


def test_model_hyperparameters():
    """Verify IsolationForest hyperparameters are strictly frozen."""
    config = IsolationForestFactory.get_config()
    assert config["n_estimators"] == 200, f"n_estimators must be 200, got {config['n_estimators']}"
    assert config["contamination"] == 0.05, f"contamination must be 0.05, got {config['contamination']}"
    assert config["random_state"] == 42, f"random_state must be 42, got {config['random_state']}"
    assert config["bootstrap"] == False, f"bootstrap must be False, got {config['bootstrap']}"
    
    model = IsolationForestFactory.create_model()
    assert model.n_estimators == 200
    assert model.contamination == 0.05
    assert model.random_state == 42
    assert model.bootstrap == False
    print("[TEST PASS] Isolation Forest hyperparameters strictly verified.")


def test_training_dataset_isolation_and_leakage_rejection():
    """Verify data loader strictly accepts train.csv and rejects validation/test files."""
    train_csv = os.path.join(base_dir, "datasets", "anomaly_detection", "splits", "train.csv")
    val_csv = os.path.join(base_dir, "datasets", "anomaly_detection", "splits", "validation.csv")
    test_csv = os.path.join(base_dir, "datasets", "anomaly_detection", "splits", "test.csv")
    
    df, train_hash = AnomalyTrainingDataLoader.load_training_data(train_csv)
    assert len(df) > 0
    assert len(train_hash) == 64
    
    # Test rejection of validation file
    try:
        AnomalyTrainingDataLoader.load_training_data(val_csv)
        assert False, "Data loader failed to reject validation.csv"
    except ValueError as e:
        assert "Strict Zero-Leakage Violation" in str(e)

    # Test rejection of test file
    try:
        AnomalyTrainingDataLoader.load_training_data(test_csv)
        assert False, "Data loader failed to reject test.csv"
    except ValueError as e:
        assert "Strict Zero-Leakage Violation" in str(e)
        
    print("[TEST PASS] Training dataset isolation and leakage rejection verified.")


def test_reproducibility():
    """Verify repeated training on same feature matrix produces deterministic output."""
    np.random.seed(42)
    X = np.random.randn(100, 4)
    
    model1 = IsolationForestFactory.create_model()
    model1.fit(X)
    scores1 = model1.decision_function(X)
    
    model2 = IsolationForestFactory.create_model()
    model2.fit(X)
    scores2 = model2.decision_function(X)
    
    np.testing.assert_array_almost_equal(scores1, scores2, decimal=6)
    assert model1.offset_ == model2.offset_
    print("[TEST PASS] Deterministic reproducibility confirmed.")


def test_feature_consistency_and_artifacts():
    """Verify saved models, thresholds, and metadata conform to specifications."""
    training_dir = os.path.join(base_dir, "datasets", "anomaly_detection", "trained_models")
    thresholds_file = os.path.join(training_dir, "frozen_thresholds.json")
    metadata_file = os.path.join(training_dir, "model_metadata.json")
    
    assert os.path.exists(thresholds_file), "frozen_thresholds.json missing"
    assert os.path.exists(metadata_file), "model_metadata.json missing"
    
    with open(metadata_file, "r", encoding="utf-8") as f:
        meta = json.load(f)
        
    assert meta["algorithm"] == "IsolationForest"
    assert meta["parameters"]["n_estimators"] == 200
    assert meta["parameters"]["contamination"] == 0.05
    assert meta["parameters"]["random_state"] == 42
    assert "bod" in meta["target_parameters"]
    assert "cod" in meta["target_parameters"]
    assert "ph" in meta["target_parameters"]
    assert "tss" in meta["target_parameters"]
    assert "nh4_n" in meta["target_parameters"]
    assert "tn" in meta["unavailable_parameters"]
    
    # Verify loaded parameter model binary
    bod_model_path = os.path.join(training_dir, "models", "isolation_forest_param_bod.joblib")
    assert os.path.exists(bod_model_path), "BOD model binary missing"
    bod_model = joblib.load(bod_model_path)
    assert isinstance(bod_model, IsolationForest)
    assert bod_model.n_features_in_ == 4, f"Feature vector must contain exactly 4 features, got {bod_model.n_features_in_}"
    
    print("[TEST PASS] Feature consistency, parameter coverage, and artifact structure validated.")


if __name__ == "__main__":
    test_model_hyperparameters()
    test_training_dataset_isolation_and_leakage_rejection()
    test_reproducibility()
    test_feature_consistency_and_artifacts()
    print("\nAll Phase 11 Isolation Forest training tests passed 100%!")
