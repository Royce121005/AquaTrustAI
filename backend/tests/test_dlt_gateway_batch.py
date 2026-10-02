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
    record_ids = ["record-a", "record-b", "record-c"]

    res = gateway.anchor_batch(
        batch_id=batch_id,
        record_hashes=hashes,
        facility_id=facility_id,
        record_ids=record_ids,
    )

    assert res["status"] == "anchored"
    assert res["leaf_count"] == 3
    assert len(res["merkle_root"]) == 64
    assert res["channel_id"] == "aquatrust-channel"
    assert res["mode"] == "SIMULATION"
    assert res["distributed_ledger"] is False
    assert res["tx_id"] is None
    assert res["simulation_reference"].startswith("sim:")
    assert res["record_ids"] == record_ids

    # Verify each hash is proven inside the anchored batch
    for h in hashes:
        assert gateway.verify_batch_leaf(batch_id, h) is True

    # Unknown hash must fail inclusion verification
    fake_hash = "0" * 64
    assert gateway.verify_batch_leaf(batch_id, fake_hash) is False
    # Test batch anchoring with custom string facility code (e.g. FAC-CPCB-001)
    res_code = gateway.anchor_batch(
        batch_id="batch_string_facility_code",
        record_hashes=hashes[:2],
        facility_id="FAC-CPCB-001",
        record_ids=["rec-1", "rec-2"],
    )
    assert res_code["facility_id"] == "FAC-CPCB-001"
    assert res_code["status"] == "anchored"


def test_dlt_batch_anchor_request_schema():
    from app.schemas.dlt import DLTBatchAnchorRequest
    # Must accept UUID
    req1 = DLTBatchAnchorRequest(
        record_hashes=["e963fc23cf0eb966c4c5cf2339678e0c4cbca476a6e542bf82aa7aeb354f3b17"],
        facility_id="085a9719-c9d0-4562-b4d7-bc389dec12b3",
    )
    assert str(req1.facility_id) == "085a9719-c9d0-4562-b4d7-bc389dec12b3"

    # Must accept string facility code
    req2 = DLTBatchAnchorRequest(
        record_hashes=["e963fc23cf0eb966c4c5cf2339678e0c4cbca476a6e542bf82aa7aeb354f3b17"],
        facility_id="FAC-CPCB-001",
    )
    assert req2.facility_id == "FAC-CPCB-001"

