"""
AquaTrust AI — Temporal Splitter & Scaler Engine
Enforces 70/15/15 chronological splitting without shuffling.
Fits StandardScaler strictly on the training partition and applies parameters downstream.
"""

import os
import json
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Any


class TemporalSplitter:
    """Partitions stream data chronologically and applies leakage-free feature scaling."""

    CORE_FEATURES = ["value_t", "delta_1", "rolling_mean_3", "rolling_std_3"]

    def __init__(self, train_ratio: float = 0.70, val_ratio: float = 0.15, test_ratio: float = 0.15):
        self.train_ratio = train_ratio
        self.val_ratio = val_ratio
        self.test_ratio = test_ratio
        self.scalers: Dict[str, Dict[str, Dict[str, float]]] = {}

    def split_stream(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
        """
        Splits a sorted stream DataFrame into chronological train, validation, and test partitions.
        """
        n = len(df)
        n_train = int(np.floor(n * self.train_ratio))
        n_val = int(np.floor(n * self.val_ratio))
        
        train_df = df.iloc[:n_train].copy()
        val_df = df.iloc[n_train:n_train + n_val].copy()
        test_df = df.iloc[n_train + n_val:].copy()
        
        train_df["split"] = "train"
        val_df["split"] = "validation"
        test_df["split"] = "test"
        
        return train_df, val_df, test_df

    def fit_and_scale(self, train_df: pd.DataFrame, val_df: pd.DataFrame, test_df: pd.DataFrame, stream_id: str) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, Dict[str, Any]]:
        """
        Fits StandardScaler strictly on the training partition and scales train, val, and test.
        """
        stream_scaler_info: Dict[str, Dict[str, float]] = {}
        
        for feat in self.CORE_FEATURES:
            # Fit only on non-null train values
            train_vals = train_df[feat].dropna().values
            if len(train_vals) > 0:
                mean_val = float(np.mean(train_vals))
                std_val = float(np.std(train_vals, ddof=0))
                # Prevent division by zero for constant features
                if std_val < 1e-9:
                    std_val = 1.0
            else:
                mean_val = 0.0
                std_val = 1.0
                
            stream_scaler_info[feat] = {
                "mean": mean_val,
                "std": std_val,
                "n_train_samples": int(len(train_vals))
            }
            
            # Apply scaling
            train_df[f"{feat}_scaled"] = (train_df[feat] - mean_val) / std_val
            val_df[f"{feat}_scaled"] = (val_df[feat] - mean_val) / std_val
            test_df[f"{feat}_scaled"] = (test_df[feat] - mean_val) / std_val
            
        self.scalers[stream_id] = stream_scaler_info
        return train_df, val_df, test_df, stream_scaler_info

    def save_scalers(self, output_filepath: str):
        """Serializes fitted scaler parameters to JSON."""
        os.makedirs(os.path.dirname(output_filepath), exist_ok=True)
        with open(output_filepath, "w", encoding="utf-8") as f:
            json.dump(self.scalers, f, indent=2)
