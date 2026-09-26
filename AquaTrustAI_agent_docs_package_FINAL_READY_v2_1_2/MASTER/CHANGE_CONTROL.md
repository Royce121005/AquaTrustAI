# AquaTrust AI — Change Control and Contract Governance

**Status:** AUTHORITATIVE — v2.1.2 governance freeze

This document prevents agents from silently changing frozen requirements or interfaces.

## 1. Changes requiring control

Change control is mandatory for:
- architecture decisions;
- database field semantics/types/relationships;
- API paths/request/response/error contracts;
- role/permission semantics;
- compliance rule semantics;
- ML feature/model/version behavior;
- canonicalization/hash/signature rules;
- Fabric topology/chaincode/endorsement behavior;
- experiment methodology or metric definitions;
- finalization/correction state machines.

Purely local refactors that preserve all contracts do not require architectural approval, but must still pass regression tests.

## 2. Procedure

```text
PROPOSE CHANGE
→ identify reason
→ identify affected master contracts
→ impact analysis
→ identify affected phases/consumers/tests
→ decide backward compatibility
→ obtain human approval
→ update authoritative docs
→ update dependent phase files
→ implement
→ run impacted tests
→ record completion evidence
```

## 3. No silent interpretation

If an agent finds an ambiguity:
- do not invent a new architecture;
- do not change a frozen contract silently;
- use the strongest existing authoritative rule;
- if still unresolved, stop and report the ambiguity for human decision.

## 4. Versioning

Master specification versions increase when an authoritative semantic change occurs. Phase documents should record the master revision used for implementation.

## 5. Compatibility

For API/data contracts, classify changes as:
- `non_breaking_additive`;
- `breaking`;
- `migration_required`;
- `research_methodology_change`.

Breaking or methodology changes require explicit approval.

## 6. Required change record

Each approved change must record:
- change ID;
- date;
- requester;
- rationale;
- affected documents;
- affected phases;
- migration impact;
- test impact;
- approval status;
- implementation commit SHA.

## 7. Agent stop condition

An agent must stop rather than proceed when implementation requires a frozen-contract change that has not been approved.
