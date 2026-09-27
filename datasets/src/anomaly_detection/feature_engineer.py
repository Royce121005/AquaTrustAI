"""
AquaTrust AI — Anomaly Detection Feature Engineering
Authoritative implementation of the baseline 4-feature vector:
  1. value_t
  2. delta_1 (first difference)
  3. rolling_mean_3 (3-period trailing mean)
  4. rolling_std_3 (3-period trailing standard deviation)
"""

import os
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple


class StreamFeatureEngineer:
    """Computes trailing temporal features independently per logical sensor stream."""

    CORE_FEATURES = ["value_t", "delta_1", "rolling_mean_3", "rolling_std_3"]

    @classmethod
    def compute_features_for_series(cls, df: pd.DataFrame, value_col: str, time_col: str = "timestamp_utc") -> pd.DataFrame:
        """
        Sorts series chronologically and computes the 4 authoritative features.
        Preserves original rows and marks insufficient history with NaN and status flags.
        """
        df = df.sort_values(time_col).reset_index(drop=True).copy()
        
        series = pd.to_numeric(df[value_col], errors="coerce")
        
        # 1. value_t
        df["value_t"] = series
        
        # 2. delta_1 = x_t - x_(t-1)
        df["delta_1"] = series.diff(1)
        
        # 3. rolling_mean_3 = trailing mean over window of size 3 (t, t-1, t-2)
        df["rolling_mean_3"] = series.rolling(window=3, min_periods=3).mean()
        
        # 4. rolling_std_3 = trailing sample std over window of size 3 (ddof=1)
        df["rolling_std_3"] = series.rolling(window=3, min_periods=3).std(ddof=1)
        
        # Flag insufficient data and missing values
        def determine_status(row, idx):
            if pd.isna(row["value_t"]):
                return "missing_input", True
            if idx < 2:
                return "insufficient_data", True
            if pd.isna(row["rolling_mean_3"]) or pd.isna(row["rolling_std_3"]):
                return "insufficient_data", True
            return "valid", False

        statuses = []
        insufficient_flags = []
        for idx, row in df.iterrows():
            st, flag = determine_status(row, idx)
            statuses.append(st)
            insufficient_flags.append(flag)
            
        df["quality_status"] = statuses
        df["insufficient_data"] = insufficient_flags
        
        return df

    @classmethod
    def extract_uci_streams(cls, uci_df: pd.DataFrame) -> List[pd.DataFrame]:
        """Extracts streams for UCI Water Treatment Plant (Dataset 01)."""
        # Map UCI stage columns to canonical parameter and stage
        uci_mappings = [
            # Effluent stage (most critical for compliance)
            ("PH-S", "ph", "final_effluent", "pH_units"),
            ("DBO-S", "bod", "final_effluent", "mg/L"),
            ("DQO-S", "cod", "final_effluent", "mg/L"),
            ("SS-S", "tss", "final_effluent", "mg/L"),
            # Plant Influent stage (for input shock detection)
            ("PH-E", "ph", "inlet", "pH_units"),
            ("DBO-E", "bod", "inlet", "mg/L"),
            ("DQO-E", "cod", "inlet", "mg/L"),
            ("SS-E", "tss", "inlet", "mg/L"),
            # Intermediate stages
            ("PH-P", "ph", "primary_settler", "pH_units"),
            ("DBO-P", "bod", "primary_settler", "mg/L"),
            ("SS-P", "tss", "primary_settler", "mg/L"),
            ("PH-D", "ph", "secondary_settler", "pH_units"),
            ("DBO-D", "bod", "secondary_settler", "mg/L"),
            ("DQO-D", "cod", "secondary_settler", "mg/L"),
            ("SS-D", "tss", "secondary_settler", "mg/L"),
        ]
        
        stream_dfs = []
        for raw_col, param, stage, unit in uci_mappings:
            sub = uci_df[["timestamp_utc", "facility_id", "dataset_id", "source_record_id", raw_col]].copy()
            sub["parameter"] = param
            sub["measurement_stage"] = stage
            sub["unit"] = unit
            sub["sensor_id"] = f"SENSOR_UCI_{stage.upper()}_{param.upper()}"
            sub["stream_id"] = f"DATASET_01_UCI:FAC_UCI_URBAN_ETP_01:{stage}:{param}"
            sub["data_origin"] = "observed"
            sub["raw_parameter_name"] = raw_col
            
            fe_df = cls.compute_features_for_series(sub, value_col=raw_col)
            stream_dfs.append(fe_df)
            
        return stream_dfs

    @classmethod
    def extract_melbourne_inlet_streams(cls, inlet_df: pd.DataFrame) -> List[pd.DataFrame]:
        """Extracts streams for Melbourne ETP Raw Influent (Dataset 02)."""
        mappings = [
            ("nh4_n_mg_l", "nh4_n", "inlet", "mg/L"),
            ("bod_mg_l", "bod", "inlet", "mg/L"),
            ("cod_mg_l", "cod", "inlet", "mg/L"),
            ("tn_mg_l", "tn", "inlet", "mg/L"),
            ("nox_n_mg_l", "nox_n", "inlet", "mg/L"),
        ]
        
        stream_dfs = []
        for raw_col, param, stage, unit in mappings:
            sub = inlet_df[["timestamp_utc", "facility_id", "dataset_id", "source_record_id", raw_col]].copy()
            sub["parameter"] = param
            sub["measurement_stage"] = stage
            sub["unit"] = unit
            sub["sensor_id"] = f"SENSOR_MWC_INLET_{param.upper()}"
            sub["stream_id"] = f"DATASET_02_MELBOURNE_INLET:MWC_ETP_MELBOURNE:inlet:{param}"
            sub["data_origin"] = "observed"
            sub["raw_parameter_name"] = raw_col
            
            fe_df = cls.compute_features_for_series(sub, value_col=raw_col)
            stream_dfs.append(fe_df)
            
        return stream_dfs

    @classmethod
    def extract_melbourne_outlet_streams(cls, outlet_df: pd.DataFrame) -> List[pd.DataFrame]:
        """Extracts streams for Melbourne ETP Treated Effluent (Dataset 03)."""
        mappings = [
            ("cod_mg_l", "cod", "final_effluent", "mg/L"),
            ("bod_mg_l", "bod", "final_effluent", "mg/L"),
            ("nh4_n_mg_l", "nh4_n", "final_effluent", "mg/L"),
            ("tn_mg_l", "tn", "final_effluent", "mg/L"),
            ("nox_n_mg_l", "nox_n", "final_effluent", "mg/L"),
            ("tkn_mg_l", "tkn", "final_effluent", "mg/L"),
        ]
        
        stream_dfs = []
        for raw_col, param, stage, unit in mappings:
            sub = outlet_df[["timestamp_utc", "facility_id", "dataset_id", "source_record_id", raw_col]].copy()
            sub["parameter"] = param
            sub["measurement_stage"] = stage
            sub["unit"] = unit
            sub["sensor_id"] = f"SENSOR_MWC_OUTLET_{param.upper()}"
            sub["stream_id"] = f"DATASET_03_MELBOURNE_OUTLET:MWC_ETP_MELBOURNE:final_effluent:{param}"
            sub["data_origin"] = "observed"
            sub["raw_parameter_name"] = raw_col
            
            fe_df = cls.compute_features_for_series(sub, value_col=raw_col)
            stream_dfs.append(fe_df)
            
        return stream_dfs
