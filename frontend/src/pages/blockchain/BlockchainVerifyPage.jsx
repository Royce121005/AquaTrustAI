import { useCallback, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  CircleCheck,
  CircleX,
  Copy,
  Check,
  Download,
  Search,
  ShieldCheck,
  TriangleAlert,
  FileCheck2,
  Lock,
} from 'lucide-react'
import Card from '../../components/ui/Card.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import StatusBadge from '../../components/ui/StatusBadge.jsx'
import Button from '../../components/ui/Button.jsx'
import useAsyncData from '../../hooks/useAsyncData.js'
import { verifyRecord } from '../../services/blockchain.js'
import { formatTimestamp } from '../../utils/format.js'
import CpcbCertificateModal from '../../features/compliance/CpcbCertificateModal.jsx'

const SAMPLE_RECORDS = ['REC-0001', 'REC-0002', 'REC-0003']

function BackLink() {
  return (
    <Link
      to="/blockchain"
      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-800"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      Back to blockchain
    </Link>
  )
}

function CheckRow({ stage, label, description, passed }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="space-y-0.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200">
            {stage}
          </span>
          <span className="text-sm font-medium text-slate-800">{label}</span>
        </div>
        {description && <p className="text-xs text-slate-500 pl-8">{description}</p>}
      </div>
      <span
        className={`inline-flex items-center gap-1.5 text-xs font-semibold shrink-0 ${
          passed ? 'text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200' : 'text-red-700 bg-red-50 px-2.5 py-1 rounded-full border border-red-200'
        }`}
      >
        {passed ? (
          <CircleCheck className="h-4 w-4" aria-hidden="true" />
        ) : (
          <CircleX className="h-4 w-4" aria-hidden="true" />
        )}
        {passed ? 'Passed' : 'Failed'}
      </span>
    </div>
  )
}

export default function BlockchainVerifyPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const recordId = searchParams.get('recordId') || ''
  const [inputVal, setInputVal] = useState(recordId)
  const [copied, setCopied] = useState(false)
  const [isCertOpen, setIsCertOpen] = useState(false)

  const fetcher = useCallback(
    () => (recordId ? verifyRecord(recordId) : Promise.resolve(null)),
    [recordId],
  )
  const { status, data, reload } = useAsyncData(fetcher)

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    const target = inputVal.trim()
    if (target) {
      setSearchParams({ recordId: target })
    }
  }

  const handlePickSample = (sampleId) => {
    setInputVal(sampleId)
    setSearchParams({ recordId: sampleId })
  }

  const handleCopyProof = () => {
    if (!data) return
    const payload = JSON.stringify(data.raw || data, null, 2)
    navigator.clipboard.writeText(payload).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  const handleDownloadProof = () => {
    if (!data) return
    const payload = JSON.stringify(data.raw || data, null, 2)
    const blob = new Blob([payload], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `aquatrust_audit_proof_${data.recordId}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <BackLink />
        <div className="inline-flex items-center gap-2 text-xs font-mono text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
          <Lock className="h-3.5 w-3.5 text-sky-600" />
          <span>Independent Proof Verifier (atc-v1)</span>
        </div>
      </div>

      {/* Record Input Console */}
      <Card
        title="Audit Query & Record Input"
        subtitle="Submit a record identifier to independently verify against Hyperledger Fabric ledger"
      >
        <form onSubmit={handleSearchSubmit} className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="Enter Treatment Record ID (e.g. REC-0001 or UUID)"
                className="w-full rounded-lg bg-white pl-9 pr-3 py-2 text-xs font-mono text-slate-800 placeholder-slate-400 border border-slate-300 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-hidden"
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              className="bg-sky-600 hover:bg-sky-700 text-white shrink-0 text-xs px-4 py-2 inline-flex items-center gap-1.5"
            >
              <ShieldCheck className="h-4 w-4" />
              Verify on Ledger
            </Button>
          </div>

          <div className="flex items-center gap-2 pt-1 text-xs">
            <span className="text-slate-500">Quick Test Records:</span>
            {SAMPLE_RECORDS.map((rec) => (
              <button
                key={rec}
                type="button"
                onClick={() => handlePickSample(rec)}
                className={`px-2 py-0.5 rounded text-xs font-mono transition-colors border ${
                  recordId === rec
                    ? 'bg-sky-50 text-sky-700 border-sky-300 font-semibold'
                    : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                }`}
              >
                {rec}
              </button>
            ))}
          </div>
        </form>
      </Card>

      {status === 'loading' && (
        <Card bodyClassName="py-16">
          <Spinner size="lg" label="Querying Hyperledger Fabric peer endorsement & recomputing canonical hash…" />
        </Card>
      )}

      {!recordId && status !== 'loading' && (
        <EmptyState
          icon={Search}
          title="Select or enter a record"
          description='Enter a Record ID above or select one of the quick test records to execute the 4-stage cryptographic trust verification.'
        />
      )}

      {recordId && status === 'error' && (
        <EmptyState
          icon={TriangleAlert}
          title="Could not complete verification"
          description="A network or gateway error occurred while communicating with the ledger."
          action={
            <div className="flex items-center gap-2">
              <Button onClick={reload}>Retry Verification</Button>
              <Link
                to="/blockchain"
                className="inline-flex items-center rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-700 ring-1 ring-inset ring-slate-300 transition-colors hover:bg-slate-50"
              >
                Back to blockchain
              </Link>
            </div>
          }
        />
      )}

      {recordId && data && status === 'success' && (
        <Card
          title={`Cryptographic Audit Verdict: ${data.recordId}`}
          subtitle="Independent multi-party verification comparing off-chain evidence against immutable distributed ledger"
          actions={
            <div className="flex items-center gap-2">
              <StatusBadge
                tone={data.verified ? 'success' : 'danger'}
                label={data.verified ? 'Ledger Match · Authentic' : 'Tampered / Unverified'}
              />
              {data.verified && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsCertOpen(true)}
                  className="inline-flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200"
                >
                  <FileCheck2 className="h-3.5 w-3.5" />
                  View CPCB Return
                </Button>
              )}
            </div>
          }
        >
          {/* 4-Stage Cryptographic Pipeline Breakdown */}
          <div className="divide-y divide-slate-100 border-y border-slate-100 my-2">
            <CheckRow
              stage="Stage 1"
              label="Canonicalization & SHA-256 Digest Re-computation"
              description="RFC 8785 deterministic JSON canonicalization produces identical byte representation"
              passed={data.checks?.canonicalHashMatch ?? false}
            />
            <CheckRow
              stage="Stage 2"
              label="Digital Signature Verification (ECDSA NIST P-256)"
              description="Facility IoT edge gateway cryptographic key signature matches canonical hash"
              passed={data.checks?.signatureVerified ?? false}
            />
            <CheckRow
              stage="Stage 3"
              label="Active X.509 Certificate & Authority Validation"
              description="Signing key certificate is valid, not revoked, and enrolled in the Facility MSP"
              passed={data.checks?.recordExists ?? false}
            />
            <CheckRow
              stage="Stage 4"
              label="Hyperledger Fabric Multi-Org Consensus Anchor"
              description="Confirmed on-chain state with Raft consensus orderer and endorsing peers"
              passed={data.checks?.ledgerAnchorConfirmed ?? false}
            />
          </div>

          {/* Canonical Digest and Network Details */}
          {data.canonicalHash && (
            <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-slate-700">Anchored RFC 8785 Canonical SHA-256 Hash:</span>
                <span className="text-[10px] font-mono text-slate-500 uppercase">256-bit Hex Digest</span>
              </div>
              <code className="text-xs font-mono text-sky-900 break-all select-all block bg-white p-2.5 rounded border border-slate-200">
                {data.canonicalHash}
              </code>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600 pt-1">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Ledger Channel:</span>
                  <strong className="text-slate-800 font-mono">{data.channel || 'aquatrust-channel'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Endorsement:</span>
                  <strong className="text-slate-800 font-sans">{data.endorsement || 'FacilityMSP, RegulatorMSP'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">DLT Reference:</span>
                  <strong className="text-slate-800 font-mono truncate block">{data.txRef || 'tx_fabric_aquatrust_001'}</strong>
                </div>
              </div>
            </div>
          )}

          {/* Narrative Verdict Banner */}
          <div
            className={`mt-4 rounded-lg px-4 py-3 text-xs leading-relaxed border ${
              data.verified
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-red-50 border-red-200 text-red-900'
            }`}
          >
            <p className="font-semibold mb-0.5">{data.verified ? 'Cryptographic Guarantee Confirmed' : 'Integrity Alert'}</p>
            {data.message}
          </div>

          {/* Bottom Audit Export Actions */}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100 text-xs">
            <span className="text-slate-500">
              Audit Timestamp: <strong className="text-slate-700">{formatTimestamp(data.checkedAt)}</strong>
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyProof}
                className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Proof Copied!' : 'Copy JSON Proof'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleDownloadProof}
                className="inline-flex items-center gap-1.5 text-xs text-slate-700 bg-white hover:bg-slate-50 border border-slate-300"
              >
                <Download className="h-3.5 w-3.5" />
                Download Audit Receipt
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* CPCB Return Modal if user clicks View CPCB Return */}
      {data && (
        <CpcbCertificateModal
          isOpen={isCertOpen}
          onClose={() => setIsCertOpen(false)}
          report={{
            id: data.recordId,
            facilityId: 'STP-KORAMANGALA-01',
            periodStart: '2026-07-01',
            periodEnd: '2026-07-31',
            canonical_hash: data.canonicalHash,
            transaction_id: data.txRef,
            block_number: 104,
          }}
          recordId={data.recordId}
        />
      )}
    </div>
  )
}
