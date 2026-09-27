import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import { Context } from 'fabric-contract-api';
import { ChaincodeStub, ClientIdentity } from 'fabric-shim';
import { AquaTrustRecordContract } from '../src/recordContract';
import { AnchorRecord } from '../src/types';

chai.should();
chai.use(chaiAsPromised);
chai.use(sinonChai);
const expect = chai.expect;

describe('AquaTrustRecordContract', () => {
  let contract: AquaTrustRecordContract;
  let ctx: sinon.SinonStubbedInstance<Context>;
  let mockStub: any;
  let mockClientIdentity: any;
  let stateMap: Map<string, Buffer>;

  const validSampleRecord: Partial<AnchorRecord> = {
    anchor_id: 'anc_20260927_001',
    record_id: 'rec_stp_001_20260927',
    certificate_id: 'cert_9901_2026',
    facility_id: 'STP-KORAMANGALA-01',
    event_timestamp: '2026-09-27T10:00:00Z',
    canonical_hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    compliance_status: 'COMPLIANT',
    signature_algorithm: 'ES256',
    signature_key_id: 'facility-key-01',
    record_version: 1,
    anchor_schema_version: 'atc-v1'
  };

  beforeEach(() => {
    contract = new AquaTrustRecordContract();
    stateMap = new Map<string, Buffer>();

    mockStub = {
      getState: sinon.stub().callsFake(async (key: string) => {
        return stateMap.get(key) || Buffer.from('');
      }),
      putState: sinon.stub().callsFake(async (key: string, value: Buffer) => {
        stateMap.set(key, value);
      }),
      createCompositeKey: sinon.stub().callsFake((objectType: string, attributes: string[]) => {
        return `${objectType}:${attributes.join(':')}`;
      }),
      splitCompositeKey: sinon.stub().callsFake((compositeKey: string) => {
        const parts = compositeKey.split(':');
        return { objectType: parts[0], attributes: parts.slice(1) };
      }),
      getStateByPartialCompositeKey: sinon.stub().callsFake(async (objectType: string, attributes: string[]) => {
        const prefix = `${objectType}:${attributes.join(':')}`;
        const matched: { key: string; value: Buffer }[] = [];
        for (const [k, v] of stateMap.entries()) {
          if (k.startsWith(prefix)) {
            matched.push({ key: k, value: v });
          }
        }
        let index = 0;
        return {
          next: async () => {
            if (index < matched.length) {
              return { value: matched[index++], done: false };
            }
            return { value: null, done: true };
          },
          close: async () => {}
        };
      }),
      getTxID: sinon.stub().returns('tx_sample_test_id_999'),
      getTxTimestamp: sinon.stub().returns({ seconds: { low: 1787837582 } }),
      setEvent: sinon.stub()
    };

    mockClientIdentity = {
      getMSPID: sinon.stub().returns('FacilityMSP')
    };

    ctx = {
      stub: mockStub as unknown as ChaincodeStub,
      clientIdentity: mockClientIdentity as unknown as ClientIdentity
    } as unknown as sinon.SinonStubbedInstance<Context>;
  });

  describe('CreateAnchor', () => {
    it('should successfully create an anchor with valid payload', async () => {
      const payloadStr = JSON.stringify(validSampleRecord);
      const resStr = await contract.CreateAnchor(ctx, payloadStr);
      const res: AnchorRecord = JSON.parse(resStr);

      expect(res.record_id).to.equal(validSampleRecord.record_id);
      expect(res.canonical_hash).to.equal(validSampleRecord.canonical_hash);
      expect(res.tx_id).to.equal('tx_sample_test_id_999');
      expect(mockStub.putState).to.have.been.called;
      expect(mockStub.setEvent).to.have.been.calledWith('AnchorCreated');
    });

    it('should reject duplicate record_id anchors', async () => {
      const payloadStr = JSON.stringify(validSampleRecord);
      await contract.CreateAnchor(ctx, payloadStr);

      await expect(contract.CreateAnchor(ctx, payloadStr)).to.be.rejectedWith(
        /Duplicate record: Anchor for record_id/
      );
    });

    it('should reject malformed SHA-256 hash', async () => {
      const invalidRecord = { ...validSampleRecord, canonical_hash: 'not-a-valid-sha256' };
      await expect(contract.CreateAnchor(ctx, JSON.stringify(invalidRecord))).to.be.rejectedWith(
        /Malformed canonical_hash/
      );
    });

    it('should reject missing required fields', async () => {
      const missingFacility = { ...validSampleRecord, facility_id: '' };
      await expect(contract.CreateAnchor(ctx, JSON.stringify(missingFacility))).to.be.rejectedWith(
        /Missing or invalid facility_id/
      );
    });

    it('should reject invalid compliance status', async () => {
      const invalidCompliance = { ...validSampleRecord, compliance_status: 'SUPER_COMPLIANT' as any };
      await expect(contract.CreateAnchor(ctx, JSON.stringify(invalidCompliance))).to.be.rejectedWith(
        /Invalid compliance_status/
      );
    });
  });

  describe('ReadAnchor / GetAnchorByRecordId', () => {
    it('should retrieve existing anchor by record_id', async () => {
      await contract.CreateAnchor(ctx, JSON.stringify(validSampleRecord));
      const resStr = await contract.GetAnchorByRecordId(ctx, validSampleRecord.record_id!);
      const res: AnchorRecord = JSON.parse(resStr);

      expect(res.record_id).to.equal(validSampleRecord.record_id);
      expect(res.canonical_hash).to.equal(validSampleRecord.canonical_hash);
    });

    it('should throw error when record_id does not exist', async () => {
      await expect(contract.GetAnchorByRecordId(ctx, 'non_existent_rec')).to.be.rejectedWith(
        /Anchor not found/
      );
    });
  });

  describe('VerifyAnchorReference', () => {
    it('should return verified: true when provided hash matches ledger', async () => {
      await contract.CreateAnchor(ctx, JSON.stringify(validSampleRecord));
      const resStr = await contract.VerifyAnchorReference(
        ctx,
        validSampleRecord.record_id!,
        validSampleRecord.canonical_hash!
      );
      const res = JSON.parse(resStr);

      expect(res.verified).to.be.true;
      expect(res.record_id).to.equal(validSampleRecord.record_id);
    });

    it('should return verified: false when provided hash does not match ledger', async () => {
      await contract.CreateAnchor(ctx, JSON.stringify(validSampleRecord));
      const tamperedHash = 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
      const resStr = await contract.VerifyAnchorReference(
        ctx,
        validSampleRecord.record_id!,
        tamperedHash
      );
      const res = JSON.parse(resStr);

      expect(res.verified).to.be.false;
      expect(res.ledger_canonical_hash).to.equal(validSampleRecord.canonical_hash);
      expect(res.provided_hash).to.equal(tamperedHash);
    });
  });

  describe('RecordCorrectionLink', () => {
    it('should record an append-only correction link between two valid records', async () => {
      // 1. Create original record
      await contract.CreateAnchor(ctx, JSON.stringify(validSampleRecord));

      // 2. Create corrected record
      const correctedRecord = {
        ...validSampleRecord,
        anchor_id: 'anc_20260927_002',
        record_id: 'rec_stp_001_20260927_corr',
        record_version: 2,
        canonical_hash: 'a35a60032f3f9f47bc56b0dff199042b7e51f8a8ef5b47a1be32fa331b53e8d2'
      };
      await contract.CreateAnchor(ctx, JSON.stringify(correctedRecord));

      // 3. Record correction link
      const linkStr = await contract.RecordCorrectionLink(
        ctx,
        validSampleRecord.record_id!,
        correctedRecord.record_id,
        'Sensor recalibration adjustment for BOD drift'
      );
      const link = JSON.parse(linkStr);

      expect(link.original_record_id).to.equal(validSampleRecord.record_id);
      expect(link.corrected_record_id).to.equal(correctedRecord.record_id);
      expect(link.reason).to.equal('Sensor recalibration adjustment for BOD drift');
      expect(link.actor_msp).to.equal('FacilityMSP');
      expect(mockStub.setEvent).to.have.been.calledWith('CorrectionRecorded');
    });

    it('should reject correction link if original record does not exist', async () => {
      await expect(
        contract.RecordCorrectionLink(ctx, 'fake_orig', 'fake_corr', 'reason')
      ).to.be.rejectedWith(/Original record "fake_orig" not found/);
    });

    it('should reject correction link if reason is missing or empty', async () => {
      await contract.CreateAnchor(ctx, JSON.stringify(validSampleRecord));
      await expect(
        contract.RecordCorrectionLink(ctx, validSampleRecord.record_id!, 'corr_id', '')
      ).to.be.rejectedWith(/valid reason must be provided/);
    });
  });
});
