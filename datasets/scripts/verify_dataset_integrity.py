"""
AquaTrust AI — Dataset Integrity Verification Test
Runs automated assertions on all 4 raw datasets.
"""

import os
import hashlib
import json
# pytest optional

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
REGISTRY_PATH = os.path.join(BASE_DIR, "registry", "dataset_registry.json")

def sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while c := f.read(65536):
            h.update(c)
    return h.hexdigest()

def test_all_datasets_registered_and_intact():
    assert os.path.exists(REGISTRY_PATH), "Registry file missing"
    with open(REGISTRY_PATH, "r", encoding="utf-8") as f:
        reg = json.load(f)
    
    assert len(reg["datasets"]) == 4, "Expected exactly 4 registered datasets"
    
    dir_map = {
        "DATASET_01_UCI_WATER_TREATMENT": ("dataset_01", "water-treatment.data"),
        "DATASET_02_MELBOURNE_ETP_INLET": ("dataset_02", "MWC_ETP_Daily_InfluentQuality_From2014_-900457074504834853_inlet.csv"),
        "DATASET_03_MELBOURNE_ETP_OUTLET": ("dataset_03", "MWC_ETP_Daily_EffluentQuality_From2014_3394485731605245297_outlet.csv"),
        "DATASET_04_CPCB_UP_STP": ("dataset_04", "UP_STP_Operational_December_2023_CORRECTED.csv")
    }
    
    for ds in reg["datasets"]:
        ds_id = ds["dataset_id"]
        subdir, fname = dir_map[ds_id]
        fpath = os.path.join(BASE_DIR, "raw", subdir, fname)
        assert os.path.exists(fpath), f"Raw file missing: {fpath}"
        actual_hash = sha256_file(fpath)
        assert actual_hash.lower() == ds["file_sha256"].lower(), f"Hash mismatch for {ds_id}"
        assert os.path.getsize(fpath) == ds["file_size_bytes"], f"Size mismatch for {ds_id}"

if __name__ == "__main__":
    test_all_datasets_registered_and_intact()
    print("All dataset integrity assertions passed 100%!")
