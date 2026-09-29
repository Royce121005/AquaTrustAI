import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Download,
  FileArchive,
  Search,
  Filter,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ExternalLink,
  Tag,
  ArrowRight,
  User,
} from 'lucide-react'
import Card from '../../components/ui/Card.jsx'
import StatusBadge from '../../components/ui/StatusBadge.jsx'
import { useAuditEvents, AUDIT_ACTIONS, ANCHOR_STATUS } from '../../lib/audit/auditStore.js'
import { downloadEvidencePack } from '../../lib/export/evidencePack.js'
import { formatTimestamp, formatDate } from '../../utils/format.js'

export default function AuditTrailTable() {
  const events = useAuditEvents()
  const navigate = useNavigate()

  // Filter States
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAction, setSelectedAction] = useState('ALL')
  const [selectedStatus, setSelectedStatus] = useState('ALL')
  const [selectedRole, setSelectedRole] = useState('ALL')

  const filteredEvents = useMemo(() => {
    return events.filter((evt) => {
      const matchesAction = selectedAction === 'ALL' || evt.action === selectedAction
      const matchesStatus = selectedStatus === 'ALL' || evt.anchorStatus === selectedStatus
      const matchesRole = selectedRole === 'ALL' || evt.role === selectedRole

      const q = searchQuery.trim().toLowerCase()
      const matchesSearch =
        !q ||
        evt.tagId.toLowerCase().includes(q) ||
        evt.reason.toLowerCase().includes(q) ||
        evt.userName.toLowerCase().includes(q) ||
        evt.hash.toLowerCase().includes(q)

      return matchesAction && matchesStatus && matchesRole && matchesSearch
    })
  }, [events, selectedAction, selectedStatus, selectedRole, searchQuery])

  const handleRowClick = (hash) => {
    navigate(`/blockchain/verify?recordId=${encodeURIComponent(hash)}`)
  }

  const exportCsv = () => {
    const header = [
      'Event ID',
      'Timestamp',
      'User',
      'Role',
      'Action',
      'Tag ID',
      'Old Value',
      'New Value',
      'Reason',
      'Anchor Status',
      'SHA-256 Hash',
    ]
    const rows = filteredEvents.map((e) => [
      e.id,
      e.timestamp,
      `"${e.userName}"`,
      `"${e.role}"`,
      e.action,
      e.tagId,
      `"${e.oldValue || ''}"`,
      `"${e.newValue || ''}"`,
      `"${e.reason.replace(/"/g, '""')}"`,
      e.anchorStatus,
      e.hash,
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' + [header.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const link = document.createElement('a')
    link.setAttribute('href', encodeURI(csvContent))
    link.setAttribute('download', `aquatrust_scada_audit_trail_${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const exportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(filteredEvents, null, 2))
    const link = document.createElement('a')
    link.setAttribute('href', dataStr)
    link.setAttribute('download', `aquatrust_scada_audit_trail_${Date.now()}.json`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const getActionTone = (action) => {
    switch (action) {
      case AUDIT_ACTIONS.SETPOINT_CHANGE:
        return 'info'
      case AUDIT_ACTIONS.PUMP_COMMAND:
        return 'success'
      case AUDIT_ACTIONS.MODE_CHANGE:
        return 'warning'
      case AUDIT_ACTIONS.CALIBRATION:
        return 'purple'
      default:
        return 'neutral'
    }
  }

  return (
    <Card
      title="SCADA Audit Trail (21 CFR Part 11)"
      subtitle="Immutable cryptographic log of all operator control actions, calibrations, and mode changes"
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={exportCsv}
            className="px-2.5 py-1 text-xs border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-md inline-flex items-center gap-1 font-medium transition-colors"
          >
            <Download className="h-3 w-3" />
            <span>CSV</span>
          </button>
          <button
            type="button"
            onClick={exportJson}
            className="px-2.5 py-1 text-xs border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-md inline-flex items-center gap-1 font-medium transition-colors"
          >
            <Download className="h-3 w-3" />
            <span>JSON</span>
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Filters Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            {/* Action Type Filter */}
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="text-xs rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-slate-700 focus:ring-1 focus:ring-sky-500 font-medium"
            >
              <option value="ALL">All Actions</option>
              {Object.values(AUDIT_ACTIONS).map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-xs rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-slate-700 focus:ring-1 focus:ring-sky-500 font-medium"
            >
              <option value="ALL">All Anchor Statuses</option>
              <option value={ANCHOR_STATUS.PENDING}>Pending (Batching)</option>
              <option value={ANCHOR_STATUS.ANCHORED}>Anchored (Fabric 2.5)</option>
            </select>

            {/* Role Filter */}
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="text-xs rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-slate-700 focus:ring-1 focus:ring-sky-500 font-medium"
            >
              <option value="ALL">All User Roles</option>
              <option value="Plant Operator">Plant Operator</option>
              <option value="Independent Auditor">Independent Auditor</option>
              <option value="Environmental Regulator">Environmental Regulator</option>
            </select>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search tag, reason, hash…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white placeholder-slate-400 focus:ring-1 focus:ring-sky-500"
            />
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-2xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-mono tracking-wider border-b border-slate-200 text-[11px]">
              <tr>
                <th className="px-3 py-2.5">Timestamp</th>
                <th className="px-3 py-2.5">User & Role</th>
                <th className="px-3 py-2.5">Action</th>
                <th className="px-3 py-2.5">Tag</th>
                <th className="px-3 py-2.5">Transition</th>
                <th className="px-3 py-2.5">Reason & Advisory</th>
                <th className="px-3 py-2.5 text-center">Status</th>
                <th className="px-3 py-2.5 text-right">Proof</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {filteredEvents.map((evt) => {
                const isAnchored = evt.anchorStatus === ANCHOR_STATUS.ANCHORED
                return (
                  <tr
                    key={evt.id}
                    onClick={() => handleRowClick(evt.hash)}
                    className="hover:bg-sky-50/50 cursor-pointer transition-colors group"
                    title="Click to verify cryptographic proof on Hyperledger Fabric ledger"
                  >
                    <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">
                      {formatTimestamp(evt.timestamp)}
                    </td>

                    <td className="px-3 py-2.5 font-sans font-medium text-slate-800">
                      <div className="flex items-center gap-1.5">
                        <User className="h-3 w-3 text-slate-400" />
                        <span>{evt.userName}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 block font-normal">{evt.role}</span>
                    </td>

                    <td className="px-3 py-2.5 font-sans">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          evt.action === AUDIT_ACTIONS.PUMP_COMMAND
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : evt.action === AUDIT_ACTIONS.MODE_CHANGE
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : evt.action === AUDIT_ACTIONS.CALIBRATION
                                ? 'bg-purple-50 text-purple-800 border border-purple-200'
                                : 'bg-sky-50 text-sky-800 border border-sky-200'
                        }`}
                      >
                        {evt.action.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="px-3 py-2.5 font-bold text-sky-800">
                      {evt.tagId}
                    </td>

                    <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">
                      <span className="text-slate-400">{evt.oldValue ?? '\u2014'}</span>
                      <span className="mx-1 text-slate-300">→</span>
                      <span className="font-bold text-slate-800">{evt.newValue ?? '\u2014'}</span>
                    </td>

                    <td className="px-3 py-2.5 font-sans text-slate-600 max-w-xs truncate" title={evt.reason}>
                      {evt.reason}
                    </td>

                    <td className="px-3 py-2.5 text-center font-sans">
                      {isAnchored ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Anchored</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                          <Clock className="h-3 w-3" />
                          <span>Pending (~15s)</span>
                        </span>
                      )}
                    </td>

                    <td className="px-3 py-2.5 text-right font-sans whitespace-nowrap space-x-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          downloadEvidencePack(evt)
                        }}
                        className="inline-flex items-center gap-1 text-slate-500 hover:text-sky-600 font-semibold text-[11px] p-1 rounded hover:bg-slate-100"
                        title="Download Statutory Evidence Pack ZIP"
                      >
                        <FileArchive className="h-3 w-3" />
                        <span>Pack</span>
                      </button>
                      <span className="inline-flex items-center gap-1 text-sky-600 group-hover:text-sky-800 font-semibold text-[11px]">
                        <span>Verify</span>
                        <ExternalLink className="h-3 w-3" />
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {filteredEvents.length === 0 && (
          <div className="py-8 text-center text-xs text-slate-400">
            No audit records match the selected filter criteria.
          </div>
        )}
      </div>
    </Card>
  )
}
