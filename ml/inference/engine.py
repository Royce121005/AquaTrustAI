"""
AquaTrust AI — Anomaly Inference Engine
Provides a decoupled, production-grade inference interface for real-time anomaly detection
across canonical wastewater measurement streams.
"""

import os
import time
import json
import yaml
import joblib
import numpy as np
from typing import Dict, List, Optional, Union, Any
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

from ml.inference.schemas import (
    CanonicalReadingInput,
    AnomalyInferenceOutput,
    canonicalize_parameter_name,
    CANONICAL_UNITS
)
from ml.inference.stream_cache import StreamContextCache
from ml.inference.exceptions import (
    InferenceEngineError,
    UnsupportedParameterError,
    InvalidReadingError,
    InvalidUnitError,
    ModelArtifactMissingError
)


class AquaTrustAnomalyInferenceEngine:
    """
    Production Anomaly Inference Engine for AquaTrust AI.
    Loads packaged Isolation Forest models and scalers to execute anomaly detection
    on canonical wastewater streams.
    """

    DEFAULT_MODEL_DIR = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "models", "anomaly_detection")
    )

    def __init__(
        self,
        model_dir: Optional[str] = None,
        min_history_required: int = 3,
        strict_units: bool = False
    ):
        """
        Initializes the inference engine by loading serialized artifacts.

        Args:
            model_dir: Directory containing production artifacts (isolation_forest.joblib, scaler.joblib, etc.)
            min_history_required: Minimum observations in sliding window before inference (default 3)
            strict_units: If True, raises InvalidUnitError for non-standard units (default False)
        """
        self.model_dir = model_dir or self.DEFAULT_MODEL_DIR
        self.min_history_required = min_history_required
        self.strict_units = strict_units
        self.cache = StreamContextCache(max_history_size=20, min_history_required=min_history_required)

        self._load_artifacts()
        self._build_fallback_scalers()

    def _load_artifacts(self):
        """Loads model bundles, scalers, metadata, and feature configs."""
        if not os.path.exists(self.model_dir):
            raise ModelArtifactMissingError(f"Model directory not found: {self.model_dir}")

        model_bundle_path = os.path.join(self.model_dir, "isolation_forest.joblib")
        scaler_bundle_path = os.path.join(self.model_dir, "scaler.joblib")
        metadata_path = os.path.join(self.model_dir, "model_metadata.json")
        feature_config_path = os.path.join(self.model_dir, "feature_config.yaml")

        for p, name in [
            (model_bundle_path, "isolation_forest.joblib"),
            (scaler_bundle_path, "scaler.joblib"),
            (metadata_path, "model_metadata.json"),
            (feature_config_path, "feature_config.yaml"),
        ]:
            if not os.path.exists(p):
                raise ModelArtifactMissingError(f"Missing required artifact: {name} at {p}")

        self.models: Dict[str, IsolationForest] = joblib.load(model_bundle_path)
        scaler_bundle = joblib.load(scaler_bundle_path)
        self.stream_scalers = scaler_bundle.get("stream_scalers", {})
        self.scaler_parameters_json = scaler_bundle.get("scaler_parameters_json", {})

        with open(metadata_path, "r", encoding="utf-8") as f:
            self.metadata = json.load(f)

        with open(feature_config_path, "r", encoding="utf-8") as f:
            self.feature_config = yaml.safe_load(f)

        self.model_version = self.metadata.get("model_version", "iforest_v2.2.1")
        self.feature_set_version = self.metadata.get("feature_set_version", "v2.2.1")
        self.supported_parameters = self.metadata.get("target_parameters", list(self.models.keys()))
        self.unavailable_parameters = self.metadata.get("unavailable_parameters", ["tn", "nox_n"])

    def _build_fallback_scalers(self):
        """
        Builds parameter-level fallback StandardScaler statistics from historical stream parameters.
        Used when an incoming stream is from a new facility or not in the training registry.
        """
        self.fallback_scalers: Dict[str, Dict[str, StandardScaler]] = {}
        feature_names = ["value_t", "delta_1", "rolling_mean_3", "rolling_std_3"]

        for param in self.supported_parameters:
            matching_streams = [
                s for s in self.scaler_parameters_json.keys() if s.endswith(f":{param}")
            ]
            if not matching_streams:
                continue

            param_scalers = {}
            for feat in feature_names:
                means = [self.scaler_parameters_json[s][feat]["mean"] for s in matching_streams]
                stds = [self.scaler_parameters_json[s][feat]["std"] for s in matching_streams]
                avg_mean = float(np.mean(means))
                avg_std = float(np.mean(stds)) if np.mean(stds) > 1e-6 else 1.0

                sc = StandardScaler()
                sc.mean_ = np.array([avg_mean], dtype=np.float64)
                sc.var_ = np.array([avg_std ** 2], dtype=np.float64)
                sc.scale_ = np.array([avg_std], dtype=np.float64)
                param_scalers[feat] = sc

            self.fallback_scalers[param] = param_scalers

    def _get_scaler_for_stream(self, stream_key: str, param: str) -> Dict[str, StandardScaler]:
        """
        Resolves the appropriate scaler for a stream.
        1. Exact stream_key match (e.g. 'DATASET_01_UCI:FAC_UCI_URBAN_ETP_01:final_effluent:ph')
        2. Partial stream match
        3. Parameter fallback scaler
        """
        if stream_key in self.stream_scalers:
            return self.stream_scalers[stream_key]

        for sk, sc in self.stream_scalers.items():
            if sk.endswith(f":{param}") and (
                stream_key.split(":")[0] in sk or stream_key.split(":")[-2] in sk
            ):
                return sc

        if param in self.fallback_scalers:
            return self.fallback_scalers[param]

        raise InferenceEngineError(f"No valid scaler found for parameter '{param}'.")

    def predict(
        self,
        reading: Union[CanonicalReadingInput, Dict[str, Any]],
        update_cache: bool = True
    ) -> AnomalyInferenceOutput:
        """
        Executes anomaly detection on a single canonical measurement.

        Args:
            reading: CanonicalReadingInput object or compatible dictionary.
            update_cache: If True, appends reading to sliding window cache (default True).

        Returns:
            AnomalyInferenceOutput contract object.
        """
        start_time = time.perf_counter()

        # 1. Parse and validate input
        if isinstance(reading, dict):
            try:
                inp = CanonicalReadingInput(**reading)
            except Exception as e:
                raise InvalidReadingError(f"Failed to parse measurement payload: {str(e)}") from e
        elif isinstance(reading, CanonicalReadingInput):
            inp = reading
        else:
            raise InvalidReadingError(f"Expected CanonicalReadingInput or dict, got {type(reading).__name__}")

        param_slug = inp.parameter_slug

        # 2. Check parameter support
        if param_slug in self.unavailable_parameters:
            raise UnsupportedParameterError(
                param_slug,
                supported_parameters=self.supported_parameters
            )
        if param_slug not in self.models:
            raise UnsupportedParameterError(
                param_slug,
                supported_parameters=self.supported_parameters
            )

        # 3. Unit validation if strict mode enabled
        if self.strict_units and param_slug in CANONICAL_UNITS:
            allowed_units = CANONICAL_UNITS[param_slug]
            if inp.unit not in allowed_units:
                raise InvalidUnitError(param_slug, inp.unit, allowed_units)

        # 4. Sliding window cache update & feature computation
        stream_key = inp.stream_key
        if update_cache:
            is_ready, features = self.cache.update(stream_key, inp.timestamp, inp.value)
        else:
            is_ready, features = self.cache.peek_features(stream_key, inp.value)

        # 5. Handle insufficient historical context window (k < 3)
        if not is_ready or features is None:
            latency_ms = (time.perf_counter() - start_time) * 1000.0
            history_count = self.cache.get_history_length(stream_key)
            return AnomalyInferenceOutput(
                facility_id=inp.facility_id,
                timestamp=inp.timestamp,
                parameter=inp.parameter,
                value=inp.value,
                unit=inp.unit,
                measurement_stage=inp.measurement_stage,
                anomaly_status="insufficient_data",
                anomaly_score=None,
                model_version=self.model_version,
                feature_set_version=self.feature_set_version,
                threshold=0.0,
                quality_status=inp.quality_status,
                compliance_status=inp.compliance_status,
                features_used=None,
                explanation=(
                    f"Sliding window has {history_count}/{self.min_history_required} readings. "
                    f"Status set to 'insufficient_data' without synthetic imputation."
                ),
                inference_latency_ms=round(latency_ms, 3)
            )

        # 6. Feature scaling
        scalers = self._get_scaler_for_stream(stream_key, param_slug)
        scaled_vector = np.array([
            scalers["value_t"].transform([[features["value_t"]]])[0, 0],
            scalers["delta_1"].transform([[features["delta_1"]]])[0, 0],
            scalers["rolling_mean_3"].transform([[features["rolling_mean_3"]]])[0, 0],
            scalers["rolling_std_3"].transform([[features["rolling_std_3"]]])[0, 0],
        ], dtype=np.float64).reshape(1, -1)

        # 7. Model evaluation
        model = self.models[param_slug]
        raw_score = float(model.decision_function(scaled_vector)[0])
        threshold = 0.0

        is_anomalous = (raw_score < threshold)
        anomaly_status = "anomalous" if is_anomalous else "normal"

        if is_anomalous:
            explanation = (
                f"Anomalous observation detected (score={raw_score:.4f} < {threshold}). "
                f"Value {inp.value} {inp.unit} exhibits anomalous trajectory/dispersion."
            )
        else:
            explanation = (
                f"Normal observation (score={raw_score:.4f} >= {threshold}). "
                f"Value {inp.value} {inp.unit} aligns with baseline pattern."
            )

        latency_ms = (time.perf_counter() - start_time) * 1000.0

        return AnomalyInferenceOutput(
            facility_id=inp.facility_id,
            timestamp=inp.timestamp,
            parameter=inp.parameter,
            value=inp.value,
            unit=inp.unit,
            measurement_stage=inp.measurement_stage,
            anomaly_status=anomaly_status,
            anomaly_score=round(raw_score, 6),
            model_version=self.model_version,
            feature_set_version=self.feature_set_version,
            threshold=threshold,
            quality_status=inp.quality_status,
            compliance_status=inp.compliance_status,
            features_used={k: round(v, 4) for k, v in features.items()},
            explanation=explanation,
            inference_latency_ms=round(latency_ms, 3)
        )

    def predict_batch(
        self,
        readings: List[Union[CanonicalReadingInput, Dict[str, Any]]],
        update_cache: bool = True
    ) -> List[AnomalyInferenceOutput]:
        """
        Processes a sequence of readings in chronological order.
        """
        results = []
        for reading in readings:
            res = self.predict(reading, update_cache=update_cache)
            results.append(res)
        return results

    def reset_stream_cache(self, stream_key: Optional[str] = None):
        """Resets stream cache for a specific stream or all streams."""
        self.cache.clear(stream_key)

    def get_model_metadata(self) -> Dict[str, Any]:
        """Returns loaded model metadata dictionary."""
        return self.metadata

    def get_supported_parameters(self) -> List[str]:
        """Returns list of parameters supported by the inference engine."""
        return list(self.supported_parameters)

    def get_unavailable_parameters(self) -> List[str]:
        """Returns list of parameters marked as unavailable due to insufficient data."""
        return list(self.unavailable_parameters)
