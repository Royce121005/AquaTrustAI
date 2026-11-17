# AquaTrustAI — Complete Module Dependency Map & Architecture Trace

**Document Version:** 1.0.0-QA-DEPENDENCY-MAP  
**Date:** November 15, 2026  
**Auditor / Architect:** Principal QA & Systems Architecture Team  
**Repository Working Branch:** `main`  
**Current HEAD Commit:** `d31f114bbb9250ec90a10545905d508a12249f85`  

---

## 1. System-Wide End-to-End Control & Data Flow

The operational flow of AquaTrustAI connects physical IoT telemetry, statistical AI anomaly detection, first-principles digital twin kinetics, statutory environmental compliance rules, cryptographic sealing, and blockchain immutability:

```mermaid
flowchart TD
    subgraph S1["Stage 1: Telemetry & Ingestion Gateway"]
        Sensors["IoT Sensors / Hardware / Simulators"]
        IngestAPI["POST /api/v1/ingestion/readings"]
        Sensors --> IngestAPI
        IngestAPI --> RateLimiter["SlidingWindowRateLimiter"]
        RateLimiter --> NaturalKeyCheck["Natural-Key Deduplication"]
    end

    subgraph S2["Stage 2: Deterministic Pre-AI Quality Filter"]
        NaturalKeyCheck --> ValService["ValidationService"]
        ValService --> BoundsCheck{"Physics & Boundary Filter\n(pH 0-14, future timestamps, types)"}
        BoundsCheck -- "Valid" --> ValidStream["quality_status = valid"]
        BoundsCheck -- "Invalid / Out-of-Bounds" --> InvalidStream["quality_status = invalid\n(Audit Flags Logged)"]
    end

    subgraph S3["Stage 3: AI Anomaly Detection & Persistence"]
        ValidStream --> AnomalySvc["AnomalyService"]
        AnomalySvc --> StreamCache["In-Memory Sliding-Window Cache\n(rolling mean, std, delta, lag-1)"]
        StreamCache --> IForest["Isolation Forest (iforest_v2.2.1)"]
        IForest --> AnomalyScore["anomaly_score & status\n(normal vs anomalous)"]
        ValidStream --> DB_Readings[(PostgreSQL 16: readings)]
        InvalidStream --> DB_Readings
        AnomalyScore --> DB_Anomalies[(PostgreSQL 16: anomaly_results)]
    end

    subgraph S4["Stage 4: Digital Twin & SCADA Processing"]
        DB_Readings --> TwinUpdater["StateUpdater"]
        TwinUpdater --> TwinEngine["TwinEngineManager (WebSocket Tick)"]
        TwinEngine --> KineticModel["ProcessModelEngine (CSTR/Monod)"]
        KineticModel --> TwinState["TwinState (Versioned Snapshot)"]
        TwinState --> AlarmMgr["AlarmManager (Critical/Warning/Info)"]
        TwinState --> PredictionSvc["PredictionService (Holdout RMSE)"]
        TwinState --> RecomSvc["RecommendationService (Advisory Only)"]
        TwinState --> SustSvc["SustainabilityService (Reuse & kWh/m3)"]
        TwinState --> ScenarioEngine["ScenarioEngine (Isolated What-If Sandbox)"]
    end

    subgraph S5["Stage 5: Finalization & Statutory Compliance"]
        DB_Readings --> Finalizer["TreatmentService.finalize_window()"]
        Finalizer --> CPCB_Engine["ComplianceService"]
        CPCB_Engine --> SchedVI{"CPCB Schedule VI Rules Engine\n(BOD<=30, COD<=250, TSS<=100, pH 5.5-9)"}
        SchedVI --> CompResult[(PostgreSQL 16: compliance_results)]
        SchedVI --> TreatRecord[(PostgreSQL 16: treatment_records)]
    end

    subgraph S6["Stage 6: Cryptographic Sealing & Proofs"]
        TreatRecord --> Canonicalizer["Deterministic Canonicalizer (atc-v1)"]
        Canonicalizer --> SHA256["SHA-256 Record Hasher"]
        SHA256 --> Signer["ECDSA P-256 Signer (ES256 Keypair)"]
        Signer --> MerkleTree["RFC 6962 Merkle Tree Engine\n(Leaf prefix 0x00, Interior 0x01)"]
        MerkleTree --> BatchRoot["Batch Merkle Root Hash"]
    end

    subgraph S7["Stage 7: Hyperledger Fabric DLT Anchoring"]
        BatchRoot --> FabricGateway["DLT Gateway Bridge (8099)"]
        FabricGateway --> FabricRouter{"Live Fabric Containers\nAvailable?"}
        FabricRouter -- "Yes (Docker)" --> LiveFabric["Fabric 2.5 Peer Network\n(Peer0.Facility, Auditor, Regulator)\nChannel: aquatrust-channel"]
        FabricRouter -- "No (Fallback)" --> SimFabric["Disk-Backed DLT Simulation Engine\n(Reconciliation & Local Ledger JSON)"]
        LiveFabric --> DLTAnchor[(PostgreSQL 16: dlt_anchors)]
        SimFabric --> DLTAnchor
    end

    subgraph S8["Stage 8: Independent 4-Stage Verification"]
        VerifierSvc["VerifierService (4-Stage Pipeline)"]
        TreatRecord -.-> VerifierSvc
        DLTAnchor -.-> VerifierSvc
        VerifierSvc --> Stg1["Stage 1: Local SHA-256 Match"]
        VerifierSvc --> Stg2["Stage 2: ECDSA Signature Verification"]
        VerifierSvc --> Stg3["Stage 3: Merkle Audit Path to Root"]
        VerifierSvc --> Stg4["Stage 4: Blockchain Anchor Query"]
    end

    subgraph S9["Stage 9: Append-Only Corrections & Audit"]
        Operator["Facility Operator"] --> PropCorr["POST /corrections/propose"]
        PropCorr --> Auditor["Accredited Auditor"]
        Auditor --> AuthCorr["POST /corrections/{id}/authorize"]
        AuthCorr --> Supersede["Stamps original 'superseded_by_correction'\nSpawns new versioned record"]
        Supersede --> Lineage[(PostgreSQL 16: corrections lineage)]
        Supersede --> FabricGateway
        AllOps["All System Actions"] --> AuditRepo["AuditRepository (Immutable Log)"]
    end

    subgraph S10["Stage 10: Presentation & User Experience"]
        DB_Readings --> WebApp["React 18 + Vite Frontend Dashboard (5174)"]
        TwinState --> WebApp
        CompResult --> WebApp
        TreatRecord --> WebApp
        VerifierSvc --> WebApp
        VerifierSvc --> PublicPortal["Public Zero-Auth Verification Portal\n(/verify/:recordId)"]
    end
```

---

## 2. Cross-Module Dependency Analysis

### 2.1 Circular Dependency Check
- **Backend Core / Services:** All backend services strictly adhere to the layered pattern:
  `API Routers -> Application Services -> Domain Engines / Cryptography -> Repositories -> SQLAlchemy Models`.
  - No circular imports exist between services or repositories.
  - Dependency injection is handled cleanly via FastAPI's `Depends(get_db)`.
- **Digital Twin Subsystem:** `DigitalTwinService` acts as an orchestration facade over `ProcessModelEngine`, `StateUpdater`, `ScenarioEngine`, `PredictionService`, `RecommendationService`, and `SustainabilityService`. The sub-engines remain completely decoupled from one another and do not import each other cyclically.
- **DLT Gateway:** `gateway.py` acts as a client bridge to the Fabric network and never imports from application services, preventing any feedback loop.

### 2.2 Missing Integrations Check
- **What-If Scenarios vs. Live Ledger:** By design ([ADR-008](file:///d:/AquaTrustAI/docs/backend/DIGITAL_TWIN_SCOPE_EXTENSION_ADR.md)), what-if scenario runs are **strictly isolated** from live telemetry and are never anchored to Hyperledger Fabric. This prevents hypothetical simulations from polluting the immutable legal ledger.
- **Predictions & Recommendations vs. Autonomous Actuators:** `RecommendationService` is strictly advisory. There is no automated actuation loop into physical plant pumps or blowers. This was evaluated and approved to ensure compliance with CPCB data integrity regulations.
- **Digital Twin WebSocket Live Reconnect:** In the frontend, `useTwinStream.ts` connects to `/facilities/{id}/twin/stream` with automated exponential backoff reconnection upon network interruption.

### 2.3 Duplicate Logic Analysis
- **Telemetry Boundaries:** Both `ValidationService` (`backend/app/services/validation_service.py`) and `datasets/canonical/models.py` define physical limits for water parameters. They are aligned on standard limits:
  - pH: $[0.0, 14.0]$
  - BOD: $[0.0, 5000.0]\text{ mg/L}$
  - COD: $[0.0, 15000.0]\text{ mg/L}$
  - TSS: $[0.0, 5000.0]\text{ mg/L}$
- **Hashing & Canonicalization:** Canonicalization is centralized in `backend/app/dlt/canonicalizer.py` (`atc-v1`). No divergent hashing or serialization routines were found across backend services.

### 2.4 Dead Routes & Disconnected UI Components Check
- **API Routes:** All 15 routers declared in `backend/app/api/router.py` are active and registered in FastAPI application startup.
- **Frontend Pages:** All 27 pages in `frontend/src/pages/` are mapped to active client routes in `frontend/src/App.tsx`.
- **SCADA Synoptic Components:** All 5 stage components (`InletScreeningStage`, `PrimaryClarifierStage`, `AerationBasinStage`, `SecondaryClarifierStage`, `EffluentUvStage`) and `ScadaPrimitives` are actively composed within `SynopticProcessFlow.tsx` on the Digital Twin page.

### 2.5 Data Transformations & Schema Consistency
- **Telemetry Parameter Units:** Units across Ingestion, ML Anomaly Inference, Compliance, and Digital Twin are consistent:
  - BOD: `mg/L`
  - COD: `mg/L`
  - TSS: `mg/L`
  - pH: `pH units`
  - NH4-N: `mg/L`
  - Flow Rate: `m3/day` or `MLD` (explicitly annotated in responses)
- **Stoichiometric Invariants:** The `ProcessModelEngine` and `ScenarioEngine` enforce thermodynamic and stoichiometric sanity checks:
  - $COD \ge 2.0 \cdot BOD$
  - $TN \ge TKN \ge NH_4\text{-}N$
  - Temperature degradation factor: $k(T) = k_{20} \cdot 1.04^{(T-20)}$

### 2.6 Hardcoded or Mock Values Check
- **Fabric Simulation Mode:** When Docker or live Hyperledger Fabric peer nodes are offline, `backend/app/dlt/gateway.py` operates in **Simulation DLT Mode**.
  - *Observation:* The simulation mode persists its ledger state to a local disk-backed JSON file and implements real SHA-256 Merkle root verification.
  - *QA Verification Requirement:* Testing must clearly differentiate between live Fabric transactions committed with consensus across 3 peer nodes and local simulation mode commitments.

---
*End of Module Dependency Map.*
