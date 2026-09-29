import { useState, useMemo } from 'react'
import {
  Bell,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Clock,
  Archive,
  Download,
  Search,
  Volume2,
  VolumeX,
  Wrench,
  CheckCheck,
} from 'lucide-react'
import Card from '../../components/ui/Card.jsx'
import Button from '../../components/ui/Button.jsx'
import TagValue from '../../components/ui/TagValue.jsx'
import { useAlarmState } from '../../lib/alarms/useAlarmState.js'
import { useTagStream } from '../../lib/tags/useTagStream.js'
import { TAG_REGISTRY } from '../../lib/tags/registry.js'
import { formatTimestamp } from '../../utils/format.js'

export default function AlarmSummary() {
  const {
    alarms,
    activeAlarms,
    journal,
    kpis,
    isMuted,
    toggleMute,
    acknowledgeAlarm,
    acknowledgeAll,
    shelveAlarm,
    outOfServiceAlarm,
    returnToService,
  } = useAlarmState()

  const { tagValues } = useTagStream()

  const [activeTab, setActiveTab] = useState('active') // 'active' | 'shelved' | 'journal'
  const [priorityFilter, setPriorityFilter] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  // Modal states for Shelve & Out-of-Service
  const [shelveModalTag, setShelveModalTag] = useState(null)
  const [shelveDuration, setShelveDuration] = useState(15)
  const [shelveReason, setShelveReason] = useState('')
  const [shelvePin, setShelvePin] = useState('')
  const [shelveError, setShelveError] = useState('')

  const [oosModalTag, setOosModalTag] = useState(null)
  const [oosReason, setOosReason] = useState('')
  const [oosPin, setOosPin] = useState('')
  const [oosError, setOosError] = useState('')

  // Shelved and OOS alarms
  const allAlarmsList = useMemo(() => Object.values(alarms), [alarms])
  const shelvedAlarms = useMemo(
    () => allAlarmsList.filter((a) => a.state === 'Shelved' || a.state === 'Out-of-Service'),
    [allAlarmsList]
  )

  // Filtered Active Alarms
  const filteredActiveAlarms = useMemo(() => {
    return activeAlarms.filter((a) => {
      const matchesPriority = priorityFilter === 'ALL' || a.priority === priorityFilter
      const q = searchQuery.trim().toLowerCase()
      const matchesSearch =
        !q || a.tagId.toLowerCase().includes(q) || a.name.toLowerCase().includes(q)
      return matchesPriority && matchesSearch
    })
  }, [activeAlarms, priorityFilter, searchQuery])

  // Filtered Journal
  const filteredJournal = useMemo(() => {
    return journal.filter((j) => {
      const matchesPriority = priorityFilter === 'ALL' || j.priority === priorityFilter
      const q = searchQuery.trim().toLowerCase()
      const matchesSearch =
        !q ||
        j.tagId.toLowerCase().includes(q) ||
        (j.tagName && j.tagName.toLowerCase().includes(q)) ||
        (j.reason && j.reason.toLowerCase().includes(q))
      return matchesPriority && matchesSearch
    })
  }, [journal, priorityFilter, searchQuery])

  const handleOpenShelve = (tagId) => {
    setShelveModalTag(tagId)
    setShelveDuration(15)
    setShelveReason('')
    setShelvePin('')
    setShelveError('')
  }

  const handleConfirmShelve = (e) => {
    e.preventDefault()
    if (!shelveReason.trim() || shelveReason.trim().length < 5) {
      setShelveError('Reason required (minimum 5 characters).')
      return
    }
    if (shelvePin !== '1234') {
      setShelveError('Invalid Operator PIN (use 1234).')
      return
    }
    try {
      shelveAlarm(shelveModalTag, Number(shelveDuration), shelveReason.trim())
      setShelveModalTag(null)
    } catch (err) {
      setShelveError(err.message)
    }
  }

  const handleOpenOos = (tagId) => {
    setOosModalTag(tagId)
    setOosReason('')
    setOosPin('')
    setOosError('')
  }

  const handleConfirmOos = (e) => {
    e.preventDefault()
    if (!oosReason.trim() || oosReason.trim().length < 5) {
      setOosError('Reason required (minimum 5 characters).')
      return
    }
    if (oosPin !== '1234') {
      setOosError('Invalid Operator PIN (use 1234).')
      return
    }
    try {
      outOfServiceAlarm(oosModalTag, oosReason.trim())
      setOosModalTag(null)
    } catch (err) {
      setOosError(err.message)
    }
  }

  const exportJournalCsv = () => {
    const headers = ['ID', 'Timestamp', 'Tag ID', 'Tag Name', 'Priority', 'From State', 'To State', 'Value', 'Action', 'Reason']
    const rows = filteredJournal.map((j) => [
      j.id,
      new Date(j.timestamp).toISOString(),
      j.tagId,
      `"${j.tagName || ''}"`,
      j.priority,
      j.fromState,
      j.toState,
      j.value ?? '',
      j.action || 'TRANSITION',
      `"${j.reason || ''}"`,
    ])
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `aquatrust-alarm-journal-${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      {/* ISA-18.2 / EEMUA 191 Benchmark KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {/* Rolling 10 Min Rate */}
        <Card bodyClassName="p-3">
          <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">
            Alarms / 10 Min
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span
              className={`text-2xl font-bold font-mono ${
                kpis.rolling10MinAlarms <= 1
                  ? 'text-emerald-600'
                  : kpis.rolling10MinAlarms <= 5
                  ? 'text-amber-600'
                  : 'text-red-600'
              }`}
            >
              {kpis.rolling10MinAlarms}
            </span>
            <span className="text-[10px] text-slate-400">Target: ≤ 1.0</span>
          </div>
          <div className="text-[10px] mt-1 text-slate-500">
            {kpis.rolling10MinAlarms <= 1 ? (
              <span className="text-emerald-600 font-semibold">● Healthy Load</span>
            ) : (
              <span className="text-amber-600 font-semibold">▲ Operator Burden</span>
            )}
          </div>
        </Card>

        {/* Active Alarms */}
        <Card bodyClassName="p-3">
          <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">
            Active Alarms
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-slate-800 dark:text-white">
              {kpis.activeCount}
            </span>
            <span className="text-[10px] text-red-600 font-semibold">
              {kpis.unackCriticalCount} Crit
            </span>
            <span className="text-[10px] text-amber-600 font-semibold">
              {kpis.unackWarningCount} Warn
            </span>
          </div>
          <div className="text-[10px] mt-1 text-slate-500">Unacknowledged trips</div>
        </Card>

        {/* Stale Count */}
        <Card bodyClassName="p-3">
          <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">
            Stale Alarms (&gt;24h)
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span
              className={`text-2xl font-bold font-mono ${
                kpis.staleCount === 0 ? 'text-emerald-600' : 'text-amber-600'
              }`}
            >
              {kpis.staleCount}
            </span>
            <span className="text-[10px] text-slate-400">Target: 0</span>
          </div>
          <div className="text-[10px] mt-1 text-slate-500">Unaddressed excursions</div>
        </Card>

        {/* Chattering Count */}
        <Card bodyClassName="p-3">
          <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">
            Chattering (≥3/60s)
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span
              className={`text-2xl font-bold font-mono ${
                kpis.chatteringCount === 0 ? 'text-emerald-600' : 'text-red-600'
              }`}
            >
              {kpis.chatteringCount}
            </span>
            <span className="text-[10px] text-slate-400">Target: 0</span>
          </div>
          <div className="text-[10px] mt-1 text-slate-500">Deadband review needed</div>
        </Card>

        {/* Shelved Alarms */}
        <Card bodyClassName="p-3">
          <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">
            Shelved Alarms
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-sky-600">{kpis.shelvedCount}</span>
            <span className="text-[10px] text-slate-400">Audited</span>
          </div>
          <div className="text-[10px] mt-1 text-slate-500">Temporarily paused</div>
        </Card>

        {/* Horn Control */}
        <Card bodyClassName="p-3 flex flex-col justify-between">
          <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">
            Annunciator Horn
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {isMuted ? 'Muted' : 'Sound Active'}
            </span>
            <button
              onClick={toggleMute}
              className={`p-1.5 rounded text-white ${isMuted ? 'bg-slate-600' : 'bg-red-600 animate-pulse'}`}
              title={isMuted ? 'Unmute horn' : 'Mute horn'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
          <div className="text-[10px] text-slate-400">Web Audio 950Hz SCADA tone</div>
        </Card>
      </div>

      {/* Tabs and Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 ${
              activeTab === 'active'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            Active Alarms ({activeAlarms.length})
          </button>

          <button
            onClick={() => setActiveTab('shelved')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 ${
              activeTab === 'shelved'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300'
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            Shelved & OOS ({shelvedAlarms.length})
          </button>

          <button
            onClick={() => setActiveTab('journal')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 ${
              activeTab === 'journal'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Alarm Journal ({journal.length})
          </button>
        </div>

        {/* Global Batch ACKs & Search */}
        <div className="flex items-center gap-2">
          {activeTab === 'active' && activeAlarms.length > 0 && (
            <>
              <Button
                variant="outline"
                className="text-[11px] py-1.5 px-3 border-red-500 text-red-600 hover:bg-red-50"
                onClick={() => acknowledgeAll('CRITICAL')}
              >
                <CheckCheck className="w-3.5 h-3.5 mr-1" />
                ACK All Critical
              </Button>
              <Button
                variant="outline"
                className="text-[11px] py-1.5 px-3 border-amber-500 text-amber-600 hover:bg-amber-50"
                onClick={() => acknowledgeAll('WARNING')}
              >
                <CheckCheck className="w-3.5 h-3.5 mr-1" />
                ACK All Warning
              </Button>
            </>
          )}

          {activeTab === 'journal' && (
            <Button
              variant="outline"
              className="text-[11px] py-1.5 px-3 inline-flex items-center gap-1"
              onClick={exportJournalCsv}
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </Button>
          )}

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="text-xs py-1.5 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-semibold"
          >
            <option value="ALL">All Priorities</option>
            <option value="CRITICAL">Critical Only</option>
            <option value="WARNING">Warning Only</option>
            <option value="INFO">Info Only</option>
          </select>

          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search tag or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-sky-500"
            />
          </div>
        </div>
      </div>

      {/* TAB 1: ACTIVE ALARMS */}
      {activeTab === 'active' && (
        <Card bodyClassName="p-0 overflow-x-auto">
          {filteredActiveAlarms.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 mb-2" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                No Active Alarms
              </p>
              <p className="text-xs text-slate-400">
                All process variables are within safe ISA-18.2 operating envelopes.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Tag & Name</th>
                  <th className="py-3 px-4">Live Reading</th>
                  <th className="py-3 px-4">Trip Limit</th>
                  <th className="py-3 px-4">State</th>
                  <th className="py-3 px-4">Time In</th>
                  <th className="py-3 px-4">ISA-18.2 Response Procedure</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredActiveAlarms.map((alarm) => {
                  const liveTag = tagValues[alarm.tagId]
                  return (
                    <tr
                      key={alarm.tagId}
                      className={
                        alarm.priority === 'CRITICAL'
                          ? 'bg-red-50/40 hover:bg-red-50/60 transition-colors'
                          : 'hover:bg-slate-50/80 transition-colors'
                      }
                    >
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            alarm.priority === 'CRITICAL'
                              ? 'bg-red-600 text-white'
                              : 'bg-amber-500 text-slate-900'
                          }`}
                        >
                          {alarm.priority === 'CRITICAL' ? (
                            <AlertOctagon className="w-3 h-3" />
                          ) : (
                            <AlertTriangle className="w-3 h-3" />
                          )}
                          {alarm.priority}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {alarm.tagId}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate max-w-xs">
                          {alarm.name}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <TagValue tag={alarm.tagId} data={liveTag} compact />
                      </td>

                      <td className="py-3 px-4 font-mono">
                        <span className="font-semibold text-red-600">
                          {alarm.limitCrossed}: {alarm.limitValue} {alarm.unit}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                            alarm.state === 'Unack-Active'
                              ? 'bg-red-100 text-red-800 animate-pulse font-bold'
                              : alarm.state === 'Ack-Active'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {alarm.state}
                        </span>
                        {alarm.isChattering && (
                          <span className="ml-1 text-[9px] bg-purple-100 text-purple-700 px-1 py-0.5 rounded">
                            CHATTERING
                          </span>
                        )}
                        {alarm.isStale && (
                          <span className="ml-1 text-[9px] bg-slate-200 text-slate-700 px-1 py-0.5 rounded">
                            STALE
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        {alarm.timeIn ? formatTimestamp(alarm.timeIn) : '--'}
                      </td>

                      <td className="py-3 px-4 text-[11px] text-slate-600 dark:text-slate-400 max-w-md">
                        {alarm.responseProcedure}
                      </td>

                      <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                        {alarm.state !== 'Ack-Active' && (
                          <button
                            onClick={() => acknowledgeAlarm(alarm.tagId)}
                            className="px-2.5 py-1 bg-slate-900 hover:bg-black text-amber-300 font-bold rounded text-[10px] uppercase tracking-wider"
                          >
                            ACK
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenShelve(alarm.tagId)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-semibold"
                        >
                          Shelve
                        </button>
                        <button
                          onClick={() => handleOpenOos(alarm.tagId)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-semibold"
                        >
                          OOS
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {/* TAB 2: SHELVED & OUT OF SERVICE */}
      {activeTab === 'shelved' && (
        <Card bodyClassName="p-0 overflow-x-auto">
          {shelvedAlarms.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <Archive className="w-10 h-10 mx-auto text-slate-400 mb-2" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                No Shelved or Out-of-Service Alarms
              </p>
              <p className="text-xs text-slate-400">
                All instrumentation points are in operational scanning mode.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Tag</th>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">State</th>
                  <th className="py-3 px-4">Justification Reason</th>
                  <th className="py-3 px-4">Expiry / Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {shelvedAlarms.map((a) => (
                  <tr key={a.tagId} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-bold">{a.tagId}</td>
                    <td className="py-3 px-4">{a.name}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                        {a.state}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{a.shelveReason || a.oosReason || '--'}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                      {a.shelveUntil ? `Expires: ${formatTimestamp(a.shelveUntil)}` : 'Manual Return Required'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => returnToService(a.tagId)}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-semibold"
                      >
                        Return to Service
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {/* TAB 3: ALARM JOURNAL (EEMUA 191) */}
      {activeTab === 'journal' && (
        <Card bodyClassName="p-0 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Tag</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Transition</th>
                <th className="py-3 px-4">Value</th>
                <th className="py-3 px-4">Operator & Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
              {filteredJournal.map((j) => (
                <tr key={j.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-4 text-slate-500">{formatTimestamp(j.timestamp)}</td>
                  <td className="py-2.5 px-4 font-bold text-slate-800">{j.tagId}</td>
                  <td className="py-2.5 px-4">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        j.priority === 'CRITICAL'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {j.priority}
                    </span>
                  </td>
                  <td className="py-2.5 px-4">
                    <span className="text-slate-400">{j.fromState}</span> →{' '}
                    <span className="font-semibold text-slate-700">{j.toState}</span>
                  </td>
                  <td className="py-2.5 px-4 text-slate-600">
                    {j.value !== undefined ? `${Number(j.value).toFixed(2)} ${j.unit || ''}` : '--'}
                  </td>
                  <td className="py-2.5 px-4 text-slate-600 font-sans">
                    {j.reason || (j.operator ? `By ${j.operator}` : 'Automatic trip')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Shelve Modal */}
      {shelveModalTag && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Archive className="w-4 h-4 text-amber-500" />
              ISA-18.2 Shelve Alarm: {shelveModalTag}
            </h3>
            <p className="text-xs text-slate-500">
              Shelving suppresses alarm annunciation for a governed duration. A formal justification and PIN re-auth are required.
            </p>

            <form onSubmit={handleConfirmShelve} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Shelve Duration
                </label>
                <select
                  value={shelveDuration}
                  onChange={(e) => setShelveDuration(e.target.value)}
                  className="w-full text-xs p-2 rounded border border-slate-300 bg-white"
                >
                  <option value={15}>15 Minutes (Probe Cleaning)</option>
                  <option value={60}>1 Hour (Standard Maintenance)</option>
                  <option value={480}>8 Hours (Shift Work)</option>
                  <option value={1440}>24 Hours (Major Overhaul)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mandatory Reason
                </label>
                <input
                  type="text"
                  placeholder="e.g. Optical sensor wiper maintenance"
                  value={shelveReason}
                  onChange={(e) => setShelveReason(e.target.value)}
                  className="w-full text-xs p-2 rounded border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Operator PIN (1234)
                </label>
                <input
                  type="password"
                  maxLength={4}
                  placeholder="••••"
                  value={shelvePin}
                  onChange={(e) => setShelvePin(e.target.value)}
                  className="w-full text-xs p-2 rounded border border-slate-300 font-mono text-center tracking-widest"
                />
              </div>

              {shelveError && <div className="text-xs text-red-600">{shelveError}</div>}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" type="button" onClick={() => setShelveModalTag(null)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit">
                  Confirm Shelve
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Out of Service Modal */}
      {oosModalTag && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Wrench className="w-4 h-4 text-purple-500" />
              Place Out-of-Service: {oosModalTag}
            </h3>
            <p className="text-xs text-slate-500">
              Removes instrument from active scanning for physical repair. Requires operator re-authentication.
            </p>

            <form onSubmit={handleConfirmOos} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mandatory Maintenance Justification
                </label>
                <input
                  type="text"
                  placeholder="e.g. Pump impeller replacement"
                  value={oosReason}
                  onChange={(e) => setOosReason(e.target.value)}
                  className="w-full text-xs p-2 rounded border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Operator PIN (1234)
                </label>
                <input
                  type="password"
                  maxLength={4}
                  placeholder="••••"
                  value={oosPin}
                  onChange={(e) => setOosPin(e.target.value)}
                  className="w-full text-xs p-2 rounded border border-slate-300 font-mono text-center tracking-widest"
                />
              </div>

              {oosError && <div className="text-xs text-red-600">{oosError}</div>}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" type="button" onClick={() => setOosModalTag(null)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit">
                  Confirm Out-of-Service
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
