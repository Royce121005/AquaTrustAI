# AquaTrust AI — Security and Integrity Rules

## Identity and access
- Enforce server-side authorization.
- Never rely on hidden frontend controls as security.
- Use least privilege.
- Separate operator, auditor and regulatory stakeholder capabilities.
- Protect administrative functions separately.

## Secrets
- Never commit private keys, passwords, API secrets or Fabric credentials.
- Use environment/secret management.
- Do not print secrets in logs.

## Cryptography
- Use established cryptographic libraries.
- SHA-256 is the authoritative record digest.
- Signing keys must be protected.
- Verification must not trust the submitted hash without recomputation.
- Never treat a hash as a signature.

## DLT
- Never fabricate a transaction ID.
- DLT submission failure must be represented as failure/pending, not success.
- Preserve the off-chain record even if anchoring is temporarily unavailable.
- Reconciliation must detect mismatches.

## Database
- Use parameterized queries/ORM mechanisms.
- Validate all externally supplied identifiers.
- Protect immutable evidence from unauthorized update/delete.
- Record audit events for consequential operations.

## Attachments and external inputs
- Validate type, size and content as applicable.
- Do not trust user-supplied filenames or URLs.
- Store provenance for imported datasets.

## Logging
Logs must not expose:
- passwords
- private keys
- access tokens
- sensitive secrets

Logs should support:
- request tracing
- actor identification
- operation identification
- failure diagnosis

## Security testing
Each relevant phase must add negative tests for unauthorized, malformed and tampered requests.
