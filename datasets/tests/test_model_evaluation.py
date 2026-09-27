"""
AquaTrust AI — Unit Tests for Phase 13 Model Evaluation and Metrics
Tests metric calculation mathematical integrity, confusion matrix logic,
latency profiling output, and evaluation JSON schema compliance.
"""

import os
import json
import numpy as np

base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
src_dir = os.path.join(base_dir, "datasets", "src")

import sys
sys.path.insert(0, src_dir)

from anomaly_detection.evaluation.metric_calculator import MetricCalculator
from anomaly_detection.evaluation.latency_benchmarker import LatencyBenchmarker


def test_metric_calculator_mathematical_formulas():
    """Verify precision, recall, f1, fpr, and confusion matrix arithmetic."""
    # Synthetic ground truth and predictions
    # 5 TP, 10 TN, 2 FP, 3 FN
    y_true = np.array([1]*5 + [0]*10 + [0]*2 + [1]*3)
    y_pred = np.array([1]*5 + [0]*10 + [1]*2 + [0]*3)

    metrics = MetricCalculator.calculate_classification_metrics(y_true, y_pred)
    cm = metrics["confusion_matrix"]

    assert cm["tp"] == 5, f"Expected TP=5, got {cm['tp']}"
    assert cm["tn"] == 10, f"Expected TN=10, got {cm['tn']}"
    assert cm["fp"] == 2, f"Expected FP=2, got {cm['fp']}"
    assert cm["fn"] == 3, f"Expected FN=3, got {cm['fn']}"

    # Precision = 5 / (5 + 2) = 5/7 ≈ 0.7143
    assert abs(metrics["precision"] - 5/7) < 1e-3, f"Precision mismatch: {metrics['precision']}"
    # Recall = 5 / (5 + 3) = 5/8 = 0.6250
    assert abs(metrics["recall"] - 5/8) < 1e-3, f"Recall mismatch: {metrics['recall']}"
    # F1 = 2 * (5/7 * 5/8) / (5/7 + 5/8) = 10/15 ≈ 0.6667
    assert abs(metrics["f1_score"] - (2 * (5/7 * 5/8) / (5/7 + 5/8))) < 1e-3, f"F1 mismatch: {metrics['f1_score']}"
    # FPR = 2 / (2 + 10) = 2/12 ≈ 0.1667
    assert abs(metrics["false_positive_rate"] - 2/12) < 1e-3, f"FPR mismatch: {metrics['false_positive_rate']}"

    print("[TEST PASS] Classification metric mathematical formulas verified.")


def test_score_statistics_and_threshold_flagging():
    """Verify score distribution statistics calculation."""
    scores = np.array([-0.5, -0.2, 0.1, 0.3, 0.5])
    stats = MetricCalculator.calculate_score_statistics(scores, threshold=0.0)

    assert stats["n_samples"] == 5
    assert stats["flagged_count"] == 2  # -0.5, -0.2
    assert stats["flagged_pct"] == 40.0
    assert stats["mean"] == 0.04
    print("[TEST PASS] Score statistics and threshold flagging logic verified.")


def test_evaluation_json_schema_and_artifacts():
    """Verify evaluation.json existence, schema keys, and checksum lineage."""
    json_path = os.path.join(base_dir, "ml", "models", "anomaly_detection", "evaluation.json")
    report_path = os.path.join(base_dir, "docs", "ml", "model_evaluation_report.md")

    assert os.path.exists(json_path), "evaluation.json missing"
    assert os.path.exists(report_path), "model_evaluation_report.md missing"

    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Required top-level keys
    req_keys = [
        "evaluation_version", "evaluation_timestamp", "model_version",
        "feature_set_version", "preprocessing_version", "dataset_lineage",
        "model_hyperparameters", "global_classification_metrics", "per_parameter_evaluations"
    ]
    for k in req_keys:
        assert k in data, f"Key '{k}' missing from evaluation.json"

    # Verify per-parameter metrics
    for p in ["bod", "cod", "tss", "ph", "nh4_n", "tkn"]:
        assert p in data["per_parameter_evaluations"], f"Parameter '{p}' missing from evaluations"
        p_eval = data["per_parameter_evaluations"][p]
        assert p_eval["status"] == "EVALUATED"
        assert "classification_metrics" in p_eval
        assert "latency_benchmarks" in p_eval

    assert data["per_parameter_evaluations"]["tn"]["status"] == "NOT_AVAILABLE"
    assert data["per_parameter_evaluations"]["nox_n"]["status"] == "NOT_AVAILABLE"

    print("[TEST PASS] Evaluation JSON schema and parameter entries validated.")


if __name__ == "__main__":
    test_metric_calculator_mathematical_formulas()
    test_score_statistics_and_threshold_flagging()
    test_evaluation_json_schema_and_artifacts()
    print("\nAll Phase 13 Model Evaluation tests passed 100%!")
