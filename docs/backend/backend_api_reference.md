# AquaTrust AI — Backend API Reference & Technical Specification

## Overview
The AquaTrust AI Backend provides an immutable, cryptographically verifiable, ML-driven telemetry and compliance verification platform for wastewater treatment facilities (STPs/ETPs).

### Architecture Highlights
- **Framework:** FastAPI (Python 3.13) with ASGI asynchronous pipeline.
- **Database Boundary:** PostgreSQL with SQLAlchemy 2.0 ORM & Alembic migrations.
- **AI Anomaly Detection:** Scikit-learn 1.9.1 Isolation Forest models with temporal rolling feature engineering.
- **Deterministic Cryptography:** `atc-v1` deterministic canonicalization, SHA-256 cryptographic hashing, ECDSA NIST P-256 (ES256) digital signatures.
- **Distributed Ledger:** Hyperledger Fabric DLT Gateway with dual live/simulation mode.
- **Four-Stage Independent Verifier:** Re-constructs canonical state, checks digital signatures, cross-verifies certificates, and reconciles DLT anchors.
- **Append-Only Corrections:** Immutable provenance lineage preserving superseded records with version chaining.

---

## Complete API Registry

### 1. Authentication & RBAC (`/api/v1/auth`)
| Method | Path | Summary | Roles |
|---|---|---|---|
| `POST` | `/api/v1/auth/login` | Authenticate user & return JWT token | Public |
| `GET` | `/api/v1/auth/me` | Get current user profile and role claims | Authenticated |
| `POST` | `/api/v1/auth/register` | Register new user account | Admin |

### 2. Telemetry Ingestion & Query (`/api/v1/telemetry`)
| Method | Path | Summary | Roles |
|---|---|---|---|
| `POST` | `/api/v1/telemetry/ingest` | Ingest single water quality reading | Operator, Admin |
| `POST` | `/api/v1/telemetry/ingest/batch` | Batch telemetry ingestion | Operator, Admin |
| `GET` | `/api/v1/telemetry/readings` | Query observations with facility & parameter filters | All |

### 3. Facilities Management (`/api/v1/facilities`)
| Method | Path | Summary | Roles |
|---|---|---|---|
| `POST` | `/api/v1/facilities` | Register wastewater treatment facility | Admin, Operator |
| `GET` | `/api/v1/facilities` | List registered facilities | All |
| `GET` | `/api/v1/facilities/{facility_id}` | Get facility details | All |

### 4. Pre-AI Validation Engine (`/api/v1/validation`)
| Method | Path | Summary | Roles |
|---|---|---|---|
| `GET` | `/api/v1/validation/stats` | Quality validation statistics | All |

### 5. AI Anomaly Detection Engine (`/api/v1/anomalies`)
| Method | Path | Summary | Roles |
|---|---|---|---|
| `GET` | `/api/v1/anomalies/metrics` | Anomaly detection metrics & scores | All |

### 6. Environmental Compliance (`/api/v1/compliance`)
| Method | Path | Summary | Roles |
|---|---|---|---|
| `GET` | `/api/v1/compliance/rules` | List CPCB 2021 discharge standard rules | All |
| `POST` | `/api/v1/compliance/evaluate` | Evaluate compliance for treatment record | Operator, Auditor |
| `GET` | `/api/v1/compliance/summary` | Summary compliance metrics | All |

### 7. Treatment Records & Finalization (`/api/v1/treatment-records`)
| Method | Path | Summary | Roles |
|---|---|---|---|
| `POST` | `/api/v1/treatment-records/finalize` | Aggregate composite window and atomically finalize | Operator, Admin |
| `GET` | `/api/v1/treatment-records` | List treatment records with state filters | All |
| `GET` | `/api/v1/treatment-records/{record_id}` | Get detailed treatment record | All |

### 8. Digital Treatment Certificates (`/api/v1/certificates`)
| Method | Path | Summary | Roles |
|---|---|---|---|
| `GET` | `/api/v1/certificates/{certificate_id}` | Get certificate by ID | All |
| `GET` | `/api/v1/certificates/record/{record_id}` | Get certificate by treatment record ID | All |

### 9. Cryptographic Verification & Trust (`/api/v1/verification`)
| Method | Path | Summary | Roles |
|---|---|---|---|
| `POST` | `/api/v1/verification/verify-record/{record_id}` | 4-stage independent trust verification | All |
| `POST` | `/api/v1/verification/verify-proof` | Stateless standalone proof verification | All |
| `GET` | `/api/v1/verification/keys/{key_id}` | Discover active public signing key | All |

### 10. Append-Only Corrections & Lineage (`/api/v1/corrections`)
| Method | Path | Summary | Roles |
|---|---|---|---|
| `POST` | `/api/v1/corrections/propose` | Propose correction for finalized record | Operator |
| `POST` | `/api/v1/corrections/{id}/authorize` | Authorize correction & seal new version | Auditor, Admin |
| `GET` | `/api/v1/corrections/chain/{record_id}` | Get complete immutable provenance chain | All |

### 11. Security & Compliance Audit Logs (`/api/v1/audit-events`)
| Method | Path | Summary | Roles |
|---|---|---|---|
| `GET` | `/api/v1/audit-events` | Query immutable audit log trail | Auditor, Admin |

### 12. Hyperledger Fabric DLT Anchors (`/api/v1/dlt`)
| Method | Path | Summary | Roles |
|---|---|---|---|
| `GET` | `/api/v1/dlt/anchors` | List DLT anchors | All |
| `POST` | `/api/v1/dlt/anchors/{record_id}/reconcile` | Reconcile pending anchor on Fabric | Operator, Admin |

### 13. Telemetry Simulator Bridge (`/api/v1/simulator`)
| Method | Path | Summary | Roles |
|---|---|---|---|
| `POST` | `/api/v1/simulator/start` | Start live telemetry simulation stream | Operator, Admin |
| `POST` | `/api/v1/simulator/stop` | Stop simulation stream | Operator, Admin |
| `GET` | `/api/v1/simulator/status` | Simulator status and ticks | All |
| `POST` | `/api/v1/simulator/inject-anomaly` | Inject one of 8 synthetic anomaly scenarios | Operator, Admin |
