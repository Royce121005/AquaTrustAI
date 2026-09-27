"""
AquaTrust AI — Unit Tests for Dataset Preprocessing Pipelines
"""

import os
import sys
import pandas as pd
import numpy as np

base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(base_dir, "src"))

from preprocessing.uci_preprocessor import UCIPreprocessor
from preprocessing.melbourne_inlet_preprocessor import MelbourneInletPreprocessor
from preprocessing.melbourne_outlet_preprocessor import MelbourneOutletPreprocessor
from preprocessing.up_stp_preprocessor import UPSTPPreprocessor


def test_uci_preprocessing():
    raw_path = os.path.join(base_dir, "raw", "DATASET_01_UCI_WATER_TREATMENT", "water-treatment.data")
    out_dir = os.path.join(base_dir, "processed", "DATASET_01_UCI_WATER_TREATMENT")
    prep = UCIPreprocessor("DATASET_01_UCI_WATER_TREATMENT", raw_path, out_dir)
    df = prep.process()
    
    assert len(df) == 527, "UCI row count must remain exactly 527 (zero dropped rows)"
    assert "timestamp_utc" in df.columns, "timestamp_utc column missing"
    assert df["data_origin"].unique()[0] == "observed", "data_origin must be 'observed'"
    assert df["PH-S"].dtype == np.float64, "PH-S must be float64"
    assert df["DBO-S"].dtype == np.float64, "DBO-S must be float64"
    print("[TEST PASS] UCI Preprocessor test passed.")


def test_melbourne_inlet_preprocessing():
    raw_path = os.path.join(base_dir, "raw", "DATASET_02_MELBOURNE_ETP_INLET", "MWC_ETP_Daily_InfluentQuality_From2014_-900457074504834853_inlet.csv")
    out_dir = os.path.join(base_dir, "processed", "DATASET_02_MELBOURNE_ETP_INLET")
    prep = MelbourneInletPreprocessor("DATASET_02_MELBOURNE_ETP_INLET", raw_path, out_dir)
    df = prep.process()
    
    assert len(df) == 1382, "Melbourne inlet row count must remain exactly 1382"
    assert "nh4_n_mg_l" in df.columns, "Ammonia must be normalized to nh4_n_mg_l"
    assert "timestamp_utc" in df.columns, "timestamp_utc missing"
    assert df["measurement_stage"].unique()[0] == "inlet", "measurement_stage must be inlet"
    print("[TEST PASS] Melbourne Inlet Preprocessor test passed.")


def test_melbourne_outlet_preprocessing():
    raw_path = os.path.join(base_dir, "raw", "DATASET_03_MELBOURNE_ETP_OUTLET", "MWC_ETP_Daily_EffluentQuality_From2014_3394485731605245297_outlet.csv")
    out_dir = os.path.join(base_dir, "processed", "DATASET_03_MELBOURNE_ETP_OUTLET")
    prep = MelbourneOutletPreprocessor("DATASET_03_MELBOURNE_ETP_OUTLET", raw_path, out_dir)
    df = prep.process()
    
    assert len(df) == 1716, "Melbourne outlet row count must remain exactly 1716"
    assert "cod_mg_l" in df.columns, "COD must be normalized to cod_mg_l"
    assert df["measurement_stage"].unique()[0] == "final_effluent", "measurement_stage must be final_effluent"
    print("[TEST PASS] Melbourne Outlet Preprocessor test passed.")


def test_up_stp_preprocessing():
    raw_path = os.path.join(base_dir, "raw", "DATASET_04_CPCB_UP_STP", "UP_STP_Operational_December_2023_CORRECTED.csv")
    out_dir = os.path.join(base_dir, "processed", "DATASET_04_CPCB_UP_STP")
    prep = UPSTPPreprocessor("DATASET_04_CPCB_UP_STP", raw_path, out_dir)
    df = prep.process()
    
    assert len(df) == 125, "UP STP facility count must remain exactly 125"
    assert "facility_id" in df.columns, "facility_id slug missing"
    assert df["facility_id"].nunique() == 125, "Every facility must have a distinct unique slug"
    print("[TEST PASS] UP STP Preprocessor test passed.")


if __name__ == "__main__":
    test_uci_preprocessing()
    test_melbourne_inlet_preprocessing()
    test_melbourne_outlet_preprocessing()
    test_up_stp_preprocessing()
    print("\nAll preprocessing unit test assertions passed 100%!")
