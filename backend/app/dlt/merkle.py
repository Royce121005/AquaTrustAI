"""
AquaTrust AI — Industrial Merkle Batch Tree Engine
Conforms to RFC 6962 / NIST standards for cryptographic transparency trees.

Provides:
1. Deterministic leaf hashing with domain separation (0x00 for leaves, 0x01 for interior nodes).
2. Merkle Root computation over arbitrary batches of sensor telemetry or treatment records.
3. Cryptographic Audit Path (Inclusion Proof) generation in O(log N) time.
4. Independent proof verification without needing access to the rest of the batch.
"""

import hashlib
from typing import List, Dict, Any, Tuple, Optional


def hash_leaf(data_bytes: bytes) -> bytes:
    """Computes SHA-256 leaf hash with 0x00 prefix to prevent second-preimage collision attacks."""
    hasher = hashlib.sha256()
    hasher.update(b"\x00")
    hasher.update(data_bytes)
    return hasher.digest()


def hash_children(left: bytes, right: bytes) -> bytes:
    """Computes SHA-256 interior node hash with 0x01 prefix."""
    hasher = hashlib.sha256()
    hasher.update(b"\x01")
    hasher.update(left)
    hasher.update(right)
    return hasher.digest()


class MerkleTree:
    """
    Binary Merkle Tree for batching high-frequency IoT sensor telemetry
    before anchoring to the Hyperledger Fabric ledger.
    """

    def __init__(self, leaves: List[bytes]):
        if not leaves:
            raise ValueError("Cannot construct a Merkle Tree from an empty leaf list")

        self.raw_leaves: List[bytes] = list(leaves)
        self.leaf_hashes: List[bytes] = [hash_leaf(leaf) for leaf in self.raw_leaves]
        self.levels: List[List[bytes]] = [self.leaf_hashes]
        self._build_tree()

    def _build_tree(self) -> None:
        """Constructs tree levels from leaves up to the root."""
        current_level = self.leaf_hashes

        while len(current_level) > 1:
            next_level: List[bytes] = []
            for i in range(0, len(current_level), 2):
                left = current_level[i]
                if i + 1 < len(current_level):
                    right = current_level[i + 1]
                else:
                    # RFC 6962 carries an unmatched rightmost node to the next level.
                    next_level.append(left)
                    continue
                next_level.append(hash_children(left, right))

            self.levels.append(next_level)
            current_level = next_level

    @property
    def root(self) -> bytes:
        """Returns the 32-byte binary Merkle Root."""
        return self.levels[-1][0]

    @property
    def root_hex(self) -> str:
        """Returns the 64-character lowercase hexadecimal Merkle Root."""
        return self.root.hex().lower()

    def get_audit_proof(self, leaf_index: int) -> List[Dict[str, str]]:
        """
        Generates an O(log N) inclusion proof for the leaf at leaf_index.
        Each proof step contains:
          - 'direction': 'left' or 'right' indicating sibling position
          - 'hash': 64-character lowercase hex digest of the sibling
        """
        if leaf_index < 0 or leaf_index >= len(self.leaf_hashes):
            raise IndexError(f"Leaf index {leaf_index} out of bounds (0 to {len(self.leaf_hashes) - 1})")

        proof: List[Dict[str, str]] = []
        idx = leaf_index

        for level in self.levels[:-1]:
            if idx % 2 == 0:
                # A rightmost unpaired node is carried up without adding a proof step.
                sibling_idx = idx + 1
                if sibling_idx >= len(level):
                    idx //= 2
                    continue
                direction = "right"
            else:
                # Target is right child, sibling is left
                sibling_idx = idx - 1
                direction = "left"

            sibling_hash = level[sibling_idx].hex().lower()
            proof.append({"direction": direction, "hash": sibling_hash})
            idx //= 2

        return proof

    @staticmethod
    def verify_proof(leaf_bytes: bytes, proof: List[Dict[str, str]], expected_root_hex: str) -> bool:
        """
        Independently verifies whether leaf_bytes is part of the Merkle Tree
        with root expected_root_hex, given the audit proof path.
        """
        try:
            if len(expected_root_hex) != 64:
                return False
            current_hash = hash_leaf(leaf_bytes)
            for step in proof:
                if step.get("direction") not in {"left", "right"}:
                    return False
                sibling = bytes.fromhex(step["hash"])
                if len(sibling) != 32:
                    return False
                if step["direction"] == "right":
                    current_hash = hash_children(current_hash, sibling)
                else:
                    current_hash = hash_children(sibling, current_hash)
            return current_hash.hex().lower() == expected_root_hex.lower()
        except (KeyError, TypeError, ValueError):
            return False
