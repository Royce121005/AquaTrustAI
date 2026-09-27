"""
AquaTrust AI — CPCB / UP STP Operational Bulletin Preprocessing Pipeline
"""

import os
import re
import pandas as pd
from datetime import datetime, timezone
from .base_transformer import BaseDatasetPreprocessor


class UPSTPPreprocessor(BaseDatasetPreprocessor):
    """Preprocessor for Dataset 04: CPCB / UP STP Operational Bulletin."""

    def process(self) -> pd.DataFrame:
        raw_hash = self.compute_sha256(self.raw_filepath)
        self.log_transformation(f"Verified source SHA-256: {raw_hash}")

        # 1. Load raw file
        df = pd.read_csv(self.raw_filepath, encoding="utf-8-sig")
        rows_before = len(df)
        missing_before = int(df.isna().sum().sum())
        self.log_transformation(f"Loaded {rows_before} raw facility records with {missing_before} missing metadata values.")

        # 2. Parse Timestamp (DD.MM.YYYY)
        df["timestamp_utc"] = pd.to_datetime(df["measurement_date"], format="%d.%m.%Y").dt.tz_localize(timezone.utc).dt.strftime("%Y-%m-%dT00:00:00.000000Z")
        self.log_transformation("Parsed DD.MM.YYYY dates to UTC ISO-8601 timestamps.")

        # 3. Generate Clean Facility IDs
        def make_facility_id(row):
            sl = int(row["sl_no"])
            city = re.sub(r"[^A-Za-z0-9]", "_", str(row["city_town_district"]).strip().upper())
            return f"STP_UP_{city}_{sl:03d}"

        df["facility_id"] = df.apply(make_facility_id, axis=1)
        df["source_record_id"] = [f"UP_STP_SL_{int(x):03d}" for x in df["sl_no"]]
        self.log_transformation("Generated standardized unique facility IDs from town name and serial number.")

        # 4. Numeric conversions
        num_cols = ["installed_capacity_mld", "utilized_capacity_mld", "ph", "bod_mg_l", "cod_mg_l", "tss_mg_l", "total_coliform_mpn_100ml", "fecal_coliform_mpn_100ml"]
        for c in num_cols:
            df[c] = pd.to_numeric(df[c], errors="coerce")
        self.log_transformation("Cast all numerical measurement and capacity columns to float64.")

        # 5. Metadata
        df["measurement_stage"] = "final_effluent"
        df["dataset_id"] = self.dataset_id
        df["data_origin"] = "observed"
        df["provenance_id"] = f"SHA256:{raw_hash}"

        # 6. Export processed CSV
        out_csv = os.path.join(self.output_dir, "cpcb_up_stp_processed.csv")
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
            "missing_values_after": int(df.isna().sum().sum()),
            "imputation_performed": False,
            "imputation_policy": "Explicit null preservation (No synthesis of missing optional metadata)",
            "parameters_removed": [],
            "transformations_performed": self.transformations_log
        }
        datasets_root = os.path.dirname(os.path.dirname(os.path.abspath(self.output_dir)))
        manifest_path = os.path.join(datasets_root, "manifests", "dataset_04_processing_manifest.json")
        self.write_manifest(manifest, manifest_path)
        return df
