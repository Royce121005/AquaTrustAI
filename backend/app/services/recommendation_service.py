"""AquaTrust AI — Process Recommendation Service (Member 2 Phase 4)."""

from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import select, desc

from app.db.base import utc_now
from app.models.recommendation import Recommendation
from app.models.reading import Reading
from app.models.audit_log import AuditLog
from app.schemas.recommendation import (
    RecommendationResponse,
    RecommendationApplyRequest,
    RecommendationListResponse,
    ParameterTargetDTO,
)
from ml.recommendations.engine import AquaTrustProcessRecommendationEngine
from ml.recommendations.schemas import ProcessRecommendation, RecommendationBatchOutput


class RecommendationService:
    """Manages prescriptive operator actions, setpoint recommendations, and execution tracking."""

    def __init__(self, db: Session, engine: Optional[AquaTrustProcessRecommendationEngine] = None):
        self.db = db
        self.engine = engine or AquaTrustProcessRecommendationEngine()

    def get_active_recommendations(self, facility_id: UUID) -> RecommendationListResponse:
        """Retrieves active recommendations for a plant, generating new ones from live telemetry if needed."""
        stmt = (
            select(Recommendation)
            .where(Recommendation.facility_id == facility_id, Recommendation.status == "active")
            .order_by(desc(Recommendation.created_at))
        )
        active_recs = list(self.db.scalars(stmt).all())

        if not active_recs:
            active_recs = self.generate_recommendations(facility_id)

        items: List[RecommendationResponse] = [self._to_dto(r) for r in active_recs]
        critical_count = sum(1 for r in items if r.severity in ("CRITICAL", "HIGH"))

        return RecommendationListResponse(
            facility_id=facility_id,
            total_count=len(items),
            active_count=len(items),
            critical_count=critical_count,
            recommendations=items,
        )

    def get_recommendation_history(
        self, facility_id: UUID, skip: int = 0, limit: int = 50
    ) -> RecommendationListResponse:
        """Queries historical recommendations (including applied, dismissed, and active)."""
        stmt = (
            select(Recommendation)
            .where(Recommendation.facility_id == facility_id)
            .order_by(desc(Recommendation.created_at))
            .offset(skip)
            .limit(limit)
        )
        rows = list(self.db.scalars(stmt).all())
        items = [self._to_dto(r) for r in rows]
        active_count = sum(1 for r in items if r.status == "active")
        critical_count = sum(1 for r in items if r.severity in ("CRITICAL", "HIGH") and r.status == "active")

        return RecommendationListResponse(
            facility_id=facility_id,
            total_count=len(items),
            active_count=active_count,
            critical_count=critical_count,
            recommendations=items,
        )

    def apply_recommendation(
        self,
        recommendation_id: UUID,
        req: RecommendationApplyRequest,
        actor_id: Optional[UUID] = None,
        actor_role: str = "operator",
    ) -> RecommendationResponse:
        """Applies/acknowledges a recommendation, recording operator identity and audit log."""
        rec = self.db.get(Recommendation, recommendation_id)
        if not rec:
            raise ValueError(f"Recommendation with ID {recommendation_id} not found.")

        now = utc_now()
        rec.status = "applied"
        rec.applied_at = now
        rec.applied_by = actor_id

        # Centralized lifecycle audit log entry
        audit_entry = AuditLog(
            actor_id=actor_id,
            actor_role=actor_role,
            action="RECOMMENDATION_APPLIED",
            resource_type="recommendation",
            resource_id=rec.recommendation_id,
            outcome="success",
            audit_metadata={
                "facility_id": str(rec.facility_id),
                "title": rec.title,
                "action": rec.action,
                "category": rec.category,
                "severity": rec.severity,
                "setpoint_applied": req.setpoint_applied,
                "operator_notes": req.operator_notes or "Acknowledged and implemented by plant operator.",
            },
        )
        self.db.add(audit_entry)
        self.db.commit()

        return self._to_dto(rec)

    def generate_recommendations(self, facility_id: UUID) -> List[Recommendation]:
        """Evaluates plant conditions with Member 1 engine and persists active recommendations."""
        now = utc_now()
        readings_map = self._get_recent_readings(facility_id)

        # Generate predictive quality forecast to drive prescriptive operator actions
        pred_out = None
        try:
            from ml.prediction.engine import AquaTrustTreatmentPredictionEngine
            from ml.prediction.schemas import TreatmentPredictionInput
            pred_engine = AquaTrustTreatmentPredictionEngine()
            pred_inp = TreatmentPredictionInput(
                facility_id=str(facility_id),
                timestamp=now.isoformat(),
                inlet_bod=readings_map.get("bod", 220.0),
                inlet_cod=readings_map.get("cod", 450.0),
                inlet_tss=readings_map.get("tss", 240.0),
                inlet_ph=readings_map.get("ph", 7.4),
            )
            pred_out = pred_engine.predict(pred_inp)
        except Exception:
            pass

        # Run Member 1 recommendation engine
        batch_out: RecommendationBatchOutput = self.engine.generate_recommendations(
            facility_id=str(facility_id),
            timestamp=now.isoformat(),
            prediction_output=pred_out,
            current_readings=readings_map,
        )

        persisted: List[Recommendation] = []
        for r in batch_out.recommendations:
            db_rec = Recommendation(
                facility_id=facility_id,
                timestamp=now,
                title=r.title,
                action=r.action,
                category=r.category.value if hasattr(r.category, "value") else str(r.category),
                severity=r.severity.value if hasattr(r.severity, "value") else str(r.severity),
                urgency=r.urgency.value if hasattr(r.urgency, "value") else str(r.urgency),
                related_parameter=r.related_parameter,
                trigger_source=r.trigger_source,
                reason=r.reason,
                parameter_target=r.parameter_target.to_dict() if r.parameter_target else None,
                estimated_impact=r.estimated_impact,
                status="active",
                recommendation_metadata=r.metadata,
                created_at=now,
            )
            self.db.add(db_rec)
            persisted.append(db_rec)

        self.db.commit()
        return persisted

    def _to_dto(self, r: Recommendation) -> RecommendationResponse:
        target_dto = None
        if r.parameter_target and isinstance(r.parameter_target, dict):
            target_dto = ParameterTargetDTO(
                parameter=r.parameter_target.get("parameter", r.related_parameter),
                current_value=r.parameter_target.get("current_value"),
                recommended_setpoint=float(r.parameter_target.get("recommended_setpoint", 0.0)),
                unit=r.parameter_target.get("unit", ""),
                adjustment_delta=float(r.parameter_target.get("adjustment_delta", 0.0)),
            )

        return RecommendationResponse(
            recommendation_id=r.recommendation_id,
            facility_id=r.facility_id,
            timestamp=r.timestamp,
            title=r.title,
            action=r.action,
            category=r.category,
            severity=r.severity,
            urgency=r.urgency,
            related_parameter=r.related_parameter,
            trigger_source=r.trigger_source,
            reason=r.reason,
            parameter_target=target_dto,
            estimated_impact=r.estimated_impact,
            status=r.status,
            applied_at=r.applied_at,
            applied_by=r.applied_by,
            created_at=r.created_at,
        )

    def _get_recent_readings(self, facility_id: UUID) -> Dict[str, float]:
        stmt = (
            select(Reading)
            .where(Reading.facility_id == facility_id)
            .order_by(desc(Reading.observed_at))
            .limit(50)
        )
        readings = list(self.db.scalars(stmt).all())
        m: Dict[str, float] = {}
        for r in readings:
            if r.parameter and r.value is not None:
                p = r.parameter.lower()
                if p not in m:
                    m[p] = float(r.value)
        return m
