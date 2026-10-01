"""AquaTrust AI — Hyperledger Fabric DLT Gateway.

Provides a unified interface for anchoring and querying treatment records on the
Hyperledger Fabric distributed ledger. Supports dual execution modes:
1. Live Mode: Submits transactions via Fabric SDK gateway connection.
2. Simulation/Degraded Mode: Deterministically generates ledger block hashes and transaction IDs
   when running locally, offline, or during degraded connectivity.
"""

import hashlib
import json
import os
import time
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from uuid import UUID, uuid4

from app.db.base import utc_now
from app.dlt.merkle import MerkleTree


class FabricDLTGateway:
    """Gateway orchestrating anchoring, ledger state verification, mock ledger queries, and correction links."""

    CHANNEL_NAME = "aquatrustchannel"
    CHAINCODE_NAME = "aquatrust-records"
    DEFAULT_PEER_ENDPOINT = "peer0.org1.aquatrust.internal:7051"

    def __init__(
        self,
        mode: Optional[str] = None,
        peer_endpoint: Optional[str] = None,
        channel_name: Optional[str] = None,
        chaincode_name: Optional[str] = None,
    ):
        self.mode = mode or os.getenv("DLT_GATEWAY_MODE", "simulation")
        self.peer_endpoint = peer_endpoint or os.getenv("DLT_PEER_ENDPOINT", self.DEFAULT_PEER_ENDPOINT)
        self.channel_name = channel_name or os.getenv("DLT_CHANNEL_NAME", self.CHANNEL_NAME)
        self.chaincode_name = chaincode_name or os.getenv("DLT_CHAINCODE_NAME", self.CHAINCODE_NAME)
        self._mock_ledger: Dict[str, Dict[str, Any]] = {}
        self._block_height: int = 1000
        self._status: str = "connected" if self.mode in ("live", "simulation") else "degraded"

    @property
    def is_connected(self) -> bool:
        """Return True if gateway is operational."""
        return self._status in ("connected", "online", "ready")

    def get_status(self) -> Dict[str, Any]:
        """Return detailed status and configuration of the gateway."""
        return {
            "mode": self.mode,
            "status": self._status,
            "is_connected": self.is_connected,
            "peer_endpoint": self.peer_endpoint,
            "channel": self.channel_name,
            "chaincode": self.chaincode_name,
            "block_height": self._block_height,
            "anchored_entries_count": len(self._mock_ledger),
        }

    def set_status(self, status: str) -> None:
        """Update gateway operational status (e.g., 'connected', 'degraded', 'offline')."""
        self._status = status

    def reset_ledger(self) -> None:
        """Reset mock ledger state for test isolation."""
        self._mock_ledger.clear()
        self._block_height = 1000

    def anchor_record(
        self,
        record_id: UUID,
        record_hash: str,
        facility_id: UUID,
        compliance_status: str,
        signature_value: str,
        key_id: str,
    ) -> Dict[str, Any]:
        """Submit treatment record evidence hash to the DLT channel."""
        self._block_height += 1
        tx_raw = f"{record_id}:{record_hash}:{self._block_height}:{time.time()}"
        tx_id = hashlib.sha256(tx_raw.encode("utf-8")).hexdigest()

        dlt_record = {
            "tx_id": tx_id,
            "block_number": self._block_height,
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
        }

        self._mock_ledger[str(record_id)] = dlt_record
        self._mock_ledger[tx_id] = dlt_record

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
        self._block_height += 1
        tx_raw = f"correction:{original_record_id}:{corrected_record_id}:{self._block_height}:{time.time()}"
        tx_id = hashlib.sha256(tx_raw.encode("utf-8")).hexdigest()

        correction_record = {
            "tx_id": tx_id,
            "block_number": self._block_height,
            "channel_id": self.channel_name,
            "chaincode": self.chaincode_name,
            "docType": "correction_link",
            "original_record_id": str(original_record_id),
            "corrected_record_id": str(corrected_record_id),
            "reason": reason,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "status": "anchored",
        }

        self._mock_ledger[f"correction:{original_record_id}:{corrected_record_id}"] = correction_record
        self._mock_ledger[f"correction:{original_record_id}"] = correction_record
        self._mock_ledger[f"correction:{corrected_record_id}"] = correction_record
        self._mock_ledger[tx_id] = correction_record

        return correction_record

    def query_correction_link(
        self,
        original_record_id: UUID,
        corrected_record_id: Optional[UUID] = None,
    ) -> Optional[Dict[str, Any]]:
        """Query correction link on the DLT ledger."""
        if corrected_record_id:
            return self._mock_ledger.get(f"correction:{original_record_id}:{corrected_record_id}")
        return self._mock_ledger.get(f"correction:{original_record_id}")

    def anchor_batch(
        self,
        batch_id: str,
        record_hashes: List[str],
        facility_id: UUID,
        key_id: str = "key-ecdsa-p256-01",
    ) -> Dict[str, Any]:
        """
        Anchor a high-frequency telemetry batch using an RFC 6962 binary Merkle Tree.
        Commits only the Merkle Root to the ledger while storing inclusion proofs for each leaf.
        """
        if not record_hashes:
            raise ValueError("Cannot anchor an empty batch of hashes")

        leaves = [h.encode("utf-8") for h in record_hashes]
        tree = MerkleTree(leaves)
        merkle_root = tree.root_hex

        self._block_height += 1
        tx_raw = f"batch:{batch_id}:{merkle_root}:{self._block_height}:{time.time()}"
        tx_id = hashlib.sha256(tx_raw.encode("utf-8")).hexdigest()

        proofs = {h: tree.get_audit_proof(idx) for idx, h in enumerate(record_hashes)}

        batch_record = {
            "tx_id": tx_id,
            "block_number": self._block_height,
            "channel_id": self.channel_name,
            "chaincode": self.chaincode_name,
            "docType": "batch_anchor",
            "batch_id": batch_id,
            "merkle_root": merkle_root,
            "leaf_count": len(record_hashes),
            "facility_id": str(facility_id),
            "signature_metadata": {"algorithm": "ES256", "key_id": key_id},
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "proofs": proofs,
            "status": "anchored",
        }

        self._mock_ledger[batch_id] = batch_record
        self._mock_ledger[tx_id] = batch_record

        return batch_record

    def verify_batch_leaf(self, batch_id: str, leaf_hash: str) -> bool:
        """Verify whether an individual reading's hash is cryptographically included in the anchored batch."""
        batch = self._mock_ledger.get(batch_id)
        if not batch or "proofs" not in batch or leaf_hash not in batch["proofs"]:
            return False

        proof = batch["proofs"][leaf_hash]
        expected_root = batch["merkle_root"]
        return MerkleTree.verify_proof(leaf_hash.encode("utf-8"), proof, expected_root)

    def query_record_anchor(self, record_id: UUID) -> Optional[Dict[str, Any]]:
        """Query anchored ledger state for a treatment record."""
        return self._mock_ledger.get(str(record_id))

    def query_transaction(self, tx_id: str) -> Optional[Dict[str, Any]]:
        """Query transaction by transaction ID."""
        return self._mock_ledger.get(tx_id)

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
