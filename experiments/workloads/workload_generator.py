"""
AquaTrust AI — Workload Generator for Architecture Benchmarks
Conforms to EXPERIMENT_PROTOCOL.md v2.2.1 Section 3
Generates reproducible, deterministic workloads across 8, 50, 100, and 500 STPs.
"""

import random
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List


def generate_stp_workload(stp_count: int, seed: int = 42) -> List[Dict[str, Any]]:
    """
    Generates an identical deterministic workload batch of finalized treatment records
    for the specified number of STPs.
    """
    rng = random.Random(seed)
    base_time = datetime(2026, 9, 27, 0, 0, 0, tzinfo=timezone.utc)
    records = []

    for i in range(1, stp_count + 1):
        facility_id = f"STP-{i:03d}"
        record_id = f"rec_{facility_id.lower()}_20260927_001"
        period_start = (base_time - timedelta(hours=6)).isoformat()
        period_end = base_time.isoformat()
        finalized_at = (base_time + timedelta(minutes=5)).isoformat()

        # Generate realistic water quality metrics with natural variability
        bod_val = round(rng.uniform(14.0, 24.0), 2)
        cod_val = round(rng.uniform(60.0, 120.0), 2)
        ph_val = round(rng.uniform(6.8, 8.2), 2)
        tss_val = round(rng.uniform(18.0, 32.0), 2)

        # CPCB Standard Thresholds: BOD <= 20, COD <= 250, pH: 6.5-9.0, TSS <= 30
        bod_pass = bod_val <= 20.0
        cod_pass = cod_val <= 250.0
        ph_pass = 6.5 <= ph_val <= 9.0
        tss_pass = tss_val <= 30.0

        is_compliant = bod_pass and cod_pass and ph_pass and tss_pass
        compliance_status = "COMPLIANT" if is_compliant else "NON_COMPLIANT"

        record = {
            "record_id": record_id,
            "facility_id": facility_id,
            "period_start": period_start,
            "period_end": period_end,
            "record_version": 1,
            "record_state": "finalized",
            "quality_status": "VALID",
            "anomaly_status": "NORMAL" if rng.random() > 0.05 else "ANOMALOUS",
            "compliance_status": compliance_status,
            "provenance": {
                "source_dataset_ids": ["DATASET_04_CPCB_UP_STP", "uci_etp_v1"],
                "model_version": "isolation_forest_v1.0.0",
                "rule_version": "CPCB_STP_2023_v1",
            },
            "evidence_snapshot": {
                "parameters": [
                    {
                        "parameter": "BOD",
                        "value": bod_val,
                        "unit": "mg/L",
                        "threshold_max": 20.0,
                        "compliance": "PASS" if bod_pass else "VIOLATION",
                    },
                    {
                        "parameter": "COD",
                        "value": cod_val,
                        "unit": "mg/L",
                        "threshold_max": 250.0,
                        "compliance": "PASS" if cod_pass else "VIOLATION",
                    },
                    {
                        "parameter": "pH",
                        "value": ph_val,
                        "unit": "pH",
                        "threshold_min": 6.5,
                        "threshold_max": 9.0,
                        "compliance": "PASS" if ph_pass else "VIOLATION",
                    },
                    {
                        "parameter": "TSS",
                        "value": tss_val,
                        "unit": "mg/L",
                        "threshold_max": 30.0,
                        "compliance": "PASS" if tss_pass else "VIOLATION",
                    },
                ]
            },
            "finalized_at": finalized_at,
        }
        records.append(record)

    return records
