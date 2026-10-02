import sys, json, os, uuid
sys.path.insert(0, r'backend')

# Set environment for FABRIC mode
os.environ['DLT_MODE'] = 'FABRIC'
os.environ['FABRIC_BRIDGE_URL'] = 'http://127.0.0.1:8099'
os.environ['FABRIC_BRIDGE_TOKEN'] = '57b5479fdfc9675b3b59ee7b74d74b64602501d0618c5d91e13daa2c612fd8ff'
os.environ['DLT_CHANNEL_NAME'] = 'aquatrust-channel'
os.environ['DLT_CHAINCODE_NAME'] = 'aquatrust-records'
os.environ['APP_ENV'] = 'development'

from app.dlt.blockchain_service import FabricBlockchainService
from app.dlt.gateway import FabricDLTGateway
from app.dlt.canonicalizer import canonicalize_treatment_record
from app.dlt.hasher import compute_canonical_hash

print("=== LIVE FABRIC GATEWAY TEST ===")

# Test 1: Health check
svc = FabricBlockchainService()
try:
    health = svc.health()
    print(f"[T1] Fabric health: PASS => {health}")
except Exception as e:
    print(f"[T1] Fabric health: FAIL => {e}")

# Test 2: Create a real treatment record anchor
gateway = FabricDLTGateway(mode='FABRIC')
print(f"[T2] Gateway mode: {gateway.mode}")

record_id = uuid.uuid4()
facility_id = uuid.uuid4()

# Create test record and hash it
test_record = {
    'facility_id': str(facility_id),
    'cod': 180.5,
    'bod': 25.2,
    'ph': 7.4,
    'tss': 45.0,
    'nh4_n': 12.3,
    'timestamp': '2024-01-15T12:00:00Z',
    'status': 'FINALIZED',
    'record_state': 'finalized',
    'compliance_status': 'compliant',
}
canonical_bytes = canonicalize_treatment_record(test_record)
record_hash = compute_canonical_hash(canonical_bytes)
print(f"[T2] Record hash: {record_hash[:32]}...")

# Test 3: Anchor the record
print("\n=== ANCHOR TEST ===")
try:
    result = gateway.anchor_record(
        record_id=record_id,
        record_hash=record_hash,
        facility_id=facility_id,
        compliance_status='compliant',
        signature_value='test_signature_base64url_placeholder',
        key_id='key-ecdsa-p256-01'
    )
    print(f"[T3] anchor_record result:")
    print(f"     mode: {result.get('mode')}")
    print(f"     distributed_ledger: {result.get('distributed_ledger')}")
    print(f"     status: {result.get('status')}")
    print(f"     tx_id: {result.get('tx_id')}")
    print(f"     record_hash: {result.get('record_hash', '')[:32]}...")
    if result.get('tx_id'):
        print(f"[T3] STATUS: PASS - Got real Fabric tx_id")
    elif result.get('status') == 'failed':
        print(f"[T3] STATUS: FAIL - Anchor failed: {result.get('failure')}")
    else:
        print(f"[T3] STATUS: PARTIAL - anchored but no tx_id")
except Exception as e:
    print(f"[T3] anchor_record EXCEPTION: {e}")

# Test 4: Query the anchor back
print("\n=== QUERY TEST ===")
try:
    anchor = gateway.query_record_anchor(record_id)
    if anchor:
        print(f"[T4] query_record_anchor: PASS")
        print(f"     record_hash from ledger: {str(anchor.get('record_hash') or anchor.get('recordHash', ''))[:32]}...")
        print(f"     distributed_ledger: {anchor.get('distributed_ledger')}")
        
        # Test 5: Verify hash matches
        ledger_hash = str(anchor.get('record_hash') or anchor.get('recordHash') or anchor.get('canonical_hash') or '')
        print(f"\n=== TAMPER TEST ===")
        if ledger_hash.lower() == record_hash.lower():
            print(f"[T5] Hash match: PASS (ledger hash == computed hash)")
        else:
            print(f"[T5] Hash mismatch: FAIL")
            
        # Modify record and recompute
        tampered_record = dict(test_record)
        tampered_record['cod'] = 9999.0
        tampered_canonical = canonicalize_treatment_record(tampered_record)
        tampered_hash = compute_canonical_hash(tampered_canonical)
        print(f"[T5] Tampered record hash: {tampered_hash[:32]}...")
        print(f"[T5] Tamper detection: hashes_differ={ledger_hash.lower() != tampered_hash}")
    else:
        print(f"[T4] query_record_anchor returned None")
except Exception as e:
    print(f"[T4] EXCEPTION: {e}")

# Test 6: Idempotency - submit same record_id again with DIFFERENT hash
print("\n=== IDEMPOTENCY TEST ===")
try:
    different_hash = compute_canonical_hash(b'different_canonical_payload_12345678')
    result2 = gateway.anchor_record(
        record_id=record_id,  # SAME record_id
        record_hash=different_hash,  # DIFFERENT hash
        facility_id=facility_id,
        compliance_status='compliant',
        signature_value='sig2',
        key_id='key-ecdsa-p256-01'
    )
    print(f"[T6] Duplicate record_id with different hash:")
    print(f"     status: {result2.get('status')}")
    print(f"     failure: {result2.get('failure')}")
    if result2.get('status') == 'failed':
        print(f"[T6] PASS - Rejected duplicate with different hash")
    elif result2.get('tx_id'):
        print(f"[T6] FAIL - Accepted duplicate! This is a CRITICAL integrity issue")
    else:
        print(f"[T6] PARTIAL - unclear result")
except Exception as e:
    print(f"[T6] Chaincode rejected (exception): {e}")

print("\nFABRIC LIVE TEST COMPLETE")
