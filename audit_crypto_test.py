import sys
sys.path.insert(0, r'backend')

import json
import hashlib

from app.dlt.canonicalizer import canonicalize_treatment_record
from app.dlt.hasher import compute_canonical_hash
from app.dlt.merkle import MerkleTree

test_record = {
    'facility_id': 'fac-001',
    'cod': 150.5,
    'bod': 45.2,
    'ph': 7.2,
    'tss': 120.0,
    'nh4_n': 15.3,
    'timestamp': '2024-01-15T10:00:00Z',
    'status': 'FINALIZED',
    'record_id': 'test-uuid-123',
    'id': 'should-be-excluded',
    'updated_at': 'should-be-excluded-too',
}

# Run 5 times
hashes = []
for i in range(5):
    canonical = canonicalize_treatment_record(test_record)
    h = compute_canonical_hash(canonical)
    hashes.append(h)

canonical_parsed = json.loads(canonical.decode('utf-8'))

print('=== CANONICALIZATION + SHA-256 DETERMINISM ===')
print(f'  All identical (5 runs): {len(set(hashes)) == 1}')
print(f'  Hash: {hashes[0]}')
print(f'  id excluded: {"id" not in canonical_parsed}')
print(f'  updated_at excluded: {"updated_at" not in canonical_parsed}')
print(f'  record_id excluded: {"record_id" not in canonical_parsed}')
print(f'  canonicalization_version present: {"canonicalization_version" in canonical_parsed}')
print(f'  canonical_version value: {canonical_parsed.get("canonicalization_version")}')
print(f'  keys sorted: {list(canonical_parsed.keys()) == sorted(canonical_parsed.keys())}')

# Tamper test
tampered = dict(test_record)
tampered['cod'] = 999.9
tampered_canonical = canonicalize_treatment_record(tampered)
tampered_hash = compute_canonical_hash(tampered_canonical)
print(f'Tamper detection: hashes_differ={hashes[0] != tampered_hash}')

# Field-specific tampers
for field, new_val in [('bod', 999.0), ('ph', 11.0), ('tss', 9999.0), ('status', 'DRAFT')]:
    mod = dict(test_record)
    mod[field] = new_val
    mod_canonical = canonicalize_treatment_record(mod)
    mod_hash = compute_canonical_hash(mod_canonical)
    print(f'  Tamper {field}: detected={hashes[0] != mod_hash}')

print()
print('=== MERKLE TREE TESTS ===')
t1 = MerkleTree([b'hash_a'])
t2 = MerkleTree([b'hash_a', b'hash_b'])
t3 = MerkleTree([b'hash_a', b'hash_b', b'hash_c'])
t3b = MerkleTree([b'hash_a', b'hash_b', b'hash_c'])
print(f'1-leaf root: {t1.root_hex[:16]}...')
print(f'2-leaf root: {t2.root_hex[:16]}...')
print(f'3-leaf (odd) root: {t3.root_hex[:16]}...')
print(f'Determinism (3-leaf): {t3.root_hex == t3b.root_hex}')

# Proof verification
proof0 = t2.get_audit_proof(0)
proof1 = t2.get_audit_proof(1)
valid0 = MerkleTree.verify_proof(b'hash_a', proof0, t2.root_hex)
valid1 = MerkleTree.verify_proof(b'hash_b', proof1, t2.root_hex)
invalid = MerkleTree.verify_proof(b'TAMPERED', proof0, t2.root_hex)
wrong_root = MerkleTree.verify_proof(b'hash_a', proof0, 'a' * 64)
print(f'Proof valid (leaf 0): {valid0}')
print(f'Proof valid (leaf 1): {valid1}')
print(f'Tampered leaf rejected: {not invalid}')
print(f'Wrong root rejected: {not wrong_root}')

# 5-leaf tree
t5 = MerkleTree([b'h1', b'h2', b'h3', b'h4', b'h5'])
for i in range(5):
    proof = t5.get_audit_proof(i)
    valid = MerkleTree.verify_proof([b'h1', b'h2', b'h3', b'h4', b'h5'][i], proof, t5.root_hex)
    print(f'  5-leaf proof[{i}]: {valid}')

print()
print('=== SIGNING TEST ===')
try:
    from app.dlt.signer import sign_canonical_payload, verify_signature, generate_key_pair
    priv_pem, pub_pem = generate_key_pair('test-key', deterministic=True)
    canonical_bytes = canonicalize_treatment_record(test_record)
    sig = sign_canonical_payload(canonical_bytes, priv_pem)
    print(f'Signature generated (len={len(sig)}): {sig[:32]}...')
    verified = verify_signature(canonical_bytes, sig, pub_pem)
    print(f'Signature verifies correctly: {verified}')
    tampered_bytes = canonicalize_treatment_record(tampered)
    tampered_verify = verify_signature(tampered_bytes, sig, pub_pem)
    print(f'Tampered data fails verification: {not tampered_verify}')
    
    # Determinism of signing
    sig2 = sign_canonical_payload(canonical_bytes, priv_pem)
    # ECDSA is non-deterministic by default; just check it verifies
    verified2 = verify_signature(canonical_bytes, sig2, pub_pem)
    print(f'Second signature also verifies: {verified2}')
except Exception as e:
    print(f'Signing test error: {e}')

print()
print('CRYPTO AUDIT TEST COMPLETE')
