"""
AquaTrust AI — Unit Tests for Industrial Merkle Batch Tree Engine
Validates RFC 6962 compliance, inclusion proofs, and tamper detection.
"""

import pytest
from app.dlt.merkle import MerkleTree, hash_leaf, hash_children


def test_merkle_tree_basic_computation():
    leaves = [b"sensor_reading_1", b"sensor_reading_2", b"sensor_reading_3", b"sensor_reading_4"]
    tree = MerkleTree(leaves)

    assert len(tree.root_hex) == 64
    assert tree.root_hex == tree.root.hex().lower()


def test_merkle_tree_odd_number_of_leaves():
    # RFC 6962 splits 3 leaves as a 2-leaf left tree and a 1-leaf right tree.
    leaves = [b"pH:7.2", b"DO:2.1", b"TSS:14.5"]
    tree = MerkleTree(leaves)

    assert len(tree.root_hex) == 64
    assert len(tree.levels) == 3
    expected = hash_children(hash_children(hash_leaf(leaves[0]), hash_leaf(leaves[1])), hash_leaf(leaves[2]))
    assert tree.root == expected
    for i, leaf in enumerate(leaves):
        assert MerkleTree.verify_proof(leaf, tree.get_audit_proof(i), expected.hex())


def test_merkle_inclusion_proof_valid():
    leaves = [
        b"reading_ph_7.2",
        b"reading_do_2.1",
        b"reading_tss_14.5",
        b"reading_bod_8.0",
        b"reading_cod_32.0",
    ]
    tree = MerkleTree(leaves)
    expected_root = tree.root_hex

    # Test inclusion proof for each leaf
    for i, leaf in enumerate(leaves):
        proof = tree.get_audit_proof(i)
        is_valid = MerkleTree.verify_proof(leaf, proof, expected_root)
        assert is_valid is True, f"Inclusion proof for leaf {i} failed verification"


def test_merkle_tamper_detection():
    leaves = [b"leaf_0", b"leaf_1", b"leaf_2", b"leaf_3"]
    tree = MerkleTree(leaves)
    expected_root = tree.root_hex

    proof_0 = tree.get_audit_proof(0)

    # Tamper with the leaf data
    tampered_leaf = b"leaf_0_tampered"
    assert MerkleTree.verify_proof(tampered_leaf, proof_0, expected_root) is False

    # Tamper with the proof itself
    tampered_proof = list(proof_0)
    tampered_proof[0] = {"direction": "right", "hash": "0" * 64}
    assert MerkleTree.verify_proof(leaves[0], tampered_proof, expected_root) is False


def test_merkle_empty_leaves_raises():
    with pytest.raises(ValueError):
        MerkleTree([])


def test_single_leaf_has_empty_valid_proof():
    tree = MerkleTree([b"one finalized record hash"])
    assert tree.get_audit_proof(0) == []
    assert MerkleTree.verify_proof(b"one finalized record hash", [], tree.root_hex)


@pytest.mark.parametrize("size", [2, 3, 5, 17, 64])
def test_rfc6962_proofs_for_every_leaf_in_odd_and_large_batches(size):
    leaves = [f"record-hash-{i}".encode() for i in range(size)]
    tree = MerkleTree(leaves)
    for index, leaf in enumerate(leaves):
        assert MerkleTree.verify_proof(leaf, tree.get_audit_proof(index), tree.root_hex)
    assert not MerkleTree.verify_proof(leaves[0], tree.get_audit_proof(0), "0" * 64)
    assert not MerkleTree.verify_proof(b"wrong leaf", tree.get_audit_proof(0), tree.root_hex)


def test_invalid_proof_encoding_is_rejected():
    assert not MerkleTree.verify_proof(b"x", [{"direction": "right", "hash": "xyz"}], "0" * 64)
    assert not MerkleTree.verify_proof(b"x", [{"direction": "up", "hash": "0" * 64}], "0" * 64)
