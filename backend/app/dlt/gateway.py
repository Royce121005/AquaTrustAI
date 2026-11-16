"""AquaTrust AI — Hyperledger Fabric DLT Gateway.

Provides a unified interface over Fabric Gateway and an explicit local simulator.
Simulation references and sequence numbers are never presented as Fabric transaction
IDs or blocks; Fabric mode never falls back to simulation state.
"""

import json
import os
import threading
import hashlib
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List, Union
from uuid import UUID

from app.dlt.blockchain_service import FabricBlockchainService, SimulationBlockchainService
from app.dlt.merkle import MerkleTree


class FabricDLTGateway:
    """Gateway orchestrating anchoring, ledger state verification, mock ledger queries, and correction links."""

    CHANNEL_NAME = "aquatrust-channel"
    CHAINCODE_NAME = "aquatrust-records"
    DEFAULT_PEER_ENDPOINT = "peer0.facility.aquatrust.internal:7051"

    def __init__(
        self,
        mode: Optional[str] = None,
        peer_endpoint: Optional[str] = None,
        channel_name: Optional[str] = None,
        chaincode_name: Optional[str] = None,
    ):
        configured_mode = (mode or os.getenv("DLT_MODE") or os.getenv("DLT_GATEWAY_MODE") or "SIMULATION").strip().upper()
        if configured_mode == "LIVE":
            configured_mode = "FABRIC"
        if configured_mode not in {"FABRIC", "SIMULATION"}:
            raise ValueError("DLT mode must be FABRIC or SIMULATION")
        self.mode = configured_mode
        self._blockchain_service = FabricBlockchainService() if self.mode == "FABRIC" else SimulationBlockchainService()
        self.peer_endpoint = peer_endpoint or os.getenv("DLT_PEER_ENDPOINT", self.DEFAULT_PEER_ENDPOINT)
        self.channel_name = channel_name or os.getenv("DLT_CHANNEL_NAME", self.CHANNEL_NAME)
        self.chaincode_name = chaincode_name or os.getenv("DLT_CHAINCODE_NAME", self.CHAINCODE_NAME)
        self._storage_path = os.getenv("DLT_SIMULATION_STATE_PATH", os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "aquatrust_simulation_state.json"))
        self._mock_ledger: Dict[str, Dict[str, Any]] = {}
        self._simulation_sequence: int = 0
        self._lock = threading.RLock()
        self._status: str = "simulation" if self.mode == "SIMULATION" else "unavailable"
        self._last_error: Optional[str] = None
        self._load_ledger()

    def _load_ledger(self) -> None:
        """Load persisted ledger entries from disk in simulation mode."""
        with self._lock:
            if self._storage_path and os.path.exists(self._storage_path):
                try:
                    with open(self._storage_path, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        self._mock_ledger.update(data.get("entries", {}))
                        self._simulation_sequence = max(self._simulation_sequence, data.get("simulation_sequence", 0))
                except Exception:
                    pass

    def _save_ledger(self) -> None:
        """Persist current ledger entries atomically to disk to ensure survival across process restarts."""
        with self._lock:
            if self._storage_path:
                try:
                    dirname = os.path.dirname(os.path.abspath(self._storage_path))
                    os.makedirs(dirname, exist_ok=True)
                    tmp_path = f"{self._storage_path}.tmp.{os.getpid()}"
                    with open(tmp_path, "w", encoding="utf-8") as f:
                        json.dump({"simulation_sequence": self._simulation_sequence, "entries": self._mock_ledger}, f)
                    os.replace(tmp_path, self._storage_path)
                except Exception:
                    pass

    @property
    def is_connected(self) -> bool:
        """Return True if gateway is operational."""
        return self._status in ("connected", "online", "ready")

    def get_status(self) -> Dict[str, Any]:
        """Return detailed status and configuration of the gateway."""
        if self.mode == "FABRIC":
            try:
                self._blockchain_service.health()
                self._status, self._last_error = "connected", None
            except RuntimeError as exc:
                self._status, self._last_error = "unavailable", str(exc)
        return {
            "mode": self.mode,
            "status": self._status,
            "is_connected": self.is_connected,
            "distributed_ledger": self.mode == "FABRIC" and self.is_connected,
            "simulation_only": self.mode == "SIMULATION",
            "last_error": self._last_error,
            "peer_endpoint": self.peer_endpoint,
            "channel": self.channel_name,
            "chaincode": self.chaincode_name,
            "simulation_sequence": self._simulation_sequence if self.mode == "SIMULATION" else None,
            "simulated_entries_count": len(self._mock_ledger) if self.mode == "SIMULATION" else None,
        }

    def set_status(self, status: str) -> None:
        """Update gateway operational status (e.g., 'connected', 'degraded', 'offline')."""
        self._status = status

    def reset_ledger(self) -> None:
        """Reset mock ledger state for test isolation."""
        with self._lock:
            self._mock_ledger.clear()
            self._simulation_sequence = 0
            if self._storage_path and os.path.exists(self._storage_path):
                try:
                    os.remove(self._storage_path)
                except Exception:
                    pass

    def anchor_record(
        self,
        record_id: UUID,
        record_hash: str,
        facility_id: UUID,
        compliance_status: str,
        signature_value: str,
        key_id: str,
    ) -> Dict[str, Any]:
        """Anchor a finalized record in Fabric or explicitly labeled local simulation."""
        if len(record_hash) != 64 or any(c not in "0123456789abcdef" for c in record_hash):
            raise ValueError("record_hash must be a lowercase SHA-256 digest")
        if self.mode == "FABRIC":
            payload = {
                "recordId": str(record_id), "recordHash": record_hash,
                "hashAlgorithm": "SHA-256", "signatureAlgorithm": "ES256",
                "signatureKeyId": key_id,
                "signatureReference": f"cryptographic_artifacts:{record_id}:{key_id}",
                "facilityId": str(facility_id), "complianceStatus": compliance_status,
                "anchorType": "TREATMENT_RECORD", "schemaVersion": "aquatrust-anchor-v1",
            }
            try:
                bridge = self._fabric_request("invoke", "CreateAnchor", [json.dumps(payload, separators=(",", ":"))])
                result = bridge["result"]
                tx_id = result.get("transactionId") or bridge.get("transactionId")
                if not tx_id:
                    raise RuntimeError("Fabric Gateway returned no committed transaction ID")
                self._status, self._last_error = "connected", None
                adapted = self._adapt_anchor(result, tx_id)
                adapted["block_number"] = bridge.get("blockNumber")
                return adapted
            except RuntimeError as exc:
                self._status, self._last_error = "unavailable", str(exc)
                return {
                    "docType": "record_anchor", "record_id": str(record_id),
                    "record_hash": record_hash, "canonical_hash": record_hash,
                    "channel_id": self.channel_name, "chaincode": self.chaincode_name,
                    "status": "failed", "mode": "FABRIC", "tx_id": None,
                    "block_number": None, "failure": str(exc), "distributed_ledger": False,
                }
        with self._lock:
            self._simulation_sequence += 1
            simulation_reference = self._blockchain_service.new_reference()

            dlt_record = {
                "tx_id": None,
                "simulation_reference": simulation_reference,
                "simulation_sequence": self._simulation_sequence,
                "channel_id": self.channel_name,
                "chaincode": self.chaincode_name,
                "docType": "record_anchor",
                "record_id": str(record_id),
                "record_hash": record_hash,
                "facility_id": str(facility_id),
                "compliance_status": compliance_status,
                "signature_metadata": {"algorithm": "ES256", "key_id": key_id, "signature": signature_value[:32] + "..."},
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "status": "anchored",
                "mode": "SIMULATION",
                "distributed_ledger": False,
            }

            self._mock_ledger[str(record_id)] = dlt_record
            self._mock_ledger[simulation_reference] = dlt_record
            self._save_ledger()

            return dlt_record

    def record_correction_link(
        self,
        original_record_id: UUID,
        corrected_record_id: UUID,
        reason: str,
    ) -> Dict[str, Any]:
        """
        Record an append-only correction linkage on the DLT ledger.
        Commits docType='correction_link' with transaction ID, block number, and audit references.
        """
        if self.mode == "FABRIC":
            original = self.query_record_anchor(original_record_id)
            corrected = self.query_record_anchor(corrected_record_id)
            if not original or not corrected:
                raise RuntimeError("Both immutable record anchors must exist before linking a correction")
            payload = {
                "originalRecordId": str(original_record_id),
                "originalHash": original.get("record_hash") or original.get("recordHash"),
                "correctionRecordId": str(corrected_record_id),
                "correctionHash": corrected.get("record_hash") or corrected.get("recordHash"),
                "correctionReason": reason,
            }
            bridge = self._fabric_request("invoke", "RecordCorrectionLink", [json.dumps(payload, separators=(",", ":"))])
            result = bridge["result"]
            tx_id = result.get("transactionId") or bridge.get("transactionId")
            if not tx_id:
                raise RuntimeError("Fabric Gateway returned no committed correction-link transaction ID")
            result.update({"tx_id": tx_id, "channel_id": self.channel_name, "chaincode": self.chaincode_name, "status": "anchored", "mode": "FABRIC", "block_number": bridge.get("blockNumber"), "distributed_ledger": True})
            return result

        original = self._mock_ledger.get(str(original_record_id))
        corrected = self._mock_ledger.get(str(corrected_record_id))
        if not original or not corrected:
            raise RuntimeError("Both simulated record anchors must exist before creating a correction link")
        with self._lock:
            self._simulation_sequence += 1
            simulation_reference = self._blockchain_service.new_reference()

            correction_record = {
                "tx_id": None,
                "simulation_reference": simulation_reference,
                "simulation_sequence": self._simulation_sequence,
                "channel_id": self.channel_name,
                "chaincode": self.chaincode_name,
                "docType": "correction_link",
                "original_record_id": str(original_record_id),
                "original_hash": original.get("record_hash"),
                "corrected_record_id": str(corrected_record_id),
                "correction_hash": corrected.get("record_hash"),
                "reason": reason,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "status": "anchored",
                "mode": "SIMULATION",
                "distributed_ledger": False,
                "organization": "SIMULATION",
            }

            self._mock_ledger[f"correction:{original_record_id}:{corrected_record_id}"] = correction_record
            self._mock_ledger[f"correction:{original_record_id}"] = correction_record
            self._mock_ledger[f"correction:{corrected_record_id}"] = correction_record
            self._mock_ledger[simulation_reference] = correction_record
            self._save_ledger()

            return correction_record

    def query_correction_link(
        self,
        original_record_id: UUID,
        corrected_record_id: Optional[UUID] = None,
    ) -> Optional[Dict[str, Any]]:
        """Query correction link on the DLT ledger."""
        if self.mode == "FABRIC":
            if not corrected_record_id:
                return None
            try:
                res = self._fabric_request("query", "ReadCorrectionLink", [str(original_record_id), str(corrected_record_id)])["result"]
                if isinstance(res, dict):
                    res["original_record_id"] = res.get("originalRecordId") or res.get("original_record_id")
                    res["corrected_record_id"] = res.get("correctionRecordId") or res.get("corrected_record_id")
                return res
            except RuntimeError:
                return None
        if corrected_record_id:
            return self._mock_ledger.get(f"correction:{original_record_id}:{corrected_record_id}")
        return self._mock_ledger.get(f"correction:{original_record_id}")

    def anchor_batch(
        self,
        batch_id: Optional[str],
        record_hashes: List[str],
        facility_id: Union[UUID, str],
        key_id: str = "key-ecdsa-p256-01",
        record_ids: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Anchor a high-frequency telemetry batch using an RFC 6962 binary Merkle Tree.
        Commits only the Merkle Root to the ledger while storing inclusion proofs for each leaf.
        """
        if not record_hashes:
            raise ValueError("Cannot anchor an empty batch of hashes")
        if any(len(value) != 64 or any(c not in "0123456789abcdef" for c in value) for value in record_hashes):
            raise ValueError("record_hashes must contain lowercase SHA-256 digests")
        if record_ids is not None and len(record_ids) != len(record_hashes):
            raise ValueError("record_ids and record_hashes must have equal length")
        ids = record_ids or record_hashes
        batch_id = batch_id or self.generate_batch_id(ids, record_hashes)

        leaves = [h.encode("utf-8") for h in record_hashes]
        tree = MerkleTree(leaves)
        merkle_root = tree.root_hex
        proofs = {h: tree.get_audit_proof(idx) for idx, h in enumerate(record_hashes)}

        if self.mode == "FABRIC":
            batch_input = {
                "batchId": batch_id, "merkleRoot": merkle_root,
                "leafCount": len(record_hashes), "recordIds": ids,
                "leafHashes": record_hashes, "hashAlgorithm": "SHA-256",
                "schemaVersion": "aquatrust-anchor-v1",
            }
            bridge = self._fabric_request("invoke", "CreateBatchAnchor", [json.dumps(batch_input, separators=(",", ":"))])
            result = bridge["result"]
            tx_id = result.get("transactionId") or bridge.get("transactionId")
            if not tx_id:
                raise RuntimeError("Fabric Gateway returned no committed batch transaction ID")
            return {
                "tx_id": tx_id, "simulation_reference": None, "block_number": bridge.get("blockNumber"),
                "channel_id": self.channel_name, "chaincode": self.chaincode_name,
                "docType": "batch_anchor", "batch_id": batch_id,
                "merkle_root": result["merkleRoot"], "leaf_count": result["leafCount"],
                "record_ids": ids, "facility_id": str(facility_id),
                "signature_metadata": {"algorithm": "ES256", "key_id": key_id},
                "timestamp": result["timestamp"], "proofs": proofs,
                "status": "anchored", "mode": "FABRIC", "distributed_ledger": True,
            }

        self._simulation_sequence += 1
        simulation_reference = self._blockchain_service.new_reference()

        batch_record = {
            "tx_id": None,
            "simulation_reference": simulation_reference,
            "simulation_sequence": self._simulation_sequence,
            "channel_id": self.channel_name,
            "chaincode": self.chaincode_name,
            "docType": "batch_anchor",
            "batch_id": batch_id,
            "merkle_root": merkle_root,
            "leaf_count": len(record_hashes),
            "record_ids": ids,
            "facility_id": str(facility_id),
            "signature_metadata": {"algorithm": "ES256", "key_id": key_id},
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "proofs": proofs,
            "status": "anchored",
            "mode": "SIMULATION",
            "distributed_ledger": False,
        }

        self._mock_ledger[batch_id] = batch_record
        self._mock_ledger[simulation_reference] = batch_record
        for record_id, record_hash in zip(ids, record_hashes):
            self._mock_ledger[f"batch-record:{record_id}"] = {
                "batch_id": batch_id, "merkle_root": merkle_root,
                "leaf_hash": record_hash, "proof": proofs[record_hash],
                "mode": "SIMULATION", "distributed_ledger": False,
            }
        self._save_ledger()

        return batch_record

    def verify_batch_leaf(self, batch_id: str, leaf_hash: str) -> bool:
        """Verify whether an individual reading's hash is cryptographically included in the anchored batch."""
        if self.mode == "FABRIC":
            try:
                batch = self.query_batch(batch_id)
                if not batch or leaf_hash not in batch.get("leafHashes", []):
                    return False
                leaves = [value.encode("utf-8") for value in batch["leafHashes"]]
                tree = MerkleTree(leaves)
                index = batch["leafHashes"].index(leaf_hash)
                return tree.root_hex == batch.get("merkleRoot") and MerkleTree.verify_proof(
                    leaf_hash.encode("utf-8"), tree.get_audit_proof(index), batch["merkleRoot"]
                )
            except (RuntimeError, ValueError, KeyError):
                return False
        batch = self.query_batch(batch_id)
        if not batch or "proofs" not in batch or leaf_hash not in batch["proofs"]:
            return False

        proof = batch["proofs"][leaf_hash]
        expected_root = batch["merkle_root"]
        return MerkleTree.verify_proof(leaf_hash.encode("utf-8"), proof, expected_root)

    def query_record_anchor(self, record_id: UUID) -> Optional[Dict[str, Any]]:
        """Query anchored ledger state for a treatment record."""
        if self.mode == "FABRIC":
            try:
                return self._adapt_anchor(self._fabric_request("query", "ReadAnchor", [str(record_id)])["result"])
            except RuntimeError:
                return None
        rec_str = str(record_id)
        if rec_str in self._mock_ledger:
            return self._mock_ledger[rec_str]
        # In simulation mode, restore anchor from database if present
        try:
            from app.db.session import SessionLocal
            from app.models.dlt_anchor import DLTAnchor
            with SessionLocal() as db:
                row = db.query(DLTAnchor).filter(DLTAnchor.record_id == record_id).first()
                if row:
                    net_ref = row.network_reference or {}
                    entry = {
                        "tx_id": row.transaction_id,
                        "simulation_reference": net_ref.get("simulation_reference"),
                        "simulation_sequence": net_ref.get("simulation_sequence", 1),
                        "channel_id": net_ref.get("channel", self.channel_name),
                        "chaincode": net_ref.get("chaincode", self.chaincode_name),
                        "docType": "record_anchor",
                        "record_id": str(row.record_id),
                        "record_hash": row.canonical_hash,
                        "canonical_hash": row.canonical_hash,
                        "facility_id": str(row.facility_id),
                        "compliance_status": row.compliance_status,
                        "status": "anchored" if row.anchor_status in ("anchored", "confirmed", "pending") else row.anchor_status,
                        "mode": "SIMULATION",
                        "distributed_ledger": False,
                    }
                    with self._lock:
                        self._mock_ledger[rec_str] = entry
                    return entry
        except Exception:
            pass
        return None

    def query_transaction(self, tx_id: str) -> Optional[Dict[str, Any]]:
        """Query transaction by transaction ID."""
        if self.mode == "FABRIC":
            try:
                return self._adapt_anchor(self._fabric_request("query", "GetTransactionById", [tx_id])["result"], tx_id)
            except RuntimeError:
                return None
        return self._mock_ledger.get(tx_id)

    def query_batch(self, batch_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve the compact on-chain batch commitment and membership list."""
        if self.mode == "FABRIC":
            try:
                return self._fabric_request("query", "ReadBatchAnchor", [batch_id])["result"]
            except RuntimeError:
                return None
        res = self._mock_ledger.get(batch_id)
        if not res:
            self._load_ledger()
            res = self._mock_ledger.get(batch_id)
        return res

    def query_batch_for_record(self, record_id: str) -> Optional[Dict[str, Any]]:
        """Read the membership index for a finalized record."""
        if self.mode == "FABRIC":
            try:
                return self._fabric_request("query", "GetBatchForRecord", [record_id])["result"]
            except RuntimeError:
                return None
        return self._mock_ledger.get(f"batch-record:{record_id}")

    def query_anchor_history(self, record_id: UUID) -> List[Dict[str, Any]]:
        """Read committed Fabric key history or a clearly identified simulation event."""
        if self.mode == "FABRIC":
            try:
                result = self._fabric_request("query", "GetAnchorHistory", [str(record_id)])["result"]
                return result if isinstance(result, list) else []
            except RuntimeError:
                return []
        anchor = self._mock_ledger.get(str(record_id))
        if not anchor:
            return []
        return [{
            "timestamp": anchor.get("timestamp"),
            "record_id": str(record_id),
            "operation": "SIMULATED_CREATE_ANCHOR",
            "simulation_reference": anchor.get("simulation_reference"),
            "organization": "SIMULATION",
            "status": "SIMULATED",
            "record_hash": anchor.get("record_hash"),
            "distributed_ledger": False,
        }]

    @staticmethod
    def generate_batch_id(record_ids: List[str], record_hashes: List[str]) -> str:
        """Derive an idempotent batch identifier from ordered record/hash pairs."""
        payload = json.dumps(list(zip(record_ids, record_hashes)), separators=(",", ":"), ensure_ascii=False)
        return f"batch-{hashlib.sha256(payload.encode('utf-8')).hexdigest()}"

    def query_anchor_by_hash(self, canonical_hash: str) -> Optional[Dict[str, Any]]:
        """Query anchored ledger state by canonical hash (mirrors GetAnchorByHash)."""
        if not canonical_hash:
            return None
        if self.mode == "FABRIC":
            try:
                return self._adapt_anchor(self._fabric_request("query", "GetAnchorByHash", [canonical_hash])["result"])
            except RuntimeError:
                return None
        target = canonical_hash.lower()
        for k, v in self._mock_ledger.items():
            if isinstance(v, dict):
                rec_hash = (v.get("record_hash") or v.get("canonical_hash") or "").lower()
                if rec_hash == target and v.get("docType") in ("record_anchor", "anchor"):
                    return v
        return None

    def _adapt_anchor(self, value: Dict[str, Any], tx_id: Optional[str] = None) -> Dict[str, Any]:
        """Map the chaincode contract's camelCase fields to the existing DLT API shape."""
        if not isinstance(value, dict):
            raise RuntimeError("Fabric chaincode returned an invalid response")
        return {
            **value,
            "record_id": value.get("recordId"),
            "record_hash": value.get("recordHash"),
            "canonical_hash": value.get("recordHash"),
            "tx_id": tx_id or value.get("transactionId"),
            "channel_id": self.channel_name,
            "chaincode": self.chaincode_name,
            "block_number": value.get("blockNumber"),
            "status": value.get("status", "anchored"),
            "mode": "FABRIC",
            "distributed_ledger": True,
        }

    def _fabric_request(self, operation: str, function: str, args: List[str]) -> Dict[str, Any]:
        """Call the authenticated private Fabric Gateway adapter without simulation fallback."""
        service = self._blockchain_service
        if operation == "invoke":
            result = service.invoke(function, args)
        elif operation == "query":
            result = service.query(function, args)
        else:
            raise ValueError(f"Unsupported Fabric operation {operation}")
        self._status, self._last_error = "connected", None
        return result

    @classmethod
    def to_dlt_compliance_status(cls, app_status: str) -> str:
        """Map application compliance status to DLT smart contract representation."""
        status_map = {
            "compliant": "COMPLIANT",
            "non_compliant": "NON_COMPLIANT",
            "marginal": "MARGINAL",
            "not_applicable": "N_A",
        }
        return status_map.get(app_status, "PENDING")

    @classmethod
    def from_dlt_compliance_status(cls, dlt_status: str) -> str:
        """Map DLT smart contract compliance status to application representation."""
        status_map = {
            "COMPLIANT": "compliant",
            "NON_COMPLIANT": "non_compliant",
            "MARGINAL": "marginal",
            "N_A": "not_applicable",
        }
        return status_map.get(dlt_status, "pending")


# Global singleton gateway
dlt_gateway = FabricDLTGateway()
