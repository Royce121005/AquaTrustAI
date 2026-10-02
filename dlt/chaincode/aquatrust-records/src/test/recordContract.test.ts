import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { AquaTrustRecordContract } from '../recordContract';

class MemoryStub {
  readonly state = new Map<string, Buffer>();
  txId = 'tx-test-001';
  readonly txTimestamp = { seconds: 1790852400, nanos: 123000000 };
  createCompositeKey(objectType: string, attributes: string[]): string {
    return `${objectType}:${attributes.join(':')}`;
  }
  async getState(key: string): Promise<Buffer> { return this.state.get(key) || Buffer.alloc(0); }
  async putState(key: string, value: Buffer): Promise<void> { this.state.set(key, value); }
  setEvent(_name: string, _payload: Buffer): void { /* test stub records world state only */ }
  getTxID(): string { return this.txId; }
  getTxTimestamp(): { seconds: number; nanos: number } { return this.txTimestamp; }
}

function context() {
  const stub = new MemoryStub();
  return {
    stub,
    clientIdentity: { getMSPID: () => 'FacilityMSP', getID: () => 'x509::facility-1' },
  } as any;
}

const hashA = 'a'.repeat(64);
const hashB = 'b'.repeat(64);
function digest(bytes: Buffer): Buffer { return createHash('sha256').update(bytes).digest(); }
function merkleRoot(hashes: string[]): string {
  let level = hashes.map((value) => digest(Buffer.concat([Buffer.from([0]), Buffer.from(value)])));
  while (level.length > 1) {
    const next: Buffer[] = [];
    for (let i = 0; i < level.length; i += 2) {
      next.push(i + 1 < level.length ? digest(Buffer.concat([Buffer.from([1]), level[i], level[i + 1]])) : level[i]);
    }
    level = next;
  }
  return level[0].toString('hex');
}

test('CreateAnchor, ReadAnchor, GetAnchorByHash and structured verification', async () => {
  const contract = new AquaTrustRecordContract();
  const ctx = context();
  const created = JSON.parse(await contract.CreateAnchor(ctx, JSON.stringify({ recordId: 'record-1', recordHash: hashA, signatureKeyId: 'key-1', facilityId: 'facility-1' })));
  assert.equal(created.transactionId, 'tx-test-001');
  assert.equal(created.organizationId, 'FacilityMSP');
  assert.equal(created.hashAlgorithm, 'SHA-256');
  assert.equal(created.timestamp, new Date(ctx.stub.txTimestamp.seconds * 1000 + ctx.stub.txTimestamp.nanos / 1_000_000).toISOString());
  assert.equal(JSON.parse(await contract.ReadAnchor(ctx, 'record-1')).recordHash, hashA);
  assert.equal(JSON.parse(await contract.GetAnchorByRecordId(ctx, 'record-1')).recordId, 'record-1');
  assert.equal(JSON.parse(await contract.GetAnchorByHash(ctx, hashA)).recordId, 'record-1');
  assert.equal(JSON.parse(await contract.GetTransactionById(ctx, 'tx-test-001')).recordId, 'record-1');
  assert.equal(JSON.parse(await contract.VerifyAnchorReference(ctx, 'record-1', hashA)).reason, 'HASH_MATCH');
  assert.equal(JSON.parse(await contract.VerifyAnchorReference(ctx, 'record-1', hashB)).reason, 'HASH_MISMATCH');
  assert.equal(JSON.parse(await contract.VerifyAnchorReference(ctx, 'missing', hashA)).reason, 'ANCHOR_NOT_FOUND');
  assert.equal(JSON.parse(await contract.CreateAnchor(ctx, JSON.stringify({ recordId: 'record-1', recordHash: hashA }))).idempotent, true);
  await assert.rejects(contract.CreateAnchor(ctx, JSON.stringify({ recordId: 'record-1', recordHash: hashB })), /different hash/);
});

test('RecordCorrectionLink is append-only and binds both immutable anchors', async () => {
  const contract = new AquaTrustRecordContract();
  const ctx = context();
  await contract.CreateAnchor(ctx, JSON.stringify({ recordId: 'original', recordHash: hashA }));
  ctx.stub.txId = 'tx-correction-record';
  await contract.CreateAnchor(ctx, JSON.stringify({ recordId: 'correction-1', recordHash: hashB }));
  ctx.stub.txId = 'tx-correction-record-2';
  await contract.CreateAnchor(ctx, JSON.stringify({ recordId: 'correction-2', recordHash: 'c'.repeat(64) }));
  ctx.stub.txId = 'tx-link-1';
  const link = JSON.parse(await contract.RecordCorrectionLink(ctx, JSON.stringify({
    originalRecordId: 'original', originalHash: hashA,
    correctionRecordId: 'correction-1', correctionHash: hashB,
    correctionReason: 'Corrected lab value',
  })));
  assert.equal(link.transactionId, 'tx-link-1');
  assert.equal(JSON.parse(await contract.ReadCorrectionLink(ctx, 'original', 'correction-1')).correctionHash, hashB);
  ctx.stub.txId = 'tx-link-2';
  const link2 = JSON.parse(await contract.RecordCorrectionLink(ctx, JSON.stringify({
    originalRecordId: 'correction-1', originalHash: hashB,
    correctionRecordId: 'correction-2', correctionHash: 'c'.repeat(64),
    correctionReason: 'Second correction',
  })));
  assert.equal(link2.originalRecordId, 'correction-1');
  assert.equal(JSON.parse(await contract.ReadCorrectionLink(ctx, 'correction-1', 'correction-2')).correctionHash, 'c'.repeat(64));
  await assert.rejects(contract.RecordCorrectionLink(ctx, JSON.stringify({
    originalRecordId: 'original', originalHash: hashB,
    correctionRecordId: 'correction-1', correctionHash: hashB, correctionReason: 'bad link',
  })), /must match immutable/);
  assert.equal(JSON.parse(await contract.ReadAnchor(ctx, 'original')).recordHash, hashA);
});

test('batch anchor persists root and record-to-batch membership', async () => {
  const contract = new AquaTrustRecordContract();
  const ctx = context();
  const result = JSON.parse(await contract.CreateBatchAnchor(ctx, JSON.stringify({
    batchId: 'batch-1', merkleRoot: merkleRoot([hashB, hashA]), leafCount: 2,
    recordIds: ['record-1', 'record-2'], leafHashes: [hashB, hashA],
  })));
  assert.equal(result.merkleRoot, merkleRoot([hashB, hashA]));
  assert.equal(JSON.parse(await contract.GetBatchForRecord(ctx, 'record-2')).batchId, 'batch-1');
  assert.equal(JSON.parse(await contract.ReadBatchAnchor(ctx, 'batch-1')).leafCount, 2);
});

test('reject malformed hashes and batches', async () => {
  const contract = new AquaTrustRecordContract();
  const ctx = context();
  await assert.rejects(contract.CreateAnchor(ctx, JSON.stringify({ recordId: 'bad', recordHash: 'xyz' })), /64-character/);
  await assert.rejects(contract.CreateBatchAnchor(ctx, JSON.stringify({ batchId: 'bad', merkleRoot: hashA, leafCount: 2, recordIds: ['r1'], leafHashes: [hashB] })), /same non-empty batch/);
  await assert.rejects(contract.CreateBatchAnchor(ctx, JSON.stringify({ batchId: 'wrong-root', merkleRoot: hashA, leafCount: 1, recordIds: ['r1'], leafHashes: [hashB] })), /does not match/);
});

test('only FacilityMSP may create anchors and batches', async () => {
  const contract = new AquaTrustRecordContract();
  const ctx = context();
  ctx.clientIdentity.getMSPID = () => 'AuditorMSP';
  await assert.rejects(contract.CreateAnchor(ctx, JSON.stringify({ recordId: 'unauthorized', recordHash: hashA })), /not authorized/);
});
