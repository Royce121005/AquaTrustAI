# AquaTrust AI — Agent Execution Protocol

## Mission

Implement exactly one assigned phase of AquaTrust AI while preserving the master architecture and all previously frozen functionality.

## Mandatory reading order

1. `MASTER/MASTER_PROJECT_SPECIFICATION.md`
2. `MASTER/ARCHITECTURE_FREEZE.md`
3. `MASTER/DATA_CONTRACTS.md`
4. `MASTER/API_CONTRACT.md`
5. `MASTER/INTEGRATION_RULES.md`
6. `MASTER/SECURITY_RULES.md`
7. `MASTER/CODING_RULES.md`
8. `MASTER/DEPENDENCY_GRAPH.md`
9. `MASTER/DEFINITION_OF_DONE.md`
10. Assigned `PHASES/PHASE_XX_*.md`
11. Previous phase completion report, if applicable

## Required execution sequence

```text
READ
 ↓
AUDIT CURRENT STATE
 ↓
IDENTIFY DEPENDENCIES
 ↓
IMPLEMENT ONLY ASSIGNED SCOPE
 ↓
RUN UNIT TESTS
 ↓
RUN INTEGRATION TESTS
 ↓
RUN REGRESSION TESTS
 ↓
SELF-AUDIT AGAINST PHASE EXIT CRITERIA
 ↓
GENERATE COMPLETION REPORT
 ↓
STOP
```

## Prohibited

Do not:
- implement future phases;
- redesign the architecture;
- silently change contracts;
- introduce unapproved technologies;
- leave fake production behavior;
- fabricate hashes, signatures, certificates or DLT transaction IDs;
- disable tests;
- delete evidence to make tests pass.

## If a blocker is discovered

Stop at the boundary of the assigned phase and document:
- blocker;
- evidence;
- affected contract;
- proposed options;
- downstream impact.

Do not silently work around an architectural blocker.

## Completion

The agent must leave the repository in a runnable state and produce the phase completion report.

## Contract-reading rule

Before implementation, the agent must read every authoritative contract named by the assigned phase, including `DATABASE_SCHEMA.md`, `API_ENDPOINT_REGISTRY.md`, `DATA_PROVENANCE_SPECIFICATION.md`, `CRYPTOGRAPHY_SPECIFICATION.md`, `ML_SPECIFICATION.md`, `COMPLIANCE_RULE_SPECIFICATION.md`, `FINALIZATION_POLICY.md`, `FABRIC_ARCHITECTURE.md`, `RBAC_PERMISSION_MATRIX.md`, and `EXPERIMENT_PROTOCOL.md` when applicable. The phase document cannot waive a required contract.
Before implementation, the agent must read every MASTER contract explicitly listed by the assigned phase, plus `DOCUMENT_VERSION_FREEZE.md` and `CHANGE_CONTROL.md`. The agent must treat those contracts as frozen requirements, not suggestions.


### Added v2.1.2 authoritative contract
- `VALIDATION_SPECIFICATION.md` — deterministic pre-AI data-trust validation rules, versioning and change-control requirements.
