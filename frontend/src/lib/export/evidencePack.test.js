import { describe, it, expect } from 'vitest'
import JSZip from 'jszip'
import { generateEvidencePack } from './evidencePack.js'

describe('evidencePack — Statutory Evidence Pack Bundler', () => {
  it('generates a valid ZIP containing Form V certificate, CSV telemetry, Merkle proof, and manifest.json', async () => {
    const mockRecord = {
      id: 'TEST-REC-001',
      tagId: 'AIT-503',
      plantName: 'Hebbal STP (60 MLD)',
      hash: 'e963fc23cf0eb966c4c5cf2339678e0c4cbca476a6e542bf82aa7aeb354f3b17',
    }

    const zipBlob = await generateEvidencePack(mockRecord)
    expect(zipBlob).toBeInstanceOf(Blob)
    expect(zipBlob.size).toBeGreaterThan(100)

    // Unpack ZIP to verify internal files
    const unzipped = await JSZip.loadAsync(zipBlob)
    expect(unzipped.file('cpcb_form_v_certificate.html')).not.toBeNull()
    expect(unzipped.file('raw_telemetry_slice.csv')).not.toBeNull()
    expect(unzipped.file('merkle_inclusion_proof.json')).not.toBeNull()
    expect(unzipped.file('signature_cert_chain.pem')).not.toBeNull()
    expect(unzipped.file('manifest.json')).not.toBeNull()

    // Verify manifest.json contains SHA-256 hashes for all 4 evidence files
    const manifestStr = await unzipped.file('manifest.json').async('string')
    const manifest = JSON.parse(manifestStr)

    expect(manifest.recordId).toBe('TEST-REC-001')
    expect(manifest.totalFiles).toBe(4)
    expect(manifest.hashes['cpcb_form_v_certificate.html']).toMatch(/^[0-9a-f]{64}$/)
    expect(manifest.hashes['raw_telemetry_slice.csv']).toMatch(/^[0-9a-f]{64}$/)
    expect(manifest.hashes['merkle_inclusion_proof.json']).toMatch(/^[0-9a-f]{64}$/)
    expect(manifest.hashes['signature_cert_chain.pem']).toMatch(/^[0-9a-f]{64}$/)
  })
})
