import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, Search, KeyRound, Network, Cpu, Lock, Database, FileCheck } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader.jsx'
import Card from '../../components/ui/Card.jsx'
import Button from '../../components/ui/Button.jsx'
import AnchoredRecordsTable from '../../features/blockchain/AnchoredRecordsTable.jsx'
import AuditTrailTable from '../../features/blockchain/AuditTrailTable.jsx'

const SAMPLE_RECORDS = ['REC-0001', 'REC-0002', 'REC-0003']

export default function BlockchainPage() {
  const [activeTab, setActiveTab] = useState('anchors')
  const [searchId, setSearchId] = useState('')
  const navigate = useNavigate()

  const handleVerify = (idToVerify) => {
    const target = (idToVerify || searchId).trim()
    if (target) {
      navigate(`/blockchain/verify?recordId=${encodeURIComponent(target)}`)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    handleVerify()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Distributed Ledger & Proof Verification"
        subtitle="Cryptographic non-repudiation, RFC 8785 canonical hashing, and Hyperledger Fabric 2.5 anchors"
      />

      {/* Industrial Trust & Quick Verifier Banner */}
      <Card
        className="bg-gradient-to-br from-slate-900 via-slate-800 to-sky-950 text-white border-slate-700 shadow-lg"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-sky-500/20 text-sky-300 text-xs font-semibold tracking-wide border border-sky-400/30">
              <Lock className="h-3.5 w-3.5" />
              Consortium Trust Protocol Active
            </div>
            <h2 className="text-lg font-bold tracking-tight text-white">
              Independent Cryptographic Audit Console
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Verify any treatment batch or SCADA setpoint event against the immutable ledger without trusting the database. 
              AquaTrust AI checks canonical atc-v1 SHA-256 digests, ECDSA NIST P-256 signatures, and Fabric multi-org endorsements.
            </p>

            {/* Quick sample chips */}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[11px] text-slate-400">Sample Records:</span>
              {SAMPLE_RECORDS.map((rec) => (
                <button
                  key={rec}
                  type="button"
                  onClick={() => handleVerify(rec)}
                  className="px-2 py-0.5 rounded bg-slate-700/80 hover:bg-sky-600/80 text-[11px] font-mono text-slate-200 transition-colors border border-slate-600"
                >
                  {rec}
                </button>
              ))}
            </div>
          </div>

          {/* Search / Verification Form */}
          <form onSubmit={handleSubmit} className="w-full lg:max-w-md space-y-2">
            <label htmlFor="record-search" className="block text-xs font-medium text-slate-300">
              Enter Treatment Record ID or SHA-256 Digest:
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  id="record-search"
                  type="text"
                  value={searchId}
                  onChange={(e) => setSearchId(e.target.value)}
                  placeholder="e.g. REC-0001, EVT-..., or SHA-256"
                  className="w-full rounded-lg bg-slate-900/90 pl-9 pr-3 py-2 text-xs font-mono text-white placeholder-slate-500 border border-slate-700 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-hidden"
                />
              </div>
              <Button
                type="submit"
                variant="primary"
                className="bg-sky-600 hover:bg-sky-500 text-white shrink-0 text-xs px-3.5 py-2 inline-flex items-center gap-1.5"
              >
                <ShieldCheck className="h-4 w-4" />
                Verify Proof
              </Button>
            </div>

            {/* Live Ledger Specs Bar */}
            <div className="grid grid-cols-3 gap-2 pt-2 text-[10px] text-slate-400 font-mono">
              <div className="flex items-center gap-1">
                <Network className="h-3 w-3 text-sky-400" />
                <span>aquatrust-channel</span>
              </div>
              <div className="flex items-center gap-1">
                <Cpu className="h-3 w-3 text-emerald-400" />
                <span>Fabric 2.5 LTS</span>
              </div>
              <div className="flex items-center gap-1">
                <KeyRound className="h-3 w-3 text-amber-400" />
                <span>NIST P-256 ECDSA</span>
              </div>
            </div>
          </form>
        </div>
      </Card>

      {/* Tabs navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('anchors')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'anchors'
              ? 'border-sky-600 text-sky-600 dark:border-sky-400 dark:text-sky-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Database className="w-4 h-4" />
          Anchored Treatment Records
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'audit'
              ? 'border-sky-600 text-sky-600 dark:border-sky-400 dark:text-sky-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          SCADA Audit Trail (Part 11)
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'anchors' ? (
        <AnchoredRecordsTable />
      ) : (
        <AuditTrailTable />
      )}
    </div>
  )
}

