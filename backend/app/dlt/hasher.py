"""
AquaTrust AI — Cryptographic SHA-256 Hashing Engine
Conforms to CRYPTOGRAPHY_SPECIFICATION.md v2.2.1 Section 4
"""

import hashlib
import re

SHA256_HEX_REGEX = re.compile(r"^[a-f0-9]{64}$")


def compute_canonical_hash(payload_bytes: bytes) -> str:
    """
    Computes SHA-256 hash of canonical UTF-8 bytes.
    Returns exactly 64 lowercase hexadecimal characters.
    """
    if not isinstance(payload_bytes, bytes):
        raise TypeError("payload_bytes must be of type bytes")

    digest = hashlib.sha256(payload_bytes).hexdigest().lower()

    if not SHA256_HEX_REGEX.match(digest):
        raise ValueError(f"Computed digest '{digest}' failed 64-character lowercase hex format validation")

    return digest


def compute_sha256_hex(payload: str | bytes) -> str:
    """Computes SHA-256 hex string from string or bytes."""
    if isinstance(payload, str):
        payload = payload.encode("utf-8")
    return compute_canonical_hash(payload)


def validate_canonical_hash(hash_str: str) -> bool:
    """Validates that a string is a well-formed 64-character lowercase hex SHA-256 digest."""
    return bool(hash_str and isinstance(hash_str, str) and SHA256_HEX_REGEX.match(hash_str))
