# AquaTrust AI — Industrial Readiness & Enterprise Deployment Specification

**Author:** Valentino Dansal D'cruz (Member 3: Frontend & Blockchain/DLT Lead)  
**System Classification:** Enterprise SCADA Telemetry & Consortium Distributed Ledger  
**Standard Adherence:** CPCB OCEMS (2026 Mandate), ISA-18.2 (Alarm Systems), RFC 8785 (Canonicalization), RFC 6962 (Merkle Trees), IEC 62443 (Industrial Cybersecurity)  
**Date:** September 2026  
**Status:** PRODUCTION HARDENED (Phases 1, 2, and 3 Complete)

---

## 1. Executive Summary

AquaTrust AI bridges the critical gap between wastewater process automation (SCADA/DCS) and statutory environmental compliance (CPCB/SPCB). In conventional treatment plants (STPs/ETPs), telemetry data is vulnerable to sensor drift, local database tampering, and unverified paper reporting.

This document specifies the enterprise industrialization executed across **Frontend Engineering** and **Blockchain / Distributed Ledger Technology (DLT)** to transition AquaTrust AI into a production-grade, multi-stakeholder platform.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        AQUATRUST AI INDUSTRIAL STACK ARCHITECTURE                      │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  CONTROL ROOM & FIELD UX (React 19 / Vite / PWA / ISA-18.2 SCADA)                      │
│  • 24/7 Fullscreen NOC Kiosk Mode with Live IST Telemetry Ticker                       │
│  • ISA-18.2 Alarm Annunciator Bar (Normal / Warning / Critical) + Web Audio Buzzer     │
│  • CPCB Form V & OCEMS Compliance Return Exporter with Embedded Vector QR Code         │
│  • Offline Field Resilience: Service Worker Cache for Clarifier/Basin Dead Zones       │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  CRYPTOGRAPHIC EDGE & ANCHORING ENGINE (FastAPI / atc-v1 / RFC 6962 / HSM)             │
│  • RFC 8785 Deterministic Canonicalization & 256-bit SHA-256 Digesting                │
│  • Hardware Security Module (HSM) PKCS#11 & Cloud KMS Key Signer (FIPS 140-2 Level 3)   │
│  • High-Throughput Binary Merkle Batch Engine (O(log N) Inclusion Proofs)              │
│  • FastAPI WebSocket (/stream) Streaming Sub-Second Process Telemetry                  │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  CONSORTIUM LEDGER & GOVERNANCE (Hyperledger Fabric 2.5 LTS / Raft)                   │
│  • 3-Organization Consortium: FacilityOrgMSP (Plant) + RegulatorOrgMSP + AuditorOrgMSP│
│  • Endorsement Policy: AND('FacilityOrgMSP.peer', 'RegulatorOrgMSP.peer')             │
│  • Private Data Collections (PDC): Proprietary Dosing vs. Public Effluent Transparency │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Phase-by-Phase Industrial Implementation

### Phase 1: Enterprise Hardening & Regulatory Verification

1. **Independent Cryptographic Audit Console (`BlockchainPage.jsx` & `BlockchainVerifyPage.jsx`):**
   * Field inspectors and auditors can query any Treatment Record ID (`REC-0001`, `REC-0002`, `REC-0003`, or UUID) or canonical hash.
   * Executes a 4-stage cryptographic proof pipeline:
     * **Stage 1 (Canonicalization):** RFC 8785 byte sorting and SHA-256 hash re-computation.
     * **Stage 2 (Digital Signature):** Verifies ECDSA NIST P-256 (ES256) signature over IEEE P1363 raw bytes (64 bytes).
     * **Stage 3 (Authority Validation):** Confirms signing key is enrolled under active Facility MSP certificate.
     * **Stage 4 (Ledger Consensus):** Verifies block number (`#104`), channel (`aquatrust-channel`), and multi-party endorsement.
   * Actions: "Copy JSON Proof" and "Download Audit Receipt (.json)".

2. **Official CPCB / SPCB Form V Compliance Exporter (`CpcbCertificateModal.jsx`):**
   * Implements official format under the *Water (Prevention and Control of Pollution) Act, 1974* and *Environment (Protection) Rules, 1986*.
   * Parameters evaluated against CPCB statutory discharge standards:
     * $\text{pH}$: $6.5 - 9.0$
     * $\text{BOD}_5$: $\le 10\text{ mg/L}$
     * $\text{COD}$: $\le 50\text{ mg/L}$
     * $\text{TSS}$: $\le 20\text{ mg/L}$
     * $\text{NH}_4\text{-N}$: $\le 5\text{ mg/L}$
     * Aeration Basin $\text{DO}$: $\ge 2.0\text{ mg/L}$
   * Features a pure SVG vector QR code (`QRCode.jsx` & `qrCodeGenerator.js`) deep-linking directly to the ledger proof.
   * 1-click print-optimized CSS layout for official paper and PDF filing.

3. **High-Throughput Binary Merkle Batch Engine (`merkle.py` & `gateway.py`):**
   * Implements RFC 6962 domain-separated hashing (`\x00` leaf prefix, `\x01` interior node prefix) to eliminate second-preimage collision attacks.
   * Allows thousands of 1-second IoT sensor readings to be batched into a single 32-byte Merkle Root.
   * Generates compact $O(\log N)$ inclusion proofs, enabling verification of any individual reading against the blockchain without downloading the batch.

---

### Phase 2: Industrial Edge & Real-Time SCADA Operations

1. **ISA-18.2 Process Alarm Annunciator Bar (`AlarmAnnunciatorBar.jsx`):**
   * Implements the international standard for process industry alarm management.
   * Three operational alarm states:
     * **NORMAL:** All 6 basins within parameters; online heartbeat confirmed.
     * **WARNING:** Proactive alert when parameters trend near breach limits (e.g. TSS at $18.8\text{ mg/L}$).
     * **CRITICAL EXCEEDANCE:** Flashing red alert on statutory breach (e.g. Aeration DO falling below $1.5\text{ mg/L}$).
   * **Operator Acknowledgment (ACK):** Silences the horn, stops visual flash, and records operator acknowledgment.
   * **Web Audio API Sound Synthesizer:** Pure JavaScript square-wave audio synthesis (`playScadaAlertTone()`) generating industrial horn chimes without external media files.

2. **24/7 Control Room NOC / Kiosk Fullscreen Mode (`NocModeBar.jsx`):**
   * Designed for unattended overhead displays in industrial control rooms.
   * 1-click fullscreen toggle collapsing sidebars into a high-contrast dark theme (`bg-slate-900`).
   * Live telemetry ticker rotating critical KPIs: Inflow ($41.8\text{ MLD}$), Aeration DO ($2.42\text{ mg/L}$), TSS ($11.6\text{ mg/L}$), pH ($7.28$), and Hyperledger Block height (`#104`).
   * High-precision Indian Standard Time (IST) / UTC control room clock.

3. **Field Operator PWA & Offline Tolerance (`sw.js` & `manifest.json`):**
   * Progressive Web App installable on plant floor tablets and ruggedized Android/iOS devices.
   * Stale-while-revalidate caching of app shell, assets, and offline telemetry fallback.
   * Real-time network detection (`useOnlineStatus.js`) displaying an amber banner when field technicians work in remote concrete basin zones.

4. **FastAPI WebSocket Telemetry Streaming (`simulator.py` & `monitoring.js`):**
   * Native WebSocket endpoint `/api/v1/simulator/stream` broadcasting live sensor ticks.
   * Client-side persistent subscription via `subscribeTelemetryStream()` for sub-second SCADA responsiveness.

---

### Phase 3: Consortium Consensus, HSM Key Vault & Multi-Org Governance

1. **Hardware Security Module (HSM) / Key Vault Interface (`signer.py`):**
   * Implements `BaseSigningProvider` with dual providers:
     * `SoftwareSigningProvider`: Local PEM keys for development and test suites.
     * `HardwareSigningProvider`: PKCS#11 / Cloud KMS non-exportable hardware signing.
   * Conforms to **FIPS 140-2 Level 3** and **IEC 62443**: private keys never leave the secure hardware cryptographic boundary; only canonical digests are signed.

2. **Consortium Multi-Org Governance (`dlt/network/consortium_policy.json`):**
   * 3 Independent Organizations:
     1. `FacilityOrgMSP`: Sewage Treatment Plant Operator (IoT ingestion & treatment finalization).
     2. `RegulatorOrgMSP`: Central/State Pollution Control Board (compliance oversight & anchor endorsement).
     3. `AuditorOrgMSP`: NABL Accredited Environmental Testing Lab (calibration verification & correction authorization).
   * **Endorsement Policy:**
     $$\text{Routine Anchoring} = \text{AND}('FacilityOrgMSP.peer', 'RegulatorOrgMSP.peer')$$
     $$\text{Calibration / Correction Relink} = \text{AND}('FacilityOrgMSP.peer', 'RegulatorOrgMSP.peer', 'AuditorOrgMSP.peer')$$

3. **Private Data Collections (PDC) Architecture (`dlt/chaincode/collections_config.json`):**
   * `collectionOperatorPrivate`: Stores proprietary chemical dosage liters, polymer suppliers, and operating costs accessible solely to `FacilityOrgMSP`.
   * `collectionRegulatoryPublic`: Stores public effluent compliance metrics (pH, BOD, COD, TSS, NH4-N), Merkle roots, and cryptographic signatures accessible to all stakeholders.

---

## 3. Verification & Compliance Checklist

| Standard / Mandate | Requirement | AquaTrust AI Implementation | Status |
| :--- | :--- | :--- | :--- |
| **CPCB OCEMS 2026** | Continuous online effluent monitoring with non-repudiation | Immutable ledger anchoring with SHA-256 hashes and dual-MSP endorsements | **COMPLIANT** |
| **Env. Protection Rules (Form V)** | Standardized annual/monthly environmental statement return | Printable Form V compliance certificate with embedded mobile QR code | **COMPLIANT** |
| **ISA-18.2** | Alarm lifecycle, priority categorization, and operator ACK | Annunciator bar with Normal/Warning/Critical states and Web Audio buzzer | **COMPLIANT** |
| **RFC 8785** | Deterministic JSON Canonicalization Format (JCS) | `atc-v1` canonicalizer sorting dictionary keys and UTF-8 encoding | **COMPLIANT** |
| **RFC 6962** | Transparency trees & tamper-evident inclusion proofs | Binary Merkle Tree with `\x00`/`\x01` prefixes and $O(\log N)$ audit proofs | **COMPLIANT** |
| **IEC 62443 / FIPS 140-2** | Hardware cryptographic key protection | PKCS#11 HSM / Cloud KMS abstraction in `signer.py` | **COMPLIANT** |
| **W3C PWA Standards** | Offline availability on mobile/tablet field devices | Service worker stale-while-revalidate cache and manifest integration | **COMPLIANT** |

---

## 4. Key Talking Points for Project Defense

1. **"AquaTrust AI is built for real plant operations, not just as a toy dashboard":**
   * Adheres to **ISA-18.2** alarm management with audible buzzers, operator acknowledgment workflows, and 24/7 wall-mount NOC Kiosk displays.
2. **"True non-repudiation requires dual-custody consortium consensus":**
   * Highlight that storing hashes on a single database or single-node ledger is insufficient for legal evidence. AquaTrust AI enforces dual endorsement between the **Plant Operator** and the **Environmental Regulator (CPCB)**.
3. **"Industrial scale requires Merkle batch anchoring":**
   * Explain how committing individual 1-second sensor ticks would crash a blockchain network. AquaTrust AI uses an **RFC 6962 Merkle Tree** to anchor 1,000 readings into a single 32-byte root while allowing $O(\log N)$ verification for any single reading.
4. **"Hardware Security (HSM) prevents key theft":**
   * Explain that private signing keys are housed inside tamper-resistant hardware tokens (PKCS#11) where keys cannot be exported or leaked even if the host OS is compromised.
