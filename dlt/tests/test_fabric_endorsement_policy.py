"""
AquaTrust AI — Hyperledger Fabric Endorsement Policy & Quorum Verification Test
Verifies 2-of-3 Endorsement Policy: OutOf(2, 'FacilityMSP', 'AuditorMSP', 'RegulatorMSP')
Validates positive quorums and explicitly asserts negative validation for single-endorser submissions.
"""

import pytest
from typing import Set, Tuple


class FabricEndorsementPolicyEvaluator:
    """Evaluates endorsement policy logic matching Hyperledger Fabric 2.5 lifecycle specifications."""

    VALID_MSPS = {"FacilityMSP", "AuditorMSP", "RegulatorMSP"}
    REQUIRED_QUORUM = 2

    @classmethod
    def evaluate(cls, endorsing_msps: Set[str]) -> Tuple[bool, str]:
        # Filter for known MSPs
        valid_endorsements = {msp for msp in endorsing_msps if msp in cls.VALID_MSPS}
        count = len(valid_endorsements)

        if count >= cls.REQUIRED_QUORUM:
            return True, f"ENDORSEMENT_POLICY_SATISFIED: {count}/{cls.REQUIRED_QUORUM} valid signatures ({', '.join(sorted(valid_endorsements))})"
        else:
            return False, f"ENDORSEMENT_POLICY_FAILURE: Insufficient valid endorsements ({count}/{cls.REQUIRED_QUORUM} required). Missing quorum."


def test_endorsement_policy_specification():
    """Confirms policy configuration requires exactly 2 out of 3 MSPs."""
    evaluator = FabricEndorsementPolicyEvaluator
    assert evaluator.REQUIRED_QUORUM == 2
    assert evaluator.VALID_MSPS == {"FacilityMSP", "AuditorMSP", "RegulatorMSP"}


@pytest.mark.parametrize("single_msp", ["FacilityMSP", "AuditorMSP", "RegulatorMSP"])
def test_negative_single_endorser_rejected(single_msp):
    """
    CRITICAL NEGATIVE TEST:
    Asserts that any single-organization endorsement (1 of 3) is strictly REJECTED
    and cannot be committed to the ledger.
    """
    passed, reason = FabricEndorsementPolicyEvaluator.evaluate({single_msp})
    assert passed is False
    assert "ENDORSEMENT_POLICY_FAILURE" in reason
    assert "1/2 required" in reason


def test_negative_zero_endorsers_rejected():
    """Asserts that zero endorsements are rejected immediately."""
    passed, reason = FabricEndorsementPolicyEvaluator.evaluate(set())
    assert passed is False
    assert "0/2 required" in reason


def test_negative_rogue_msp_rejected():
    """Asserts that unauthorized external MSP endorsements are filtered out."""
    passed, reason = FabricEndorsementPolicyEvaluator.evaluate({"RogueAttackerMSP", "FacilityMSP"})
    assert passed is False  # Only 1 valid MSP (FacilityMSP), 1 invalid
    assert "1/2 required" in reason


@pytest.mark.parametrize(
    "pair",
    [
        {"FacilityMSP", "AuditorMSP"},
        {"FacilityMSP", "RegulatorMSP"},
        {"AuditorMSP", "RegulatorMSP"},
    ],
)
def test_positive_two_endorsers_accepted(pair):
    """Asserts that any valid 2-of-3 combination satisfies quorum."""
    passed, reason = FabricEndorsementPolicyEvaluator.evaluate(pair)
    assert passed is True
    assert "ENDORSEMENT_POLICY_SATISFIED" in reason
    assert "2/2 valid signatures" in reason


def test_positive_unanimous_three_endorsers_accepted():
    """Asserts that unanimous endorsement (3 of 3) satisfies quorum."""
    passed, reason = FabricEndorsementPolicyEvaluator.evaluate(
        {"FacilityMSP", "AuditorMSP", "RegulatorMSP"}
    )
    assert passed is True
    assert "3/2 valid signatures" in reason
