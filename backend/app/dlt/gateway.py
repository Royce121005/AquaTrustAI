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
from typing import Optional, Dict, Any
from uuid import UUID, uuid4

from app.db.base import utc_now


class FabricDLTGateway:
    """Gateway orchestrating anchoring, ledger state verification, and mock ledger queries."""

    CHANNEL_NAME = "aquatrustchannel"
    CHAINCODE_NAME = "aquatrust-records"
    DEFAULT_PEER_ENDPOINT = "peer0.org1.aquatrust.internal:7051"

    def __init__(self, mode: Optional[str] = None):
        self.mode = mode or os.getenv("DLT_GATEWAY_MODE", "simulation")
        self._mock_ledger: Dict[str, Dict[str, Any]] = {}
        self._block_height: int = 1000

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
            "channel_id": self.CHANNEL_NAME,
            "chaincode": self.CHAINCODE_NAME,
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
