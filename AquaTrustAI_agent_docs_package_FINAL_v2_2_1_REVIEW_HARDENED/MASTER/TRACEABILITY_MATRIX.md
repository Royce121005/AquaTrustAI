# AquaTrust AI — Objective-to-Evidence Traceability Matrix

**Status:** AUTHORITATIVE — v2.2.1 research traceability freeze

The matrix is the backbone for proving that implementation work maps to the final objectives.

| Objective | Requirement | Architecture | Phase | Primary DB/API | Test/evidence |
|---|---|---|---|---|---|
| O1 | Multi-facility simulation | STP simulator | P03 | experiment_runs / ingestion API | workload generation tests |
| O2 | Detect invalid/missing/inconsistent/anomalous data before anchoring | validation + AI | P05–P06 | validation_results/anomaly_results | validation + anomaly tests |
| O3 | Isolation Forest for six parameters | AI service | P06 | anomaly_results | model artifact + evaluation |
| O4 | Configurable QA/compliance | compliance engine | P07 | compliance_rules/results | rule boundary tests |
| O5 | Signed/hash treatment records | record + crypto services | P08–P09 | records/certificates/crypto | canonical/hash/signature tests |
| O6 | Permissioned DLT | Fabric anchor service | P10 | dlt_anchors | Fabric integration evidence |
| O7 | Append-only correction | correction service | P11 | corrections + superseding records | lineage/tamper tests |
| O8 | Standardized heterogeneous interface | FastAPI canonical contract | P04 | readings | API contract tests |
| O9 | Architecture comparison | experiment adapters | P14 | experiment_runs | controlled comparison report |
| O10 | Operator/auditor/regulator dashboard | React + API | P12–P13 | API DTOs | E2E + RBAC evidence |
| O11 | Integrity/latency/throughput/storage/verification/computation/scalability | benchmark harness | P14–P15 | experiment_metrics | benchmark artifacts |

## 1. Evidence rule

For every row, final evidence must identify the actual implementation artifact and test result. Planned work is not evidence.

## 2. Traceability chain

```text
Objective
→ Requirement
→ Architecture component
→ Phase
→ DB/API/UI artifact
→ Test
→ Evidence
```

## 3. Gap handling

If an objective has no executable test or evidence artifact, it remains incomplete regardless of UI appearance.

## 4. Update rule

Changes to objectives, requirements, interfaces, tests or evidence mappings require `CHANGE_CONTROL.md` review.
