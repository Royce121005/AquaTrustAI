import sys
sys.path.insert(0, r'c:\Users\valentino\Downloads\AquatrustAI\backend')
from app.dlt.merkle import MerkleTree

# Test 1: single record
t1 = MerkleTree([b'hash_a'])
print(f'Single record root: {t1.root_hex}')

# Test 2: two records
t2 = MerkleTree([b'hash_a', b'hash_b'])
print(f'Two record root: {t2.root_hex}')

# Test 3: odd number
t3 = MerkleTree([b'hash_a', b'hash_b', b'hash_c'])
print(f'Three record root: {t3.root_hex}')

# Test 4: determinism
t4a = MerkleTree([b'hash_a', b'hash_b', b'hash_c'])
t4b = MerkleTree([b'hash_a', b'hash_b', b'hash_c'])
print(f'Determinism: {t4a.root_hex == t4b.root_hex}')

# Test 5: tamper detection
t5 = MerkleTree([b'hash_a', b'TAMPERED', b'hash_c'])
print(f'Tamper changes root: {t5.root_hex != t3.root_hex}')

# Test 6: proof verification if available
try:
    proof = t2.get_audit_proof(0)
    valid = t2.verify_proof(b'hash_a', proof, t2.root_hex)
    print(f'Proof verification: {valid}')
except Exception as e:
    print(f'Proof not implemented: {e}')

print('Merkle test complete.')
