# AquaTrust AI — Cryptography Specification

**Status:** AUTHORITATIVE — v2.2.1 engineering freeze

## 1. Security purpose

Cryptography protects integrity and authenticity of finalized treatment evidence. It does not establish that a physical sensor was truthful.

## 2. Protected representation

The cryptographic input is the canonicalized **finalized treatment-record evidence snapshot**. The following are not included unless explicitly frozen into the snapshot schema:
- database-generated mutable timestamps added after finalization;
- DLT transaction IDs generated later;
- mutable anchor status;
- UI formatting;
- database row ordering.

## 3. Canonicalization

Canonicalization version: `atc-v1`.

Rules:
1. Use UTF-8 encoding.
2. Serialize an object with lexicographically sorted keys at every object level.
3. Preserve arrays in semantic order defined by the schema; do not sort arrays unless the schema explicitly declares them unordered. `source_dataset_ids[]` is set-like lineage metadata and MUST be lexicographically sorted before canonicalization; other provenance arrays must follow their schema-defined order.
4. Represent timestamps as ISO 8601 UTC with `Z`.
5. Represent decimal measurements as canonical decimal strings without scientific notation, preserving the declared precision from the data contract.
6. Omit fields only when the canonical schema marks them excluded; never omit opportunistically.
7. Use JSON with no insignificant whitespace.
8. No trailing newline is included in the canonical byte sequence.
9. The canonical schema/version is itself included in the canonical payload.

A reference canonicalization test vector must be committed in Phase 09 and used by Python and any verification client.

## 4. Hashing

Algorithm: SHA-256.

Output: lowercase hexadecimal, exactly 64 characters.

```text
canonical_bytes
    ↓
SHA-256
    ↓
64-char lowercase hex digest
```

## 5. Digital signature

Primary application signature algorithm: **ECDSA using NIST P-256 with SHA-256 (`ES256`)**.

Signature encoding must be frozen in the implementation test vectors and must not vary between services. The recommended interchange representation is base64url-encoded signature bytes with explicit algorithm metadata.

Key metadata:
- `key_id`
- `algorithm`
- `curve`
- `created_at`
- `status`

Private keys never enter the frontend or database plaintext fields.

## 6. Signature input

The baseline implementation signs the canonicalized record bytes using ECDSA P-256 with SHA-256. The signature is encoded as IEEE P1363 raw `r || s` (64 bytes) and transported as unpadded base64url. The ECDSA nonce generation must use RFC 6979 deterministic nonce generation where supported by the selected implementation, so identical key + canonical payload inputs produce reproducible signature bytes. DER encoding is prohibited for the canonical certificate artifact. The SHA-256 digest is stored separately for direct integrity comparison. Verification must use the same canonical bytes, algorithm and signature encoding. The verifier must resolve `key_id` through the trusted public signing-key registry before accepting the signature.

## 7. Public verification-key registry

Every signing identity used for a finalized certificate must have a corresponding public-key registry entry containing:

- `key_id`
- algorithm
- curve
- public key
- fingerprint
- status
- creation/revocation metadata

The registry is readable by independent verifiers through the verification-key API. Private keys are never stored in the registry, PostgreSQL, frontend or repository.

## 8. Key management

Development:
- keys stored outside source control;
- documented local secret path/environment injection;
- deterministic test keys permitted only in test fixtures.

Deployment:
- use a secret-management mechanism where available;
- key rotation creates a new `key_id` and does not invalidate historical signatures;
- historical certificates retain the key identifier needed for verification.

## 9. Verification sequence

```text
retrieve finalized record
→ reconstruct canonical payload
→ recompute SHA-256
→ compare stored hash
→ verify ECDSA signature
→ retrieve DLT anchor
→ compare anchored hash
→ return structured evidence
```

## 10. Tamper tests

Mandatory tests:
- change one measurement value → hash mismatch;
- change one metadata field covered by canonicalization → hash mismatch;
- change signature bytes → signature failure;
- change DLT anchor hash in a test fixture → anchor mismatch;
- reorder JSON keys → verification remains successful because canonicalization sorts keys;
- change array order where order is semantic → hash mismatch.

## 11. Immutable evidence rule

After finalization, cryptographic artifacts are append-only. A correction produces a new record/certificate/hash/signature and links to the original record.
