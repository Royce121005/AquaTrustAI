import { useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Brush,
  ReferenceLine,
  ReferenceArea,
  ReferenceDot,
} from 'recharts'
import { formatTimestamp, formatUtcDate } from '../../utils/format.js'
import { useSettings } from '../../hooks/useSettings.js'

const TOOLTIP_STYLE = {
  backgroundColor: '#0f172a',
  borderRadius: '0.5rem',
  border: '1px solid #334155',
  color: '#f8fafc',
  fontSize: '11px',
  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
}

const DAY_MS = 24 * 60 * 60 * 1000

function isDateLikeSpan(points) {
  if (!points || points.length < 2) return false
  const first = new Date(points[0].timestamp).getTime()
  const last = new Date(points[points.length - 1].timestamp).getTime()
  if (Number.isNaN(first) || Number.isNaN(last)) return false
  return last - first > 4 * DAY_MS
}

function formatDateTick(timestamp) {
  return new Date(timestamp).toLocaleDateString(undefined, {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
  })
}

export default function ParameterLineChart({
  points = [],
  pens = [],
  eventMarkers = [],
  limits = null,
  showGhost = false,
  showBrush = true,
  onCursorMove = null,
}) {
  const { settings } = useSettings()

  if (!points || points.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400 text-xs">
        No telemetry records in selected window.
      </div>
    )
  }

  const dateScale = isDateLikeSpan(points)

  // Determine Y-Axes from visible pens
  const yAxes = pens.map((pen, idx) => {
    const isRight = idx % 2 === 1
    return {
      id: pen.yAxisId || `axis-${pen.id}`,
      orientation: isRight ? 'right' : 'left',
      color: pen.color,
      unit: pen.unit,
      label: pen.label,
    }
  })

  // Format custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null

    // Check if there is an event marker near this timestamp
    const matchedEvent = eventMarkers.find((ev) => {
      const t1 = new Date(ev.timestamp).getTime()
      const t2 = new Date(label).getTime()
      return Math.abs(t1 - t2) < 30 * 60 * 1000
    })

    return (
      <div className="p-3 bg-slate-900 border border-slate-700 rounded-lg shadow-xl text-xs space-y-2">
        <div className="font-mono text-[11px] text-slate-400 border-b border-slate-800 pb-1">
          {dateScale ? formatUtcDate(label) : formatTimestamp(label)}
        </div>

        <div className="space-y-1">
          {payload.map((entry, index) => {
            const isGhost = entry.dataKey && entry.dataKey.endsWith('_ghost')
            const pen = pens.find((p) => p.dataKey === entry.dataKey || `${p.dataKey}_ghost` === entry.dataKey)
            return (
              <div key={index} className="flex items-center justify-between gap-4 font-mono">
                <span className="flex items-center gap-1.5" style={{ color: entry.color }}>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                  {isGhost ? `${pen?.label || 'Pen'} (-24h)` : pen?.label || entry.name}
                </span>
                <span className="font-bold text-white">
                  {entry.value !== null && entry.value !== undefined ? entry.value : '--'}{' '}
                  <span className="text-[10px] text-slate-400">{pen?.unit || ''}</span>
                </span>
              </div>
            )
          })}
        </div>

        {matchedEvent && (
          <div className="mt-2 pt-2 border-t border-slate-800 text-[10px] text-amber-300">
            <strong>[{matchedEvent.type} EVENT]:</strong> {matchedEvent.label}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="w-full h-96 select-none">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={points}
          margin={{ top: 15, right: 30, bottom: showBrush ? 10 : 25, left: 10 }}
          onMouseMove={(e) => {
            if (onCursorMove && e && e.activePayload) {
              onCursorMove(e.activePayload[0]?.payload)
            }
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" dark:stroke="#334155" vertical={false} />

          <XAxis
            dataKey="timestamp"
            tickFormatter={(timestamp) =>
              dateScale
                ? formatDateTick(timestamp)
                : new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
            stroke="#94a3b8"
            fontSize={10}
            tickLine={false}
            axisLine={{ stroke: '#cbd5e1' }}
            minTickGap={45}
          />

          {/* Render Independent Y-Axes for each pen */}
          {yAxes.map((axis, i) => (
            <YAxis
              key={axis.id}
              yAxisId={axis.id}
              orientation={axis.orientation}
              stroke={axis.color}
              fontSize={10}
              tickLine={false}
              axisLine={false}
              domain={['auto', 'auto']}
              tickFormatter={(v) => Number(v).toFixed(1)}
              label={{
                value: axis.unit,
                angle: axis.orientation === 'left' ? -90 : 90,
                position: axis.orientation === 'left' ? 'insideLeft' : 'insideRight',
                style: { textAnchor: 'middle', fill: axis.color, fontSize: 10, fontWeight: 600 },
              }}
            />
          ))}

          {/* Shaded Alarm Bands for Primary Pen if Limits Exist */}
          {limits && limits.HH && (
            <ReferenceArea
              yAxisId={yAxes[0]?.id}
              y1={limits.HH}
              y2={limits.HH * 1.5}
              fill="#ef4444"
              fillOpacity={0.06}
            />
          )}
          {limits && limits.LL && (
            <ReferenceArea
              yAxisId={yAxes[0]?.id}
              y1={0}
              y2={limits.LL}
              fill="#ef4444"
              fillOpacity={0.06}
            />
          )}

          {/* Limit Reference Lines */}
          {limits?.HH && (
            <ReferenceLine
              yAxisId={yAxes[0]?.id}
              y={limits.HH}
              stroke="#ef4444"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{ value: `HH: ${limits.HH}`, fill: '#ef4444', fontSize: 10, position: 'right' }}
            />
          )}
          {limits?.H && (
            <ReferenceLine
              yAxisId={yAxes[0]?.id}
              y={limits.H}
              stroke="#f59e0b"
              strokeDasharray="3 3"
              strokeWidth={1}
              label={{ value: `H: ${limits.H}`, fill: '#f59e0b', fontSize: 9, position: 'right' }}
            />
          )}
          {limits?.L && (
            <ReferenceLine
              yAxisId={yAxes[0]?.id}
              y={limits.L}
              stroke="#f59e0b"
              strokeDasharray="3 3"
              strokeWidth={1}
              label={{ value: `L: ${limits.L}`, fill: '#f59e0b', fontSize: 9, position: 'left' }}
            />
          )}
          {limits?.LL && (
            <ReferenceLine
              yAxisId={yAxes[0]?.id}
              y={limits.LL}
              stroke="#ef4444"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{ value: `LL: ${limits.LL}`, fill: '#ef4444', fontSize: 10, position: 'left' }}
            />
          )}

          {/* Real Event Markers Overlay */}
          {eventMarkers.map((evt, i) => (
            <ReferenceLine
              key={evt.id || i}
              x={evt.timestamp}
              stroke={evt.type === 'ALARM' ? '#ef4444' : evt.type === 'CALIBRATION' ? '#10b981' : '#0284c7'}
              strokeDasharray="3 3"
              strokeWidth={1.5}
              label={{
                value: `● ${evt.type}`,
                fill: evt.type === 'ALARM' ? '#ef4444' : evt.type === 'CALIBRATION' ? '#10b981' : '#0284c7',
                fontSize: 9,
                position: 'top',
              }}
            />
          ))}

          <Tooltip content={<CustomTooltip />} />

          {/* Multi-Pen Lines */}
          {pens.map((pen) => (
            <Line
              key={pen.id}
              yAxisId={pen.yAxisId || `axis-${pen.id}`}
              type="monotone"
              dataKey={pen.dataKey || 'value'}
              name={pen.label}
              stroke={pen.color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, stroke: pen.color, strokeWidth: 2, fill: '#fff' }}
              connectNulls={false}
              isAnimationActive={settings.chartAnimations}
            />
          ))}

          {/* Ghost Line (Previous Day Comparison) */}
          {showGhost && pens[0] && (
            <Line
              yAxisId={pens[0].yAxisId || `axis-${pens[0].id}`}
              type="monotone"
              dataKey={`${pens[0].dataKey || 'value'}_ghost`}
              name={`${pens[0].label} (-24h)`}
              stroke={pens[0].color}
              strokeWidth={1.5}
              strokeDasharray="4 4"
              opacity={0.45}
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
          )}

          {/* Recharts Brush Zoom */}
          {showBrush && points.length > 5 && (
            <Brush
              dataKey="timestamp"
              height={22}
              stroke="#0284c7"
              fill="#f1f5f9"
              tickFormatter={(t) => (dateScale ? formatDateTick(t) : new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))}
              travellerWidth={8}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
