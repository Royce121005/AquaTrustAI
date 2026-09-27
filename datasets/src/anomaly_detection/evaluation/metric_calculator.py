"""
AquaTrust AI — Metric Calculator
Calculates classification metrics, confusion matrices, and distribution statistics.
"""

import numpy as np
from typing import Dict, Any, Tuple


class MetricCalculator:
    """Computes rigorous classification and distribution metrics for anomaly detection."""

    @classmethod
    def calculate_classification_metrics(cls, y_true: np.ndarray, y_pred: np.ndarray) -> Dict[str, Any]:
        """
        Computes TP, TN, FP, FN, Precision, Recall, F1, and FPR.
        y_true: 1 for anomaly, 0 for normal
        y_pred: 1 for anomaly, 0 for normal
        """
        y_true = np.asarray(y_true).astype(int)
        y_pred = np.asarray(y_pred).astype(int)

        tp = int(np.sum((y_true == 1) & (y_pred == 1)))
        tn = int(np.sum((y_true == 0) & (y_pred == 0)))
        fp = int(np.sum((y_true == 0) & (y_pred == 1)))
        fn = int(np.sum((y_true == 1) & (y_pred == 0)))

        precision = float(tp / (tp + fp)) if (tp + fp) > 0 else 0.0
        recall = float(tp / (tp + fn)) if (tp + fn) > 0 else 0.0
        f1 = float(2 * (precision * recall) / (precision + recall)) if (precision + recall) > 0 else 0.0
        fpr = float(fp / (fp + tn)) if (fp + tn) > 0 else 0.0

        return {
            "confusion_matrix": {
                "tp": tp,
                "tn": tn,
                "fp": fp,
                "fn": fn
            },
            "total_samples": int(len(y_true)),
            "positive_samples": int(np.sum(y_true == 1)),
            "negative_samples": int(np.sum(y_true == 0)),
            "precision": round(precision, 4),
            "recall": round(recall, 4),
            "f1_score": round(f1, 4),
            "false_positive_rate": round(fpr, 4)
        }

    @classmethod
    def calculate_score_statistics(cls, scores: np.ndarray, threshold: float = 0.0) -> Dict[str, Any]:
        """
        Computes summary statistics on raw continuous decision scores.
        """
        scores = np.asarray(scores).astype(float)
        valid_scores = scores[~np.isnan(scores)]

        if len(valid_scores) == 0:
            return {
                "n_samples": 0,
                "mean": None,
                "std": None,
                "median": None,
                "min": None,
                "max": None,
                "p05": None,
                "p95": None,
                "flagged_count": 0,
                "flagged_pct": 0.0
            }

        flagged = int(np.sum(valid_scores < threshold))
        flagged_pct = float((flagged / len(valid_scores)) * 100.0)

        return {
            "n_samples": int(len(valid_scores)),
            "mean": round(float(np.mean(valid_scores)), 4),
            "std": round(float(np.std(valid_scores)), 4),
            "median": round(float(np.median(valid_scores)), 4),
            "min": round(float(np.min(valid_scores)), 4),
            "max": round(float(np.max(valid_scores)), 4),
            "p05": round(float(np.percentile(valid_scores, 5)), 4),
            "p95": round(float(np.percentile(valid_scores, 95)), 4),
            "flagged_count": flagged,
            "flagged_pct": round(flagged_pct, 2)
        }
