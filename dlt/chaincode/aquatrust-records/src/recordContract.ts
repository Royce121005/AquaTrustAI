import { Context, Contract, Info, Returns, Transaction } from 'fabric-contract-api';
import { AnchorRecord, ComplianceStatus, CorrectionLink, VerificationResult } from './types';

const SHA256_HEX_REGEX = /^[a-f0-9]{64}$/;
const VALID_COMPLIANCE_STATUSES: ComplianceStatus[] = ['COMPLIANT', 'NON_COMPLIANT', 'EXEMPT'];

@Info({
  title: 'AquaTrustRecordContract',
  description: 'Authoritative Smart Contract for AquaTrust AI Wastewater Treatment Anchors'
})
export class AquaTrustRecordContract extends Contract {
  constructor() {
    super('AquaTrustRecordContract');
  }

  /**
   * CreateAnchor
   * Commits a new finalized treatment record anchor to the ledger state.
   */
  @Transaction()
  @Returns('string')
  public async CreateAnchor(ctx: Context, payloadJson: string): Promise<string> {
    if (!payloadJson || typeof payloadJson !== 'string') {
      throw new Error('Payload must be a non-empty JSON string');
    }

    let payload: Partial<AnchorRecord>;
    try {
      payload = JSON.parse(payloadJson);
    } catch (err: any) {
      throw new Error(`Failed to parse anchor payload JSON: ${err.message}`);
    }

    const {
      anchor_id,
      record_id,
      certificate_id,
      facility_id,
      event_timestamp,
      canonical_hash,
      compliance_status,
      signature_algorithm,
      signature_key_id,
      record_version,
      anchor_schema_version
    } = payload;

    // Required fields validation
    if (!anchor_id || typeof anchor_id !== 'string') {
      throw new Error('Missing or invalid anchor_id');
    }
    if (!record_id || typeof record_id !== 'string') {
      throw new Error('Missing or invalid record_id');
    }
    if (!certificate_id || typeof certificate_id !== 'string') {
      throw new Error('Missing or invalid certificate_id');
    }
    if (!facility_id || typeof facility_id !== 'string') {
      throw new Error('Missing or invalid facility_id');
    }
    if (!event_timestamp || typeof event_timestamp !== 'string') {
      throw new Error('Missing or invalid event_timestamp');
    }
    if (!canonical_hash || typeof canonical_hash !== 'string') {
      throw new Error('Missing canonical_hash');
    }
    if (!SHA256_HEX_REGEX.test(canonical_hash)) {
      throw new Error(`Malformed canonical_hash: "${canonical_hash}" must be a 64-character lowercase hexadecimal SHA-256 string`);
    }
    if (!compliance_status || !VALID_COMPLIANCE_STATUSES.includes(compliance_status)) {
      throw new Error(`Invalid compliance_status: "${compliance_status}". Must be one of: ${VALID_COMPLIANCE_STATUSES.join(', ')}`);
    }

    // Check for duplicate finalized record
    const existsBytes = await ctx.stub.getState(record_id);
    if (existsBytes && existsBytes.length > 0) {
      throw new Error(`Duplicate record: Anchor for record_id "${record_id}" already exists on the ledger and is immutable`);
    }

    const txId = ctx.stub.getTxID();
    const txTimestamp = ctx.stub.getTxTimestamp();
    const committedAt = txTimestamp ? new Date(txTimestamp.seconds.low * 1000).toISOString() : new Date().toISOString();

    const anchorRecord: AnchorRecord = {
      docType: 'anchor',
      anchor_id,
      record_id,
      certificate_id,
      facility_id,
      event_timestamp,
      canonical_hash: canonical_hash.toLowerCase(),
      compliance_status,
      signature_algorithm: signature_algorithm || 'ES256',
      signature_key_id: signature_key_id || 'default_key',
      record_version: typeof record_version === 'number' ? record_version : 1,
      anchor_schema_version: anchor_schema_version || 'atc-v1',
      tx_id: txId,
      committed_at: committedAt
    };

    const recordBuffer = Buffer.from(JSON.stringify(anchorRecord));
    await ctx.stub.putState(record_id, recordBuffer);

    // Create composite key for hash index (to enable fast lookup by canonical_hash)
    const hashCompositeKey = ctx.stub.createCompositeKey('hash~record', [anchorRecord.canonical_hash, record_id]);
    await ctx.stub.putState(hashCompositeKey, Buffer.from('\u0000'));

    // Emit event
    ctx.stub.setEvent('AnchorCreated', Buffer.from(JSON.stringify({
      record_id,
      anchor_id,
      canonical_hash: anchorRecord.canonical_hash,
      facility_id,
      tx_id: txId
    })));

    return JSON.stringify(anchorRecord);
  }

  /**
   * ReadAnchor / GetAnchorByRecordId
   */
  @Transaction(false)
  @Returns('string')
  public async ReadAnchor(ctx: Context, record_id: string): Promise<string> {
    return this.GetAnchorByRecordId(ctx, record_id);
  }

  @Transaction(false)
  @Returns('string')
  public async GetAnchorByRecordId(ctx: Context, record_id: string): Promise<string> {
    if (!record_id) {
      throw new Error('record_id parameter is required');
    }
    const dataBytes = await ctx.stub.getState(record_id);
    if (!dataBytes || dataBytes.length === 0) {
      throw new Error(`Anchor not found for record_id: "${record_id}"`);
    }
    return dataBytes.toString('utf8');
  }

  /**
   * GetAnchorByHash
   * Queries anchor by its canonical SHA-256 hash using the composite key index.
   */
  @Transaction(false)
  @Returns('string')
  public async GetAnchorByHash(ctx: Context, canonical_hash: string): Promise<string> {
    if (!canonical_hash || !SHA256_HEX_REGEX.test(canonical_hash)) {
      throw new Error(`Invalid canonical_hash: must be a 64-character lowercase hex SHA-256 string`);
    }

    const iterator = await ctx.stub.getStateByPartialCompositeKey('hash~record', [canonical_hash.toLowerCase()]);
    let recordId: string | null = null;

    try {
      const result = await iterator.next();
      if (!result.done && result.value) {
        const splitKey = ctx.stub.splitCompositeKey(result.value.key);
        if (splitKey.attributes && splitKey.attributes.length >= 2) {
          recordId = splitKey.attributes[1];
        }
      }
    } finally {
      await iterator.close();
    }

    if (!recordId) {
      throw new Error(`No anchor found matching canonical_hash: "${canonical_hash}"`);
    }

    return this.GetAnchorByRecordId(ctx, recordId);
  }

  /**
   * VerifyAnchorReference
   * Verifies whether a given record_id and SHA-256 hash match what is committed on the ledger.
   */
  @Transaction(false)
  @Returns('string')
  public async VerifyAnchorReference(ctx: Context, record_id: string, hash: string): Promise<string> {
    if (!record_id) {
      throw new Error('record_id is required');
    }
    if (!hash) {
      throw new Error('hash is required');
    }

    const dataBytes = await ctx.stub.getState(record_id);
    if (!dataBytes || dataBytes.length === 0) {
      const res: VerificationResult = {
        record_id,
        verified: false,
        provided_hash: hash,
        error: 'Record not found on ledger'
      };
      return JSON.stringify(res);
    }

    const anchor: AnchorRecord = JSON.parse(dataBytes.toString('utf8'));
    const isMatch = anchor.canonical_hash === hash.toLowerCase();

    const result: VerificationResult = {
      record_id,
      verified: isMatch,
      ledger_canonical_hash: anchor.canonical_hash,
      provided_hash: hash.toLowerCase(),
      compliance_status: anchor.compliance_status,
      timestamp: anchor.event_timestamp
    };

    return JSON.stringify(result);
  }

  /**
   * RecordCorrectionLink
   * Records an append-only correction link while maintaining immutable history.
   */
  @Transaction()
  @Returns('string')
  public async RecordCorrectionLink(
    ctx: Context,
    original_record_id: string,
    corrected_record_id: string,
    reason: string
  ): Promise<string> {
    if (!original_record_id || !corrected_record_id) {
      throw new Error('Both original_record_id and corrected_record_id are required');
    }
    if (!reason || reason.trim().length === 0) {
      throw new Error('A valid reason must be provided for recording a correction');
    }

    // Verify original record exists
    const origBytes = await ctx.stub.getState(original_record_id);
    if (!origBytes || origBytes.length === 0) {
      throw new Error(`Original record "${original_record_id}" not found on ledger`);
    }

    // Verify corrected record exists
    const corrBytes = await ctx.stub.getState(corrected_record_id);
    if (!corrBytes || corrBytes.length === 0) {
      throw new Error(`Corrected record "${corrected_record_id}" not found on ledger`);
    }

    const correctionKey = ctx.stub.createCompositeKey('correction', [original_record_id, corrected_record_id]);
    const txId = ctx.stub.getTxID();
    const actorMsp = ctx.clientIdentity.getMSPID();
    const txTimestamp = ctx.stub.getTxTimestamp();
    const timestamp = txTimestamp ? new Date(txTimestamp.seconds.low * 1000).toISOString() : new Date().toISOString();

    const link: CorrectionLink = {
      docType: 'correction_link',
      original_record_id,
      corrected_record_id,
      reason,
      timestamp,
      actor_msp: actorMsp,
      tx_id: txId
    };

    await ctx.stub.putState(correctionKey, Buffer.from(JSON.stringify(link)));

    ctx.stub.setEvent('CorrectionRecorded', Buffer.from(JSON.stringify({
      original_record_id,
      corrected_record_id,
      actor_msp: actorMsp,
      tx_id: txId
    })));

    return JSON.stringify(link);
  }
}
