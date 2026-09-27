"""
AquaTrust AI — Dataset Ingestion Script (Phase 01 / Member 1)

Verifies raw source dataset integrity, validates checksums, and registers
raw files into canonical dataset directories without modifying raw data.
"""

import os
import hashlib
import json
import shutil
import sys

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
REGISTRY_PATH = os.path.join(BASE_DIR, "registry", "dataset_registry.json")
RAW_DIR = os.path.join(BASE_DIR, "raw")

def compute_sha256(filepath):
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

def verify_and_ingest():
    print("=== AquaTrust AI Dataset Ingestion & Verification ===")
    if not os.path.exists(REGISTRY_PATH):
        print(f"Error: Registry file not found at {REGISTRY_PATH}")
        sys.exit(1)
        
    with open(REGISTRY_PATH, "r", encoding="utf-8") as f:
        registry = json.load(f)
        
    all_passed = True
    for ds in registry.get("datasets", []):
        ds_id = ds["dataset_id"]
        expected_sha = ds["file_sha256"]
        orig_fname = ds["original_filename"]
        
        # Determine directory
        dir_map = {
            "DATASET_01_UCI_WATER_TREATMENT": "dataset_01",
            "DATASET_02_MELBOURNE_ETP_INLET": "dataset_02",
            "DATASET_03_MELBOURNE_ETP_OUTLET": "dataset_03",
            "DATASET_04_CPCB_UP_STP": "dataset_04"
        }
        target_dir = os.path.join(RAW_DIR, dir_map.get(ds_id, ""))
        target_file = os.path.join(target_dir, orig_fname)
        
        if not os.path.exists(target_file):
            print(f"[FAIL] Missing file for {ds_id}: {target_file}")
            all_passed = False
            continue
            
        actual_sha = compute_sha256(target_file)
        if actual_sha.lower() == expected_sha.lower():
            print(f"[PASS] {ds_id} -> Checksum matched: {actual_sha[:16]}...")
        else:
            print(f"[FAIL] {ds_id} -> Checksum mismatch! Expected {expected_sha}, got {actual_sha}")
            all_passed = False
            
    if all_passed:
        print("\nAll datasets verified and ingested successfully!")
    else:
        print("\nSome dataset checks failed.")
        sys.exit(1)

if __name__ == "__main__":
    verify_and_ingest()
