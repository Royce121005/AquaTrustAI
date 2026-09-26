# Validation Specification

**Document Version:** v2.1.2  
**Authority:** Master engineering contract  
**Status:** Frozen for implementation

## Purpose

This document defines the deterministic pre-AI data-trust validation layer. Agents MUST implement these checks as specified and MUST NOT invent alternative thresholds or formulas.

## Required validation dimensions

Every standardized treatment reading is evaluated for:

1. range validity
2. missingness
3. duplicate detection
4. sudden-change detection
5. cross-parameter consistency

## Deterministic rules

### Range validity

A value is `invalid` when it is non-numeric, non-finite, or outside the parameter's configured physical/engineering bounds.

Parameter bounds MUST be stored in the versioned validation configuration. If a required bound is not present in the approved configuration, implementation MUST STOP rather than invent a bound.

### Missingness

A required reading is `invalid` when the expected observation is absent according to the facility/parameter sampling contract.

Missingness MUST be distinguishable from a sensor-reported value of zero.

### Duplicate detection

A duplicate is identified by the canonical uniqueness key defined by the data contract: facility, sensor/parameter identity, and observation timestamp (plus any explicitly required source identity).

Duplicate observations MUST NOT silently overwrite an existing observation.

### Sudden-change detection

Sudden-change detection compares the current value with the immediately preceding valid observation for the same facility/parameter according to the approved validation configuration.

The configured absolute/relative change threshold MUST be versioned. If no approved threshold exists for a parameter, the agent MUST report a blocker instead of choosing one.

### Cross-parameter consistency

Consistency rules compare parameters only where an approved domain rule exists. A missing rule MUST NOT be replaced by an agent-created heuristic.

Each consistency violation records:
- rule identifier/version
- affected parameters
- observed values
- evaluation result
- timestamp
- validation status

## Validation result contract

Validation produces a deterministic result containing:
- validation status
- validation rule/version identifiers
- failed-check identifiers
- normalized reason codes
- processing timestamp/version

Validation MUST NOT delete the raw source record. Invalid data remains traceable and is excluded from downstream finalization according to the finalization policy.

## Research reproducibility

All threshold configuration versions, rule versions and validation results MUST be persisted as evidence metadata sufficient to reproduce the decision.

## Change control

Changing a threshold, formula, uniqueness key, consistency rule or status meaning after implementation begins requires the formal change-control process in `MASTER/CHANGE_CONTROL.md`.
