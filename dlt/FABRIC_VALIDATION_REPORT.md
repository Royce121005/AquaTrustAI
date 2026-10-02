# AquaTrust Fabric Validation Report

**Run date:** 2026-10-01  
**Result:** Core live Fabric/DLT flow passed; full repository validation is incomplete because of unrelated test-environment/backend failures.

## Network and deployment

- Docker Engine **29.8.1**; Fabric peer/orderer/tools **2.5.15**. Facility, Auditor, Regulator, Orderer and Gateway containers were running. All three peers reported channel height **18** and the same current block hash; peers reported joined to `aquatrust-channel`.
- Existing network lifecycle was used through `dlt/network/scripts/start-network.sh`. Existing crypto material, ledgers, PostgreSQL/backend data, and named Fabric volumes were retained. No network volumes or MSP material were deleted or regenerated.
- The channel already existed. Its live config had no anchor peers, so a signed config update added the three anchor peer endpoints. The peers subsequently joined gossip; the prior cross-organization bootstrap warnings were absent from the post-restart log window.
- Chaincode is **`aquatrust-records` 1.0.1, sequence 2**, normal Fabric Node.js packaging (`type: node`), no CCAAS connection metadata. Package ID on Facility, Auditor and Regulator:

  `aquatrust-records_1.0.1:fb50d56172aec18aa99c2719a269a2c0628bdb7e4c642d92edd8f918de1f8cd0`

- `checkcommitreadiness` returned `FacilityMSP=true`, `AuditorMSP=true`, `RegulatorMSP=true`. The committed policy is the existing **2-of-3** policy: `OutOf(2, 'FacilityMSP.peer', 'AuditorMSP.peer', 'RegulatorMSP.peer')`. Query-committed confirmed version 1.0.1 / sequence 2 / all three approvals on each peer.
- Install, approvals, readiness and commit were executed with the official `hyperledger/fabric-tools:2.5.15` CLI image attached transiently to the existing Docker network. No second Fabric network was created. The deploy shell script itself was not used for lifecycle commands.

## Live transaction evidence

All listed transactions were submitted through the Fabric Gateway or the backend-to-Gateway integration, committed with `VALID`, and queried from ledger state. They are **REAL FABRIC**, not simulation.

| Operation | Evidence |
|---|---|
| Finalized treatment report anchor | Record `2a989812-6837-46dc-99b4-e3390eb46a7d`; SHA-256 `24a14f6cde4322047184220bda55869db4ef0f6d69cc5375ab8e7ff607ac6169`; tx `3f78d6a3709027ce92893436679f284f81949fdb5dbdd6621de1799e65302822`. Backend finalization, reconciliation and verification ran through the actual HTTP API. |
| Query / verification / history | `ReadAnchor`, `GetAnchorByRecordId`, `GetAnchorByHash`, `VerifyAnchorReference`, `GetAnchorHistory` and `GetTransactionById` returned matching ledger data. Backend verification returned **VERIFIED**: canonical hash, ES256 signature, certificate consistency and DLT anchor all passed. |
| Batch of 2 | Batch `fabric-live-2-20261001`; root `696b2bbd52574ff3f1590ca9d54801d488d45343b90e51aca17bf2f29442f22d`; tx `736b716cd7afbc68b3ddc5a6b0b87e80caef480d93352c26fc515c429b1c48b`; commit block 10. Readback, record mapping and inclusion proof passed. |
| Batch of 3 | Batch `fabric-live-3-20261001`; root `c7f78a7bf009ecbf5b5bf19bd8d4a18d12841326fde0d40ef5904bb083a027f2`; tx `8fbd7667bced0171c364d70a43e26d3128c293ac3da30a0ffdf22676c014d0dc`; commit block 11. Readback, record mapping and inclusion proof passed. |
| Correction lineage | Original anchor tx `38e635e8366a8797400e81d9420e1cb0849f56d714dba30f45414abf66fe3e8a`; correction anchor tx `b01387a168b371135a48cc290c3c8afb83dc2c93c8b04c7806d8de9c8394e1fd`; link tx `492c0a7df5d3d53aee8d8ea29fbbd23d94ea2409c03a63d59f5653bd488855de`. `ReadCorrectionLink` returned the link; querying the original returned its original hash and anchor unchanged. |
| Tampering / invalid proof | `VerifyAnchorReference` with a substituted hash returned `verified=false`, `HASH_MISMATCH`; batch verification with a nonmember leaf returned `verified=false`. A focused backend verifier test, run with `DLT_MODE=FABRIC`, finalized and anchored a record, mutated its stored compliance field, then returned `TAMPER_DETECTED`. |

Multi-organization endorsement was exercised under the committed 2-of-3 policy. Facility and Auditor peer logs show both endorsing the treatment anchor and 2-leaf batch; Facility and Regulator logs show both endorsing the correction transactions; Facility, Auditor and Regulator logs show the 3-leaf batch proposal. These commits were VALID. The single-endorser negative case was **not tested**: the CLI invocation failed while parsing its constructor JSON under Windows/PowerShell quoting (`invalid character 'A' looking for beginning of object key string`), before proposal submission. No negative-test transaction reached the network.

Simulation remains separate: Fabric health and transaction responses report `FABRIC`, actual transaction IDs and ledger state. The passing backend DLT tests include simulation behavior and Fabric-unavailable/no-silent-fallback assertions; a separate live application run with Fabric stopped was not performed.

## Fixes applied during validation

1. Upgraded the active Fabric image pin from 2.5.9 to 2.5.15, retaining Docker 29.8.1.
2. Set chaincode containers to the existing `aquatrust-fabric` Docker network so they can resolve peer endpoints.
3. Removed invalid cross-MSP gossip bootstrap peers and disabled the stock loopback bootstrap default for these single-peer organizations.
4. Updated the existing channel config with the anchor peers already specified by the repository's configtx configuration.
5. Made chaincode write timestamps deterministic from the Fabric proposal timestamp. The prior wall-clock timestamp differed among endorsers, causing Fabric Gateway's chaincode event mismatch and failed endorsements.
6. Packaged and deployed chaincode as version 1.0.1 / sequence 2, preserving the existing 2-of-3 endorsement policy.

## Tests and blockers

- Chaincode `npm test`: **5 passed**.
- Focused DLT backend suite (`test_dlt_gateway_corrections.py`, `test_dlt_merkle.py`, `test_dlt_verification.py`): **32 passed**.
- Focused backend verifier test with live Fabric: **1 passed**, including the stored-field tamper case.
- Fabric client `npm run build`: **passed**.
- Full backend run excluding migration collection: **128 passed, 1 failed**. The known unrelated `tests/test_errors.py::test_422_validation_error_structure` failure is `AttributeError: starlette.status.HTTP_422_UNPROCESSABLE_CONTENT`.
- Full backend collection also cannot collect `tests/test_database_migrations.py`: `ModuleNotFoundError: No module named 'alembic.config'`. Alembic was not changed.
- Pydantic deprecation and scikit-learn pickle-version warnings were emitted. They did not block the Fabric/DLT tests.
- Not tested: deliberately insufficient endorsement negative case; full browser/frontend integration; separate app startup in Simulation mode with Fabric offline; API-level correction workflow (the real chaincode correction operations were submitted and queried directly through Gateway).

## File changes

Validation-related edits: `environment/fabric-version.env`, the archived package's matching Fabric version env file, `dlt/README.md`, `dlt/network/docker-compose.yaml`, `dlt/network/scripts/generate-artifacts.sh`, `dlt/network/scripts/deploy-chaincode.sh`, `dlt/chaincode/aquatrust-records/package.json`, its lockfile, `src/recordContract.ts`, and its unit test. The report files are new. Pre-existing backend/DLT working-tree changes were preserved; they are not attributed to this validation run.

## Commands used

- `bash dlt/network/scripts/start-network.sh` (through WSL; preserved volumes and crypto).
- Fabric CLI lifecycle: package with `peer lifecycle chaincode package`; install on all three peers; approve from all three organizations; `checkcommitreadiness`; commit; query installed/committed definitions. Commands used the `hyperledger/fabric-tools:2.5.15` image.
- `peer channel getinfo -c aquatrust-channel` from each organization identity.
- Backend HTTP operations: `POST /api/v1/treatment-records/finalize`, `POST /api/v1/dlt/anchors/{id}/reconcile`, `POST /api/v1/verification/verify-record/{id}`, and DLT anchor/history/transaction/batch endpoints.
- Fabric Gateway `invoke`/`query` operations for anchor, correction-link and batch functions.
- `npm test` in `dlt/chaincode/aquatrust-records`; `npm run build` in `dlt/fabric-client`; focused DLT pytest commands and `pytest -q --ignore=tests/test_database_migrations.py` in `backend`.
