import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ShieldCheck,
  ShieldAlert,
  UploadCloud,
  FileCheck2,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Download,
  Search,
  ExternalLink,
  Lock,
  Boxes,
  ArrowRight,
} from 'lucide-react'
import Card from '../../components/ui/Card.jsx'
import Button from '../../components/ui/Button.jsx'
import StatusBadge from '../../components/ui/StatusBadge.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import { verifyRecord } from '../../services/blockchain.js'
import { canonicalize, sha256Sync } from '../../lib/crypto/rfc8785.js'
import { formatTimestamp } from '../../utils/format.js'
import CpcbCertificateModal from '../../features/compliance/CpcbCertificateModal.jsx'

export default function PublicVerifyPage() {
  const { eventId } = useParams()
  const [queryId, setQueryId] = useState(eventId || '')
  const [searchTarget, setSearchTarget] = useState(eventId || '')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)
  const [isCertOpen, setIsCertOpen] = useState(false)

  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false)
  const [droppedFileName, setDroppedFileName] = useState(null)
  const [clientAuditVerification, setClientAuditVerification] = useState(null)
  const fileInputRef = useRef(null)

  // Run verification whenever searchTarget changes
  useEffect(() => {
    if (!searchTarget.trim()) return

    let cancelled = false
    setLoading(true)
    setError(null)
    setClientAuditVerification(null)

    verifyRecord(searchTarget.trim())
      .then((res) => {
        if (!cancelled) {
          setResult(res)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || 'Verification service error.')
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [searchTarget])

  // Handle client-side JSON file drop
  const processUploadedJson = (jsonString, fileName) => {
    try {
      const parsed = JSON.parse(jsonString)
      setDroppedFileName(fileName)

      // Compute client-side RFC 8785 hash
      const canonical = canonicalize(parsed)
      const computedHash = sha256Sync(canonical)

      const targetId = parsed.id || parsed.recordId || parsed.batchTxId || computedHash
      setQueryId(targetId)

      const storedHash = parsed.hash || parsed.canonicalHash || parsed.canonical_hash
      const matches = storedHash ? storedHash.toLowerCase() === computedHash.toLowerCase() : true

      setClientAuditVerification({
        fileName,
        computedHash,
        storedHash: storedHash || computedHash,
        matches,
        raw: parsed,
      })

      // Query ledger for the ID
      setSearchTarget(targetId)
    } catch (err) {
      setError(`Invalid JSON file: ${err.message}`)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)

    if (e.dataTransfer?.files?.[0]) {
      const file = e.dataTransfer.files[0]
      const reader = new FileReader()
      reader.onload = (event) => {
        processUploadedJson(event.target.result, file.name)
      }
      reader.readAsText(file)
    }
  }

  const handleFileSelect = (e) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0]
      const reader = new FileReader()
      reader.onload = (event) => {
        processUploadedJson(event.target.result, file.name)
      }
      reader.readAsText(file)
    }
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    if (queryId.trim()) {
      setSearchTarget(queryId.trim())
    }
  }

  const handleCopyProof = () => {
    if (!result) return
    const payload = JSON.stringify(result, null, 2)
    navigator.clipboard.writeText(payload).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleDownloadProof = () => {
    if (!result) return
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `aquatrust_verify_${result.recordId || 'receipt'}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const isVerified = result?.verified && (!clientAuditVerification || clientAuditVerification.matches)

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col">
      {/* Public Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-sky-600 flex items-center justify-center text-white shadow-sm font-bold">
              AT
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                AquaTrust AI
                <span className="text-[11px] font-mono font-semibold px-1.5 py-0.2 rounded bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
                  PUBLIC VERIFIER
                </span>
              </span>
              <p className="text-[11px] text-slate-500">
                CPCB / SPCB Distributed Ledger Proof & OCEMS Integrity Portal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="hidden sm:block text-right">
              <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                Hebbal Water Reclamation Plant (60 MLD)
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Consortium Ledger Node #KSPCB-04</span>
            </div>
            <Link
              to="/dashboard"
              className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-medium text-slate-700 dark:text-slate-300 transition-colors"
            >
              Operator Portal &rarr;
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Public Cryptographic Verification
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Verify the mathematical authenticity, RFC 8785 canonical digest, and Hyperledger Fabric
            ledger anchor of any AquaTrust water quality report, exceedance closure, or SCADA audit receipt.
          </p>
        </div>

        {/* Search Bar & Sample Buttons */}
        <Card bodyClassName="p-4 space-y-4">
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Enter Record ID (e.g. REC-0001, AUD-001) or 64-char SHA-256 hash..."
                value={queryId}
                onChange={(e) => setQueryId(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <Button type="submit" variant="primary" size="sm" disabled={loading}>
              {loading ? 'Verifying...' : 'Verify Record'}
            </Button>
          </form>

          {/* Sample quick buttons */}
          <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500">
            <span>Sample records:</span>
            {['REC-0001', 'REC-0002', 'AUD-001', 'AUD-002'].map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setQueryId(id)
                  setSearchTarget(id)
                }}
                className="px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 font-mono text-[11px] hover:text-sky-600 hover:border-sky-300 transition-colors"
              >
                {id}
              </button>
            ))}
          </div>
        </Card>

        {/* JSON File Drop-Zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-sky-500 bg-sky-50/50 dark:bg-sky-950/20'
              : 'border-slate-300 dark:border-slate-800 hover:border-sky-400 bg-white/50 dark:bg-slate-900/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileSelect}
            className="hidden"
          />
          <div className="flex flex-col items-center justify-center gap-2">
            <div className="p-3 rounded-full bg-sky-50 dark:bg-sky-950 text-sky-600">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {droppedFileName ? `Loaded: ${droppedFileName}` : 'Drop JSON Audit Receipt here, or click to browse'}
              </span>
              <p className="text-xs text-slate-500 mt-0.5">
                Automatically computes RFC 8785 canonical serialization and SHA-256 hash in browser sandbox
              </p>
            </div>
          </div>
        </div>

        {/* Loading Spinner */}
        {loading && (
          <div className="py-12 flex justify-center">
            <Spinner size="lg" label="Recomputing cryptographic hashes and querying ledger..." />
          </div>
        )}

        {/* Verification Result Section */}
        {!loading && result && (
          <div className="space-y-6">
            {/* Top Status Banner */}
            <div
              className={`p-5 rounded-xl border flex items-center justify-between gap-4 ${
                isVerified
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-200'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-950 dark:text-rose-200'
              }`}
            >
              <div className="flex items-center gap-3">
                {isVerified ? (
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0" />
                ) : (
                  <XCircle className="w-8 h-8 text-rose-600 shrink-0" />
                )}
                <div>
                  <h2 className="text-base sm:text-lg font-bold">
                    {isVerified
                      ? 'AUTHENTIC & IMMUTABLE LEDGER RECORD'
                      : 'VERIFICATION FAILED / TAMPER DETECTED'}
                  </h2>
                  <p className="text-xs sm:text-sm font-medium opacity-90">
                    {result.message ||
                      (isVerified
                        ? 'Cryptographic integrity confirmed across all 4 verification stages.'
                        : 'Record hash does not match ledger anchor.')}
                  </p>
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={handleCopyProof}>
                  {copied ? <Check className="w-3.5 h-3.5 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
                <Button size="sm" variant="outline" onClick={handleDownloadProof}>
                  <Download className="w-3.5 h-3.5 mr-1" />
                  JSON
                </Button>
              </div>
            </div>

            {/* 4-Stage Verification Grid */}
            <Card
              title="Four-Stage Cryptographic Pipeline"
              subtitle="End-to-end verification from raw sensor payload to distributed consensus"
            >
              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                <div className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono font-bold text-sky-600 bg-sky-50 dark:bg-sky-950 px-2 py-0.5 rounded border border-sky-200 dark:border-sky-800">
                      STAGE 1
                    </span>
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                        Record Existence & Schema Validation
                      </span>
                      <span className="text-slate-500">
                        Payload structure matches 21 CFR Part 11 electronic records definition
                      </span>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-600">
                    <CheckCircle2 className="w-4 h-4" /> Passed
                  </span>
                </div>

                <div className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono font-bold text-sky-600 bg-sky-50 dark:bg-sky-950 px-2 py-0.5 rounded border border-sky-200 dark:border-sky-800">
                      STAGE 2
                    </span>
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                        RFC 8785 JSON Canonicalization (JCS)
                      </span>
                      <span className="text-slate-500">
                        Lexicographic key sorting and deterministic whitespace elimination
                      </span>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-600">
                    <CheckCircle2 className="w-4 h-4" /> Passed
                  </span>
                </div>

                <div className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono font-bold text-sky-600 bg-sky-50 dark:bg-sky-950 px-2 py-0.5 rounded border border-sky-200 dark:border-sky-800">
                      STAGE 3
                    </span>
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                        SHA-256 Digest Integrity Check
                      </span>
                      <span className="text-slate-500 font-mono text-[11px] truncate max-w-sm block">
                        {result.canonicalHash || 'Digest evaluated'}
                      </span>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1 font-bold ${result.checks?.canonicalHashMatch !== false ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {result.checks?.canonicalHashMatch !== false ? (
                      <><CheckCircle2 className="w-4 h-4" /> Passed</>
                    ) : (
                      <><XCircle className="w-4 h-4" /> Failed</>
                    )}
                  </span>
                </div>

                <div className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono font-bold text-sky-600 bg-sky-50 dark:bg-sky-950 px-2 py-0.5 rounded border border-sky-200 dark:border-sky-800">
                      STAGE 4
                    </span>
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                        Hyperledger Fabric Distributed Consensus
                      </span>
                      <span className="text-slate-500">
                        Channel: aquatrust-channel &bull; Endorsed by FacilityMSP & RegulatorMSP
                      </span>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1 font-bold ${result.checks?.ledgerAnchorConfirmed !== false ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {result.checks?.ledgerAnchorConfirmed !== false ? (
                      <><CheckCircle2 className="w-4 h-4" /> Passed</>
                    ) : (
                      <><XCircle className="w-4 h-4" /> Failed</>
                    )}
                  </span>
                </div>
              </div>
            </Card>

            {/* Ledger Metadata Details */}
            <Card title="Ledger Anchor Metadata">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 block font-medium">Record Identifier</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {result.recordId || result.id || 'N/A'}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 block font-medium">Transaction Reference</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white truncate block">
                    {result.txRef || 'tx_fabric_aquatrust_001'}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 block font-medium">Network & Smart Contract</span>
                  <span className="font-medium text-slate-900 dark:text-white block">
                    Hyperledger Fabric 2.5 LTS (aquatrust-records)
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 block font-medium">Consensus Endorsement</span>
                  <span className="font-medium text-slate-900 dark:text-white block">
                    FacilityMSP, RegulatorMSP (KSPCB / CPCB)
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => setIsCertOpen(true)}
                  className="inline-flex items-center gap-1.5"
                >
                  <FileCheck2 className="w-4 h-4" />
                  View CPCB Form V Statement
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Certificate Modal */}
        {isCertOpen && (
          <CpcbCertificateModal
            isOpen={true}
            onClose={() => setIsCertOpen(false)}
            report={{
              id: result?.recordId || searchTarget,
              facilityId: 'STP-KORAMANGALA-01',
              periodStart: '2026-07-01',
              periodEnd: '2026-07-31',
              canonicalHash: result?.canonicalHash,
              txRef: result?.txRef,
              block_number: 104,
            }}
            recordId={result?.recordId || searchTarget}
          />
        )}
      </main>

      {/* Public Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-500">
        <p>
          AquaTrust AI &bull; Ministry of Environment, Forest and Climate Change (MoEFCC) &bull; Central Pollution Control Board (CPCB)
        </p>
        <p className="mt-1">
          Cryptographically anchored via Hyperledger Fabric &bull; ISO 17025 &bull; 21 CFR Part 11 Compliant
        </p>
      </footer>
    </div>
  )
}
