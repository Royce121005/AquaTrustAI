# AquaTrust AI — RBAC Permission Matrix

**Status:** AUTHORITATIVE — v2.1.2 security freeze


## Cross-Contract Authorization Rule

This matrix is authoritative for human-role authorization. `service_identity` is an infrastructure identity and MUST NOT be presented as an interactive end-user role.

Research execution, benchmark execution and automated DLT reconciliation may use designated service identities where specified by the endpoint contract. Human access to those capabilities MUST follow the explicit resource/action permissions in this matrix.

`API_ENDPOINT_REGISTRY.md` MUST map endpoint authorization to these roles/identities without introducing an `admin` or `research` end-user role unless a formal change-control decision adds one.


## 1. Required research roles

- `operator`
- `auditor`
- `regulatory_stakeholder`

An infrastructure `admin` role may exist for system administration but must not automatically inherit stakeholder access in application logic.

## 2. Permission matrix

| Capability | Operator | Auditor | Regulatory stakeholder |
|---|---:|---:|---:|
| View own/scoped facility data | Yes | Yes | Yes |
| View readings | Yes | Yes | Yes |
| View validation results | Yes | Yes | Yes |
| View anomaly results | Yes | Yes | Yes |
| View compliance | Yes | Yes | Yes |
| View finalized records | Yes | Yes | Yes |
| View certificates | Yes | Yes | Yes |
| Verify certificate/record | Yes, scoped | Yes | Yes |
| View DLT anchor | Yes, scoped | Yes | Yes |
| Request correction | Yes | Policy-controlled | Policy-controlled |
| Authorize correction | No | Designated authority | Designated authority |
| Execute corrected record | No direct DB write | No direct DB write | No direct DB write |
| View audit history | Own/scoped actions | Yes | Yes |
| Manage compliance rules | No | No by default | No by default |
| Manage users/roles | No | No | No |
| Run architecture experiments | No | No | No |
| Reconcile DLT anchor | No | No | No |

## 3. Resource scoping

Authorization must enforce facility/resource scope in the backend. A user who can access Facility A must not obtain Facility B by changing a URL parameter.

## 4. Correction authorization

The exact approving role must be recorded in the application policy. The correction requester must not silently self-authorize a consequential correction unless an explicitly approved policy permits it.

## 5. Service identities

Internal service identities may have technical permissions required to execute pipeline steps, but they are not end-user roles and must be separately authenticated/audited.

## 6. Enforcement

Every protected endpoint must evaluate:
```text
authenticated principal
→ role
→ permission
→ resource scope
→ action
→ state constraint
```

Frontend hiding is not authorization.

## 7. Audit requirements

Log consequential:
- authentication/authorization outcomes;
- finalization;
- correction request/approval/execution;
- compliance rule changes;
- DLT anchor submission/reconciliation;
- verification events;
- role changes.

## 8. Negative tests

Every role must have explicit denial tests for actions it cannot perform. Do not rely only on positive tests.

## Frozen action mapping
| Action | Operator | Auditor | Regulatory Stakeholder |
|---|---|---|---|
| Ingest readings | YES, own facility | NO | NO |
| Read readings | YES, own facility | YES, authorized scope | YES, authorized scope |
| View validation | YES, own facility | YES | YES |
| View anomaly results | YES, own facility | YES | YES |
| Evaluate compliance | service action; read result | YES | YES |
| Finalize treatment record | YES, own facility if finalization gate passes | NO | NO |
| Verify certificate | YES | YES | YES |
| Request correction | YES, authorized record scope | YES | YES |
| Authorize correction | NO | YES, when designated correction authority | YES, when designated correction authority |
| Reconcile DLT anchor | NO | YES | YES |
| Run architecture experiments | NO | NO | NO; research execution identity only |

`research execution identity` is an infrastructure/service identity and is not an end-user role. Correction authority must be assigned by configuration to an auditor or regulatory stakeholder; an operator may request but never authorize their own correction.
