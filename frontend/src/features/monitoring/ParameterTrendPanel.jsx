import { useCallback, useState, useMemo } from 'react'
import {
  Layers,
  Download,
  Clock,
} from 'lucide-react'
import Card from '../../components/ui/Card.jsx'
import ChartCard from '../../components/charts/ChartCard.jsx'
import Button from '../../components/ui/Button.jsx'
import StatusBadge from '../../components/ui/StatusBadge.jsx'
import useAsyncData from '../../hooks/useAsyncData.js'
import { getStpOptions } from '../../services/monitoring.js'
import { TAG_REGISTRY } from '../../lib/tags/registry.js'
import { alarmManager } from '../../lib/alarms/alarmManager.js'
import { getAllCalibrations } from '../../lib/calibration/calibrationStore.js'
import { getAllAuditEvents } from '../../lib/audit/auditStore.js'
import { lttbDownsample, bucketTimeSeries } from '../../lib/historian/lttb.js'
import StpSelector from './StpSelector.jsx'
import ParameterLineChart from './ParameterLineChart.jsx'

const AVAILABLE_PENS = [
  { id: 'AIT-201', label: 'Aeration DO', unit: 'mg/L', color: '#0284c7', yAxisId: 'axis-do', decimals: 2, defaultBase: 2.45 },
  { id: 'AIT-202', label: 'Basin pH', unit: 'pH', color: '#10b981', yAxisId: 'axis-ph', decimals: 2, defaultBase: 7.35 },
  { id: 'AIT-401', label: 'Free Chlorine', unit: 'mg/L', color: '#8b5cf6', yAxisId: 'axis-cl', decimals: 2, defaultBase: 1.15 },
  { id: 'FIT-101', label: 'Raw Sewage Inflow', unit: 'MLD', color: '#f59e0b', yAxisId: 'axis-flow', decimals: 1, defaultBase: 42.4 },
  { id: 'AIT-503', label: 'Effluent COD', unit: 'mg/L', color: '#f43f5e', yAxisId: 'axis-cod', decimals: 1, defaultBase: 34.2 },
  { id: 'AIT-504', label: 'Effluent TSS', unit: 'mg/L', color: '#6366f1', yAxisId: 'axis-tss', decimals: 1, defaultBase: 11.4 },
]

const TIME_RANGES = [
  { id: '1h', label: '1 Hour', hours: 1, intervalMin: 1 },
  { id: '8h', label: '8 Hours', hours: 8, intervalMin: 5 },
  { id: '24h', label: '24 Hours', hours: 24, intervalMin: 15 },
  { id: '7d', label: '7 Days', hours: 168, intervalMin: 60 },
  { id: '30d', label: '30 Days', hours: 720, intervalMin: 240 },
]

export default function ParameterTrendPanel() {
  const [selectedPens, setSelectedPens] = useState(['AIT-201', 'AIT-202'])
  const [stpId, setStpId] = useState('')
  const [timeRange, setTimeRange] = useState('24h')
  const [aggregation, setAggregation] = useState('raw') // 'raw' | '15m' | '1h'
  const [showGhost, setShowGhost] = useState(false)
  const [showEvents, setShowEvents] = useState(true)
  const [cursorData, setCursorData] = useState(null)

  // Fetch Bangalore STP Options
  const fetchOptions = useCallback(async () => {
    return getStpOptions()
  }, [])

  const { status, data } = useAsyncData(fetchOptions)
  const options = data || []
  const activeStpId = stpId && options.some((o) => o.id === stpId) ? stpId : (options[0]?.id ?? 'hebbal')

  // Generate synthetic high-density multi-pen time-series tied to timeRange
  const trendPoints = useMemo(() => {
    const rangeConfig = TIME_RANGES.find((r) => r.id === timeRange) || TIME_RANGES[2]
    const now = Date.now()
    const startMs = now - rangeConfig.hours * 3600 * 1000
    const stepMs = rangeConfig.intervalMin * 60 * 1000
    const pointCount = Math.floor((now - startMs) / stepMs)

    const rawList = []
    for (let i = 0; i <= pointCount; i++) {
      const t = startMs + i * stepMs
      const timestamp = new Date(t).toISOString()
      const point = { timestamp }

      // Generate realistic values for each available pen
      AVAILABLE_PENS.forEach((pen, pIdx) => {
        const base = pen.defaultBase
        const wave = Math.sin((i / 14) + pIdx) * (base * 0.08)
        const noise = (Math.sin(i * 7 + pIdx * 11) * 0.5) * (base * 0.03)
        const val = Number((base + wave + noise).toFixed(pen.decimals))
        point[pen.id] = val

        // Ghost comparison (-24 hours shifted)
        if (showGhost) {
          const ghostWave = Math.sin(((i - (24 * 60 / rangeConfig.intervalMin)) / 14) + pIdx) * (base * 0.08)
          point[`${pen.id}_ghost`] = Number((base + ghostWave + noise * 0.9).toFixed(pen.decimals))
        }
      })

      rawList.push(point)
    }

    // Apply Client-Side Bucketing if selected
    if (aggregation !== 'raw') {
      const primaryPen = selectedPens[0] || 'AIT-201'
      const bucketedPrimary = bucketTimeSeries(
        rawList.map((p) => ({ timestamp: p.timestamp, value: p[primaryPen] })),
        aggregation
      )
      return bucketedPrimary.map((bp) => {
        const original = rawList.find((r) => r.timestamp === bp.timestamp) || rawList[0]
        return {
          ...original,
          [primaryPen]: bp.value,
        }
      })
    }

    // Downsample with LTTB if > 2000 points
    if (rawList.length > 2000) {
      const primaryPen = selectedPens[0] || 'AIT-201'
      return lttbDownsample(
        rawList.map((p) => ({ ...p, value: p[primaryPen] })),
        1000
      )
    }

    return rawList
  }, [timeRange, aggregation, showGhost, selectedPens])

  // Extract Real Event Markers from Alarm Manager, Calibrations & Audit Store
  const eventMarkers = useMemo(() => {
    if (!showEvents) return []
    const markers = []

    // 1. Alarms from Alarm Journal
    try {
      const journal = alarmManager.getAlarmJournal()
      journal.forEach((j) => {
        if (selectedPens.includes(j.tagId)) {
          markers.push({
            id: j.id,
            timestamp: new Date(j.timestamp).toISOString(),
            type: 'ALARM',
            label: `${j.tagId} ${j.priority}: ${j.toState}`,
          })
        }
      })
    } catch {}

    // 2. Calibrations from Calibration Store
    try {
      const allCals = getAllCalibrations()
      Object.values(allCals).forEach((cal) => {
        if (selectedPens.includes(cal.sensorId) && cal.history) {
          cal.history.forEach((h) => {
            markers.push({
              id: h.id,
              timestamp: h.date,
              type: 'CALIBRATION',
              label: `${cal.sensorId} Cal ${h.result} (${h.method})`,
            })
          })
        }
      })
    } catch {}

    // 3. Setpoint & Tuning changes from Central Audit Store
    try {
      const audits = getAllAuditEvents()
      audits.forEach((aud) => {
        if (selectedPens.includes(aud.tagId) && (aud.action === 'SETPOINT_CHANGE' || aud.action === 'PID_TUNE')) {
          markers.push({
            id: aud.id,
            timestamp: aud.timestamp,
            type: 'SETPOINT',
            label: `${aud.tagId} SP -> ${aud.newValue}`,
          })
        }
      })
    } catch {}

    return markers
  }, [showEvents, selectedPens])

  const activePenConfigs = useMemo(() => {
    return AVAILABLE_PENS.filter((p) => selectedPens.includes(p.id)).map((p) => ({
      ...p,
      dataKey: p.id,
    }))
  }, [selectedPens])

  const primaryTagLimits = useMemo(() => {
    const primaryId = selectedPens[0]
    return primaryId ? TAG_REGISTRY[primaryId]?.alarmLimits : null
  }, [selectedPens])

  const togglePen = (penId) => {
    if (selectedPens.includes(penId)) {
      if (selectedPens.length === 1) return // Keep at least one
      setSelectedPens(selectedPens.filter((id) => id !== penId))
    } else {
      if (selectedPens.length >= 4) return // Max 4 pens for visual clarity
      setSelectedPens([...selectedPens, penId])
    }
  }

  const exportCsv = () => {
    const headers = ['Timestamp', ...activePenConfigs.map((p) => `"${p.label} (${p.unit})"`)]
    const rows = trendPoints.map((pt) => [
      pt.timestamp,
      ...activePenConfigs.map((p) => pt[p.id] ?? ''),
    ])
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `aquatrust-historian-${timeRange}-${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const activeStpName = options.find((o) => o.id === activeStpId)?.name || 'Koramangala 60 MLD STP'

  return (
    <div className="space-y-4">
      {/* Historian Controls & Multi-Pen Strip */}
      <Card bodyClassName="p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-sky-600" />
              Historian Overlay Pens:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {AVAILABLE_PENS.map((pen) => {
                const isSelected = selectedPens.includes(pen.id)
                return (
                  <button
                    key={pen.id}
                    onClick={() => togglePen(pen.id)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                      isSelected
                        ? 'border-transparent text-white shadow-xs'
                        : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900'
                    }`}
                    style={{ backgroundColor: isSelected ? pen.color : undefined }}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: isSelected ? '#fff' : pen.color }}
                    />
                    {pen.id} ({pen.label})
                  </button>
                )
              })}
            </div>
          </div>

          {/* Plant Selector */}
          <StpSelector options={options} value={activeStpId} onChange={setStpId} />
        </div>

        {/* Time Ranges, Bucketing, Ghost Comparison, and Export */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-400 font-medium">Window:</span>
            <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-0.5">
              {TIME_RANGES.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setTimeRange(r.id)}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                    timeRange === r.id
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <span className="text-slate-400 font-medium ml-2">Aggregation:</span>
            <select
              value={aggregation}
              onChange={(e) => setAggregation(e.target.value)}
              className="text-xs py-1 px-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
            >
              <option value="raw">Raw Readings</option>
              <option value="15m">15-Min Avg</option>
              <option value="1h">Hourly Avg</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            {/* Ghost Toggle */}
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 dark:text-slate-300 font-medium select-none">
              <input
                type="checkbox"
                checked={showGhost}
                onChange={(e) => setShowGhost(e.target.checked)}
                className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
              />
              Compare to -24h (Ghost)
            </label>

            {/* Event Markers Toggle */}
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 dark:text-slate-300 font-medium select-none">
              <input
                type="checkbox"
                checked={showEvents}
                onChange={(e) => setShowEvents(e.target.checked)}
                className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
              />
              Overlay Events ({eventMarkers.length})
            </label>

            <Button
              variant="outline"
              className="text-[11px] py-1 px-2.5 inline-flex items-center gap-1"
              onClick={exportCsv}
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </Button>
          </div>
        </div>
      </Card>

      {/* Main Historian Trend Display */}
      <ChartCard
        title={`${activeStpName} · SCADA Historian Overlay`}
        subtitle={`${activePenConfigs.map((p) => `${p.label} [${p.id}]`).join(', ')} · ${trendPoints.length} Points · ISA-101 Cursor Tracking`}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge tone="success" label="SCADA Telemetry" dot={true} />
            {primaryTagLimits && (
              <span className="text-[10px] font-mono text-red-600 font-semibold bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                HH: {primaryTagLimits.HH} / LL: {primaryTagLimits.LL}
              </span>
            )}
          </div>
        }
      >
        {/* Live Cursor Readout Bar */}
        {cursorData && (
          <div className="mb-2 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-mono flex flex-wrap items-center justify-between gap-2 shadow-inner border border-slate-800">
            <div className="flex items-center gap-1.5 text-slate-400">
              <Clock className="w-3.5 h-3.5 text-sky-400" />
              <span>Cursor: {new Date(cursorData.timestamp).toLocaleString()}</span>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              {activePenConfigs.map((pen) => (
                <div key={pen.id} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: pen.color }} />
                  <span className="text-slate-400">{pen.id}:</span>
                  <span className="font-bold text-white">
                    {cursorData[pen.id] !== undefined ? cursorData[pen.id] : '--'}{' '}
                    <span className="text-[10px] text-slate-400">{pen.unit}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <ParameterLineChart
          points={trendPoints}
          pens={activePenConfigs}
          eventMarkers={eventMarkers}
          limits={primaryTagLimits}
          showGhost={showGhost}
          showBrush={true}
          onCursorMove={setCursorData}
        />
      </ChartCard>
    </div>
  )
}
