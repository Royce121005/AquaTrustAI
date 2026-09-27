"""
AquaTrust AI — Model Evaluator
Executes multi-split evaluation on injected test, clean test, and validation partitions.
"""

import os
import json
import joblib
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Any

from .metric_calculator import MetricCalculator
from .latency_benchmarker import LatencyBenchmarker


class AnomalyModelEvaluator:
    """Performs end-to-end evaluation of trained Isolation Forest models across all partitions."""

    FEATURE_COLS = [
        "value_t_scaled",
        "delta_1_scaled",
        "rolling_mean_3_scaled",
        "rolling_std_3_scaled"
    ]

    def __init__(self, models_dir: str, thresholds_path: str):
        self.models_dir = models_dir
        self.thresholds_path = thresholds_path
        
        with open(self.thresholds_path, "r", encoding="utf-8") as f:
            self.threshold_config = json.load(f)

    def evaluate_parameter_model(
        self,
        parameter: str,
        eval_test_df: pd.DataFrame,
        clean_test_df: pd.DataFrame,
        val_df: pd.DataFrame
    ) -> Dict[str, Any]:
        """
        Evaluates an individual parameter-level model on all three splits.
        """
        model_filename = f"isolation_forest_param_{parameter}.joblib"
        model_path = os.path.join(self.models_dir, model_filename)

        if not os.path.exists(model_path):
            return {
                "parameter": parameter,
                "status": "NOT_AVAILABLE",
                "reason": "Parameter not trained due to lack of contiguous historical observations"
            }

        model = joblib.load(model_path)
        threshold_info = self.threshold_config.get("parameter_thresholds", {}).get(parameter, {})
        threshold_val = 0.0  # Canonical decision_function threshold

        # 1. Classification Evaluation on test_with_injected_anomalies.csv
        p_eval = eval_test_df[eval_test_df["parameter"] == parameter].copy()
        valid_eval_mask = (p_eval["insufficient_data"] == False) & (p_eval[self.FEATURE_COLS].notna().all(axis=1))
        valid_eval = p_eval[valid_eval_mask].copy()

        if len(valid_eval) > 0:
            X_eval = valid_eval[self.FEATURE_COLS].values.astype(np.float64)
            scores_eval = model.decision_function(X_eval)
            y_pred = (scores_eval < threshold_val).astype(int)
            y_true = valid_eval["ground_truth_anomaly"].values.astype(int)

            class_metrics = MetricCalculator.calculate_classification_metrics(y_true, y_pred)
            eval_score_stats = MetricCalculator.calculate_score_statistics(scores_eval, threshold_val)

            # Scenario breakdown
            valid_eval["pred_anomaly"] = y_pred
            scenario_detection = {}
            for sc in valid_eval[valid_eval["ground_truth_anomaly"] == 1]["scenario"].unique():
                sc_sub = valid_eval[valid_eval["scenario"] == sc]
                sc_tp = int(sc_sub["pred_anomaly"].sum())
                sc_total = len(sc_sub)
                scenario_detection[sc] = {
                    "total_injected": sc_total,
                    "detected_tp": sc_tp,
                    "recall": round(float(sc_tp / sc_total), 4) if sc_total > 0 else 0.0
                }
        else:
            class_metrics = {}
            eval_score_stats = {}
            scenario_detection = {}

        # 2. Clean Test Evaluation on test.csv
        p_clean = clean_test_df[clean_test_df["parameter"] == parameter].copy()
        valid_clean_mask = (p_clean["insufficient_data"] == False) & (p_clean[self.FEATURE_COLS].notna().all(axis=1))
        valid_clean = p_clean[valid_clean_mask].copy()

        if len(valid_clean) > 0:
            X_clean = valid_clean[self.FEATURE_COLS].values.astype(np.float64)
            scores_clean = model.decision_function(X_clean)
            clean_score_stats = MetricCalculator.calculate_score_statistics(scores_clean, threshold_val)
        else:
            clean_score_stats = {}

        # 3. Validation Evaluation on validation.csv
        p_val = val_df[val_df["parameter"] == parameter].copy()
        valid_val_mask = (p_val["insufficient_data"] == False) & (p_val[self.FEATURE_COLS].notna().all(axis=1))
        valid_val = p_val[valid_val_mask].copy()

        if len(valid_val) > 0:
            X_val = valid_val[self.FEATURE_COLS].values.astype(np.float64)
            scores_val = model.decision_function(X_val)
            val_score_stats = MetricCalculator.calculate_score_statistics(scores_val, threshold_val)
        else:
            val_score_stats = {}

        # 4. Latency Benchmark
        latency_info = LatencyBenchmarker.benchmark_model_latency(model_path)

        return {
            "parameter": parameter,
            "status": "EVALUATED",
            "model_artifact": model_filename,
            "threshold_info": threshold_info,
            "classification_metrics": class_metrics,
            "scenario_breakdown": scenario_detection,
            "clean_test_score_statistics": clean_score_stats,
            "validation_score_statistics": val_score_stats,
            "injected_test_score_statistics": eval_score_stats,
            "latency_benchmarks": latency_info
        }
