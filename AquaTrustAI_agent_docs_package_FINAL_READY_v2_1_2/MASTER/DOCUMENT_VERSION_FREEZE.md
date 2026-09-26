**Contract release: 2.1.1**

# AquaTrust AI — Documentation Version Freeze

**Package:** Agent Documentation Package v2.1.2
**Master specification:** v2.1.2 controlled release
**Purpose:** Prevent agents from treating old phase text or ad-hoc decisions as authoritative.

## Authority order

1. `MASTER/MASTER_PROJECT_SPECIFICATION.md` — overall functional/architectural baseline.
2. New v2.1.2 `MASTER/*SPECIFICATION.md`, `*_MATRIX.md`, `*_PROTOCOL.md`, `DATABASE_SCHEMA.md`, `API_ENDPOINT_REGISTRY.md`, `ARCHITECTURE_INTERFACE_MAP.md`, `CHANGE_CONTROL.md` — exact engineering contracts.
3. Existing `MASTER/ARCHITECTURE_FREEZE.md`, `DATA_CONTRACTS.md`, `API_CONTRACT.md`, `INTEGRATION_RULES.md`, `SECURITY_RULES.md`, `CODING_RULES.md`, `DEPENDENCY_GRAPH.md`, `DEFINITION_OF_DONE.md`, `AGENT_EXECUTION_PROTOCOL.md`.
4. Phase files — execution scope only; they cannot override master contracts.
5. Completion reports — evidence only; they cannot redefine requirements.
6. Templates — formatting/instructions only.

## Package rule

When documents conflict, the agent must stop and report the conflict rather than choosing silently.

## Phase packet rule

Every coding agent receives:
- the assigned phase document;
- all master documents explicitly listed by that phase;
- the previous phase completion report;
- the repository state/commit SHA being audited.

## Completion rule

A phase is not complete because code exists. It is complete only when the phase's scope, tests, integration gate, self-audit and completion report are satisfied.


### Added v2.1.2 authoritative contract
- `VALIDATION_SPECIFICATION.md` — deterministic pre-AI data-trust validation rules, versioning and change-control requirements.
