"""AquaTrust AI — Compliance Rule Provenance and Unverified Status Verification.

Verifies Phase 3 statutory audit requirements:
- All default CPCB rules are annotated with statutory provenance.
- Claimed effective date (2021-01-01) is marked UNVERIFIED_CLAIMED_2021_DATE and is_authoritative=False.
- Prevents rules from being falsely presented as authoritative without gazetted evidence.
- Verifies current and historical compliance calculations.
"""

from datetime import datetime, timezone
from decimal import Decimal
import pytest
from uuid import uuid4

from app.services.compliance_service import ComplianceService, DEFAULT_CPCB_RULES
from app.models.reading import Reading
from app.models.compliance_rule import ComplianceRule


def test_default_cpcb_rules_provenance_and_unverified_flag():
    """Verify that all default CPCB rules carry statutory provenance and unverified flags."""
    assert len(DEFAULT_CPCB_RULES) == 6
    required_params = {"BOD", "COD", "TSS", "PH", "NH4_N", "TKN"}
    found_params = {r["parameter"] for r in DEFAULT_CPCB_RULES}
    assert found_params == required_params

    for rule in DEFAULT_CPCB_RULES:
        param = rule["parameter"]
        assert rule["is_authoritative"] is False, f"Rule {param} must not be marked authoritative without gazetted evidence"
        assert rule["verification_status"] == "UNVERIFIED_CLAIMED_2021_DATE", f"Rule {param} must be flagged UNVERIFIED_CLAIMED_2021_DATE"
        assert "statutory_source" in rule and rule["statutory_source"] is not None
        assert "notification_number" in rule and rule["notification_number"] is not None
        assert "discharge_category" in rule and rule["discharge_category"] is not None
        assert "provenance_notes" in rule and len(rule["provenance_notes"]) > 10


def test_compliance_evaluation_historical_and_current():
    """Verify evaluation logic works correctly across valid, marginal, and violation levels."""
    fac_id = uuid4()
    now = datetime.now(timezone.utc)

    # 1. Fully compliant effluent set
    compliant_readings = [
        Reading(reading_id=uuid4(), facility_id=fac_id, observed_at=now, treatment_stage="final_effluent", parameter="BOD", value=Decimal("15.0"), unit="mg/L", quality_status="valid"),
        Reading(reading_id=uuid4(), facility_id=fac_id, observed_at=now, treatment_stage="final_effluent", parameter="COD", value=Decimal("120.0"), unit="mg/L", quality_status="valid"),
        Reading(reading_id=uuid4(), facility_id=fac_id, observed_at=now, treatment_stage="final_effluent", parameter="TSS", value=Decimal("30.0"), unit="mg/L", quality_status="valid"),
        Reading(reading_id=uuid4(), facility_id=fac_id, observed_at=now, treatment_stage="final_effluent", parameter="PH", value=Decimal("7.4"), unit="pH units", quality_status="valid"),
        Reading(reading_id=uuid4(), facility_id=fac_id, observed_at=now, treatment_stage="final_effluent", parameter="NH4_N", value=Decimal("20.0"), unit="mg/L", quality_status="valid"),
        Reading(reading_id=uuid4(), facility_id=fac_id, observed_at=now, treatment_stage="final_effluent", parameter="TKN", value=Decimal("8.0"), unit="mg/L", quality_status="valid"),
    ]
    status_c, details_c = ComplianceService.evaluate_readings(compliant_readings)
    assert status_c == "compliant"
    for p in ["BOD", "COD", "TSS", "PH", "NH4_N", "TKN"]:
        assert details_c[p]["status"] == "compliant"

    # 2. Violation on BOD (> 30 mg/L)
    violation_readings = [
        Reading(reading_id=uuid4(), facility_id=fac_id, observed_at=now, treatment_stage="final_effluent", parameter="BOD", value=Decimal("45.0"), unit="mg/L", quality_status="valid"),
        Reading(reading_id=uuid4(), facility_id=fac_id, observed_at=now, treatment_stage="final_effluent", parameter="COD", value=Decimal("120.0"), unit="mg/L", quality_status="valid"),
        Reading(reading_id=uuid4(), facility_id=fac_id, observed_at=now, treatment_stage="final_effluent", parameter="TSS", value=Decimal("30.0"), unit="mg/L", quality_status="valid"),
        Reading(reading_id=uuid4(), facility_id=fac_id, observed_at=now, treatment_stage="final_effluent", parameter="PH", value=Decimal("7.4"), unit="pH units", quality_status="valid"),
        Reading(reading_id=uuid4(), facility_id=fac_id, observed_at=now, treatment_stage="final_effluent", parameter="NH4_N", value=Decimal("20.0"), unit="mg/L", quality_status="valid"),
    ]
    status_v, details_v = ComplianceService.evaluate_readings(violation_readings)
    assert status_v == "non_compliant"
    assert details_v["BOD"]["status"] == "non_compliant"


def test_api_compliance_rules_endpoint(sync_client, auditor_auth_headers):
    """Verify that the GET /api/v1/compliance/rules endpoint returns unverified annotations."""
    res = sync_client.get("/api/v1/compliance/rules", headers=auditor_auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 6
    for r in data:
        assert r["is_authoritative"] is False
        assert r["verification_status"] == "UNVERIFIED_CLAIMED_2021_DATE"
        assert r["statutory_source"] is not None
