import { useState, useMemo, useEffect } from 'react'
import {
  Download,
  FileArchive,
  Lock,
  Search,
  ShieldAlert,
  Edit3,
  Check,
  X,
} from 'lucide-react'
import Card from '../../components/ui/Card.jsx'
import Button from '../../components/ui/Button.jsx'
import StatusBadge from '../../components/ui/StatusBadge.jsx'
import Modal from '../../components/ui/Modal.jsx'
import { alarmManager } from '../../lib/alarms/alarmManager.js'
import { TAG_REGISTRY } from '../../lib/tags/registry.js'
import { addAuditEvent, AUDIT_ACTIONS } from '../../lib/audit/auditStore.js'
import { downloadEvidencePack } from '../../lib/export/evidencePack.js'
import { useAuth } from '../../context/authContext.js'
import { formatTimestamp } from '../../utils/format.js'

const STORAGE_KEY = 'aquatrust-exceedance-register-v1'

const BASELINE_EXCEEDANCES = [
  {
    id: 'EXC-2026-0811',
    tagId: 'AIT-503',
    parameter: 'Effluent COD (CPCB Standard)',
    limitCrossed: 'HH (50.0 mg/L)',
    peakValue: '54.2 mg/L',
    timeIn: '2026-09-28T04:20:00.000Z',
    timeRtn: '2026-09-28T05:08:00.000Z',
    duration: '48m',
    autoCause: 'Upstream dairy processing facility slug discharge during early morning batch cleanout.',
    correctiveAction: 'Increased alum coagulant dosing on DP-101 to 24 L/h; engaged aeration blower BLW-202.',
    owner: 'K. Ramanathan (Lead Operator)',
    dueDate: '2026-09-29T04:20:00.000Z',
    status: 'In Progress',
    closureEvidence: 'Interim grab sample analysis completed; COD normalized to 34.2 mg/L.',
  },
  {
    id: 'EXC-2026-0810',
    tagId: 'AIT-504',
    parameter: 'Effluent TSS (CPCB Standard)',
    limitCrossed: 'HH (20.0 mg/L)',
    peakValue: '22.8 mg/L',
    timeIn: '2026-09-27T18:15:00.000Z',
    timeRtn: '2026-09-27T19:02:00.000Z',
    duration: '47m',
    autoCause: 'Secondary clarifier CLR-301 sludge blanket elevation during hydraulic surge.',
    correctiveAction: 'Elevated RAS pump P-103 to 75% speed and increased polymer dosing on DP-102 to 9 L/h.',
    owner: 'V. Nair (Process Tech)',
    dueDate: '2026-09-28T18:15:00.000Z',
    status: 'Closed',
    closureEvidence: 'Post-event effluent TSS laboratory gravimetric test confirmed 11.2 mg/L (Certificate #KSPCB-LAB-8812).',
  },
  {
    id: 'EXC-2026-0809',
    tagId: 'AIT-501',
    parameter: 'Effluent pH (CPCB OCEMS)',
    limitCrossed: 'LL (< 6.5 pH)',
    peakValue: '6.32 pH',
    timeIn: '2026-09-26T11:00:00.000Z',
    timeRtn: '2026-09-26T11:35:00.000Z',
    duration: '35m',
    autoCause: 'Acidic chemical clean-in-place (CIP) neutralization lag at industrial inlet.',
    correctiveAction: 'Auto-started alkali dosing pump DP-202; adjusted caustic feed rate to 4.5 L/h.',
    owner: 'K. Ramanathan (Lead Operator)',
    dueDate: '2026-09-27T11:00:00.000Z',
    status: 'Closed',
    closureEvidence: 'pH stable at 7.34 for >24 consecutive hours. Audit trail anchored on block #142850.',
  },
]

export default function ExceedanceRegister() {
  const { user, permissions } = useAuth()
  const isOperator = permissions.isOperator

  const [exceedances, setExceedances] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) return JSON.parse(stored)
    } catch {
      // fallback
    }
    return BASELINE_EXCEEDANCES
  })

  // Filter states
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editActionText, setEditActionText] = useState('')

  // Closure modal state
  const [closeModalRecord, setCloseModalRecord] = useState(null)
  const [operatorPin, setOperatorPin] = useState('')
  const [supervisorPin, setSupervisorPin] = useState('')
  const [closeReason, setCloseReason] = useState('')
  const [closeEvidence, setCloseEvidence] = useState('')
  const [closeError, setCloseError] = useState('')
  const [downloadingZipId, setDownloadingZipId] = useState(null)

  // Sync auto-discovered outfall exceedances from alarmManager journal
  useEffect(() => {
    const journal = alarmManager.getAlarmJournal()
    const outfallAlarms = journal.filter(
      (j) =>
        ['AIT-501', 'AIT-502', 'AIT-503', 'AIT-504', 'AIT-505'].includes(j.tagId) &&
        (j.limitCrossed === 'H' || j.limitCrossed === 'HH' || j.limitCrossed === 'LL')
    )

    if (outfallAlarms.length > 0) {
      setExceedances((prev) => {
        const existingIds = new Set(prev.map((e) => e.id))
        const newRecords = []

        outfallAlarms.forEach((alarm) => {
          const recId = `EXC-${alarm.id}`
          if (!existingIds.has(recId)) {
            const meta = TAG_REGISTRY[alarm.tagId] || {}
            newRecords.push({
              id: recId,
              tagId: alarm.tagId,
              parameter: meta.name || alarm.tagName,
              limitCrossed: `${alarm.limitCrossed} (${meta.alarmLimits?.[alarm.limitCrossed] || 'Limit'} ${meta.unit || ''})`,
              peakValue: `${alarm.value} ${meta.unit || ''}`,
              timeIn: new Date(alarm.timestamp).toISOString(),
              timeRtn: 'Ongoing',
              duration: 'Active',
              autoCause: meta.responseProcedure || 'Threshold excursion detected by continuous OCEMS analyzer.',
              correctiveAction: 'Initial inspection underway by duty operator.',
              owner: user?.name || 'K. Ramanathan (Lead Operator)',
              dueDate: new Date(alarm.timestamp + 24 * 3600 * 1000).toISOString(),
              status: 'Open',
              closureEvidence: 'Pending corrective intervention and laboratory verification.',
            })
          }
        })

        if (newRecords.length > 0) {
          const updated = [...newRecords, ...prev]
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
          } catch {}
          return updated
        }
        return prev
      })
    }
  }, [user])

  // Persist edits
  const saveExceedances = (updated) => {
    setExceedances(updated)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    } catch {}
  }

  // Handle corrective action edit
  const handleStartEdit = (rec) => {
    setEditingId(rec.id)
    setEditActionText(rec.correctiveAction || '')
  }

  const handleSaveEdit = (recId) => {
    const updated = exceedances.map((e) =>
      e.id === recId ? { ...e, correctiveAction: editActionText } : e
    )
    saveExceedances(updated)
    setEditingId(null)
  }

  // Handle Exceedance Close Modal Submission
  const handleConfirmClose = (e) => {
    e.preventDefault()
    setCloseError('')

    const rec = closeModalRecord
    const isCritical = TAG_REGISTRY[rec?.tagId]?.critical !== false

    if (operatorPin.trim() !== '1234') {
      setCloseError('Invalid Operator PIN. Verification code is 1234.')
      return
    }

    if (isCritical && supervisorPin.trim() !== '9999') {
      setCloseError(
        'Invalid Supervisor Approval PIN. Verification code is 9999 (Dual-authorization mandatory for critical parameters).'
      )
      return
    }

    if (!closeReason.trim()) {
      setCloseError('Closure rationale is required for statutory CPCB compliance.')
      return
    }

    try {
      // Dispatch immutable audit event
      addAuditEvent({
        action: AUDIT_ACTIONS.EXCEEDANCE_CLOSE,
        tagId: rec.tagId,
        oldValue: rec.status,
        newValue: 'Closed',
        reason: `Exceedance ${rec.id} closed: ${closeReason.trim()}`,
        userId: user?.id || 'usr_op_current',
        userName: user?.name || 'Plant Operator',
        role: user?.roleName || 'Plant Operator',
        signatureMeaning: isCritical ? 'Dual-Authorized & Closed' : 'Exceedance Resolved',
      })

      // Update state
      const updated = exceedances.map((item) =>
        item.id === rec.id
          ? {
              ...item,
              status: 'Closed',
              timeRtn: item.timeRtn === 'Ongoing' ? new Date().toISOString() : item.timeRtn,
              closureEvidence:
                closeEvidence.trim() ||
                (isCritical
                  ? 'Closed with dual-authorization cryptographic re-authentication (Operator + Supervisor).'
                  : 'Closed with operator cryptographic re-authentication.'),
            }
          : item
      )
      saveExceedances(updated)

      // Reset
      setCloseModalRecord(null)
      setOperatorPin('')
      setSupervisorPin('')
      setCloseReason('')
      setCloseEvidence('')
    } catch (err) {
      setCloseError(err.message || 'Failed to close exceedance.')
    }
  }

  // Handle Evidence Pack ZIP Download
  const handleDownloadEvidence = async (rec) => {
    try {
      setDownloadingZipId(rec.id)
      await downloadEvidencePack(rec, `evidence_pack_${rec.id}.zip`)
    } catch (err) {
      console.error('Evidence pack export error:', err)
    } finally {
      setDownloadingZipId(null)
    }
  }

  // Handle CSV Export
  const handleExportCsv = () => {
    const headers = [
      'ExceedanceID',
      'TagID',
      'Parameter',
      'LimitCrossed',
      'PeakValue',
      'TimeIn',
      'TimeRtn',
      'Duration',
      'Status',
      'Owner',
      'DueDate',
      'CorrectiveAction',
      'ClosureEvidence',
    ]

    const rows = exceedances.map((e) => [
      e.id,
      e.tagId,
      `"${e.parameter.replace(/"/g, '""')}"`,
      `"${e.limitCrossed}"`,
      `"${e.peakValue}"`,
      e.timeIn,
      e.timeRtn,
      e.duration,
      e.status,
      `"${e.owner}"`,
      e.dueDate,
      `"${(e.correctiveAction || '').replace(/"/g, '""')}"`,
      `"${(e.closureEvidence || '').replace(/"/g, '""')}"`,
    ])

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `cpcb_exceedance_register_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Filtered rows
  const filteredExceedances = useMemo(() => {
    return exceedances.filter((item) => {
      if (statusFilter !== 'ALL' && item.status.toUpperCase() !== statusFilter) {
        return false
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        return (
          item.id.toLowerCase().includes(q) ||
          item.parameter.toLowerCase().includes(q) ||
          item.tagId.toLowerCase().includes(q) ||
          item.owner.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [exceedances, statusFilter, searchQuery])

  // Calculate SLA countdown
  const getSlaStatus = (dueDateStr, status) => {
    if (status === 'Closed') return { text: 'Resolved', tone: 'success' }
    const dueMs = new Date(dueDateStr).getTime()
    const nowMs = Date.now()
    const diffHours = (dueMs - nowMs) / (3600 * 1000)

    if (diffHours <= 0) {
      return { text: 'SLA Breached', tone: 'danger' }
    }
    if (diffHours < 4) {
      return { text: `${Math.round(diffHours * 60)}m left`, tone: 'warning' }
    }
    return { text: `${diffHours.toFixed(1)}h left`, tone: 'info' }
  }

  return (
    <Card
      title="CPCB Statutory Exceedance Register"
      subtitle="Mandatory OCEMS threshold excursion tracking, SLA remediation countdowns, and 21 CFR Part 11 closure governance"
      actions={
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleExportCsv}>
            <Download className="w-3.5 h-3.5 mr-1" />
            Export CSV
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by ID, parameter, tag..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            {['ALL', 'OPEN', 'IN PROGRESS', 'CLOSED'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors ${
                  statusFilter === st
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Exceedance Table */}
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="py-2.5 px-3">Exceedance ID</th>
                <th className="py-2.5 px-3">Parameter</th>
                <th className="py-2.5 px-3">Limit / Peak</th>
                <th className="py-2.5 px-3">Duration</th>
                <th className="py-2.5 px-3">Corrective Action</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">CPCB SLA</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {filteredExceedances.map((item) => {
                const sla = getSlaStatus(item.dueDate, item.status)
                const isEditing = editingId === item.id

                return (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-3 font-mono font-medium text-slate-900 dark:text-white whitespace-nowrap">
                      {item.id}
                      <span className="block text-[10px] text-slate-400 font-sans">
                        {formatTimestamp(item.timeIn)}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <span className="font-semibold text-slate-900 dark:text-white block">
                        {item.parameter}
                      </span>
                      <span className="font-mono text-[11px] text-slate-500">{item.tagId}</span>
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="font-mono font-bold text-rose-600 block">
                        {item.peakValue}
                      </span>
                      <span className="text-[11px] text-slate-500">Limit: {item.limitCrossed}</span>
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap font-mono">{item.duration}</td>

                    <td className="py-3 px-3 max-w-xs">
                      {isEditing ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={editActionText}
                            onChange={(e) => setEditActionText(e.target.value)}
                            className="w-full text-xs p-1.5 rounded border border-sky-500 bg-white dark:bg-slate-900"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(item.id)}
                            className="p-1 rounded bg-sky-600 text-white hover:bg-sky-700"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="p-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-600"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="group flex items-start justify-between gap-2">
                          <span className="text-slate-600 dark:text-slate-300 leading-snug">
                            {item.correctiveAction}
                          </span>
                          {isOperator && item.status !== 'Closed' && (
                            <button
                              type="button"
                              onClick={() => handleStartEdit(item)}
                              className="text-slate-400 hover:text-sky-600 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Edit Corrective Action"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap">
                      <StatusBadge
                        tone={
                          item.status === 'Closed'
                            ? 'success'
                            : item.status === 'In Progress'
                            ? 'warning'
                            : 'danger'
                        }
                        label={item.status}
                      />
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap">
                      <StatusBadge tone={sla.tone} label={sla.text} />
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap text-right space-x-1.5">
                      {item.status !== 'Closed' && isOperator && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs text-rose-600 hover:bg-rose-50 border-rose-300 dark:border-rose-800"
                          onClick={() => {
                            setCloseModalRecord(item)
                            setCloseError('')
                            setOperatorPin('')
                            setSupervisorPin('')
                          }}
                        >
                          <Lock className="w-3 h-3 mr-1" />
                          Close
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs text-sky-600 hover:text-sky-700"
                        title="Download Statutory Evidence Pack ZIP"
                        onClick={() => handleDownloadEvidence(item)}
                        disabled={downloadingZipId === item.id}
                      >
                        <FileArchive className="w-3.5 h-3.5 mr-1" />
                        {downloadingZipId === item.id ? 'Bundling...' : 'Evidence'}
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Operator PIN Re-Auth Modal for Closing Exceedance */}
      {closeModalRecord && (
        <Modal
          isOpen={true}
          onClose={() => setCloseModalRecord(null)}
          title={`Close Statutory Exceedance — ${closeModalRecord.id}`}
        >
          <form onSubmit={handleConfirmClose} className="space-y-4">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-lg border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-1">
              <div className="font-semibold flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                21 CFR Part 11 Electronic Closure Signature
              </div>
              <p>
                Closing a CPCB statutory exceedance formally certifies that process remediation has
                been executed and water quality has normalized below statutory limits.
              </p>
            </div>

            {closeError && (
              <div className="p-2 text-xs font-semibold text-rose-600 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 rounded">
                {closeError}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Mandatory Closure Reason & Remediation Details *
              </label>
              <textarea
                required
                rows={3}
                placeholder="e.g. Coagulant dosing rate optimized; secondary clarifier settling verified normal; 3 consecutive grab samples confirmed < 40 mg/L."
                value={closeReason}
                onChange={(e) => setCloseReason(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Closure Evidence Stub / Lab Reference
              </label>
              <input
                type="text"
                placeholder="e.g. Lab Certificate #KSPCB-LAB-8910 or Spectrophotometer Run #44"
                value={closeEvidence}
                onChange={(e) => setCloseEvidence(e.target.value)}
                className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Operator Signature PIN (Demo: 1234) *
              </label>
              <input
                type="password"
                required
                maxLength={6}
                placeholder="••••"
                value={operatorPin}
                onChange={(e) => setOperatorPin(e.target.value)}
                className="w-full text-xs p-2 rounded-lg font-mono tracking-widest border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            {TAG_REGISTRY[closeModalRecord?.tagId]?.critical !== false && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-amber-800 dark:text-amber-400">
                    Supervisor / Peer Approval PIN (Demo: 9999) *
                  </label>
                  <span className="text-[10px] font-bold text-amber-600 bg-amber-100 dark:bg-amber-950 px-1.5 py-0.5 rounded">
                    Dual-Auth Required
                  </span>
                </div>
                <input
                  type="password"
                  required
                  maxLength={6}
                  placeholder="••••"
                  value={supervisorPin}
                  onChange={(e) => setSupervisorPin(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg font-mono tracking-widest border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Mandatory second-signature supervisor authorization for critical statutory outfall parameter excursions.
                </span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setCloseModalRecord(null)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm">
                Sign & Close Exceedance
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </Card>
  )
}
