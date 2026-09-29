import { describe, it, expect } from 'vitest'
import JSZip from 'jszip'
import { generateEvidencePack } from './evidencePack.js'
import { sha256Sync } from '../crypto/rfc8785.js'

describe('evidencePack — Statutory Evidence Pack Bundler', () => {
  const mockRecord = {
    id: 'TEST-REC-001',
    tagId: 'AIT-503',
    plantName: 'Hebbal STP (60 MLD)',
    hash: 'e963fc23cf0eb966c4c5cf2339678e0c4cbca476a6e542bf82aa7aeb354f3b17',
    anchorStatus: 'Anchored',
    batchTxId: 'tx_fabric_batch_0815',
    blockNumber: 142981,
  }

  it('generates a valid ZIP containing Form V certificate, CSV telemetry, Merkle proof, and manifest.json', async () => {
    const zipBlob = await generateEvidencePack(mockRecord)
    expect(zipBlob).toBeInstanceOf(Blob)
    expect(zipBlob.size).toBeGreaterThan(100)

    // Unpack ZIP to verify internal files exist
    const unzipped = await JSZip.loadAsync(zipBlob)
    expect(unzipped.file('cpcb_form_v_certificate.html')).not.toBeNull()
    expect(unzipped.file('raw_telemetry_slice.csv')).not.toBeNull()
    expect(unzipped.file('merkle_inclusion_proof.json')).not.toBeNull()
    expect(unzipped.file('signature_cert_chain.pem')).not.toBeNull()
    expect(unzipped.file('manifest.json')).not.toBeNull()

    const manifestStr = await unzipped.file('manifest.json').async('string')
    const manifest = JSON.parse(manifestStr)

    expect(manifest.recordId).toBe('TEST-REC-001')
    expect(manifest.totalFiles).toBe(4)
    expect(manifest.hashes['cpcb_form_v_certificate.html']).toMatch(/^[0-9a-f]{64}$/)
    expect(manifest.hashes['raw_telemetry_slice.csv']).toMatch(/^[0-9a-f]{64}$/)
    expect(manifest.hashes['merkle_inclusion_proof.json']).toMatch(/^[0-9a-f]{64}$/)
    expect(manifest.hashes['signature_cert_chain.pem']).toMatch(/^[0-9a-f]{64}$/)
  })

  it('manifest SHA-256 entries strictly match bundled file contents', async () => {
    const zipBlob = await generateEvidencePack(mockRecord)
    const unzipped = await JSZip.loadAsync(zipBlob)

    const manifestStr = await unzipped.file('manifest.json').async('string')
    const manifest = JSON.parse(manifestStr)

    // Verify SHA-256 digest of each file independently
    for (const [filename, expectedHash] of Object.entries(manifest.hashes)) {
      const fileContent = await unzipped.file(filename).async('string')
      const actualHash = sha256Sync(fileContent)
      expect(actualHash).toBe(expectedHash)
    }
  })

  it('a tampered file inside the bundle is detectable via manifest mismatch', async () => {
    const zipBlob = await generateEvidencePack(mockRecord)
    const unzipped = await JSZip.loadAsync(zipBlob)

    const manifestStr = await unzipped.file('manifest.json').async('string')
    const manifest = JSON.parse(manifestStr)

    const originalCsv = await unzipped.file('raw_telemetry_slice.csv').async('string')
    const recordedHash = manifest.hashes['raw_telemetry_slice.csv']

    // Tamper one value in the CSV
    const tamperedCsv = `${originalCsv}\n2026-09-28T05:00:00Z,AIT-503,"Effluent COD",999.9,mg/L,BAD,TAMPERED`
    const tamperedHash = sha256Sync(tamperedCsv)

    // Tampered digest must not match the signed manifest entry
    expect(tamperedHash).not.toBe(recordedHash)
  })

  it('export succeeds gracefully with a clear "Pending anchor" note when anchorStatus is "Pending"', async () => {
    const pendingRecord = {
      id: 'REC-PENDING-042',
      tagId: 'AIT-503',
      plantName: 'Hebbal STP (60 MLD)',
      anchorStatus: 'Pending',
    }

    const zipBlob = await generateEvidencePack(pendingRecord)
    expect(zipBlob).toBeInstanceOf(Blob)

    const unzipped = await JSZip.loadAsync(zipBlob)

    // Verify manifest contains clear Pending anchor notes
    const manifestStr = await unzipped.file('manifest.json').async('string')
    const manifest = JSON.parse(manifestStr)
    expect(manifest.anchorStatus).toBe('Pending')
    expect(manifest.anchorNote).toContain('Pending anchor')
    expect(manifest.complianceStatus).toBe('PENDING_ANCHOR')

    // Verify Merkle proof notes pending status
    const merkleStr = await unzipped.file('merkle_inclusion_proof.json').async('string')
    const merkle = JSON.parse(merkleStr)
    expect(merkle.verifiedLedgerState).toBe('PENDING_BATCH_ANCHOR')
    expect(merkle.anchorNote).toContain('Pending anchor')

    // Verify Certificate HTML includes Pending warning
    const certHtml = await unzipped.file('cpcb_form_v_certificate.html').async('string')
    expect(certHtml).toContain('PENDING LEDGER ANCHOR')
    expect(certHtml).toContain('Pending anchor')
  })
})
