"""AquaTrust AI — Sensor Health & Calibration Service (Member 2 Phase 2)."""

from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import select, desc, func

from app.db.base import utc_now
from app.models.sensor import Sensor
from app.models.reading import Reading
from app.models.audit_log import AuditLog
from app.schemas.sensor import (
    SensorHealthItem,
    SensorHealthResponse,
    SensorCalibrationRequest,
    SensorCalibrationResponse,
)
from ml.inference.sensor_trust import SensorTrustClassifier, SensorTrustAnomalyType


class SensorService:
    """Evaluates sensor calibration schedules, drift status, and operational trust metrics."""

    NOMINAL_CALIBRATION_INTERVAL_DAYS = 30
    OVERDUE_CALIBRATION_INTERVAL_DAYS = 60

    def __init__(self, db: Session):
        self.db = db
        self.classifier = SensorTrustClassifier()

    def get_facility_sensor_health(self, facility_id: UUID) -> SensorHealthResponse:
        """Computes comprehensive health scores and calibration readiness for all sensors in a facility."""
        now = utc_now()
        stmt = select(Sensor).where(Sensor.facility_id == facility_id)
        sensors = list(self.db.scalars(stmt).all())

        # Batch fetch up to 10 most recent readings per sensor to eliminate N+1 queries
        sensor_ids = [s.sensor_id for s in sensors]
        readings_by_sensor: Dict[Any, List[Reading]] = {s.sensor_id: [] for s in sensors}
        if sensor_ids:
            rn_col = func.row_number().over(
                partition_by=Reading.sensor_id,
                order_by=desc(Reading.observed_at)
            ).label("rn")
            subq = (
                select(Reading.reading_id, rn_col)
                .where(Reading.sensor_id.in_(sensor_ids))
                .subquery()
            )
            batch_stmt = (
                select(Reading)
                .join(subq, Reading.reading_id == subq.c.reading_id)
                .where(subq.c.rn <= 10)
                .order_by(Reading.sensor_id, desc(Reading.observed_at))
            )
            for r in self.db.scalars(batch_stmt).all():
                readings_by_sensor.setdefault(r.sensor_id, []).append(r)

        items: List[SensorHealthItem] = []
        healthy_count = 0
        drift_count = 0
        overdue_count = 0
        total_health_accum = 0.0

        for sensor in sensors:
            # 1. Calibration Schedule Check
            days_since = None
            is_due = False
            cal_status = sensor.calibration_status or "calibrated"

            if sensor.last_calibrated_at:
                delta = now - sensor.last_calibrated_at
                days_since = max(0, delta.days)
                if days_since > self.OVERDUE_CALIBRATION_INTERVAL_DAYS:
                    cal_status = "overdue"
                    is_due = True
                elif days_since > self.NOMINAL_CALIBRATION_INTERVAL_DAYS:
                    cal_status = "due"
                    is_due = True
                else:
                    cal_status = "calibrated"
            else:
                cal_status = "due"
                is_due = True
                days_since = 45

            # 2. Dynamic Telemetry Health Check via Member 1 SensorTrustClassifier
            recent_readings = readings_by_sensor.get(sensor.sensor_id, [])

            drift_detected = False
            stuck_detected = False
            health_penalty = 0.0
            diagnostic_msg = "Operating within nominal accuracy thresholds."

            if recent_readings:
                # Chronological values
                chron_vals = [float(r.value) for r in reversed(recent_readings) if r.value is not None]
                if len(chron_vals) >= 4:
                    latest_val = chron_vals[-1]
                    hist = chron_vals[:-1]
                    trust_res = self.classifier.evaluate(
                        current_value=latest_val,
                        parameter=sensor.parameter,
                        unit=sensor.unit,
                        timestamp=recent_readings[0].observed_at.isoformat(),
                        sliding_history=hist,
                    )
                    if trust_res.anomaly_type == SensorTrustAnomalyType.SENSOR_DRIFT:
                        drift_detected = True
                        health_penalty += 35.0
                        diagnostic_msg = f"Progressive calibration drift detected on {sensor.parameter}: {trust_res.reason}"
                    elif trust_res.anomaly_type == SensorTrustAnomalyType.STUCK_SENSOR:
                        stuck_detected = True
                        health_penalty += 50.0
                        diagnostic_msg = f"Signal frozen: {trust_res.reason}"
                    elif trust_res.anomaly_type == SensorTrustAnomalyType.SENSOR_FAILURE:
                        health_penalty += 60.0
                        diagnostic_msg = f"Hardware/boundary violation: {trust_res.reason}"

            # Calibration overdue penalty
            if cal_status == "overdue":
                health_penalty += 30.0
                overdue_count += 1
                if not drift_detected and not stuck_detected:
                    diagnostic_msg = f"Sensor calibration is overdue ({days_since} days elapsed > 60 days standard)."
            elif cal_status == "due":
                health_penalty += 10.0
                if not drift_detected and not stuck_detected:
                    diagnostic_msg = f"Sensor is due for periodic maintenance calibration ({days_since} days)."

            # Update DB drift flag if changed
            if sensor.drift_flag != drift_detected:
                sensor.drift_flag = drift_detected

            sensor.calibration_status = cal_status
            if drift_detected:
                drift_count += 1

            health_score = max(0.0, min(100.0, 100.0 - health_penalty))
            if health_score >= 80.0:
                healthy_count += 1

            total_health_accum += health_score

            items.append(
                SensorHealthItem(
                    sensor_id=sensor.sensor_id,
                    facility_id=sensor.facility_id,
                    parameter=sensor.parameter,
                    unit=sensor.unit,
                    treatment_stage=sensor.treatment_stage,
                    status=sensor.status,
                    calibration_status=cal_status,
                    last_calibrated_at=sensor.last_calibrated_at,
                    days_since_calibration=days_since,
                    is_calibration_due=is_due,
                    drift_flag=drift_detected,
                    health_score=round(health_score, 1),
                    diagnostic_message=diagnostic_msg,
                )
            )

        overall_index = round(total_health_accum / len(items), 1) if items else 100.0
        self.db.commit()

        return SensorHealthResponse(
            facility_id=facility_id,
            evaluated_at=now,
            total_sensors=len(items),
            healthy_sensors=healthy_count,
            drift_flagged_sensors=drift_count,
            overdue_calibration_sensors=overdue_count,
            overall_health_index=overall_index,
            sensors=items,
        )

    def calibrate_sensor(
        self,
        req: SensorCalibrationRequest,
        actor_id: Optional[UUID] = None,
        actor_role: str = "operator",
    ) -> SensorCalibrationResponse:
        """Executes a calibration reset for a sensor and logs the maintenance event to audit_logs."""
        sensor = self.db.get(Sensor, req.sensor_id)
        if not sensor:
            raise ValueError(f"Sensor with ID {req.sensor_id} does not exist.")

        now = utc_now()
        sensor.last_calibrated_at = now
        sensor.calibration_status = "calibrated"
        sensor.drift_flag = False
        sensor.status = "active"

        # Centralized lifecycle audit log entry
        audit_entry = AuditLog(
            actor_id=actor_id,
            actor_role=actor_role,
            action="SENSOR_CALIBRATED",
            resource_type="sensor",
            resource_id=sensor.sensor_id,
            outcome="success",
            audit_metadata={
                "facility_id": str(sensor.facility_id),
                "parameter": sensor.parameter,
                "unit": sensor.unit,
                "calibration_type": req.calibration_type,
                "performed_by": req.performed_by or str(actor_id or "operator"),
                "notes": req.notes or "Zero and span point calibration verified.",
            },
        )
        self.db.add(audit_entry)
        self.db.commit()

        return SensorCalibrationResponse(
            sensor_id=sensor.sensor_id,
            facility_id=sensor.facility_id,
            parameter=sensor.parameter,
            calibration_status="calibrated",
            calibrated_at=now,
            drift_flag=False,
            status=sensor.status,
            message=f"Sensor for {sensor.parameter} successfully calibrated. Drift flag cleared.",
        )
