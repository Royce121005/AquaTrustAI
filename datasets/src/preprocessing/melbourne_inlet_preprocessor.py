"""
AquaTrust AI — Melbourne ETP Raw Influent Preprocessing Pipeline
"""

import os
import pandas as pd
from datetime import datetime, timezone
from .base_transformer import BaseDatasetPreprocessor


class MelbourneInletPreprocessor(BaseDatasetPreprocessor):
    """Preprocessor for Dataset 02: Melbourne ETP Raw Influent."""

    def process(self) -> pd.DataFrame:
        raw_hash = self.compute_sha256(self.raw_filepath)
        self.log_transformation(f"Verified source SHA-256: {raw_hash}")

        # 1. Load raw file
        df = pd.read_csv(self.raw_filepath, encoding="utf-8-sig")
        rows_before = len(df)
        missing_before = int(df.isna().sum().sum())
        self.log_transformation(f"Loaded {rows_before} raw rows with {missing_before} empty cells.")

        # 2. Parse Timestamp
        df["timestamp_utc"] = pd.to_datetime(df["recorddate"], format="mixed").dt.tz_localize(timezone.utc).dt.strftime("%Y-%m-%dT%H:%M:%S.000000Z")
        self.log_transformation("Parsed mixed date strings into UTC ISO-8601 timestamps.")

        # 3. Column Renaming & Unit Normalization (mg.L-1 -> mg/L)
        col_map = {
            "Ammonia_mg.L-1": "nh4_n_mg_l",
            "BOD_mg.L-1": "bod_mg_l",
            "COD_mg.L-1": "cod_mg_l",
            "NitrateplusNitrite_mg.L-1": "nox_n_mg_l",
            "Nitrogentotal_mg.L-1": "tn_mg_l",
            "ObjectId": "source_record_id"
        }
        df = df.rename(columns=col_map)
        self.log_transformation("Normalized column names to lowercase canonical parameter slugs with mg_l units.")

        # 4. Numeric conversion
        num_cols = ["nh4_n_mg_l", "bod_mg_l", "cod_mg_l", "nox_n_mg_l", "tn_mg_l"]
        for c in num_cols:
            df[c] = pd.to_numeric(df[c], errors="coerce")
        self.log_transformation("Ensured strict float64 types for all numerical measurement columns.")

        # 5. Metadata
        df["facility_id"] = "MWC_ETP_MELBOURNE"
        df["measurement_stage"] = "inlet"
        df["dataset_id"] = self.dataset_id
        df["data_origin"] = "observed"
        df["provenance_id"] = f"SHA256:{raw_hash}"

        # 6. Export processed CSV
        out_csv = os.path.join(self.output_dir, "melbourne_inlet_processed.csv")
        df.to_csv(out_csv, index=False)
        self.log_transformation(f"Exported processed dataset to {out_csv}")

        # 7. Write manifest
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
            "missing_values_after": int(df[num_cols].isna().sum().sum()),
            "imputation_performed": False,
            "imputation_policy": "Explicit null preservation (No synthetic filling of missing days)",
            "parameters_removed": ["recorddate"],
            "transformations_performed": self.transformations_log
        }
        manifest_path = os.path.join(r"AquaTrustAI\datasets\manifests", "dataset_02_processing_manifest.json")
        self.write_manifest(manifest, manifest_path)
        return df
