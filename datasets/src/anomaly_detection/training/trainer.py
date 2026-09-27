"""
AquaTrust AI — Isolation Forest Trainer
Orchestrates training of parameter-specific and stream-specific Isolation Forest models strictly on train.csv.
"""

import os
import joblib
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Any

from .data_loader import AnomalyTrainingDataLoader
from .model_factory import IsolationForestFactory
from .threshold_manager import ThresholdManager


class IsolationForestTrainer:
    """Trains reproducible Isolation Forest models on strictly isolated training feature vectors."""

    TARGET_PARAMETERS = ["bod", "cod", "tss", "ph", "nh4_n", "tn"]
    OPTIONAL_PARAMETERS = ["tkn", "nox_n"]

    def __init__(
        self,
        output_dir: str,
        model_version: str = "iforest_v2.2.1",
        feature_set_version: str = "v2.2.1",
        preprocessing_version: str = "v2.2.1"
    ):
        self.output_dir = output_dir
        self.model_version = model_version
        self.feature_set_version = feature_set_version
        self.preprocessing_version = preprocessing_version
        os.makedirs(self.output_dir, exist_ok=True)
        
        self.models_dir = os.path.join(self.output_dir, "models")
        os.makedirs(self.models_dir, exist_ok=True)

    def train_parameter_models(self, train_df: pd.DataFrame) -> Tuple[Dict[str, Any], Dict[str, Any], List[str], List[str]]:
        """
        Trains independent Isolation Forest models for each supported wastewater parameter.
        """
        model_summaries = {}
        thresholds = {}
        modeled_parameters = []
        unavailable_parameters = []
        
        # All potential parameters
        all_params = self.TARGET_PARAMETERS + self.OPTIONAL_PARAMETERS
        
        for param in all_params:
            valid_df, X_train = AnomalyTrainingDataLoader.extract_valid_parameter_features(train_df, parameter=param)
            
            if len(X_train) < 10:
                unavailable_parameters.append(param)
                model_summaries[param] = {
                    "status": "NOT_AVAILABLE",
                    "reason": "Insufficient contiguous training observations in historical window (valid samples < 10)",
                    "valid_training_samples": len(X_train),
                    "model_artifact": None
                }
                thresholds[param] = {
                    "status": "NOT_AVAILABLE",
                    "threshold": None
                }
                continue
                
            # Train Isolation Forest
            model = IsolationForestFactory.create_model()
            model.fit(X_train)
            
            # Calculate threshold
            thresh_info = ThresholdManager.calculate_threshold(model, X_train, contamination=0.05)
            thresholds[param] = thresh_info
            
            # Serialize model artifact
            model_filename = f"isolation_forest_param_{param}.joblib"
            model_path = os.path.join(self.models_dir, model_filename)
            joblib.dump(model, model_path)
            
            modeled_parameters.append(param)
            model_summaries[param] = {
                "status": "TRAINED",
                "parameter": param,
                "n_training_samples": int(len(X_train)),
                "n_streams_covered": int(valid_df["stream_id"].nunique()),
                "streams": list(valid_df["stream_id"].unique()),
                "model_artifact": model_filename,
                "model_path": model_path,
                "threshold_offset": thresh_info["model_offset"],
                "train_score_p05": thresh_info["train_score_p05"]
            }
            
        return model_summaries, thresholds, modeled_parameters, unavailable_parameters

    def train_stream_models(self, train_df: pd.DataFrame) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        """
        Trains dedicated stream-specific Isolation Forest models for high-precision facility/stage monitoring.
        """
        stream_summaries = {}
        stream_thresholds = {}
        
        stream_ids = sorted(train_df["stream_id"].unique())
        
        for sid in stream_ids:
            valid_df, X_train = AnomalyTrainingDataLoader.extract_valid_stream_features(train_df, stream_id=sid)
            
            if len(X_train) < 10:
                stream_summaries[sid] = {
                    "status": "INSUFFICIENT_DATA",
                    "valid_training_samples": len(X_train),
                    "model_artifact": None
                }
                continue
                
            model = IsolationForestFactory.create_model()
            model.fit(X_train)
            
            thresh_info = ThresholdManager.calculate_threshold(model, X_train, contamination=0.05)
            stream_thresholds[sid] = thresh_info
            
            # Sanitize stream ID for filename
            clean_name = sid.replace(":", "_").replace("-", "_").lower()
            model_filename = f"iforest_stream_{clean_name}.joblib"
            model_path = os.path.join(self.models_dir, model_filename)
            joblib.dump(model, model_path)
            
            stream_summaries[sid] = {
                "status": "TRAINED",
                "stream_id": sid,
                "parameter": valid_df["parameter"].iloc[0],
                "measurement_stage": valid_df["measurement_stage"].iloc[0],
                "facility_id": valid_df["facility_id"].iloc[0],
                "n_training_samples": int(len(X_train)),
                "model_artifact": model_filename,
                "model_path": model_path,
                "threshold_offset": thresh_info["model_offset"],
                "train_score_p05": thresh_info["train_score_p05"]
            }
            
        return stream_summaries, stream_thresholds
