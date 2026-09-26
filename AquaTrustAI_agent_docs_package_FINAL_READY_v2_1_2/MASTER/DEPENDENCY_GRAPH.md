# AquaTrust AI — Implementation Dependency Graph

## Phase order

```text
P00 Repository Audit
   ↓
P01 Foundation + Contracts
   ↓
P02 Data Pipeline
   ↓
P03 STP Simulator
   ↓
P04 FastAPI Gateway
   ↓
P05 Data Trust / Validation
   ↓
P06 Isolation Forest
   ↓
P07 QA + Compliance
   ↓
P08 Treatment Records
   ↓
P09 Cryptography
   ↓
P10 Hyperledger Fabric
   ↓
P11 Verification + Corrections
   ↓
P12 Frontend Integration
   ↓
P13 RBAC + Security
   ↓
P14 Architecture Experiments
   ↓
P15 Performance + Scalability
   ↓
P16 Final Validation
```

## Gate rule

A phase may not be declared complete until:
- its own exit criteria pass;
- required previous phases are frozen;
- integration tests pass;
- regression tests pass;
- completion report is generated.

## Parallel work

Agents may work in parallel only when the master contracts prove there is no shared mutable contract conflict. Default policy is sequential execution.

## High-risk dependency chain

```text
DATA CONTRACTS
→ API
→ VALIDATION
→ AI
→ COMPLIANCE
→ TREATMENT RECORD
→ CERTIFICATE
→ HASH
→ SIGNATURE
→ FABRIC
→ VERIFICATION
```

Changes early in this chain require impact analysis across all downstream phases.
