# AquaTrust AI — Integration Rules

## Rule 1 — One source of truth

Business rules belong in backend/domain services, not duplicated in React.

## Rule 2 — No silent contract changes

If a schema, API, event or database contract changes, update the corresponding master contract and all consumers.

## Rule 3 — Preserve backward behavior

Before changing an existing feature, identify its callers and regression-test them.

## Rule 4 — No mock-to-production leakage

Mocks may be used in tests only. Production paths must not silently return fabricated AI, compliance, hash or DLT results.

## Rule 5 — No fabricated evidence

Never invent:
- transaction IDs
- certificate IDs presented as real
- hashes
- signatures
- compliance results
- sensor readings

## Rule 6 — One responsibility per layer

- React: presentation and user interaction.
- FastAPI: transport/API boundary.
- Domain services: business rules.
- AI service: model inference/training lifecycle.
- PostgreSQL: detailed persistent evidence.
- Crypto service: canonicalization, hashing, signing and verification.
- Fabric: permissioned ledger anchoring.
- Experiment layer: controlled measurements, not production business logic.

## Rule 7 — Append-only evidence

Finalized records and their correction lineage must never be destroyed by ordinary application operations.

## Rule 8 — Migration safety

Every database migration must be reversible or have a documented recovery strategy and must be tested against a representative database.

## Rule 9 — Determinism

Preprocessing, canonicalization, validation and benchmark procedures must be deterministic where deterministic behavior is required.

## Rule 10 — Observability

Critical workflows must produce structured logs and traceable request/correlation identifiers.

## Rule 11 — Integration gate

A phase is not complete merely because its local unit tests pass. It must pass:
- previous-phase compatibility;
- end-to-end integration for its scope;
- regression tests.

## Rule 12 — No premature optimization

Do not optimize based on assumptions. Measure first, then optimize while preserving correctness.

## Rule 13 — No architecture drift

Do not introduce a competing backend, DLT, ML pipeline or data model without approved architecture change.

## Rule 14 — Test data isolation

Synthetic/benchmark data must be distinguishable from real operational data.

## Rule 15 — Auditability

Every mutation of consequential evidence must be attributable to an actor/system identity and timestamp.
