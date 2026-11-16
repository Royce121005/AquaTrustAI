"""
AquaTrust AI — Treatment Quality Prediction Engine (Phase 3)
Production inference engine predicting downstream/effluent wastewater quality
and forecasting statutory CPCB non-compliance risk 4 to 8 hours ahead.
"""

import os
import time
import json
import joblib
import numpy as np
from typing import Dict, List, Optional, Union, Any

from ml.prediction.schemas import (
    TreatmentPredictionInput,
    PredictedParameter,
    TreatmentQualityPredictionOutput,
    CPCB_DISCHARGE_LIMITS,
)


class AquaTrustTreatmentPredictionEngine:
    """
    Supervised predictive inference engine for wastewater effluent quality forecasting.
    Loads trained scikit-learn models and scalers to predict future effluent concentrations
    and assess regulatory breach probabilities before effluent discharge occurs.
    """

    DEFAULT_MODEL_DIR = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "models", "treatment_prediction")
    )

    def __init__(self, model_dir: Optional[str] = None):
        self.model_dir = model_dir or self.DEFAULT_MODEL_DIR
        self._load_artifacts()

    def _load_artifacts(self):
        """Loads serialized models, feature scalers, and training metadata."""
        if not os.path.exists(self.model_dir):
            raise FileNotFoundError(f"Prediction model directory not found: {self.model_dir}")

        bundle_path = os.path.join(self.model_dir, "treatment_quality_predictor.joblib")
        scaler_path = os.path.join(self.model_dir, "feature_scaler.joblib")
        meta_path = os.path.join(self.model_dir, "model_metadata.json")

        for p, name in [(bundle_path, "predictor bundle"), (scaler_path, "feature scaler"), (meta_path, "metadata")]:
            if not os.path.exists(p):
                raise FileNotFoundError(f"Required prediction artifact missing: {name} at {p}")

        bundle = joblib.load(bundle_path)
        self.models = bundle["models"]
        self.model_types = bundle["model_types"]
        self.residual_stds = bundle["residual_stds"]
        self.feature_cols = bundle["feature_cols"]
        self.train_medians = bundle["train_medians"]
        self.model_version = bundle.get("model_version", "treatment_predictor_v1.0.0")

        self.scaler = joblib.load(scaler_path)

        with open(meta_path, "r", encoding="utf-8") as f:
            self.metadata = json.load(f)

    def predict(
        self,
        inp_data: Union[TreatmentPredictionInput, Dict[str, Any]],
    ) -> TreatmentQualityPredictionOutput:
        """
        Runs multi-target predictive inference on influent parameters.

        Args:
            inp_data: TreatmentPredictionInput or equivalent dictionary.

        Returns:
            TreatmentQualityPredictionOutput contract object.
        """
        start_time = time.perf_counter()

        if isinstance(inp_data, TreatmentPredictionInput):
            inp = inp_data
        elif isinstance(inp_data, dict):
            inp = TreatmentPredictionInput(**inp_data)
        elif hasattr(inp_data, "model_dump"):
            inp = TreatmentPredictionInput(**inp_data.model_dump())
        elif hasattr(inp_data, "dict"):
            inp = TreatmentPredictionInput(**inp_data.dict())
        else:
            raise TypeError(f"Unsupported input type for prediction: {type(inp_data)}")

        # 1. Construct raw feature vector
        raw_vector = np.array(inp.to_feature_vector(), dtype=np.float64).reshape(1, -1)

        # 2. Scale features
        scaled_vector = self.scaler.transform(raw_vector)

        # 3. Predict each target parameter
        predicted_params: Dict[str, PredictedParameter] = {}
        inlet_values = {
            "bod": inp.inlet_bod,
            "cod": inp.inlet_cod,
            "tss": inp.inlet_tss,
            "ph": inp.inlet_ph,
        }

        any_breach = False
        any_borderline = False
        risk_scores: List[float] = []
        recommendation_hints: List[str] = []

        for param in ["bod", "cod", "tss", "ph"]:
            model = self.models[param]
            pred_val = float(model.predict(scaled_vector)[0])
            pred_val = max(0.0, pred_val) if param != "ph" else np.clip(pred_val, 0.0, 14.0)

            res_std = self.residual_stds.get(param, 1.0)
            ci_lower = max(0.0, pred_val - 1.96 * res_std) if param != "ph" else max(0.0, pred_val - 1.96 * res_std)
            ci_upper = pred_val + 1.96 * res_std

            # Calculate removal efficiency
            inlet_v = inlet_values[param]
            if param != "ph" and inlet_v > 0.0:
                removal_eff = max(0.0, min(100.0, ((inlet_v - pred_val) / inlet_v) * 100.0))
            else:
                removal_eff = 0.0

            # Assess CPCB Schedule VI regulatory compliance & risk level
            risk_level, risk_score, hint = self._assess_parameter_risk(param, pred_val, ci_upper)
            risk_scores.append(risk_score)
            if hint:
                recommendation_hints.append(hint)

            if risk_level == "BREACH_RISK":
                any_breach = True
            elif risk_level == "BORDERLINE":
                any_borderline = True

            cpcb_limit = CPCB_DISCHARGE_LIMITS.get(param, CPCB_DISCHARGE_LIMITS.get(f"{param}_max", 30.0))
            unit = "pH_units" if param == "ph" else "mg/L"

            predicted_params[param] = PredictedParameter(
                parameter=param,
                predicted_value=round(pred_val, 2),
                unit=unit,
                cpcb_discharge_limit=cpcb_limit,
                confidence_lower=round(ci_lower, 2),
                confidence_upper=round(ci_upper, 2),
                risk_level=risk_level,
                risk_score=round(risk_score, 3),
                expected_removal_efficiency_pct=round(removal_eff, 1),
            )

        # 4. Synthesize overall risk status
        overall_risk_score = float(np.mean(risk_scores)) if risk_scores else 0.0
        if any_breach:
            overall_risk_status = "HIGH_RISK"
            overall_risk_score = max(0.75, overall_risk_score)
            is_cpcb_compliant = False
        elif any_borderline:
            overall_risk_status = "MODERATE_RISK"
            overall_risk_score = max(0.40, overall_risk_score)
            is_cpcb_compliant = True
        else:
            overall_risk_status = "LOW_RISK"
            is_cpcb_compliant = True

        latency_ms = (time.perf_counter() - start_time) * 1000.0

        explanation = (
            f"Forecast for {inp.facility_id} (+{inp.lead_time_hours}h lead time): "
            f"Overall risk is {overall_risk_status} (score={overall_risk_score:.2f}). "
            f"Effluent BOD: {predicted_params['bod'].predicted_value} mg/L (Limit 30), "
            f"COD: {predicted_params['cod'].predicted_value} mg/L (Limit 250), "
            f"TSS: {predicted_params['tss'].predicted_value} mg/L (Limit 100), "
            f"pH: {predicted_params['ph'].predicted_value}."
        )

        rec_hint = "; ".join(recommendation_hints) if recommendation_hints else "Maintain current operating setpoints."

        return TreatmentQualityPredictionOutput(
            facility_id=inp.facility_id,
            timestamp=inp.timestamp,
            lead_time_hours=inp.lead_time_hours,
            predicted_parameters=predicted_params,
            overall_risk_status=overall_risk_status,
            overall_risk_score=round(overall_risk_score, 3),
            is_cpcb_compliant=is_cpcb_compliant,
            model_version=self.model_version,
            summary_explanation=explanation,
            inference_latency_ms=round(latency_ms, 3),
            recommendation_hint=rec_hint,
        )

    def _assess_parameter_risk(
        self,
        param: str,
        val: float,
        upper_bound: float
    ) -> tuple[str, float, Optional[str]]:
        """Assesses regulatory risk relative to CPCB limits."""
        if param == "bod":
            limit = CPCB_DISCHARGE_LIMITS["bod"]  # 30 mg/L
            if val > limit:
                return "BREACH_RISK", min(1.0, 0.75 + (val - limit) / 20.0), f"Increase aeration blower output: predicted BOD ({val:.1f} mg/L) exceeds limit (30 mg/L)"
            elif val >= 24.0 or upper_bound > 45.0:
                return "BORDERLINE", min(0.65, 0.40 + max(0.0, val - 20.0) / 20.0), f"Monitor aeration dissolved oxygen: predicted BOD ({val:.1f} mg/L) approaching limit"
            return "COMPLIANT", min(0.35, val / 60.0), None

        elif param == "cod":
            limit = CPCB_DISCHARGE_LIMITS["cod"]  # 250 mg/L
            if val > limit:
                return "BREACH_RISK", min(1.0, 0.75 + (val - limit) / 100.0), f"Increase secondary biological retention: predicted COD ({val:.1f} mg/L) exceeds limit (250 mg/L)"
            elif val >= 180.0:
                return "BORDERLINE", 0.40 + (val - 180.0) / 140.0, f"Verify equalization basin: predicted COD ({val:.1f} mg/L) elevated"
            return "COMPLIANT", min(0.35, val / 500.0), None

        elif param == "tss":
            limit = CPCB_DISCHARGE_LIMITS["tss"]  # 100 mg/L
            if val > limit:
                return "BREACH_RISK", min(1.0, 0.75 + (val - limit) / 50.0), f"Increase coagulant dosing (PAC/Alum) and check clarifier scraper: predicted TSS ({val:.1f} mg/L) exceeds limit"
            elif val >= 65.0:
                return "BORDERLINE", 0.40 + (val - 65.0) / 70.0, f"Verify coagulant dosage: predicted TSS ({val:.1f} mg/L) near threshold"
            return "COMPLIANT", min(0.30, val / 200.0), None

        elif param == "ph":
            min_lim = CPCB_DISCHARGE_LIMITS["ph_min"]  # 5.5
            max_lim = CPCB_DISCHARGE_LIMITS["ph_max"]  # 9.0
            if val < min_lim or val > max_lim:
                action = "Inject Caustic Soda (NaOH)" if val < min_lim else "Inject Sulfuric Acid (H2SO4)"
                return "BREACH_RISK", 0.90, f"Immediate pH neutralization required: {action} (predicted pH={val:.2f})"
            elif val < 6.2 or val > 8.3:
                return "BORDERLINE", 0.50, f"Adjust chemical neutralization dosing: predicted pH ({val:.2f}) drifting"
            return "COMPLIANT", 0.05, None

        return "COMPLIANT", 0.1, None

    def get_supported_parameters(self) -> List[str]:
        return list(self.models.keys())
