"""AquaTrust AI — Quality Prediction Persistence Service (Member 2 Phase 3)."""

from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import select, desc

from app.db.base import utc_now
from app.models.prediction import Prediction
from app.models.reading import Reading
from app.models.audit_log import AuditLog
from app.schemas.prediction import (
    PredictionEvaluateRequest,
    PredictionResponse,
    PredictionLatestResponse,
    PredictedParameterDTO,
)
from ml.prediction.engine import AquaTrustTreatmentPredictionEngine
from ml.prediction.schemas import TreatmentPredictionInput, TreatmentQualityPredictionOutput


class PredictionService:
    """Orchestrates influent-to-effluent water quality forecasting and regulatory breach gating."""

    # Nominal baseline influent parameters (used as fallback when inlet telemetry is unavailable)
    NOMINAL_INFLUENT = {
        "bod": 230.0,
        "cod": 480.0,
        "tss": 250.0,
        "ph": 7.4,
        "q": 35000.0,
    }

    def __init__(self, db: Session, engine: Optional[AquaTrustTreatmentPredictionEngine] = None):
        self.db = db
        self.engine = engine or AquaTrustTreatmentPredictionEngine()

    def evaluate_prediction(
        self,
        req: PredictionEvaluateRequest,
        actor_id: Optional[UUID] = None,
        actor_role: str = "operator",
    ) -> PredictionResponse:
        """
        Executes treatment quality prediction using Member 1's supervised regression model.
        Supports dual-mode input: explicit overrides or automated retrieval from recent telemetry.
        """
        now = utc_now()

        # Dual-mode: resolve missing values from recent inlet telemetry
        inlet_vals = self._resolve_influent_telemetry(req.facility_id)

        bod = req.inlet_bod if req.inlet_bod is not None else inlet_vals.get("bod", self.NOMINAL_INFLUENT["bod"])
        cod = req.inlet_cod if req.inlet_cod is not None else inlet_vals.get("cod", self.NOMINAL_INFLUENT["cod"])
        tss = req.inlet_tss if req.inlet_tss is not None else inlet_vals.get("tss", self.NOMINAL_INFLUENT["tss"])
        ph = req.inlet_ph if req.inlet_ph is not None else inlet_vals.get("ph", self.NOMINAL_INFLUENT["ph"])
        flow = req.flow_rate_q if req.flow_rate_q is not None else inlet_vals.get("q", self.NOMINAL_INFLUENT["q"])

        # Execute Member 1 supervised regression model
        pred_input = TreatmentPredictionInput(
            facility_id=str(req.facility_id),
            timestamp=now.isoformat(),
            inlet_bod=bod,
            inlet_cod=cod,
            inlet_tss=tss,
            inlet_ph=ph,
            flow_rate_q=flow,
            lead_time_hours=req.lead_time_hours,
        )
        ml_output: TreatmentQualityPredictionOutput = self.engine.predict(pred_input)

        # Map to Pydantic DTOs
        param_dtos: Dict[str, PredictedParameterDTO] = {}
        for p_name, p_data in ml_output.predicted_parameters.items():
            param_dtos[p_name] = PredictedParameterDTO(
                parameter=p_data.parameter,
                predicted_value=p_data.predicted_value,
                unit=p_data.unit,
                cpcb_discharge_limit=p_data.cpcb_discharge_limit,
                confidence_lower=p_data.confidence_lower,
                confidence_upper=p_data.confidence_upper,
                risk_level=p_data.risk_level,
                risk_score=p_data.risk_score,
                expected_removal_efficiency_pct=p_data.expected_removal_efficiency_pct,
            )

        # Persist to predictions table
        db_prediction = Prediction(
            facility_id=req.facility_id,
            treatment_stage="effluent",
            cycle_timestamp=now,
            horizon_hours=req.lead_time_hours,
            predicted_parameters={k: v.model_dump() for k, v in param_dtos.items()},
            overall_risk_status=ml_output.overall_risk_status,
            overall_risk_score=ml_output.overall_risk_score,
            is_cpcb_compliant=ml_output.is_cpcb_compliant,
            model_version=ml_output.model_version,
            summary_explanation=ml_output.summary_explanation,
            prediction_metadata={
                "inlet_bod": bod,
                "inlet_cod": cod,
                "inlet_tss": tss,
                "inlet_ph": ph,
                "flow_rate_q": flow,
                "inference_latency_ms": ml_output.inference_latency_ms,
            },
            created_at=now,
        )
        self.db.add(db_prediction)

        # Centralized lifecycle audit log entry
        audit_entry = AuditLog(
            actor_id=actor_id,
            actor_role=actor_role,
            action="PREDICTION_GENERATED",
            resource_type="facility",
            resource_id=req.facility_id,
            outcome="success",
            audit_metadata={
                "prediction_id": str(db_prediction.prediction_id),
                "horizon_hours": req.lead_time_hours,
                "overall_risk_status": ml_output.overall_risk_status,
                "overall_risk_score": ml_output.overall_risk_score,
                "is_cpcb_compliant": ml_output.is_cpcb_compliant,
            },
        )
        self.db.add(audit_entry)
        self.db.commit()

        return PredictionResponse(
            prediction_id=db_prediction.prediction_id,
            facility_id=db_prediction.facility_id,
            treatment_stage=db_prediction.treatment_stage,
            cycle_timestamp=db_prediction.cycle_timestamp,
            horizon_hours=db_prediction.horizon_hours,
            predicted_parameters=param_dtos,
            overall_risk_status=db_prediction.overall_risk_status,
            overall_risk_score=db_prediction.overall_risk_score,
            is_cpcb_compliant=db_prediction.is_cpcb_compliant,
            model_version=db_prediction.model_version,
            summary_explanation=db_prediction.summary_explanation,
            created_at=db_prediction.created_at,
        )

    def get_latest_prediction(self, facility_id: UUID) -> PredictionLatestResponse:
        """Retrieves the newest effluent forecast, automatically generating one if empty."""
        stmt = (
            select(Prediction)
            .where(Prediction.facility_id == facility_id)
            .order_by(desc(Prediction.created_at))
            .limit(1)
        )
        pred = self.db.scalars(stmt).first()

        if not pred:
            # Auto-generate baseline forecast
            resp = self.evaluate_prediction(PredictionEvaluateRequest(facility_id=facility_id))
            return PredictionLatestResponse(
                facility_id=facility_id,
                evaluated_at=resp.created_at,
                has_prediction=True,
                latest_prediction=resp,
            )

        # Map stored JSON to DTOs
        raw_params = pred.predicted_parameters or {}
        param_dtos = {
            k: PredictedParameterDTO(**v) if isinstance(v, dict) else v
            for k, v in raw_params.items()
        }

        resp = PredictionResponse(
            prediction_id=pred.prediction_id,
            facility_id=pred.facility_id,
            treatment_stage=pred.treatment_stage,
            cycle_timestamp=pred.cycle_timestamp,
            horizon_hours=pred.horizon_hours,
            predicted_parameters=param_dtos,
            overall_risk_status=pred.overall_risk_status,
            overall_risk_score=pred.overall_risk_score,
            is_cpcb_compliant=pred.is_cpcb_compliant,
            model_version=pred.model_version,
            summary_explanation=pred.summary_explanation,
            created_at=pred.created_at,
        )

        return PredictionLatestResponse(
            facility_id=facility_id,
            evaluated_at=pred.created_at,
            has_prediction=True,
            latest_prediction=resp,
        )

    def _resolve_influent_telemetry(self, facility_id: UUID) -> Dict[str, float]:
        """Resolves latest observed influent values from readings table."""
        stmt = (
            select(Reading)
            .where(Reading.facility_id == facility_id)
            .order_by(desc(Reading.observed_at))
            .limit(50)
        )
        readings = list(self.db.scalars(stmt).all())
        results: Dict[str, float] = {}
        for r in readings:
            if r.parameter and r.value is not None:
                p_key = r.parameter.lower()
                if p_key not in results:
                    results[p_key] = float(r.value)
        return results
