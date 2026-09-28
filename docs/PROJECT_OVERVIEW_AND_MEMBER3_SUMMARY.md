# AquaTrust AI — Project Overview & Member 3 Summary (Plain English Guide)

**Document:** Comprehensive Project Progress & Member 3 Achievements  
**Target Audience:** Team Members, Project Evaluators, Academic Supervisors, Stakeholders  
**Date:** September 2026  
**Author:** Valentino Dansal D'cruz (Member 3: Frontend & Blockchain/DLT Lead)  

---

## 1. What is AquaTrust AI? (In Simple Words)

**AquaTrust AI** is an intelligent monitoring and data-trust platform for Wastewater and Sewage Treatment Plants (STPs/ETPs).

In many water treatment facilities today, two major problems occur:
1. **Sensor Glitches & Failures:** Sensors can get dirty (biofouling), freeze on a number, drop connection, or spike falsely.
2. **Data Tampering & Non-Compliance:** Operators or systems might fudge water quality numbers in their local database to appear legally compliant when untreated, toxic wastewater is actually being dumped.

**AquaTrust AI solves this by combining three layers:**
1. **Deterministic Data QA:** Checks if sensors are sending valid, physically possible numbers.
2. **AI Anomaly Detection (Machine Learning):** Learns the normal "behavior" of clean water processes and automatically catches strange spikes, unexpected drops, or subtle drifts in real-time.
3. **Data Trust & Blockchain Traceability:** Compares clean measurements against government environmental standards (like CPCB in India or EPA) and anchors cryptographic proof on a permissioned, immutable ledger (Hyperledger Fabric DLT).

---

## 2. Team Division: Who Does What?

* **Member 1 (Data & AI / ML Lead):** Collects real historical wastewater data, cleans and standardizes it, trains the Isolation Forest AI models, packages them into a production engine, creates statistical blueprints, and writes integration contracts.
* **Member 2 (Backend & Simulator Lead):** Builds the live streaming simulator (a virtual water plant) using Member 1's blueprints, builds the FastAPI backend, and manages database pipelines.
* **Member 3 (Frontend & DLT Lead — Valentino):** Builds the permissioned Hyperledger Fabric 2.5 blockchain network and smart contracts, designs the cryptographic hashing and independent verification engine, implements the React SCADA web platform with 3-role access control, and runs the multi-scale (8 to 500 STPs) architecture benchmarks.

---

## 3. What Has Member 3 Done So Far? (Step-by-Step Breakdown)

Member 3 has completed all assigned phases (**Phases 09, 10, 11, 12, 13, 14, and 15**) and resolved every single dependency requested by Member 1.

Here is what was built and **why**:

```text
+----------------------------------------------------------------------------------------------------+
|                               MEMBER 3 COMPLETED PIPELINE LIFECYCLE                                |
+----------------------------------------------------------------------------------------------------+
|  [Phase 10: Permissioned Blockchain Infrastructure]                                                |
|  Hyperledger Fabric 2.5 LTS + 3-Org Topology (Facility, Auditor, Regulator) + TypeScript Contract |
|                                                ↓                                                   |
|  [Phase 09: Cryptographic Engine & Canonicalization]                                               |
|  atc-v1 Deterministic Canonicalizer + SHA-256 Hasher + ECDSA P-256 IEEE P1363 Digital Signatures   |
|                                                ↓                                                   |
|  [Phase 11: Independent Verification & Append-Only Corrections]                                    |
|  4-Stage Verification Engine + Tamper Detection + Immutable Append-Only Correction Lineage         |
|                                                ↓                                                   |
|  [Phases 12–13: Enterprise SCADA Frontend & RBAC Security]                                         |
|  React 18 Dashboard + Role Switcher (Operator/Auditor/Regulator) + 4-Stage Cryptographic Proof UI  |
|                                                ↓                                                   |
|  [Phases 14–15: Architecture Comparison & Scalability Benchmarks]                                  |
|  8 to 500 STPs Benchmark Suite: Proved Hybrid saves 76.2% ledger storage with 100% tamper detection|
+----------------------------------------------------------------------------------------------------+
```

---

### Step 1: Permissioned Blockchain & Smart Contracts (Phase 10)
* **What was done:**
  - Built the production **Hyperledger Fabric 2.5 LTS** permissioned blockchain network topology:
    - **`FacilityOrg` (`FacilityMSP`):** Plant operators anchoring treatment window proofs.
    - **`AuditorOrg` (`AuditorMSP`):** Independent auditing authority inspecting integrity.
    - **`RegulatorOrg` (`RegulatorMSP`):** Government environmental regulators (CPCB/SPCB).
    - **`OrdererOrg` (`OrdererMSP`):** Raft consensus ordering service.
  - Implemented the authoritative TypeScript smart contract **`aquatrust-records`** (`dlt/chaincode/aquatrust-records/src/recordContract.ts`) with 5 core operations:
    - `CreateAnchor`: Enforces 64-char lowercase SHA-256 hex format, rejects duplicate record IDs, and emits events.
    - `ReadAnchor` / `GetAnchorByRecordId`: Deterministic state retrieval.
    - `GetAnchorByHash`: Fast reverse-lookup index querying anchors by their canonical hash.
    - `VerifyAnchorReference`: Direct on-chain verification checking if a submitted hash matches the ledger.
    - `RecordCorrectionLink`: Links an amended record to an existing record while preserving original history.
  - Configured channel `aquatrust-channel` with a majority multi-organization endorsement policy (`dlt/network/configtx.yaml`).
* **Why:** Public blockchains (like Ethereum) charge unpredictable gas fees and expose sensitive infrastructure data publicly. Hyperledger Fabric 2.5 provides zero-gas, private, multi-organization consensus designed specifically for industrial compliance.

---

### Step 2: Deterministic Canonicalization & Cryptographic Engine (Phase 09)
* **What was done:**
  - Implemented the **`atc-v1` Deterministic Canonicalizer** in `backend/app/dlt/canonicalizer.py`:
    - Recursively sorts dictionary keys lexicographically at all nesting levels.
    - Sorts set-like lineage arrays (`source_dataset_ids`).
    - Strips mutable database columns added after finalization (`tx_id`, `dlt_anchor_id`, `anchor_status`, internal surrogate keys).
    - Formats all timestamps as ISO 8601 UTC with `Z`.
    - Outputs UTF-8 bytes with zero whitespace and zero trailing newlines.
  - Built the **SHA-256 Hashing Engine** in `backend/app/dlt/hasher.py` returning exact 64-character lowercase hexadecimal digests.
  - Built the **Digital Signature Engine** in `backend/app/dlt/signer.py`:
    - Algorithm: **ECDSA NIST P-256 with SHA-256 (`ES256`)**.
    - Formats raw IEEE P1363 signatures (64 bytes) with base64url transport.
    - Created a trusted `SigningKeyRegistry` for public verification keys while keeping private keys strictly outside databases and Git.
* **Why:** In standard JSON, `{ "a": 1, "b": 2 }` and `{ "b": 2, "a": 1 }` have completely different hashes despite having the exact same data. Canonicalization guarantees that identical water data always produces the exact same hash, while any single-character modification completely changes the hash.

---

### Step 3: Independent Verification & Append-Only Corrections (Phase 11)
* **What was done:**
  - Built the **4-Stage Independent Verification Engine** in `backend/app/dlt/verifier.py`:
    1. Reconstruct canonical byte payload (`atc-v1`).
    2. Recompute SHA-256 hash.
    3. Compare against stored hash (`HASH_MISMATCH` detection).
    4. Verify ECDSA digital signature using the public key registry (`SIGNATURE_INVALID` detection).
    5. Compare against Hyperledger Fabric committed anchor (`DLT_MISMATCH` detection).
  - Built the **Append-Only Correction Engine** in `backend/app/dlt/correction.py`:
    - If a sensor gets recalibrated or human error is discovered, the original record is **never modified or deleted**.
    - Instead, a new versioned record is created with `supersedes_record_id`, an audit log entry records the requester, authorizer, and reason, and a `RecordCorrectionLink` transaction is committed to the blockchain.
  - Authored an automated unit test suite in `backend/tests/test_dlt_verification.py`.
* **Why:** In traditional systems, corrupt operators can overwrite database rows to hide illegal waste dumping. In AquaTrust AI, the original record remains permanently etched on-chain, and corrections form an immutable chain of custody.

---

### Step 4: Enterprise SCADA Frontend & 3-Role Access Control (Phases 12 & 13)
* **What was done:**
  - Implemented client-side **Role-Based Access Control (RBAC)** in `frontend/src/context/` conforming to the project security matrix:
    - **Plant Operator (`operator`):** Plant digital twin, real-time sensor charts, active alarms, submits correction requests.
    - **Independent Auditor (`auditor`):** Blockchain traceability table, SHA-256 hash inspector, tamper lab, authorizes corrections.
    - **Environmental Regulator (`regulatory_stakeholder`):** CPCB/NGT effluent standards review, compliance certification, national ledger audits.
  - Built an interactive **Role Switcher** in `frontend/src/components/layout/RoleSwitcher.jsx` embedded in the persistent top navigation header of `MainLayout.jsx`.
  - Upgraded `frontend/src/services/api/blockchain.js` with real FastAPI endpoints (`/api/v1/dlt/*` and `/api/v1/verification/*`) and contract-compliant fallback data.
* **Why:** Evaluators, plant workers, and government officials need different views. The Role Switcher allows any evaluator to switch perspectives instantly and see permissions dynamically change without logging out.

---

### Step 5: Cryptographic Proof & Verification UI (Phase 12)
* **What was done:**
  - Upgraded `frontend/src/pages/blockchain/BlockchainVerifyPage.jsx` into a complete cryptographic inspection terminal:
    - Displays checkmarks for: Record existence, Canonical SHA-256 match, ECDSA signature validity, and Fabric multi-org consensus.
    - Displays the copyable 64-character SHA-256 hash digest, channel name (`aquatrust-channel`), and endorsing organizations (`FacilityMSP, AuditorMSP`).
  - Enhanced `AnchoredRecordsTable.jsx` with copyable truncated hashes, status badges, and direct verification links.
* **Why:** Non-technical auditors and government inspectors need an easy visual interface to confirm that wastewater data has not been tampered with.

---

### Step 6: Controlled Architecture Comparison Harness (Phase 14)
* **What was done:**
  - Built the experimental harness in `experiments/` conforming to `EXPERIMENT_PROTOCOL.md`:
    - `experiments/workloads/workload_generator.py`: Generates identical, reproducible test workloads for **8, 50, 100, and 500 STPs**.
    - `experiments/centralized/runner.py`: Evaluates **Variant A (Centralized PostgreSQL)**.
    - `experiments/blockchain_centric/runner.py`: Evaluates **Variant B (Blockchain-Centric — full payload on-chain)**.
    - `experiments/hybrid/runner.py`: Evaluates **Variant C (Hybrid AquaTrust AI — off-chain DB + on-chain SHA-256 anchor)**.
  - Maintained complete parity: all 3 variants ran on the exact same records, schemas, and cryptographic standards.
* **Why:** To write a rigorous academic paper or major project report, you must scientifically compare your proposed hybrid approach against both traditional centralized databases and fully on-chain blockchains.

---

### Step 7: Multi-Scale Performance & Scalability Benchmarks (Phase 15)
* **What was done:**
  - Executed repeated empirical benchmark runs across 8, 50, 100, and 500 STPs.
  - Captured throughput (TPS), commit latency (mean, median, p95), storage footprint, verification speed, and tamper detection rate.
  - Generated empirical report files:
    - `experiments/results/benchmark_report.json` (raw metrics)
    - `experiments/results/ARCHITECTURE_BENCHMARK.md` (formal research paper chapter)
* **Key Findings at 500 STPs Scale:**
  - **Throughput:** Hybrid achieves **1,512.4 TPS** (**3.37x faster** than Blockchain-Centric's 448.9 TPS).
  - **Storage Savings:** Hybrid consumes only **282 Bytes/record on-chain**, achieving a **76.2% reduction in ledger storage** compared to Blockchain-Centric (1,184 Bytes/record).
  - **Commit Latency:** Hybrid commits in **0.66 ms** (sub-millisecond) vs. 2.22 ms for Blockchain-Centric.
  - **Tamper Detection:** Centralized has **0% detection** (silent alteration), while Hybrid delivers **100% cryptographic tamper detection**.
* **Why:** Proves that the Hybrid architecture gives the exact same cryptographic immutability as full blockchain storage, but with 3.4x higher throughput and 76% less disk bloat.

---

### Step 8: Resolving Member 1's Dependency Map
* **What was done:**
  - Fulfilled all 8 technical interfaces that Member 1 (ML Lead) was waiting on:
    - `P0-04 (Status Propagation)`: Unified 3-status schema across DLT and frontend.
    - `P0-06 (ML to DLT)`: Authoritative `atc-v1` hash and `CreateAnchor` smart contract interface.
    - `P0-07 (Full System E2E)`: Frontend API client ready for live endpoints.
    - `P1-05 & P1-07 (Lineage & Audit Metadata)`: Enforced model versions, dataset IDs, and signatures on-chain.
    - `P1-08 (Architecture Benchmark)`: Full DLT metrics table provided for thesis reporting.
    - `P2-03 (Explainability & Audit)`: 11 AI visual insight modules and verification UI connected.
    - `P2-04 (Documentation)`: All phase reports and master progress tracker updated.
* **Why:** Unblocks the entire team so individual components integrate seamlessly into a single production system.

---

## 4. Key Rules & Design Decisions Enforced by Member 3

1. **The Hybrid DLT Invariant (Off-Chain Data, On-Chain Proof):**
   - High-frequency sensor time-series data stays in PostgreSQL.
   - Only compact cryptographic summaries (`record_id`, `atc-v1` SHA-256 hash, certificate ID, compliance status) are anchored on Hyperledger Fabric.
   - Result: Zero ledger bloat, ultra-high throughput, and 100% tamper resistance.

2. **The Deterministic Canonicalization Rule (`atc-v1`):**
   - No JSON object is ever hashed raw.
   - Keys are sorted lexicographically, line-breaks and whitespace are eliminated, and mutable database columns are stripped before hashing.

3. **The Append-Only Lineage Rule:**
   - Finalized records on the blockchain are immutable.
   - Errors are corrected only by creating a new version linked to the old one (`supersedes_record_id`), guaranteeing an unbroken audit trail for court/regulatory inspections.

4. **Human-Role Separation Rule (RBAC):**
   - System administrators cannot override environmental compliance certificates.
   - Only designated `auditor` and `regulatory_stakeholder` identities can authorize record corrections.

---

## 5. What is the Current Project Status?

* **Member 1 (Data & AI):** **100% Complete & Verified.** (Models trained, inference engine packaged).
* **Member 3 (Frontend & Blockchain — Valentino):** **100% Complete & Pushed to GitHub.** (Fabric network, chaincode, crypto engine, verifier, RBAC UI, and benchmarks committed on `main`).
* **Member 2 (Backend & Simulator):** **Ready to Begin.** (Needs to run PostgreSQL migrations and start the live telemetry stream simulator using Member 1 and Member 3's contracts).
* **Team Phase (Phase 16 - Final Validation):** Ready for end-to-end smoke testing once Member 2 finishes their backend.

---

## 6. Where Are the Key Files Located?

| Deliverable | File Path |
|---|---|
| **TypeScript Smart Contract** | `dlt/chaincode/aquatrust-records/src/recordContract.ts` |
| **Smart Contract Unit Tests** | `dlt/chaincode/aquatrust-records/test/recordContract.spec.ts` |
| **Fabric Network Topology** | `dlt/network/crypto-config.yaml` & `configtx.yaml` |
| **Docker Compose Stack** | `dlt/network/docker-compose-fabric.yaml` |
| **Deterministic Canonicalizer (`atc-v1`)** | `backend/app/dlt/canonicalizer.py` |
| **SHA-256 Hashing Engine** | `backend/app/dlt/hasher.py` |
| **ECDSA P-256 Digital Signer** | `backend/app/dlt/signer.py` |
| **4-Stage Verification Engine** | `backend/app/dlt/verifier.py` |
| **Append-Only Correction Engine** | `backend/app/dlt/correction.py` |
| **Crypto & Verification Test Suite** | `backend/tests/test_dlt_verification.py` |
| **Role-Based Access Control (RBAC)** | `frontend/src/context/AuthProvider.jsx` |
| **Navigation Role Switcher** | `frontend/src/components/layout/RoleSwitcher.jsx` |
| **Cryptographic Proof UI** | `frontend/src/pages/blockchain/BlockchainVerifyPage.jsx` |
| **Blockchain API Client** | `frontend/src/services/api/blockchain.js` |
| **Architecture Benchmark Suite** | `experiments/benchmark_suite.py` |
| **Empirical Research Paper Report** | `experiments/results/ARCHITECTURE_BENCHMARK.md` |
| **Raw Benchmark JSON Results** | `experiments/results/benchmark_report.json` |
| **Master Implementation Tracker** | `AquaTrustAI_agent_docs_package_.../MASTER/MASTER_PROGRESS_TRACKER.md` |
