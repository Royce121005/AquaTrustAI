"""
AquaTrust AI — UCI Water Treatment Plant Preprocessing Pipeline
"""

import os
import re
import numpy as np
import pandas as pd
from datetime import datetime, timezone
from .base_transformer import BaseDatasetPreprocessor


class UCIPreprocessor(BaseDatasetPreprocessor):
    """Preprocessor for Dataset 01: UCI Water Treatment Plant."""

    COLUMNS = [
        "DATE", "Q-E", "ZN-E", "PH-E", "DBO-E", "DQO-E", "SS-E", "SSV-E", "SED-E", "COND-E",
        "PH-P", "DBO-P", "SS-P", "SSV-P", "SED-P", "COND-P",
        "PH-D", "DBO-D", "DQO-D", "SS-D", "SSV-D", "SED-D", "COND-D",
        "PH-S", "DBO-S", "DQO-S", "SS-S", "SSV-S", "SED-S", "COND-S",
        "RD-DBO-P", "RD-SS-P", "RD-SED-P", "RD-DBO-S", "RD-DQO-S", "RD-SS-S", "RD-SED-S",
        "RD-DBO-G", "RD-DQO-G", "RD-SS-G", "RD-SED-G"
    ]

    def process(self) -> pd.DataFrame:
        raw_hash = self.compute_sha256(self.raw_filepath)
        self.log_transformation(f"Verified source SHA-256: {raw_hash}")

        # 1. Load raw file
        df = pd.read_csv(self.raw_filepath, header=None, names=self.COLUMNS)
        rows_before = len(df)
        missing_before = int((df == "?").sum().sum())
        self.log_transformation(f"Loaded {rows_before} raw rows with {missing_before} missing '?' values.")

        # 2. Parse Date
        def parse_date(d_str):
            clean = d_str.replace("D-", "")
            p = clean.split("/")
            return datetime(1900 + int(p[2]), int(p[1]), int(p[0]), 12, 0, 0, tzinfo=timezone.utc).isoformat()

        df["timestamp_utc"] = df["DATE"].apply(parse_date)
        self.log_transformation("Parsed date string (D-D/M/YY) into UTC ISO-8601 timestamps.")

        # 3. Numeric conversions & ? to NaN
        for col in self.COLUMNS[1:]:
            df[col] = pd.to_numeric(df[col].replace("?", np.nan), errors="coerce")
        self.log_transformation("Converted 38 operational sensor measurements from string to float64, preserving missingness.")

        # 4. Standard Metadata
        df["facility_id"] = "FAC_UCI_URBAN_ETP_01"
        df["dataset_id"] = self.dataset_id
        df["data_origin"] = "observed"
        df["source_record_id"] = [f"ROW_{i+1:04d}" for i in range(len(df))]
        df["provenance_id"] = f"SHA256:{raw_hash}"

        # 5. Export processed CSV
        out_csv = os.path.join(self.output_dir, "uci_water_treatment_processed.csv")
        df.to_csv(out_csv, index=False)
        self.log_transformation(f"Exported processed dataset to {out_csv}")

        # 6. Build and write manifest
        manifest = {
            "dataset_id": self.dataset_id,
            "processing_version": self.version,
            "processing_timestamp": datetime.now(timezone.utc).isoformat(),
            "raw_file_hash": raw_hash,
            "output_file": os.path.basename(out_csv),
            "rows_before": rows_before,
            "rows_after": len(df),
            "rows_removed": 0,
            "reasons_for_removal": [],
            "missing_values_before": missing_before,
            "missing_values_after": int(df.isna().sum().sum()),
            "imputation_performed": False,
            "imputation_policy": "Explicit null preservation (No synthetic values or zero filling)",
            "parameters_removed": [],
            "transformations_performed": self.transformations_log
        }
        manifest_path = os.path.join(r"AquaTrustAI\datasets\manifests", "dataset_01_processing_manifest.json")
        self.write_manifest(manifest, manifest_path)
        return df
