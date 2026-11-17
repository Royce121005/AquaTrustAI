"""AquaTrust AI — Centralized Lifecycle Audit Service (Member 2 Phase 9)."""

from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import select, desc

from app.models.audit_log import AuditLog
from app.schemas.audit import AuditTimelineItem, AuditTimelineResponse


class AuditService:
    """Aggregates and formats the chronological lifecycle audit trail across all system events."""

    ACTION_CATEGORY_MAP = {
        "READING_INGESTED": "TELEMETRY",
        "TELEMETRY_INGESTION_BATCH": "TELEMETRY",
        "TELEMETRY_VALIDATED": "TELEMETRY",
        "ANOMALY_TRIGGERED": "ANOMALY",
        "ANOMALY_RESOLVED": "ANOMALY",
        "PREDICTION_GENERATED": "PREDICTION",
        "RECOMMENDATION_GENERATED": "RECOMMENDATION",
        "RECOMMENDATION_APPLIED": "RECOMMENDATION",
        "COMPLIANCE_EVALUATION": "COMPLIANCE",
        "COMPLIANCE_CHECK": "COMPLIANCE",
        "READING_CORRECTED": "CORRECTION",
        "CORRECTION_SUBMITTED": "CORRECTION",
        "TREATMENT_RECORD_FINALIZED": "FINALIZATION",
        "RECORD_SIGNED": "FINALIZATION",
        "DLT_ANCHOR_COMMITTED": "FINALIZATION",
        "SENSOR_CALIBRATED": "CALIBRATION",
        "USER_LOGIN": "SECURITY",
        "AUTH_KEY_GENERATED": "SECURITY",
    }

    def __init__(self, db: Session):
        self.db = db

    def get_audit_timeline(
        self,
        facility_id: Optional[UUID] = None,
        from_date: Optional[datetime] = None,
        to_date: Optional[datetime] = None,
        category: Optional[str] = None,
        limit: int = 50,
    ) -> AuditTimelineResponse:
        """Retrieves structured, categorized timeline events in reverse chronological order."""
        stmt = select(AuditLog)

        if from_date:
            stmt = stmt.where(AuditLog.created_at >= from_date)
        if to_date:
            stmt = stmt.where(AuditLog.created_at <= to_date)

        stmt = stmt.order_by(desc(AuditLog.created_at)).limit(limit * 2)
        rows = list(self.db.scalars(stmt).all())

        items: List[AuditTimelineItem] = []
        for r in rows:
            cat = self.ACTION_CATEGORY_MAP.get(r.action, "GENERAL")
            if category and cat.upper() != category.upper():
                continue

            # Check facility filter if stored in metadata
            meta = r.audit_metadata or {}
            event_facility = meta.get("facility_id")
            if facility_id:
                if r.resource_type == "facility" and r.resource_id == facility_id:
                    pass
                elif event_facility and str(facility_id) in str(event_facility):
                    pass
                else:
                    # If this event is not related to the requested facility, skip
                    if r.resource_type in ("facility", "sensor", "treatment_record") and r.resource_id != facility_id:
                        continue

            summary = self._generate_summary(r, cat, meta)

            items.append(
                AuditTimelineItem(
                    audit_log_id=r.audit_log_id,
                    timestamp=r.created_at,
                    category=cat,
                    action=r.action,
                    actor_id=str(r.actor_id) if r.actor_id else "system",
                    actor_role=r.actor_role or "system",
                    resource_type=r.resource_type,
                    resource_id=r.resource_id,
                    outcome=r.outcome,
                    summary=summary,
                    details=meta,
                )
            )

            if len(items) >= limit:
                break

        return AuditTimelineResponse(
            facility_id=facility_id,
            total_events=len(items),
            timeline=items,
        )

    def _generate_summary(self, log: AuditLog, category: str, meta: Dict[str, Any]) -> str:
        action = log.action
        if action == "SENSOR_CALIBRATED":
            param = meta.get("parameter", "Sensor")
            return f"Maintenance calibration completed on {param} sensor. Accuracy reset."
        elif action == "PREDICTION_GENERATED":
            status = meta.get("overall_risk_status", "NORMAL")
            return f"AI quality forecast computed downstream effluent breach risk as {status}."
        elif action == "RECOMMENDATION_APPLIED":
            act = meta.get("action", "Prescriptive adjustment")
            return f"Operator applied recommendation: {act}"
        elif action == "TELEMETRY_INGESTION_BATCH":
            count = meta.get("reading_count", "Batch")
            return f"Ingested telemetry batch ({count} readings) from online PLC gateway."
        elif action == "READING_CORRECTED":
            param = meta.get("parameter", "reading")
            return f"Append-only correction logged for {param} with full provenance tracking."
        elif action == "TREATMENT_RECORD_FINALIZED":
            ver = meta.get("record_version", "1.0")
            return f"Treatment record cycle finalized (v{ver}), ECDSA-signed, and prepared for DLT anchoring."
        elif action == "COMPLIANCE_EVALUATION":
            res = meta.get("compliance_status", "EVALUATED")
            return f"Statutory CPCB discharge limits evaluated: status={res}."
        elif action == "ANOMALY_TRIGGERED":
            atype = meta.get("anomaly_type", "anomaly")
            return f"Real-time sensor trust alert: {atype} detected on stream."
        else:
            return f"{action.replace('_', ' ').capitalize()} executed with status {log.outcome}."
