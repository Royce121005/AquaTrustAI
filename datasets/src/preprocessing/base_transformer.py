"""
AquaTrust AI — Base Preprocessor & Invariant Validator
Enforces zero-data loss, SHA-256 provenance tracking, and strict typing.
"""

import os
import hashlib
import json
from datetime import datetime, timezone
from typing import Dict, Any, List
import pandas as pd


class BaseDatasetPreprocessor:
    """Abstract base preprocessor enforcing strict reproducibility and manifest logging."""

    def __init__(self, dataset_id: str, raw_filepath: str, output_dir: str, version: str = "v2.2.1"):
        self.dataset_id = dataset_id
        self.raw_filepath = raw_filepath
        self.output_dir = output_dir
        self.version = version
        self.transformations_log: List[str] = []
        os.makedirs(self.output_dir, exist_ok=True)

    @staticmethod
    def compute_sha256(filepath: str) -> str:
        h = hashlib.sha256()
        with open(filepath, "rb") as f:
            while chunk := f.read(65536):
                h.update(chunk)
        return h.hexdigest()

    def log_transformation(self, description: str):
        self.transformations_log.append(description)

    def write_manifest(self, manifest_data: Dict[str, Any], manifest_path: str):
        os.makedirs(os.path.dirname(manifest_path), exist_ok=True)
        with open(manifest_path, "w", encoding="utf-8") as f:
            json.dump(manifest_data, f, indent=2)
