import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ShieldAlert,
  Building2,
  FileCheck2,
  Scale,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  Boxes,
  ArrowRight,
} from 'lucide-react'
import Card from '../../components/ui/Card.jsx'
import Button from '../../components/ui/Button.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import AllStpGrid from '../dashboard/AllStpGrid.jsx'

export default function RegulatorWorkspace() {
  const [selectedStpId, setSelectedStpId] = useState('hebbal')
  const navigate = useNavigate()

  const handleDrilldown = (stpId) => {
    setSelectedStpId(stpId)
    navigate(`/dashboard?stpId=${encodeURIComponent(stpId)}`)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Environmental Regulator Compliance Console (CPCB / SPCB)"
        subtitle="National and State Pollution Control Board statutory oversight, multi-plant fleet sorting, and exceedance enforcement"
      />

      {/* Statutory Regulatory Fleet Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card bodyClassName="p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 uppercase font-semibold">
            <span>Jurisdiction Fleet</span>
            <Building2 className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
            13 STPs Online
          </div>
          <div className="text-[11px] text-slate-500">Karnataka & Uttar Pradesh</div>
        </Card>

        <Card bodyClassName="p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 uppercase font-semibold">
            <span>Fleet Avg Compliance</span>
            <Scale className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-600">
            91.4%
          </div>
          <div className="text-[11px] text-slate-500">NGT Statutory Threshold: 85.0%</div>
        </Card>

        <Card bodyClassName="p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 uppercase font-semibold">
            <span>Active Exceedance Notices</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-600">
            2 Facilities
          </div>
          <div className="text-[11px] text-slate-500">Under 24h SLA Remediation</div>
        </Card>

        <Card bodyClassName="p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 uppercase font-semibold">
            <span>DLT Multi-Org Proofs</span>
            <Boxes className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-sky-600">
            100% Anchored
          </div>
          <div className="text-[11px] text-slate-500">RegulatorMSP Endorsed</div>
        </Card>
      </div>

      {/* Fleet Grid with Worst-First Sorting */}
      <div className="space-y-2">
        <div className="p-3 bg-amber-500/10 border border-amber-400/30 rounded-xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Regulator View Active:</strong> Plants are prioritized <em>worst-compliance first</em> to highlight facilities with active exceedances. Click any plant tile to drill down into its real-time telemetry.
            </span>
          </div>
        </div>

        <AllStpGrid
          regulatorMode={true}
          selectedStpId={selectedStpId}
          onSelectStp={handleDrilldown}
        />
      </div>
    </div>
  )
}
