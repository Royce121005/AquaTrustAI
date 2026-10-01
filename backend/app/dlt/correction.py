"""
AquaTrust AI — Append-Only Correction & Lineage Engine
Conforms to PHASE_11_VERIFICATION_CORRECTIONS.md & DATABASE_SCHEMA.md
"""

import copy
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Tuple

from .canonicalizer import canonicalize_treatment_record
from .hasher import compute_canonical_hash


def create_corrected_record_bundle(
    original_record: Dict[str, Any],
    proposed_modifications: Dict[str, Any],
    reason: str,
    requested_by: str,
    authorized_by: str,
) -> Tuple[Dict[str, Any], Dict[str, Any], Dict[str, Any]]:
    """
    Creates an append-only corrected record preserving original record immutability.
    
    Returns:
    - corrected_record: New finalized record with incremented version and supersedes link.
    - correction_record: Database audit record tracking requester, authorizer, and reason.
    - dlt_correction_link_payload: Smart contract payload for RecordCorrectionLink.
    """
    if not reason or not reason.strip():
        raise ValueError("A valid non-empty reason must be provided for recording a correction.")
    if not original_record or "record_id" not in original_record:
        raise ValueError("original_record must be a valid finalized record with record_id.")

    original_id = original_record["record_id"]
    current_version = original_record.get("record_version", 1)
    new_version = current_version + 1

    # Generate new record IDs
    corrected_id = str(uuid.uuid4())
    correction_id = str(uuid.uuid4())
    now_iso = datetime.now(timezone.utc).isoformat()

    # Create new record copy
    corrected_record = copy.deepcopy(original_record)
    corrected_record["record_id"] = corrected_id
    corrected_record["record_version"] = new_version
    corrected_record["supersedes_record_id"] = original_id
    corrected_record["finalized_at"] = now_iso

    # Apply proposed modifications
    for k, v in proposed_modifications.items():
        if k in corrected_record:
            if isinstance(corrected_record[k], dict) and isinstance(v, dict):
                corrected_record[k].update(v)
            else:
                corrected_record[k] = v
        else:
            corrected_record[k] = v

    # Compute new canonical hash
    canonical_bytes = canonicalize_treatment_record(corrected_record)
    new_canonical_hash = compute_canonical_hash(canonical_bytes)
    corrected_record["canonical_hash"] = new_canonical_hash

    # Database correction audit entity
    correction_record = {
        "correction_id": correction_id,
        "original_record_id": original_id,
        "corrected_record_id": corrected_id,
        "requested_by": requested_by,
        "authorized_by": authorized_by,
        "reason": reason,
        "proposed_changes": proposed_modifications,
        "status": "APPLIED",
        "new_canonical_hash": new_canonical_hash,
        "created_at": now_iso,
        "completed_at": now_iso,
    }

    # Fabric Chaincode RecordCorrectionLink invocation payload
    dlt_correction_link_payload = {
        "original_record_id": original_id,
        "corrected_record_id": corrected_id,
        "reason": reason,
        "timestamp": now_iso,
    }

    return corrected_record, correction_record, dlt_correction_link_payload
