"""
AquaTrust AI — Threshold Manager
Calculates, freezes, and persists anomaly decision thresholds derived strictly from training data.
"""

import json
import numpy as np
from typing import Dict, Any
from sklearn.ensemble import IsolationForest


class ThresholdManager:
    """Manages frozen decision thresholds for anomaly detection models."""

    @classmethod
    def calculate_threshold(cls, model: IsolationForest, X_train: np.ndarray, contamination: float = 0.05) -> Dict[str, Any]:
        """
        Calculates the operational decision threshold from training data scores.
        """
        if len(X_train) == 0:
            return {
                "threshold": None,
                "offset": None,
                "method": "decision_function_offset",
                "contamination": contamination,
                "n_samples": 0
            }
            
        decision_scores = model.decision_function(X_train)
        score_samples = model.score_samples(X_train)
        
        # Scikit-learn offset
        offset_val = float(model.offset_)
        
        # 5th percentile of decision scores
        train_p05 = float(np.percentile(decision_scores, contamination * 100))
        train_mean_score = float(np.mean(decision_scores))
        train_std_score = float(np.std(decision_scores))
        
        return {
            "threshold": 0.0,  # For decision_function(X), 0.0 is the canonical decision boundary
            "model_offset": offset_val,
            "train_score_p05": train_p05,
            "train_score_mean": train_mean_score,
            "train_score_std": train_std_score,
            "method": "decision_function_zero_boundary",
            "contamination": contamination,
            "n_training_samples": int(len(X_train))
        }

    @classmethod
    def save_thresholds(cls, thresholds: Dict[str, Any], filepath: str):
        """Saves frozen threshold configuration to JSON."""
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(thresholds, f, indent=2)

    @classmethod
    def load_thresholds(cls, filepath: str) -> Dict[str, Any]:
        """Loads frozen threshold configuration from JSON."""
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)
