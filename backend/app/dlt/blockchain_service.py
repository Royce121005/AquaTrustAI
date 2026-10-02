"""Transport adapters for the AquaTrust DLT facade.

Fabric mode submits and evaluates chaincode through the private Node.js Fabric
Gateway adapter. Simulation mode returns explicit simulation references and is
never reported as distributed consensus.
"""

import json
import os
from typing import Any, Dict, List, Protocol
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from uuid import uuid4


class BlockchainService(Protocol):
    mode: str

    def invoke(self, function: str, args: List[str]) -> Dict[str, Any]: ...
    def query(self, function: str, args: List[str]) -> Dict[str, Any]: ...


class FabricBlockchainService:
    """Actual Fabric Gateway transport; errors never fall back to simulation."""

    mode = "FABRIC"

    def __init__(self, base_url: str | None = None, token: str | None = None):
        self.base_url = (base_url or os.getenv("FABRIC_BRIDGE_URL", "http://127.0.0.1:8099")).rstrip("/")
        self.token = token if token is not None else os.getenv("FABRIC_BRIDGE_TOKEN", "")

    def invoke(self, function: str, args: List[str]) -> Dict[str, Any]:
        return self._request("invoke", function, args)

    def query(self, function: str, args: List[str]) -> Dict[str, Any]:
        return self._request("query", function, args)

    def health(self) -> Dict[str, Any]:
        if not self.token:
            raise RuntimeError("FABRIC_BRIDGE_TOKEN is required in FABRIC mode")
        req = Request(f"{self.base_url}/health", headers={"Authorization": f"Bearer {self.token}"})
        try:
            with urlopen(req, timeout=float(os.getenv("FABRIC_BRIDGE_TIMEOUT_SECONDS", "5"))) as response:
                body = json.loads(response.read().decode("utf-8"))
        except (HTTPError, URLError, TimeoutError, OSError) as exc:
            raise RuntimeError(f"Fabric health check failed: {exc}") from exc
        if not isinstance(body, dict) or body.get("mode") != "FABRIC" or not body.get("online"):
            raise RuntimeError("Fabric Gateway reports that the configured channel/chaincode is unavailable")
        return body

    def _request(self, operation: str, function: str, args: List[str]) -> Dict[str, Any]:
        if not self.token:
            raise RuntimeError("FABRIC_BRIDGE_TOKEN is required in FABRIC mode")
        req = Request(
            f"{self.base_url}/{operation}",
            data=json.dumps({"function": function, "args": args}).encode("utf-8"),
            headers={"Content-Type": "application/json", "Authorization": f"Bearer {self.token}"},
            method="POST",
        )
        try:
            with urlopen(req, timeout=float(os.getenv("FABRIC_BRIDGE_TIMEOUT_SECONDS", "15"))) as response:
                body = json.loads(response.read().decode("utf-8"))
        except (HTTPError, URLError, TimeoutError, OSError) as exc:
            detail = str(exc)
            if isinstance(exc, HTTPError):
                try:
                    detail = exc.read().decode("utf-8")
                except OSError:
                    pass
            raise RuntimeError(f"Fabric Gateway request failed: {detail}") from exc
        if not isinstance(body, dict) or "result" not in body:
            raise RuntimeError("Fabric Gateway returned a malformed response")
        return body


class SimulationBlockchainService:
    """Simulation identity helper; it produces no Fabric transaction/block IDs."""

    mode = "SIMULATION"
    distributed_ledger = False

    @staticmethod
    def new_reference() -> str:
        return f"sim:{uuid4()}"

    @staticmethod
    def status() -> Dict[str, Any]:
        return {"mode": "SIMULATION", "distributed_ledger": False, "simulation_only": True}
