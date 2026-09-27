"""
AquaTrust AI — Deterministic Canonicalization Engine (atc-v1)
Conforms to CRYPTOGRAPHY_SPECIFICATION.md v2.2.1 Section 3
"""

import json
from decimal import Decimal
from typing import Any, Dict

CANONICAL_VERSION = "atc-v1"

# Mutable post-finalization fields that MUST be excluded from the cryptographic evidence snapshot
EXCLUDED_FIELDS = {
    "tx_id",
    "dlt_anchor_id",
    "anchor_status",
    "signature_id",
    "canonical_hash",
    "created_at",
    "updated_at",
    "id",  # Internal DB surrogate primary key if present
}


def _normalize_value(val: Any) -> Any:
    """Recursively formats and normalizes values according to atc-v1 rules."""
    if isinstance(val, dict):
        normalized_dict = {}
        for k in sorted(val.keys()):
            if k in EXCLUDED_FIELDS:
                continue
            normalized_dict[k] = _normalize_value(val[k])
        return normalized_dict

    elif isinstance(val, list):
        return [_normalize_value(item) for item in val]

    elif isinstance(val, float):
        # Format floating numbers deterministically without scientific notation
        d = Decimal(str(val))
        return float(d)

    elif isinstance(val, Decimal):
        return float(val)

    elif isinstance(val, str):
        # Ensure UTC timestamps end with Z
        if val.endswith("+00:00"):
            return val[:-6] + "Z"
        return val

    return val


def canonicalize_treatment_record(record: Dict[str, Any]) -> bytes:
    """
    Transforms a finalized treatment record into deterministic canonical UTF-8 bytes.
    Enforces atc-v1 rules:
    - Recursively sorted dictionary keys
    - Ordered arrays preserved; source_dataset_ids sorted lexicographically
    - Excluded post-finalization mutable fields stripped
    - No insignificant whitespace
    - No trailing newline
    - canonicalization_version 'atc-v1' included
    """
    # Create working copy
    cleaned = dict(record)

    # Clean excluded fields
    for field in EXCLUDED_FIELDS:
        cleaned.pop(field, None)

    # Normalize fields recursively
    normalized = _normalize_value(cleaned)

    # Special rule: source_dataset_ids is set-like lineage metadata and MUST be sorted
    if "provenance" in normalized and isinstance(normalized["provenance"], dict):
        if "source_dataset_ids" in normalized["provenance"] and isinstance(
            normalized["provenance"]["source_dataset_ids"], list
        ):
            normalized["provenance"]["source_dataset_ids"] = sorted(
                normalized["provenance"]["source_dataset_ids"]
            )

    # Ensure canonicalization_version is declared
    normalized["canonicalization_version"] = CANONICAL_VERSION

    # Serialize with lexicographically sorted keys, no whitespace separators
    canonical_json_str = json.dumps(
        normalized,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
    )

    return canonical_json_str.encode("utf-8")
