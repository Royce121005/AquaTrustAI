# AquaTrust AI — Frontend to API Mapping

**Status:** AUTHORITATIVE — v2.1.2 integration freeze

The existing React/Vite frontend is an integration target. Preserve useful UI structure and visual language while replacing provisional/mock data for core research workflows.

## 1. Mapping principles

- API response DTOs are authoritative.
- Frontend state mirrors server state; it does not recalculate compliance, anomaly scores, hashes or signatures.
- Loading, empty, error, unauthorized and stale states must be represented.
- Any mock service used during development must be explicitly labeled and must not remain in a final research workflow.

## 2. Required page mappings

| UI capability | Backend source | Required data |
|---|---|---|
| Dashboard KPIs | `GET /facilities`, readings/record aggregation | facility count, reading health, anomaly/compliance summaries |
| Facility monitoring | `GET /facilities/{id}/readings` | time series + quality status |
| Validation view | `GET /validation/readings/{id}` | validation flags/version/time |
| AI insights | `GET /anomalies/readings/{id}` + aggregate queries | anomaly status/score/model version |
| Compliance view | `GET /compliance/rules` + record results | rule version + parameter results |
| Treatment records | `GET /treatment-records` | record state/status/time |
| Certificate detail | `GET /certificates/{id}` | certificate + hash/signature metadata |
| Verification | `POST /verification/records/{id}` | hash/signature/DLT verification evidence |
| Corrections | `/corrections*` | request/authorization/new record lineage |
| Audit history | `GET /audit-events` | actor/action/resource/outcome/time |
| DLT status | `GET /dlt/anchors/{record_id}` | anchor state/transaction reference |
| Experiments | `/experiments*` | run status and metrics |

## 3. UI authority rules

The frontend may display:
- derived KPI summaries from API responses;
- chart transformations for presentation;
- local filters/sorting;
- user-entered correction reasons.

The frontend may not authoritatively calculate:
- compliance;
- anomaly classification;
- final record state;
- canonical hash;
- signature;
- DLT transaction ID.

## 4. Integration acceptance

For each mapped screen:
1. identify its current mock/provisional source;
2. map it to the registry endpoint;
3. create API client types;
4. implement loading/error/empty states;
5. test role visibility;
6. remove or isolate the mock source;
7. perform end-to-end verification with real persisted data.

## 5. Existing frontend preservation rule

Do not redesign the entire dashboard merely to integrate APIs. UI changes are allowed when necessary for truthful states, permissions, verification evidence, correction lineage or usability.
