import { useEffect, useState } from 'react'
import { AlertCircle, Clock, ShieldAlert } from 'lucide-react'
import { QUALITY } from '../../lib/tags/registry.js'

/**
 * ISA-101 Data-Quality Value Display Component
 * Renders process values paired with physical units, quality flags, and update age.
 */
export default function TagValue({
  tag,
  data,
  staleTimeoutSeconds = 10,
  compact = false,
  className = '',
}) {
  const [ageSeconds, setAgeSeconds] = useState(0)

  useEffect(() => {
    if (!data?.timestamp) return
    const updateAge = () => {
      const elapsed = Math.max(0, Math.floor((Date.now() - data.timestamp) / 1000))
      setAgeSeconds(elapsed)
    }
    updateAge()
    const timer = setInterval(updateAge, 1000)
    return () => clearInterval(timer)
  }, [data?.timestamp])

  const isStale = ageSeconds >= staleTimeoutSeconds || data?.quality === QUALITY.STALE
  const isBad = data?.quality === QUALITY.BAD
  const isUncertain = data?.quality === QUALITY.UNCERTAIN

  // Alarm Tone Styling (ISA-101: Color only for abnormal states)
  let alarmStyle = 'text-slate-800'
  if (data?.alarmState === 'CRITICAL') {
    alarmStyle = 'text-red-600 font-bold'
  } else if (data?.alarmState === 'WARNING') {
    alarmStyle = 'text-amber-600 font-semibold'
  }

  if (isBad || isStale) {
    alarmStyle = 'text-slate-400'
  }

  // Value presentation
  let displayValue = data?.formatted ?? '--'
  if (isBad) displayValue = '???'
  if (isStale) displayValue = data?.formatted ? `${data.formatted} (STALE)` : 'STALE'

  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-xs font-mono select-none ${
          isBad
            ? 'bg-red-50 border-red-300 text-red-700'
            : isStale
            ? 'bg-slate-100 border-slate-300 text-slate-500'
            : data?.alarmState === 'CRITICAL'
            ? 'bg-red-50 border-red-300 text-red-700'
            : data?.alarmState === 'WARNING'
            ? 'bg-amber-50 border-amber-300 text-amber-800'
            : 'bg-white border-slate-200 text-slate-800'
        } ${className}`}
        title={`Quality: ${data?.quality ?? 'GOOD'} | Updated: ${ageSeconds}s ago`}
      >
        <span className="font-bold">{displayValue}</span>
        {tag?.unit && <span className="text-[10px] text-slate-500">{tag.unit}</span>}
        {isBad && <AlertCircle className="h-3 w-3 text-red-600 shrink-0" />}
        {isStale && <Clock className="h-3 w-3 text-slate-400 shrink-0" />}
      </div>
    )
  }

  return (
    <div className={`flex flex-col gap-0.5 ${className}`}>
      <div className="flex items-baseline gap-1.5">
        <span className={`text-base font-mono font-bold tracking-tight ${alarmStyle}`}>
          {displayValue}
        </span>
        {tag?.unit && (
          <span className="text-xs font-sans text-slate-500 font-medium">{tag.unit}</span>
        )}
      </div>

      <div className="flex items-center gap-2 text-[10px] text-slate-500 font-sans">
        {/* Quality Flag */}
        {isBad ? (
          <span className="inline-flex items-center gap-0.5 text-red-700 bg-red-50 px-1 rounded border border-red-200 font-semibold">
            <ShieldAlert className="h-2.5 w-2.5" /> BAD
          </span>
        ) : isStale ? (
          <span className="inline-flex items-center gap-0.5 text-slate-600 bg-slate-100 px-1 rounded border border-slate-200 font-semibold">
            <Clock className="h-2.5 w-2.5" /> STALE
          </span>
        ) : isUncertain ? (
          <span className="inline-flex items-center gap-0.5 text-amber-700 bg-amber-50 px-1 rounded border border-amber-200 font-semibold">
            UNCERTAIN
          </span>
        ) : (
          <span className="inline-flex items-center text-emerald-700 bg-emerald-50 px-1 rounded border border-emerald-200 font-medium">
            GOOD
          </span>
        )}

        {/* Age Indicator */}
        <span className="font-mono text-[10px]">{ageSeconds}s ago</span>
      </div>
    </div>
  )
}
