import { Contract, Context, Info, Transaction } from 'fabric-contract-api';
import { createHash } from 'node:crypto';

const HASH_RE = /^[a-f0-9]{64}$/;
const SCHEMA_VERSION = 'aquatrust-anchor-v1';

interface AnchorInput {
  recordId: string;
  recordHash: string;
  hashAlgorithm?: string;
  signatureAlgorithm?: string;
  signatureKeyId?: string;
  signatureReference?: string;
  certificateId?: string;
  facilityId?: string;
  anchorType?: string;
  schemaVersion?: string;
}

interface RecordAnchor extends AnchorInput {
  docType: 'record_anchor';
  recordHash: string;
  hashAlgorithm: 'SHA-256';
  anchorType: string;
  schemaVersion: string;
  timestamp: string;
  transactionId: string;
  organizationId: string;
  clientIdentity: string;
}

interface CorrectionLink {
  docType: 'correction_link';
  originalRecordId: string;
  originalHash: string;
  correctionRecordId: string;
  correctionHash: string;
  correctionReason: string;
  timestamp: string;
  transactionId: string;
  organizationId: string;
  clientIdentity: string;
}

interface BatchInput {
  batchId: string;
  merkleRoot: string;
  leafCount: number;
  recordIds: string[];
  leafHashes: string[];
  hashAlgorithm?: string;
  schemaVersion?: string;
}

function required(value: unknown, name: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${name} is required`);
  return value.trim();
}

function validHash(value: unknown, name: string): string {
  const hash = required(value, name).toLowerCase();
  if (!HASH_RE.test(hash)) throw new Error(`${name} must be a 64-character lowercase SHA-256 hex digest`);
  return hash;
}

function sha256(data: Buffer): Buffer {
  return createHash('sha256').update(data).digest();
}

function rfc6962Root(hashes: string[]): string {
  let level = hashes.map((value) => sha256(Buffer.concat([Buffer.from([0]), Buffer.from(value, 'utf8')])));
  while (level.length > 1) {
    const next: Buffer[] = [];
    for (let i = 0; i < level.length; i += 2) {
      if (i + 1 === level.length) next.push(level[i]);
      else next.push(sha256(Buffer.concat([Buffer.from([1]), level[i], level[i + 1]])));
    }
    level = next;
  }
  return level[0].toString('hex');
}

@Info({ title: 'AquaTrustRecordContract', description: 'Immutable record and batch integrity anchors' })
export class AquaTrustRecordContract extends Contract {
  @Transaction(false)
  public async GetStatus(ctx: Context): Promise<string> {
    return JSON.stringify({ mode: 'FABRIC', channel: ctx.stub.getChannelID(), chaincode: 'aquatrust-records' });
  }

  private recordKey(ctx: Context, id: string): string {
    return ctx.stub.createCompositeKey('record', [id]);
  }

  private hashKey(ctx: Context, hash: string): string {
    return ctx.stub.createCompositeKey('recordHash', [hash]);
  }

  private correctionKey(ctx: Context, txId: string): string {
    return ctx.stub.createCompositeKey('correction', [txId]);
  }

  private batchKey(ctx: Context, id: string): string {
    return ctx.stub.createCompositeKey('batch', [id]);
  }

  private batchRecordKey(ctx: Context, id: string): string {
    return ctx.stub.createCompositeKey('batchRecord', [id]);
  }

  private actor(ctx: Context): { organizationId: string; clientIdentity: string } {
    return {
      organizationId: ctx.clientIdentity.getMSPID(),
      clientIdentity: ctx.clientIdentity.getID(),
    };
  }

  private transactionTimestamp(ctx: Context): string {
    const timestamp = ctx.stub.getTxTimestamp();
    const milliseconds = Number(timestamp.seconds) * 1000 + Math.floor(timestamp.nanos / 1_000_000);
    return new Date(milliseconds).toISOString();
  }

  private requireOrg(ctx: Context, allowed: string[]): void {
    const mspId = ctx.clientIdentity.getMSPID();
    if (!allowed.includes(mspId)) throw new Error(`MSP ${mspId} is not authorized for this transaction`);
  }

  @Transaction(false)
  public async ReadAnchor(ctx: Context, recordId: string): Promise<string> {
    const id = required(recordId, 'recordId');
    const bytes = await ctx.stub.getState(this.recordKey(ctx, id));
    if (!bytes?.length) throw new Error(`Anchor for record ${id} does not exist`);
    return Buffer.from(bytes).toString('utf8');
  }

  @Transaction(false)
  public async GetAnchorByRecordId(ctx: Context, recordId: string): Promise<string> {
    return this.ReadAnchor(ctx, recordId);
  }

  @Transaction(false)
  public async GetAnchorByHash(ctx: Context, recordHash: string): Promise<string> {
    const hash = validHash(recordHash, 'recordHash');
    const idBytes = await ctx.stub.getState(this.hashKey(ctx, hash));
    if (!idBytes?.length) throw new Error(`Anchor for hash ${hash} does not exist`);
    return this.ReadAnchor(ctx, Buffer.from(idBytes).toString('utf8'));
  }

  @Transaction(true)
  public async CreateAnchor(ctx: Context, inputJson: string): Promise<string> {
    this.requireOrg(ctx, ['FacilityMSP']);
    const input = JSON.parse(inputJson) as AnchorInput;
    const recordId = required(input.recordId, 'recordId');
    const recordHash = validHash(input.recordHash, 'recordHash');
    const existing = await ctx.stub.getState(this.recordKey(ctx, recordId));
    if (existing?.length) {
      const anchor = JSON.parse(Buffer.from(existing).toString('utf8')) as RecordAnchor;
      if (anchor.recordHash === recordHash) return JSON.stringify({ ...anchor, idempotent: true });
      throw new Error(`Record ${recordId} is already anchored to a different hash`);
    }
    const hashOwner = await ctx.stub.getState(this.hashKey(ctx, recordHash));
    if (hashOwner?.length && Buffer.from(hashOwner).toString('utf8') !== recordId) {
      throw new Error(`Hash ${recordHash} is already associated with another record`);
    }

    const actor = this.actor(ctx);
    const anchor: RecordAnchor = {
      ...input,
      docType: 'record_anchor',
      recordId,
      recordHash,
      hashAlgorithm: 'SHA-256',
      anchorType: input.anchorType || 'TREATMENT_RECORD',
      schemaVersion: input.schemaVersion || SCHEMA_VERSION,
      timestamp: this.transactionTimestamp(ctx),
      transactionId: ctx.stub.getTxID(),
      ...actor,
    };
    await ctx.stub.putState(this.recordKey(ctx, recordId), Buffer.from(JSON.stringify(anchor)));
    await ctx.stub.putState(this.hashKey(ctx, recordHash), Buffer.from(recordId));
    await ctx.stub.putState(ctx.stub.createCompositeKey('transaction', [anchor.transactionId]), Buffer.from(this.recordKey(ctx, recordId)));
    ctx.stub.setEvent('AnchorCreated', Buffer.from(JSON.stringify(anchor)));
    return JSON.stringify(anchor);
  }

  @Transaction(false)
  public async VerifyAnchorReference(ctx: Context, recordId: string, submittedHash: string): Promise<string> {
    const id = required(recordId, 'recordId');
    const hash = validHash(submittedHash, 'recordHash');
    const bytes = await ctx.stub.getState(this.recordKey(ctx, id));
    if (!bytes?.length) {
      return JSON.stringify({ verified: false, recordId: id, submittedHash: hash, anchoredHash: null, reason: 'ANCHOR_NOT_FOUND' });
    }
    const anchor = JSON.parse(Buffer.from(bytes).toString('utf8')) as RecordAnchor;
    return JSON.stringify({
      verified: anchor.recordHash === hash,
      recordId: id,
      submittedHash: hash,
      anchoredHash: anchor.recordHash,
      transactionId: anchor.transactionId,
      organizationId: anchor.organizationId,
      timestamp: anchor.timestamp,
      reason: anchor.recordHash === hash ? 'HASH_MATCH' : 'HASH_MISMATCH',
    });
  }

  @Transaction(true)
  public async RecordCorrectionLink(ctx: Context, inputJson: string): Promise<string> {
    this.requireOrg(ctx, ['FacilityMSP']);
    const input = JSON.parse(inputJson) as Partial<CorrectionLink>;
    const originalRecordId = required(input.originalRecordId, 'originalRecordId');
    const correctionRecordId = required(input.correctionRecordId, 'correctionRecordId');
    const originalHash = validHash(input.originalHash, 'originalHash');
    const correctionHash = validHash(input.correctionHash, 'correctionHash');
    const correctionReason = required(input.correctionReason, 'correctionReason');
    const originalBytes = await ctx.stub.getState(this.recordKey(ctx, originalRecordId));
    const correctionBytes = await ctx.stub.getState(this.recordKey(ctx, correctionRecordId));
    if (!originalBytes?.length || !correctionBytes?.length) throw new Error('Both original and correction anchors must exist');
    const original = JSON.parse(Buffer.from(originalBytes).toString('utf8')) as RecordAnchor;
    const corrected = JSON.parse(Buffer.from(correctionBytes).toString('utf8')) as RecordAnchor;
    if (original.recordHash !== originalHash || corrected.recordHash !== correctionHash) throw new Error('Correction link hashes must match immutable record anchors');
    const relationshipKey = ctx.stub.createCompositeKey('correctionFor', [originalRecordId, correctionRecordId]);
    const existingLinkKey = await ctx.stub.getState(relationshipKey);
    if (existingLinkKey?.length) throw new Error('Correction link already exists; existing history is immutable');
    const transactionId = ctx.stub.getTxID();
    const key = this.correctionKey(ctx, transactionId);
    const prior = await ctx.stub.getState(key);
    if (prior?.length) throw new Error(`Correction link transaction ${transactionId} already exists`);
    const link: CorrectionLink = {
      docType: 'correction_link', originalRecordId, originalHash,
      correctionRecordId, correctionHash, correctionReason,
      timestamp: this.transactionTimestamp(ctx), transactionId, ...this.actor(ctx),
    };
    await ctx.stub.putState(key, Buffer.from(JSON.stringify(link)));
    await ctx.stub.putState(ctx.stub.createCompositeKey('transaction', [transactionId]), Buffer.from(key));
    await ctx.stub.putState(relationshipKey, Buffer.from(key));
    ctx.stub.setEvent('CorrectionLinked', Buffer.from(JSON.stringify(link)));
    return JSON.stringify(link);
  }

  @Transaction(false)
  public async ReadCorrectionLink(ctx: Context, originalRecordId: string, correctionRecordId: string): Promise<string> {
    const key = ctx.stub.createCompositeKey('correctionFor', [required(originalRecordId, 'originalRecordId'), required(correctionRecordId, 'correctionRecordId')]);
    const linkKey = await ctx.stub.getState(key);
    if (!linkKey?.length) throw new Error('Correction link does not exist');
    const bytes = await ctx.stub.getState(Buffer.from(linkKey).toString('utf8'));
    if (!bytes?.length) throw new Error('Correction link state is missing');
    return Buffer.from(bytes).toString('utf8');
  }

  @Transaction(true)
  public async CreateBatchAnchor(ctx: Context, inputJson: string): Promise<string> {
    this.requireOrg(ctx, ['FacilityMSP']);
    const input = JSON.parse(inputJson) as BatchInput;
    const batchId = required(input.batchId, 'batchId');
    const merkleRoot = validHash(input.merkleRoot, 'merkleRoot');
    if (!Array.isArray(input.recordIds) || !Array.isArray(input.leafHashes) || input.recordIds.length === 0 || input.recordIds.length !== input.leafHashes.length || input.leafCount !== input.recordIds.length) {
      throw new Error('recordIds, leafHashes, and leafCount must describe the same non-empty batch');
    }
    const leafHashes = input.leafHashes.map((hash) => validHash(hash, 'leafHash'));
    if (rfc6962Root(leafHashes) !== merkleRoot) throw new Error('merkleRoot does not match the RFC 6962 tree of leafHashes');
    if (new Set(input.recordIds).size !== input.recordIds.length) throw new Error('recordIds must be unique within a batch');
    const existing = await ctx.stub.getState(this.batchKey(ctx, batchId));
    if (existing?.length) {
      const prior = JSON.parse(Buffer.from(existing).toString('utf8'));
      if (prior.merkleRoot === merkleRoot) return JSON.stringify({ ...prior, idempotent: true });
      throw new Error(`Batch ${batchId} already exists with a different root`);
    }
    const actor = this.actor(ctx);
    const batch = {
      docType: 'batch_anchor', batchId, merkleRoot, leafCount: input.leafCount,
      recordIds: input.recordIds.map((id) => required(id, 'recordId')),
      leafHashes,
      hashAlgorithm: 'SHA-256', schemaVersion: input.schemaVersion || SCHEMA_VERSION,
      timestamp: this.transactionTimestamp(ctx), transactionId: ctx.stub.getTxID(), ...actor,
    };
    for (let i = 0; i < batch.recordIds.length; i += 1) {
      const priorMapping = await ctx.stub.getState(this.batchRecordKey(ctx, batch.recordIds[i]));
      if (priorMapping?.length) throw new Error(`Record ${batch.recordIds[i]} is already assigned to a batch`);
      await ctx.stub.putState(this.batchRecordKey(ctx, batch.recordIds[i]), Buffer.from(JSON.stringify({ batchId, merkleRoot, leafHash: batch.leafHashes[i], index: i })));
    }
    await ctx.stub.putState(this.batchKey(ctx, batchId), Buffer.from(JSON.stringify(batch)));
    await ctx.stub.putState(ctx.stub.createCompositeKey('transaction', [batch.transactionId]), Buffer.from(this.batchKey(ctx, batchId)));
    ctx.stub.setEvent('BatchAnchored', Buffer.from(JSON.stringify(batch)));
    return JSON.stringify(batch);
  }

  @Transaction(false)
  public async ReadBatchAnchor(ctx: Context, batchId: string): Promise<string> {
    const bytes = await ctx.stub.getState(this.batchKey(ctx, required(batchId, 'batchId')));
    if (!bytes?.length) throw new Error(`Batch ${batchId} does not exist`);
    return Buffer.from(bytes).toString('utf8');
  }

  @Transaction(false)
  public async GetBatchForRecord(ctx: Context, recordId: string): Promise<string> {
    const bytes = await ctx.stub.getState(this.batchRecordKey(ctx, required(recordId, 'recordId')));
    if (!bytes?.length) throw new Error(`No batch mapping for record ${recordId}`);
    return Buffer.from(bytes).toString('utf8');
  }

  @Transaction(false)
  public async GetTransactionById(ctx: Context, transactionId: string): Promise<string> {
    const txId = required(transactionId, 'transactionId');
    const index = await ctx.stub.getState(ctx.stub.createCompositeKey('transaction', [txId]));
    if (!index?.length) throw new Error(`Transaction ${txId} is not indexed`);
    const value = await ctx.stub.getState(Buffer.from(index).toString('utf8'));
    if (!value?.length) throw new Error(`State for transaction ${txId} is missing`);
    return Buffer.from(value).toString('utf8');
  }

  @Transaction(false)
  public async GetAnchorHistory(ctx: Context, recordId: string): Promise<string> {
    const iterator = await ctx.stub.getHistoryForKey(this.recordKey(ctx, required(recordId, 'recordId')));
    const history: Array<Record<string, unknown>> = [];
    try {
      while (true) {
        const item = await iterator.next();
        if (item.value) {
          const value = item.value;
          history.push({
            transactionId: value.txId,
            timestamp: value.timestamp ? new Date(Number(value.timestamp.seconds) * 1000).toISOString() : null,
            isDelete: value.isDelete,
            anchor: value.isDelete ? null : JSON.parse(Buffer.from(value.value).toString('utf8')),
          });
        }
        if (item.done) break;
      }
    } finally {
      await iterator.close();
    }
    return JSON.stringify(history);
  }
}
