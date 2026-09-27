"""
AquaTrust AI — Anomaly Training Data Loader
Strict zero-leakage data loader that ingests ONLY train.csv.
"""

import os
import hashlib
import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Optional


class AnomalyTrainingDataLoader:
    """Loads and validates training data strictly from train.csv."""

    DEFAULT_FEATURE_COLS = [
        "value_t_scaled",
        "delta_1_scaled",
        "rolling_mean_3_scaled",
        "rolling_std_3_scaled"
    ]
    RAW_FEATURE_COLS = [
        "value_t",
        "delta_1",
        "rolling_mean_3",
        "rolling_std_3"
    ]

    @staticmethod
    def compute_sha256(filepath: str) -> str:
        h = hashlib.sha256()
        with open(filepath, "rb") as f:
            while chunk := f.read(65536):
                h.update(chunk)
        return h.hexdigest()

    @classmethod
    def load_training_data(cls, train_filepath: str) -> Tuple[pd.DataFrame, str]:
        """
        Loads and validates train.csv. Strictly rejects validation or test files.
        """
        if not os.path.exists(train_filepath):
            raise FileNotFoundError(f"Training file not found: {train_filepath}")
        
        filename = os.path.basename(train_filepath).lower()
        if "test" in filename or "val" in filename:
            raise ValueError(f"Strict Zero-Leakage Violation: Cannot load non-train file for training: {filename}")
        
        train_hash = cls.compute_sha256(train_filepath)
        df = pd.read_csv(train_filepath, low_memory=False)
        
        # Verify required columns
        for c in cls.DEFAULT_FEATURE_COLS + ["parameter", "stream_id", "quality_status", "insufficient_data"]:
            if c not in df.columns:
                raise KeyError(f"Required training column missing: {c}")
                
        return df, train_hash

    @classmethod
    def extract_valid_parameter_features(cls, df: pd.DataFrame, parameter: str, feature_cols: Optional[List[str]] = None) -> Tuple[pd.DataFrame, np.ndarray]:
        """
        Extracts valid, non-null training feature vectors for a given target parameter.
        Filters out rows marked insufficient_data or with missing features.
        """
        if feature_cols is None:
            feature_cols = cls.DEFAULT_FEATURE_COLS
            
        param_df = df[df["parameter"] == parameter].copy()
        if len(param_df) == 0:
            return param_df, np.empty((0, len(feature_cols)))
            
        # Filter for complete non-NaN feature rows
        valid_mask = (param_df["insufficient_data"] == False) & (param_df[feature_cols].notna().all(axis=1))
        valid_df = param_df[valid_mask].copy()
        
        X = valid_df[feature_cols].values.astype(np.float64)
        return valid_df, X

    @classmethod
    def extract_valid_stream_features(cls, df: pd.DataFrame, stream_id: str, feature_cols: Optional[List[str]] = None) -> Tuple[pd.DataFrame, np.ndarray]:
        """
        Extracts valid, non-null training feature vectors for a specific logical stream.
        """
        if feature_cols is None:
            feature_cols = cls.DEFAULT_FEATURE_COLS
            
        stream_df = df[df["stream_id"] == stream_id].copy()
        if len(stream_df) == 0:
            return stream_df, np.empty((0, len(feature_cols)))
            
        valid_mask = (stream_df["insufficient_data"] == False) & (stream_df[feature_cols].notna().all(axis=1))
        valid_df = stream_df[valid_mask].copy()
        
        X = valid_df[feature_cols].values.astype(np.float64)
        return valid_df, X
