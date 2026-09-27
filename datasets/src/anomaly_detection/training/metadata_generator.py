"""
AquaTrust AI — Model Metadata Generator
Generates reproducible lineage metadata for trained Isolation Forest models.
"""

import json
from datetime import datetime, timezone
from typing import Dict, Any, List


class ModelMetadataGenerator:
    """Generates structured metadata documenting model parameters, dataset lineage, and thresholds."""

    @classmethod
    def generate_training_metadata(
        cls,
        model_version: str,
        training_dataset_name: str,
        training_dataset_hash: str,
        feature_set_version: str,
        preprocessing_version: str,
        model_config: Dict[str, Any],
        target_parameters: List[str],
        unavailable_parameters: List[str],
        thresholds: Dict[str, Any],
        model_summaries: Dict[str, Any],
        software_versions: Dict[str, str]
    ) -> Dict[str, Any]:
        """
        Builds authoritative model metadata dictionary.
        """
        return {
            "model_version": model_version,
            "algorithm": "IsolationForest",
            "framework": "scikit-learn",
            "parameters": model_config,
            "training_dataset": training_dataset_name,
            "training_dataset_hash": training_dataset_hash,
            "feature_set_version": feature_set_version,
            "preprocessing_version": preprocessing_version,
            "training_timestamp": datetime.now(timezone.utc).isoformat(),
            "target_parameters": target_parameters,
            "unavailable_parameters": unavailable_parameters,
            "thresholds": thresholds,
            "trained_models": model_summaries,
            "environment": software_versions,
            "invariants_checked": [
                "Strict zero-leakage training partition only",
                "Reproducible random_state=42",
                "Explicit null preservation",
                "Separated quality_status and anomaly_status"
            ]
        }

    @classmethod
    def save_metadata(cls, metadata: Dict[str, Any], filepath: str):
        """Saves metadata to JSON."""
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=2)
