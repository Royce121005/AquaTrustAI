"""AquaTrust AI — Historical Demo Windows Generator.

Generates 6 additional authentic historical treatment record windows across
Bharwara STP Lucknow, Jajmau STP Kanpur, and Dinapur STP Varanasi in PostgreSQL.
Includes:
- 4 Compliant Windows (CPCB limits satisfied)
- 2 Non-Compliant Exceedance Windows (showing CPCB threshold breaches)

Resulting database metrics:
- Total Evaluated Records: 7
- Compliant Windows: 5
- Non-Compliant Windows: 2
- Compliance Rate: ~71.4%
"""

import os
import sys
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal

# Ensure backend and project root are on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.base import utc_now
from app.models.facility import Facility
from app.models.sensor import Sensor
from app.models.reading import Reading
from app.models.treatment_record import TreatmentRecord
from app.models.compliance_result import ComplianceResult
from app.services.validation_service import ValidationService
from app.services.anomaly_service import AnomalyService
from app.services.treatment_service import TreatmentService
from app.services.compliance_service import ComplianceService

# Target Facility UUIDs
BHARWARA_ID = uuid.UUID("085a9719-c9d0-4562-b4d7-bc389dec12b3")
JAJMAU_ID = uuid.UUID("13000000-0000-0000-0000-000000000014")
DINAPUR_ID = uuid.UUID("14000000-0000-0000-0000-000000000032")

PARAMS_CONFIG = [
    {"parameter": "BOD", "unit": "mg/L"},
    {"parameter": "COD", "unit": "mg/L"},
    {"parameter": "TSS", "unit": "mg/L"},
    {"parameter": "PH", "unit": "pH units"},
    {"parameter": "NH4_N", "unit": "mg/L"},
    {"parameter": "TKN", "unit": "mg/L"},
]


def ensure_sensors_for_facility(db, facility_id: uuid.UUID):
    """Ensure all 6 active parameters exist in sensors table for a facility."""
    sensor_map = {}
    for p in PARAMS_CONFIG:
        param = p["parameter"]
        s = db.query(Sensor).filter(
            Sensor.facility_id == facility_id,
            Sensor.parameter == param
        ).first()
        if not s:
            s = Sensor(
                sensor_id=uuid.uuid5(uuid.NAMESPACE_DNS, f"{facility_id}_{param}_sensor"),
                facility_id=facility_id,
                parameter=param,
                unit=p["unit"],
                treatment_stage="final_effluent",
                status="active",
                created_at=utc_now(),
            )
            db.add(s)
            db.flush()
        sensor_map[param] = s.sensor_id
    db.commit()
    return sensor_map


def generate_window(
    db,
    facility_id: uuid.UUID,
    facility_name: str,
    window_start: datetime,
    window_end: datetime,
    param_profiles: dict,
    label: str,
):
    """Generates sequential readings per parameter, aggregates window, evaluates compliance, and seals finalization."""
    print(f"\n--- Generating Window: {label} ({facility_name}) ---", flush=True)
    print(f"    Period: {window_start.isoformat()} -> {window_end.isoformat()}", flush=True)

    sensor_map = ensure_sensors_for_facility(db, facility_id)
    engine_ml = AnomalyService.get_engine()

    num_samples = len(list(param_profiles.values())[0])

    # Pre-warm ML sliding window cache
    for param, vals in param_profiles.items():
        stream_key = f"{facility_id}:final_effluent:{param.lower()}"
        base_val = float(vals[0])
        for k in range(3, 0, -1):
            warmup_ts = (window_start - timedelta(minutes=15 * k)).isoformat()
            engine_ml.cache.update(stream_key, warmup_ts, base_val)

    # Ingest readings spaced evenly in window
    time_delta = (window_end - window_start) / max(num_samples, 1)
    created_readings = []

    for i in range(num_samples):
        obs_time = window_start + (time_delta * i)
        for param, vals in param_profiles.items():
            val = vals[i]
            r_id = uuid.uuid5(uuid.NAMESPACE_DNS, f"{facility_id}_{param}_{obs_time.isoformat()}")
            reading = db.query(Reading).filter(Reading.reading_id == r_id).first()
            if not reading:
                reading = Reading(
                    reading_id=r_id,
                    facility_id=facility_id,
                    sensor_id=sensor_map.get(param),
                    observed_at=obs_time,
                    treatment_stage="final_effluent",
                    parameter=param,
                    value=Decimal(str(val)),
                    unit="pH units" if param == "PH" else "mg/L",
                    source="telemetry",
                    quality_status="pending",
                    created_at=utc_now(),
                )
                db.add(reading)
                db.flush()

            # Run deterministic validation and AI inference
            ValidationService.validate_reading(db, reading)
            AnomalyService.infer_reading(db, reading)
            created_readings.append(reading)

    db.commit()
    print(f"    Ingested & validated {len(created_readings)} readings.", flush=True)

    # Aggregate window
    record = TreatmentService.aggregate_window(
        db=db,
        facility_id=facility_id,
        period_start=window_start,
        period_end=window_end,
    )
    print(f"    Aggregated Record ID: {record.record_id}", flush=True)
    print(f"    Record State: {record.record_state} | Compliance: {record.compliance_status}", flush=True)

    # Finalize record with cryptographic seal & DLT anchor
    try:
        finalized_rec = TreatmentService.finalize_record(
            db=db,
            record=record,
            key_id="key-ecdsa-p256-01",
        )
        db.commit()
        print(f"    Finalized Successfully! State: {finalized_rec.record_state} | Compliance: {finalized_rec.compliance_status}", flush=True)
    except Exception as e:
        print(f"    Finalization notice: {e}", flush=True)
        db.commit()

    return record


def main(db_url: str):
    print(f"[INFO] Connecting to database: {db_url[:40]}...", flush=True)
    engine = create_engine(db_url, pool_pre_ping=True)
    Session = sessionmaker(bind=engine)
    db = Session()

    try:
        print("Starting AquaTrust AI Historical Demo Windows Generation...", flush=True)

        # 1. Bharwara STP Compliant Window (2026-09-30 08:00 - 12:00 UTC)
        generate_window(
            db=db,
            facility_id=BHARWARA_ID,
            facility_name="Bharwara STP Lucknow",
            window_start=datetime(2026, 9, 30, 8, 0, 0, tzinfo=timezone.utc),
            window_end=datetime(2026, 9, 30, 12, 0, 0, tzinfo=timezone.utc),
            param_profiles={
                "BOD": [14.6, 14.8, 15.0],
                "COD": [91.5, 92.4, 93.0],
                "TSS": [37.8, 38.5, 39.0],
                "PH": [7.50, 7.52, 7.51],
                "NH4_N": [0.08, 0.08, 0.09],
                "TKN": [2.14, 2.16, 2.18],
            },
            label="Bharwara Compliant Window (Sep 30)",
        )

        # 2. Bharwara STP NON-COMPLIANT Exceedance Window (2026-10-01 14:00 - 18:00 UTC)
        # Industrial Shock Load: BOD breaches 30, COD breaches 250, TSS breaches 100
        generate_window(
            db=db,
            facility_id=BHARWARA_ID,
            facility_name="Bharwara STP Lucknow",
            window_start=datetime(2026, 10, 1, 14, 0, 0, tzinfo=timezone.utc),
            window_end=datetime(2026, 10, 1, 18, 0, 0, tzinfo=timezone.utc),
            param_profiles={
                "BOD": [46.5, 48.2, 49.0],  # > 30 mg/L limit!
                "COD": [305.0, 312.0, 318.0],  # > 250 mg/L limit!
                "TSS": [121.0, 124.5, 126.0],  # > 100 mg/L limit!
                "PH": [7.10, 7.08, 7.12],
                "NH4_N": [1.15, 1.22, 1.25],
                "TKN": [4.30, 4.45, 4.60],
            },
            label="Bharwara Industrial Shock Exceedance (Oct 01)",
        )

        # 3. Jajmau STP Kanpur Compliant Window (2026-09-29 00:00 - 06:00 UTC)
        generate_window(
            db=db,
            facility_id=JAJMAU_ID,
            facility_name="Jajmau STP Kanpur",
            window_start=datetime(2026, 9, 29, 0, 0, 0, tzinfo=timezone.utc),
            window_end=datetime(2026, 9, 29, 6, 0, 0, tzinfo=timezone.utc),
            param_profiles={
                "BOD": [17.8, 18.2, 18.5],
                "COD": [112.0, 115.0, 116.5],
                "TSS": [44.0, 45.2, 45.8],
                "PH": [7.32, 7.35, 7.34],
                "NH4_N": [0.11, 0.12, 0.13],
                "TKN": [2.75, 2.80, 2.85],
            },
            label="Jajmau Compliant Window (Sep 29 Morning)",
        )

        # 4. Jajmau STP Kanpur NON-COMPLIANT Exceedance Window (2026-09-29 12:00 - 16:00 UTC)
        # Acidic Industrial / Tannery Discharge: pH breaches 5.5, COD breaches 250, BOD breaches 30
        generate_window(
            db=db,
            facility_id=JAJMAU_ID,
            facility_name="Jajmau STP Kanpur",
            window_start=datetime(2026, 9, 29, 12, 0, 0, tzinfo=timezone.utc),
            window_end=datetime(2026, 9, 29, 16, 0, 0, tzinfo=timezone.utc),
            param_profiles={
                "BOD": [52.0, 54.5, 55.0],  # > 30 mg/L limit!
                "COD": [338.0, 344.0, 350.0],  # > 250 mg/L limit!
                "TSS": [86.0, 88.0, 89.5],
                "PH": [4.82, 4.80, 4.86],  # < 5.50 minimum limit!
                "NH4_N": [0.48, 0.52, 0.55],
                "TKN": [3.15, 3.24, 3.30],
            },
            label="Jajmau Acidic Effluent Exceedance (Sep 29 Afternoon)",
        )

        # 5. Dinapur STP Varanasi Compliant Window (2026-09-28 06:00 - 12:00 UTC)
        generate_window(
            db=db,
            facility_id=DINAPUR_ID,
            facility_name="Dinapur STP Varanasi",
            window_start=datetime(2026, 9, 28, 6, 0, 0, tzinfo=timezone.utc),
            window_end=datetime(2026, 9, 28, 12, 0, 0, tzinfo=timezone.utc),
            param_profiles={
                "BOD": [12.2, 12.5, 12.8],
                "COD": [80.5, 82.2, 83.5],
                "TSS": [27.5, 28.0, 28.5],
                "PH": [7.62, 7.65, 7.64],
                "NH4_N": [0.05, 0.06, 0.07],
                "TKN": [1.80, 1.85, 1.90],
            },
            label="Dinapur High-Efficiency Window (Sep 28 Morning)",
        )

        # 6. Dinapur STP Varanasi Compliant Window (2026-09-28 12:00 - 18:00 UTC)
        generate_window(
            db=db,
            facility_id=DINAPUR_ID,
            facility_name="Dinapur STP Varanasi",
            window_start=datetime(2026, 9, 28, 12, 0, 0, tzinfo=timezone.utc),
            window_end=datetime(2026, 9, 28, 18, 0, 0, tzinfo=timezone.utc),
            param_profiles={
                "BOD": [13.5, 13.8, 14.0],
                "COD": [87.0, 88.6, 90.0],
                "TSS": [31.5, 32.0, 32.6],
                "PH": [7.55, 7.58, 7.57],
                "NH4_N": [0.06, 0.07, 0.08],
                "TKN": [1.90, 1.95, 2.00],
            },
            label="Dinapur Afternoon Window (Sep 28 Afternoon)",
        )

        # Print Final Summary from Database
        total_evals = db.query(ComplianceResult).count()
        total_records = db.query(TreatmentRecord).count()
        compliant_records = db.query(TreatmentRecord).filter(TreatmentRecord.compliance_status == "compliant").count()
        non_compliant_records = db.query(TreatmentRecord).filter(TreatmentRecord.compliance_status == "non_compliant").count()
        finalized_records = db.query(TreatmentRecord).filter(TreatmentRecord.record_state == "finalized").count()

        print("\n================ FINAL METRICS SUMMARY ================", flush=True)
        print(f"Total Treatment Records in DB: {total_records}", flush=True)
        print(f"Finalized Records:             {finalized_records}", flush=True)
        print(f"Compliant Windows:             {compliant_records}", flush=True)
        print(f"Non-Compliant Windows:         {non_compliant_records}", flush=True)
        print(f"Total Compliance Evaluations:  {total_evals}", flush=True)
        if total_records > 0:
            print(f"Overall Compliance Rate:       {round((compliant_records / total_records) * 100, 1)}%", flush=True)
        print("=======================================================", flush=True)

    finally:
        db.close()


if __name__ == "__main__":
    db_target = sys.argv[1] if len(sys.argv) > 1 else os.getenv("DATABASE_URL")
    if not db_target:
        from app.core.config import get_settings
        db_target = get_settings().DATABASE_URL

    main(db_target)
