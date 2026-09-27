"""
AquaTrust AI — Controlled Anomaly Evaluation Dataset Generator (Phase 12)
Generates test_with_injected_anomalies.csv from clean test.csv for rigorous,
leakage-free Isolation Forest evaluation across 7 wastewater anomaly scenarios.
"""

import os
import json
import hashlib
from datetime import datetime, timezone
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Any


class ControlledEvaluationInjector:
    """Generates reproducible controlled anomaly evaluation datasets with full ground truth."""

    SCENARIOS = [
        "extreme_ph",
        "extreme_cod",
        "sudden_increase",
        "sudden_decrease",
        "multivariate_inconsistency",
        "duplicate_observation",
        "missing_context"
    ]

    def __init__(self, random_seed: int = 42, target_anomaly_rate: float = 0.05):
        self.random_seed = random_seed
        self.target_anomaly_rate = target_anomaly_rate
        self.injection_records: List[Dict[str, Any]] = []
        self.injection_counter = 0

    @staticmethod
    def compute_sha256(filepath: str) -> str:
        h = hashlib.sha256()
        with open(filepath, "rb") as f:
            while chunk := f.read(65536):
                h.update(chunk)
        return h.hexdigest()

    def generate_evaluation_dataset(
        self,
        test_df: pd.DataFrame,
        scalers: Dict[str, Any]
    ) -> pd.DataFrame:
        """
        Takes a copy of test.csv and injects controlled anomalies stream-by-stream.
        Recomputes downstream trailing features and scaled features.
        """
        np.random.seed(self.random_seed)
        df_eval = test_df.copy()

        # Initialize ground-truth and provenance columns
        df_eval["ground_truth_anomaly"] = 0
        df_eval["is_anomaly_injected"] = 0
        df_eval["anomaly_origin"] = "observed"
        df_eval["injection_id"] = ""
        df_eval["scenario"] = "none"
        df_eval["original_value"] = df_eval["value_t"]
        df_eval["injected_value"] = df_eval["value_t"]

        stream_ids = sorted(df_eval["stream_id"].unique())
        processed_stream_dfs = []

        for stream_idx, sid in enumerate(stream_ids):
            # Stream-specific random sub-seed for determinism
            stream_seed = self.random_seed + stream_idx * 101 + int(abs(hash(sid)) % 1000)
            rng = np.random.default_rng(stream_seed)

            s_df = df_eval[df_eval["stream_id"] == sid].copy().sort_values("timestamp_utc").reset_index(drop=True)
            param = s_df["parameter"].iloc[0]
            
            # Fetch frozen scaler parameters
            s_scaler = scalers.get(sid, {}).get("value_t", {"mean": 0.0, "std": 1.0})
            mean_val = s_scaler["mean"]
            std_val = s_scaler["std"] if s_scaler["std"] > 1e-9 else 1.0

            # Valid candidate indices for injection (must have non-null value and sufficient boundary room)
            valid_indices = s_df[s_df["value_t"].notna()].index.tolist()
            if len(valid_indices) < 8:
                processed_stream_dfs.append(s_df)
                continue

            # Number of anomalies for this stream (approx 5%)
            n_target = max(1, int(np.round(len(valid_indices) * self.target_anomaly_rate)))
            
            # Interior candidates to allow trailing rolling window calculation
            candidates = [idx for idx in valid_indices if 3 <= idx < len(s_df) - 4]
            if len(candidates) == 0:
                candidates = valid_indices[2:-1]

            n_injections = min(n_target, len(candidates))
            chosen_indices = rng.choice(candidates, size=n_injections, replace=False)
            chosen_indices = sorted(chosen_indices)

            for c_idx in chosen_indices:
                orig_val = float(s_df.loc[c_idx, "value_t"])
                
                # Select scenario based on parameter suitability
                if param == "ph":
                    scenario = rng.choice(["extreme_ph", "sudden_increase", "sudden_decrease", "duplicate_observation"])
                elif param == "cod":
                    scenario = rng.choice(["extreme_cod", "sudden_increase", "multivariate_inconsistency", "duplicate_observation"])
                else:
                    scenario = rng.choice(["sudden_increase", "sudden_decrease", "multivariate_inconsistency", "duplicate_observation", "missing_context"])

                self.injection_counter += 1
                inj_id = f"INJ_{self.injection_counter:04d}"

                # Execute Scenario Transformation
                if scenario == "extreme_ph":
                    # Acidic shock (< 4.0) or Alkaline shock (> 11.5)
                    inj_val = float(rng.choice([rng.uniform(2.5, 4.0), rng.uniform(11.5, 13.0)]))
                    s_df.loc[c_idx, "value_t"] = inj_val
                    s_df.loc[c_idx, "ground_truth_anomaly"] = 1
                    s_df.loc[c_idx, "anomaly_origin"] = "injected"
                    s_df.loc[c_idx, "injection_id"] = inj_id
                    s_df.loc[c_idx, "scenario"] = scenario
                    s_df.loc[c_idx, "injected_value"] = inj_val
                    
                elif scenario == "extreme_cod":
                    # Implausibly large COD deviation (+5 to +8 std)
                    inj_val = float(max(0.0, orig_val + rng.uniform(5.0, 8.0) * std_val))
                    s_df.loc[c_idx, "value_t"] = inj_val
                    s_df.loc[c_idx, "ground_truth_anomaly"] = 1
                    s_df.loc[c_idx, "anomaly_origin"] = "injected"
                    s_df.loc[c_idx, "injection_id"] = inj_id
                    s_df.loc[c_idx, "scenario"] = scenario
                    s_df.loc[c_idx, "injected_value"] = inj_val

                elif scenario == "sudden_increase":
                    # Sharp jump +4.5 to +6.5 std relative to t-1
                    prev_val = float(s_df.loc[c_idx - 1, "value_t"]) if c_idx > 0 else orig_val
                    inj_val = float(prev_val + rng.uniform(4.5, 6.5) * std_val)
                    s_df.loc[c_idx, "value_t"] = inj_val
                    s_df.loc[c_idx, "ground_truth_anomaly"] = 1
                    s_df.loc[c_idx, "anomaly_origin"] = "injected"
                    s_df.loc[c_idx, "injection_id"] = inj_id
                    s_df.loc[c_idx, "scenario"] = scenario
                    s_df.loc[c_idx, "injected_value"] = inj_val

                elif scenario == "sudden_decrease":
                    # Sharp drop -4.5 to -6.5 std relative to t-1
                    prev_val = float(s_df.loc[c_idx - 1, "value_t"]) if c_idx > 0 else orig_val
                    inj_val = float(max(0.0, prev_val - rng.uniform(4.5, 6.5) * std_val))
                    s_df.loc[c_idx, "value_t"] = inj_val
                    s_df.loc[c_idx, "ground_truth_anomaly"] = 1
                    s_df.loc[c_idx, "anomaly_origin"] = "injected"
                    s_df.loc[c_idx, "injection_id"] = inj_id
                    s_df.loc[c_idx, "scenario"] = scenario
                    s_df.loc[c_idx, "injected_value"] = inj_val

                elif scenario == "multivariate_inconsistency":
                    # Extreme local oscillation / variance explosion
                    inj_val = float(orig_val + rng.choice([1.0, -1.0]) * rng.uniform(4.0, 6.0) * std_val)
                    inj_val = max(0.0, inj_val)
                    s_df.loc[c_idx, "value_t"] = inj_val
                    s_df.loc[c_idx, "ground_truth_anomaly"] = 1
                    s_df.loc[c_idx, "anomaly_origin"] = "injected"
                    s_df.loc[c_idx, "injection_id"] = inj_id
                    s_df.loc[c_idx, "scenario"] = scenario
                    s_df.loc[c_idx, "injected_value"] = inj_val

                elif scenario == "duplicate_observation":
                    # Sensor freeze / flatline across 2-3 steps
                    freeze_val = orig_val
                    for step in range(3):
                        step_idx = c_idx + step
                        if step_idx < len(s_df):
                            s_df.loc[step_idx, "value_t"] = freeze_val
                            s_df.loc[step_idx, "ground_truth_anomaly"] = 1
                            s_df.loc[step_idx, "anomaly_origin"] = "injected"
                            s_df.loc[step_idx, "injection_id"] = f"{inj_id}_step{step}"
                            s_df.loc[step_idx, "scenario"] = scenario
                            s_df.loc[step_idx, "injected_value"] = freeze_val
                    inj_val = freeze_val

                elif scenario == "missing_context":
                    # Isolated sensor drop / blackout
                    s_df.loc[c_idx, "value_t"] = np.nan
                    s_df.loc[c_idx, "ground_truth_anomaly"] = 1
                    s_df.loc[c_idx, "anomaly_origin"] = "injected"
                    s_df.loc[c_idx, "injection_id"] = inj_id
                    s_df.loc[c_idx, "scenario"] = scenario
                    s_df.loc[c_idx, "injected_value"] = np.nan
                    inj_val = np.nan

                # Record manifest log
                self.injection_records.append({
                    "injection_id": inj_id,
                    "scenario": scenario,
                    "stream_id": sid,
                    "parameter": param,
                    "row_identifier": str(s_df.loc[c_idx, "source_record_id"]),
                    "timestamp_utc": str(s_df.loc[c_idx, "timestamp_utc"]),
                    "original_value": orig_val,
                    "injected_value": None if np.isnan(inj_val) else inj_val,
                    "ground_truth": 1,
                    "injection_timestamp": datetime.now(timezone.utc).isoformat(),
                    "random_seed": stream_seed
                })

            # Recompute trailing temporal features for this stream
            series = s_df["value_t"]
            s_df["delta_1"] = series.diff(1)
            s_df["rolling_mean_3"] = series.rolling(window=3, min_periods=3).mean()
            s_df["rolling_std_3"] = series.rolling(window=3, min_periods=3).std(ddof=1)

            # Apply frozen StandardScaler parameters strictly from training
            if sid in scalers:
                for feat in ["value_t", "delta_1", "rolling_mean_3", "rolling_std_3"]:
                    f_mean = scalers[sid][feat]["mean"]
                    f_std = scalers[sid][feat]["std"] if scalers[sid][feat]["std"] > 1e-9 else 1.0
                    s_df[f"{feat}_scaled"] = (s_df[feat] - f_mean) / f_std

            processed_stream_dfs.append(s_df)

        final_eval_df = pd.concat(processed_stream_dfs, ignore_index=True)
        final_eval_df["is_anomaly_injected"] = final_eval_df["ground_truth_anomaly"]
        return final_eval_df
