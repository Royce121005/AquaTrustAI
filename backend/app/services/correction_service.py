"""AquaTrust AI — Append-Only Correction Service.

Enforces immutable provenance and append-only governance:
1. Past records are NEVER mutated or overwritten in place.
2. A correction creates a new TreatmentRecord (version + 1) with `supersedes_record_id` pointing
   to the prior record.
3. The prior record is transitioned to `superseded_by_correction`.
4. A full cryptographic re-finalization, new digital certificate, and new DLT anchor are generated.
5. An immutable correction link is committed to the Hyperledger Fabric DLT ledger.
"""

from datetime import datetime, timezone, timedelta
from decimal import Decimal
from typing import Dict, Any, List, Optional
from uuid import UUID, uuid4
from sqlalchemy.orm import Session

from app.db.base import utc_now
from app.models.treatment_record import TreatmentRecord
from app.models.correction import Correction
from app.models.reading import Reading
from app.models.dlt_anchor import DLTAnchor
from app.models.audit_log import AuditLog
from app.repositories.treatment_repository import TreatmentRepository
from app.repositories.reading_repository import ReadingRepository
from app.services.treatment_service import TreatmentService
from app.services.compliance_service import ComplianceService
from app.dlt.gateway import dlt_gateway


class CorrectionService:
    """Service handling proposed and authorized append-only corrections."""

    @classmethod
    def propose_correction(
        cls,
        db: Session,
        original_record_id: UUID,
        reason: str,
        justification_code: str,
        corrected_parameters: Dict[str, float],
        proposer_id: Optional[UUID] = None,
    ) -> Correction:
        """Propose a correction against a finalized treatment record."""
        treatment_repo = TreatmentRepository(db)
        original = treatment_repo.get_by_id(original_record_id)
        if not original:
            raise ValueError(f"Original record {original_record_id} does not exist")

        req_by = proposer_id or uuid4()
        correction = Correction(
            correction_id=uuid4(),
            original_record_id=original_record_id,
            requested_by=req_by,
            reason=f"[{justification_code}] {reason}",
            proposed_changes={"parameters": corrected_parameters, "justification_code": justification_code},
            status="pending",
            created_at=utc_now(),
        )
        db.add(correction)

        audit = AuditLog(
            audit_log_id=uuid4(),
            action="PROPOSE_CORRECTION",
            resource_type="correction",
            resource_id=correction.correction_id,
            actor_id=req_by,
            outcome="success",
            audit_metadata={"record_id": str(original_record_id), "reason": reason},
            created_at=utc_now(),
        )
        db.add(audit)
        db.flush()
        return correction

    @classmethod
    def authorize_correction(
        cls,
        db: Session,
        correction_id: UUID,
        authorized_by: Optional[UUID] = None,
        key_id: str = "key-ecdsa-p256-01",
    ) -> TreatmentRecord:
        """Authorize a correction: supersedes previous record, creates new versioned record, and anchors link on DLT."""
        treatment_repo = TreatmentRepository(db)
        correction = db.query(Correction).filter(Correction.correction_id == correction_id).first()
        if not correction:
            raise ValueError(f"Correction {correction_id} not found")

        original_record = treatment_repo.get_by_id(correction.original_record_id)
        if not original_record:
            raise ValueError(f"Original record {correction.original_record_id} not found")

        # 1. Mark original record as superseded
        original_record.record_state = "superseded_by_correction"

        # 2. Append corrected readings without mutating historical raw telemetry in-place
        param_delta = correction.proposed_changes.get("parameters", {}) if correction.proposed_changes else {}
        for param, val in param_delta.items():
            existing = db.query(Reading).filter(
                Reading.facility_id == original_record.facility_id,
                Reading.treatment_stage == "final_effluent",
                Reading.parameter == param,
                Reading.observed_at >= original_record.period_start,
                Reading.observed_at <= original_record.period_end,
            ).first()
            if existing:
                # Retain raw historical observation value, mark status suspect to exclude from new compliance
                existing.quality_status = "suspect"
                existing.provenance = {
                    **(existing.provenance or {}),
                    "superseded_by_correction_id": str(correction.correction_id),
                }
                # Insert append-only corrected reading with distinct microsecond offset to respect uq_readings_natural_key
                r = Reading(
                    reading_id=uuid4(),
                    facility_id=original_record.facility_id,
                    sensor_id=existing.sensor_id,
                    observed_at=existing.observed_at + timedelta(microseconds=1000),
                    treatment_stage="final_effluent",
                    parameter=param,
                    value=Decimal(str(val)),
                    unit=existing.unit,
                    source="correction",
                    quality_status="valid",
                    provenance={
                        "correction_id": str(correction.correction_id),
                        "supersedes_reading_id": str(existing.reading_id),
                        "original_value": str(existing.value),
                    },
                )
                db.add(r)
            else:
                r = Reading(
                    reading_id=uuid4(),
                    facility_id=original_record.facility_id,
                    observed_at=original_record.period_start + timedelta(microseconds=1000),
                    treatment_stage="final_effluent",
                    parameter=param,
                    value=Decimal(str(val)),
                    unit="mg/L" if param != "PH" else "pH units",
                    source="correction",
                    quality_status="valid",
                    provenance={
                        "correction_id": str(correction.correction_id),
                        "supersedes": str(original_record.record_id),
                    },
                )
                db.add(r)
        db.flush()

        # 3. Create new Treatment Record with incremented version
        new_record_id = uuid4()
        new_record = TreatmentRecord(
            record_id=new_record_id,
            facility_id=original_record.facility_id,
            period_start=original_record.period_start,
            period_end=original_record.period_end,
            record_version=original_record.record_version + 1,
            record_state="eligible_for_finalization",
            quality_status=original_record.quality_status,
            anomaly_status=original_record.anomaly_status,
            compliance_status="pending",
            anchor_status="not_required",
            supersedes_record_id=original_record.record_id,
            created_at=utc_now(),
        )
        treatment_repo.create(new_record)
        db.flush()

        # 4. Evaluate compliance and finalize new record
        ComplianceService.evaluate_treatment_record(db, new_record)
        finalized_new = TreatmentService.finalize_record(db, new_record, key_id=key_id)

        # 5. Anchor correction linkage on DLT ledger
        dlt_corr_link = dlt_gateway.record_correction_link(
            original_record_id=original_record.record_id,
            corrected_record_id=finalized_new.record_id,
            reason=correction.reason or "",
        )

        # Retrieve new record's DLT Anchor if present
        dlt_anchor = db.query(DLTAnchor).filter(DLTAnchor.record_id == finalized_new.record_id).first()

        # 6. Mark correction authorized
        auth_uuid = authorized_by or uuid4()
        correction.status = "authorized"
        correction.authorized_by = auth_uuid
        correction.authorized_at = utc_now()
        correction.corrected_record_id = finalized_new.record_id
        correction.new_certificate_id = finalized_new.certificate_id
        correction.new_hash = finalized_new.canonical_hash
        correction.new_signature_id = finalized_new.signature_id
        correction.new_dlt_anchor_id = dlt_anchor.anchor_id if dlt_anchor else None
        correction.completed_at = utc_now()

        # 7. Audit Trail
        audit = AuditLog(
            audit_log_id=uuid4(),
            action="AUTHORIZE_CORRECTION",
            resource_type="correction",
            resource_id=correction.correction_id,
            actor_id=auth_uuid,
            outcome="success",
            audit_metadata={
                "superseded_record_id": str(original_record.record_id),
                "new_record_id": str(finalized_new.record_id),
                "new_version": finalized_new.record_version,
                "dlt_tx_id": dlt_corr_link.get("tx_id"),
                "dlt_block_number": dlt_corr_link.get("block_number"),
                "correction_link_tx": dlt_corr_link.get("tx_id"),
                "correction_link_mode": dlt_corr_link.get("mode", "SIMULATION"),
                "correction_simulation_reference": dlt_corr_link.get("simulation_reference"),
                "new_dlt_anchor_id": str(dlt_anchor.anchor_id) if dlt_anchor else None,
            },
            created_at=utc_now(),
        )
        db.add(audit)
        db.flush()

        return finalized_new

    @classmethod
    def get_correction_chain(cls, db: Session, record_id: UUID) -> List[TreatmentRecord]:
        """Fetch the complete lineage/provenance chain for a treatment record."""
        treatment_repo = TreatmentRepository(db)
        chain = []
        current = treatment_repo.get_by_id(record_id)
        if not current:
            return []

        # Walk backward to find root
        while current and current.supersedes_record_id:
            current = treatment_repo.get_by_id(current.supersedes_record_id)

        root = current or treatment_repo.get_by_id(record_id)
        chain.append(root)

        # Walk forward to find all descendants
        while True:
            child = db.query(TreatmentRecord).filter(
                TreatmentRecord.supersedes_record_id == chain[-1].record_id
            ).first()
            if not child:
                break
            chain.append(child)

        return chain
