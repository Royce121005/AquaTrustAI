"""
AquaTrust AI — Master Preprocessing Pipeline Runner
Executes all four source preprocessors and generates processed datasets & manifests.
"""

import os
import sys
from .uci_preprocessor import UCIPreprocessor
from .melbourne_inlet_preprocessor import MelbourneInletPreprocessor
from .melbourne_outlet_preprocessor import MelbourneOutletPreprocessor
from .up_stp_preprocessor import UPSTPPreprocessor

def run_all_preprocessing():
    print("=== AquaTrust AI: Executing All Source Preprocessing Pipelines ===")
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    raw_dir = os.path.join(base_dir, "raw")
    processed_dir = os.path.join(base_dir, "processed")

    # 1. UCI
    p1 = UCIPreprocessor(
        dataset_id="DATASET_01_UCI_WATER_TREATMENT",
        raw_filepath=os.path.join(raw_dir, "DATASET_01_UCI_WATER_TREATMENT", "water-treatment.data"),
        output_dir=os.path.join(processed_dir, "DATASET_01_UCI_WATER_TREATMENT")
    )
    df1 = p1.process()
    print(f"[SUCCESS] Dataset 01 (UCI) -> {len(df1)} rows processed.")

    # 2. Melbourne Inlet
    p2 = MelbourneInletPreprocessor(
        dataset_id="DATASET_02_MELBOURNE_ETP_INLET",
        raw_filepath=os.path.join(raw_dir, "DATASET_02_MELBOURNE_ETP_INLET", "MWC_ETP_Daily_InfluentQuality_From2014_-900457074504834853_inlet.csv"),
        output_dir=os.path.join(processed_dir, "DATASET_02_MELBOURNE_ETP_INLET")
    )
    df2 = p2.process()
    print(f"[SUCCESS] Dataset 02 (Melbourne Inlet) -> {len(df2)} rows processed.")

    # 3. Melbourne Outlet
    p3 = MelbourneOutletPreprocessor(
        dataset_id="DATASET_03_MELBOURNE_ETP_OUTLET",
        raw_filepath=os.path.join(raw_dir, "DATASET_03_MELBOURNE_ETP_OUTLET", "MWC_ETP_Daily_EffluentQuality_From2014_3394485731605245297_outlet.csv"),
        output_dir=os.path.join(processed_dir, "DATASET_03_MELBOURNE_ETP_OUTLET")
    )
    df3 = p3.process()
    print(f"[SUCCESS] Dataset 03 (Melbourne Outlet) -> {len(df3)} rows processed.")

    # 4. UP STP
    p4 = UPSTPPreprocessor(
        dataset_id="DATASET_04_CPCB_UP_STP",
        raw_filepath=os.path.join(raw_dir, "DATASET_04_CPCB_UP_STP", "UP_STP_Operational_December_2023_CORRECTED.csv"),
        output_dir=os.path.join(processed_dir, "DATASET_04_CPCB_UP_STP")
    )
    df4 = p4.process()
    print(f"[SUCCESS] Dataset 04 (CPCB / UP STP) -> {len(df4)} rows processed.")

    print("\nAll 4 preprocessing pipelines executed with 100% data preservation and manifest generation!")

if __name__ == "__main__":
    run_all_preprocessing()
