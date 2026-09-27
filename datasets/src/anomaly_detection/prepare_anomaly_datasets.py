"""
AquaTrust AI — Master Anomaly Detection Dataset Preparation Pipeline
Orchestrates stream feature engineering, chronological partitioning,
scaler fitting, evaluation anomaly injection, manifest recording, and leakage audits.
"""

import os
import sys
import json
import hashlib
from datetime import datetime, timezone
import pandas as pd
import numpy as np

# Set base path
base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, os.path.join(base_dir, "src"))

from anomaly_detection.feature_engineer import StreamFeatureEngineer
from anomaly_detection.temporal_splitter import TemporalSplitter
from anomaly_injector import ControlledAnomalyInjector
from leakage_checker import LeakageChecker


def compute_sha256(filepath: str) -> str:
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()


def main():
    print("=== AquaTrust AI: Preparing Finalized Anomaly Detection Datasets ===")
    
    # 1. Paths
    processed_dir = os.path.join(base_dir, "processed")
    ad_dir = os.path.join(base_dir, "anomaly_detection")
    splits_dir = os.path.join(ad_dir, "splits")
    scalers_path = os.path.join(ad_dir, "scalers", "scaler_parameters.json")
    manifest_path = os.path.join(ad_dir, "split_manifest.json")
    leakage_report_path = os.path.join(ad_dir, "reports", "leakage_check_report.md")
    split_report_path = os.path.join(ad_dir, "reports", "split_validation_report.md")
    
    uci_csv = os.path.join(processed_dir, "DATASET_01_UCI_WATER_TREATMENT", "uci_water_treatment_processed.csv")
    inlet_csv = os.path.join(processed_dir, "DATASET_02_MELBOURNE_ETP_INLET", "melbourne_inlet_processed.csv")
    outlet_csv = os.path.join(processed_dir, "DATASET_03_MELBOURNE_ETP_OUTLET", "melbourne_outlet_processed.csv")
    
    print("[1/6] Loading preprocessed source datasets...")
    uci_df = pd.read_csv(uci_csv)
    inlet_df = pd.read_csv(inlet_csv)
    outlet_df = pd.read_csv(outlet_csv)
    
    # 2. Extract Streams and compute trailing 4-feature vectors
    print("[2/6] Extracting sensor streams and computing 4-feature baseline vectors...")
    uci_streams = StreamFeatureEngineer.extract_uci_streams(uci_df)
    inlet_streams = StreamFeatureEngineer.extract_melbourne_inlet_streams(inlet_df)
    outlet_streams = StreamFeatureEngineer.extract_melbourne_outlet_streams(outlet_df)
    
    all_streams_list = [
        ("dataset_01_uci", uci_streams),
        ("dataset_02_melbourne_inlet", inlet_streams),
        ("dataset_03_melbourne_outlet", outlet_streams)
    ]
    
    # 3. Partitioning, Scaler Fitting on Train only, and Anomaly Injection
    print("[3/6] Chronological 70/15/15 partitioning and training-scaler fitting...")
    splitter = TemporalSplitter(train_ratio=0.70, val_ratio=0.15, test_ratio=0.15)
    injector = ControlledAnomalyInjector(random_seed=42, anomaly_rate=0.05)
    
    all_train_parts = []
    all_val_parts = []
    all_test_parts = []
    all_eval_test_parts = []
    
    dataset_manifest_details = {}
    
    for ds_name, streams in all_streams_list:
        ds_train_parts = []
        ds_val_parts = []
        ds_test_parts = []
        ds_eval_test_parts = []
        
        ds_splits_dir = os.path.join(splits_dir, ds_name)
        os.makedirs(ds_splits_dir, exist_ok=True)
        
        for stream_df in streams:
            sid = stream_df["stream_id"].iloc[0]
            
            # Chronological split
            tr, va, te = splitter.split_stream(stream_df)
            
            # Fit scaler strictly on Train, apply to all
            tr_scaled, va_scaled, te_scaled, scaler_info = splitter.fit_and_scale(tr, va, te, sid)
            
            # Generate evaluation test partition with controlled anomalies
            eval_te = injector.inject_anomalies_for_stream(te_scaled, scaler_info)
            
            ds_train_parts.append(tr_scaled)
            ds_val_parts.append(va_scaled)
            ds_test_parts.append(te_scaled)
            ds_eval_test_parts.append(eval_te)
            
            all_train_parts.append(tr_scaled)
            all_val_parts.append(va_scaled)
            all_test_parts.append(te_scaled)
            all_eval_test_parts.append(eval_te)
            
        # Combine per dataset
        ds_train_df = pd.concat(ds_train_parts, ignore_index=True)
        ds_val_df = pd.concat(ds_val_parts, ignore_index=True)
        ds_test_df = pd.concat(ds_test_parts, ignore_index=True)
        ds_eval_test_df = pd.concat(ds_eval_test_parts, ignore_index=True)
        
        ds_train_df.to_csv(os.path.join(ds_splits_dir, "train.csv"), index=False)
        ds_val_df.to_csv(os.path.join(ds_splits_dir, "validation.csv"), index=False)
        ds_test_df.to_csv(os.path.join(ds_splits_dir, "test.csv"), index=False)
        ds_eval_test_df.to_csv(os.path.join(ds_splits_dir, "test_with_injected_anomalies.csv"), index=False)
        
        dataset_manifest_details[ds_name] = {
            "stream_count": len(streams),
            "train_rows": len(ds_train_df),
            "val_rows": len(ds_val_df),
            "test_rows": len(ds_test_df),
            "eval_test_rows": len(ds_eval_test_df),
            "injected_anomalies_count": int((ds_eval_test_df["is_anomaly_injected"] == 1).sum()),
            "streams": [s["stream_id"].iloc[0] for s in streams]
        }
        print(f"  -> Saved {ds_name} splits ({len(streams)} streams).")

    # 4. Save Scalers
    print("[4/6] Serializing fitted StandardScaler parameters...")
    splitter.save_scalers(scalers_path)
    
    # 5. Combine Unified Split CSVs
    print("[5/6] Exporting unified train, validation, test, and evaluation CSVs...")
    unified_train = pd.concat(all_train_parts, ignore_index=True)
    unified_val = pd.concat(all_val_parts, ignore_index=True)
    unified_test = pd.concat(all_test_parts, ignore_index=True)
    unified_eval_test = pd.concat(all_eval_test_parts, ignore_index=True)
    
    unified_train.to_csv(os.path.join(splits_dir, "train.csv"), index=False)
    unified_val.to_csv(os.path.join(splits_dir, "validation.csv"), index=False)
    unified_test.to_csv(os.path.join(splits_dir, "test.csv"), index=False)
    unified_eval_test.to_csv(os.path.join(splits_dir, "test_with_injected_anomalies.csv"), index=False)
    
    # 6. Leakage Audit and Reports
    print("[6/6] Running automated data leakage checks and generating manifest...")
    audit_results = LeakageChecker.audit_splits(
        unified_train, unified_val, unified_test, unified_eval_test, splitter.scalers
    )
    
    LeakageChecker.generate_leakage_report(audit_results, leakage_report_path)
    LeakageChecker.generate_split_validation_report(audit_results, split_report_path)
    
    # Write Split Manifest
    manifest = {
        "manifest_version": "2.2.1",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "algorithm_target": "IsolationForest",
        "partition_strategy": "chronological_70_15_15",
        "leakage_status": audit_results["overall_status"],
        "total_streams_processed": len(splitter.scalers),
        "total_rows": {
            "train": len(unified_train),
            "validation": len(unified_val),
            "test": len(unified_test),
            "test_with_injected_anomalies": len(unified_eval_test)
        },
        "feature_list": [
            "value_t",
            "delta_1",
            "rolling_mean_3",
            "rolling_std_3"
        ],
        "scaled_feature_list": [
            "value_t_scaled",
            "delta_1_scaled",
            "rolling_mean_3_scaled",
            "rolling_std_3_scaled"
        ],
        "scaler_file": os.path.relpath(scalers_path, ad_dir),
        "dataset_breakdown": dataset_manifest_details,
        "file_checksums": {
            "train.csv": compute_sha256(os.path.join(splits_dir, "train.csv")),
            "validation.csv": compute_sha256(os.path.join(splits_dir, "validation.csv")),
            "test.csv": compute_sha256(os.path.join(splits_dir, "test.csv")),
            "test_with_injected_anomalies.csv": compute_sha256(os.path.join(splits_dir, "test_with_injected_anomalies.csv")),
            "scaler_parameters.json": compute_sha256(scalers_path)
        }
    }
    
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
        
    print("\n[SUCCESS] Anomaly detection datasets and manifests successfully generated!")
    print(f"Overall Leakage Status: {audit_results['overall_status']}")
    print(f"Manifest written to: {manifest_path}")


if __name__ == "__main__":
    main()
