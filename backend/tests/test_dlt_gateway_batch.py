"""
AquaTrust AI — Unit Tests for DLT Gateway Merkle Batch Anchoring
Validates high-frequency batch commitment and inclusion proof verification.
"""

from uuid import uuid4
from app.dlt.gateway import FabricDLTGateway


def test_gateway_anchor_and_verify_batch():
    gateway = FabricDLTGateway(mode="simulation")
    facility_id = uuid4()
    batch_id = "batch_2026_09_28_h21"

    hashes = [
        "e963fc23cf0eb966c4c5cf2339678e0c4cbca476a6e542bf82aa7aeb354f3b17",
        "4a5e8c187f54b6b662d5e3f4219b168936932400f07df8b857796d1945f348e3",
        "90df45318532f146a782e46cf29d0092c481979b92f7dc2a7925e01b332dc3a1",
    ]

    res = gateway.anchor_batch(
        batch_id=batch_id,
        record_hashes=hashes,
        facility_id=facility_id,
    )

    assert res["status"] == "anchored"
    assert res["leaf_count"] == 3
    assert len(res["merkle_root"]) == 64
    assert res["channel_id"] == "aquatrustchannel"

    # Verify each hash is proven inside the anchored batch
    for h in hashes:
        assert gateway.verify_batch_leaf(batch_id, h) is True

    # Unknown hash must fail inclusion verification
    fake_hash = "0" * 64
    assert gateway.verify_batch_leaf(batch_id, fake_hash) is False
