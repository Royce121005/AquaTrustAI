"""
AquaTrust AI — Controlled Synthetic Anomaly Injector
Generates an isolated evaluation test dataset containing controlled anomalies.
IMPORTANT: Injected anomalies are strictly segregated and NEVER mixed into train/val partitions.
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Tuple


class ControlledAnomalyInjector:
    """Injects realistic wastewater process and sensor anomalies for unsupervised evaluation."""

    def __init__(self, random_seed: int = 42, anomaly_rate: float = 0.05):
        self.random_seed = random_seed
        self.anomaly_rate = anomaly_rate

    def inject_anomalies_for_stream(self, test_df: pd.DataFrame, scaler_info: Dict[str, Dict[str, float]]) -> pd.DataFrame:
        """
        Creates a deep copy of test partition, injects controlled anomalies,
        and recomputes downstream features and scaling.
        """
        np.random.seed(self.random_seed + int(abs(hash(test_df["stream_id"].iloc[0])) % 10000))
        df_eval = test_df.copy()
        
        n_rows = len(df_eval)
        df_eval["is_anomaly_injected"] = 0
        df_eval["anomaly_type"] = "normal"
        
        # Valid candidate indices (exclude rows that are already NaN)
        valid_indices = df_eval[df_eval["value_t"].notna()].index.tolist()
        n_anomalies = max(1, int(np.round(len(valid_indices) * self.anomaly_rate)))
        
        if len(valid_indices) < 5 or n_anomalies == 0:
            return df_eval

        # Select random start indices for anomaly injection (spaced out)
        selected_indices = np.random.choice(valid_indices[2:-2], size=min(n_anomalies, len(valid_indices) - 4), replace=False)
        
        mean_val = scaler_info["value_t"]["mean"]
        std_val = scaler_info["value_t"]["std"]
        
        for idx in selected_indices:
            anomaly_kind = np.random.choice(["point_spike", "sensor_flatline", "process_drift"], p=[0.4, 0.3, 0.3])
            
            if anomaly_kind == "point_spike":
                # 3.5 to 5.5 standard deviations spike
                direction = np.random.choice([1.0, -1.0], p=[0.8, 0.2])
                spike_mag = direction * np.random.uniform(3.5, 5.5) * std_val
                df_eval.loc[idx, "value_t"] = max(0.0, df_eval.loc[idx, "value_t"] + spike_mag)
                df_eval.loc[idx, "is_anomaly_injected"] = 1
                df_eval.loc[idx, "anomaly_type"] = "point_spike"
                
            elif anomaly_kind == "sensor_flatline":
                # Flatline sensor across 2-3 consecutive steps
                flat_val = df_eval.loc[idx, "value_t"]
                for step in range(3):
                    cur_idx = idx + step
                    if cur_idx < len(df_eval):
                        df_eval.loc[cur_idx, "value_t"] = flat_val
                        df_eval.loc[cur_idx, "is_anomaly_injected"] = 1
                        df_eval.loc[cur_idx, "anomaly_type"] = "sensor_flatline"
                        
            elif anomaly_kind == "process_drift":
                # Linear drift over 3-4 steps
                drift_step = (1.5 * std_val) / 4.0
                for step in range(4):
                    cur_idx = idx + step
                    if cur_idx < len(df_eval):
                        df_eval.loc[cur_idx, "value_t"] = max(0.0, df_eval.loc[cur_idx, "value_t"] + (step + 1) * drift_step)
                        df_eval.loc[cur_idx, "is_anomaly_injected"] = 1
                        df_eval.loc[cur_idx, "anomaly_type"] = "process_drift"

        # Recompute trailing temporal features for the evaluation dataset
        series = df_eval["value_t"]
        df_eval["delta_1"] = series.diff(1)
        df_eval["rolling_mean_3"] = series.rolling(window=3, min_periods=3).mean()
        df_eval["rolling_std_3"] = series.rolling(window=3, min_periods=3).std(ddof=1)
        
        # Apply scaling using training scaler params
        for feat in ["value_t", "delta_1", "rolling_mean_3", "rolling_std_3"]:
            m = scaler_info[feat]["mean"]
            s = scaler_info[feat]["std"]
            df_eval[f"{feat}_scaled"] = (df_eval[feat] - m) / s

        return df_eval
