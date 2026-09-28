import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Volume2,
  VolumeX,
  BellRing,
  ExternalLink,
  SlidersHorizontal,
} from 'lucide-react'

// Synthesizes an authentic industrial SCADA alert tone via Web Audio API without external files
function playScadaAlertTone(frequency = 880, durationMs = 250) {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) return
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'square'
    osc.frequency.setValueAtTime(frequency, ctx.currentTime)
    gain.gain.setValueAtTime(0.08, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start()
    osc.stop(ctx.currentTime + durationMs / 1000)
  } catch (err) {
    // Ignore audio autoplay restrictions
  }
}

export default function AlarmAnnunciatorBar() {
  // Industrial Alarm States: 'NORMAL' | 'WARNING' | 'CRITICAL'
  const [alarmState, setAlarmState] = useState('NORMAL')
  const [activeAlarm, setActiveAlarm] = useState(null)
  const [isAcknowledged, setIsAcknowledged] = useState(false)
  const [isMuted, setIsMuted] = useState(true) // Default muted to prevent unwanted noise
  const [showSimMenu, setShowSimMenu] = useState(false)
  const audioIntervalRef = useRef(null)

  // Trigger audio beeps if alarm is CRITICAL, unacknowledged, and not muted
  useEffect(() => {
    if (alarmState === 'CRITICAL' && !isAcknowledged && !isMuted) {
      playScadaAlertTone(950, 300)
      audioIntervalRef.current = setInterval(() => {
        playScadaAlertTone(950, 300)
      }, 2500)
    } else {
      if (audioIntervalRef.current) {
        clearInterval(audioIntervalRef.current)
        audioIntervalRef.current = null
      }
    }

    return () => {
      if (audioIntervalRef.current) clearInterval(audioIntervalRef.current)
    }
  }, [alarmState, isAcknowledged, isMuted])

  const handleAcknowledge = () => {
    setIsAcknowledged(true)
  }

  const triggerAlarmSimulation = (type) => {
    if (type === 'CRITICAL') {
      setAlarmState('CRITICAL')
      setActiveAlarm({
        id: 'ALM-DO-001',
        tag: 'DO_AERATION_BASIN_01',
        unit: 'Biological Aeration Tank 01',
        param: 'Dissolved Oxygen',
        value: '1.24 mg/L',
        limit: 'Min 2.00 mg/L',
        severity: 'CRITICAL',
        timestamp: new Date().toLocaleTimeString(),
        link: '/monitoring/sensors',
      })
      setIsAcknowledged(false)
    } else if (type === 'WARNING') {
      setAlarmState('WARNING')
      setActiveAlarm({
        id: 'ALM-TSS-002',
        tag: 'TSS_CLARIFIER_EFFLUENT',
        unit: 'Secondary Clarifier Outfall',
        param: 'Total Suspended Solids (TSS)',
        value: '18.8 mg/L',
        limit: 'Max 20.0 mg/L',
        severity: 'WARNING',
        timestamp: new Date().toLocaleTimeString(),
        link: '/monitoring/sensors',
      })
      setIsAcknowledged(false)
    } else {
      setAlarmState('NORMAL')
      setActiveAlarm(null)
      setIsAcknowledged(false)
    }
    setShowSimMenu(false)
  }

  return (
    <div className="border-b border-slate-200 bg-white">
      {/* Normal Operational Bar */}
      {alarmState === 'NORMAL' && (
        <div className="flex items-center justify-between px-6 py-1.5 bg-emerald-50/70 text-emerald-900 border-b border-emerald-100 text-xs">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            <span className="font-medium">
              SCADA Process Status: <strong className="font-semibold text-emerald-800">ALL BASINS NORMAL</strong>
            </span>
            <span className="text-emerald-700/80 hidden md:inline">
              · 12 Online Sensors · 0 ISA-18.2 Priority Alarms Active · CPCB OCEMS Heartbeat OK
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSimMenu(!showSimMenu)}
              className="text-[11px] font-mono text-emerald-700 hover:text-emerald-900 underline flex items-center gap-1"
            >
              <SlidersHorizontal className="h-3 w-3" />
              Simulate SCADA Trip
            </button>
          </div>
        </div>
      )}

      {/* Warning State Bar */}
      {alarmState === 'WARNING' && activeAlarm && (
        <div className="flex items-center justify-between px-6 py-2 bg-amber-500 text-slate-900 text-xs font-medium shadow-inner">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-4 w-4 shrink-0 text-slate-900" />
            <span>
              <strong>[ISA-18.2 WARNING]</strong> {activeAlarm.unit}: {activeAlarm.param} reached{' '}
              <strong>{activeAlarm.value}</strong> ({activeAlarm.limit}) at {activeAlarm.timestamp}
            </span>
            {isAcknowledged && (
              <span className="bg-amber-600/30 text-slate-900 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider">
                Acknowledged
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Link
              to={activeAlarm.link}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/90 hover:bg-white text-slate-900 rounded font-semibold text-[11px] transition-colors"
            >
              Investigate Sensor <ExternalLink className="h-3 w-3" />
            </Link>
            {!isAcknowledged && (
              <button
                onClick={handleAcknowledge}
                className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded font-bold text-[11px] transition-colors"
              >
                ACK ALARM
              </button>
            )}
            <button
              onClick={() => triggerAlarmSimulation('NORMAL')}
              className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px]"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Critical Exceedance Bar */}
      {alarmState === 'CRITICAL' && activeAlarm && (
        <div
          className={`flex items-center justify-between px-6 py-2.5 text-xs text-white shadow-md transition-colors ${
            isAcknowledged ? 'bg-red-800' : 'bg-red-600 animate-pulse'
          }`}
        >
          <div className="flex items-center gap-3">
            <AlertOctagon className="h-5 w-5 shrink-0 text-white animate-bounce" />
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-white text-red-700 px-1.5 py-0.2 rounded font-black text-[10px] tracking-wider uppercase">
                  CRITICAL EXCEEDANCE
                </span>
                <span className="font-bold text-sm">{activeAlarm.param} Breach</span>
                <span className="text-red-100 font-mono text-xs">[{activeAlarm.tag}]</span>
              </div>
              <p className="text-[11px] text-red-100 mt-0.5">
                {activeAlarm.unit}: Measured <strong className="text-white underline">{activeAlarm.value}</strong> vs.{' '}
                {activeAlarm.limit}. Risk of regulatory violation under CPCB guidelines.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMuted(!isMuted)}
              title={isMuted ? 'Unmute alarm horn' : 'Mute alarm horn'}
              className="p-1.5 rounded bg-red-700/80 hover:bg-red-700 text-white"
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <Link
              to={activeAlarm.link}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-white text-red-800 hover:bg-slate-100 rounded font-bold text-xs transition-colors shadow-xs"
            >
              Inspect Basin <ExternalLink className="h-3 w-3" />
            </Link>
            {!isAcknowledged ? (
              <button
                onClick={handleAcknowledge}
                className="px-3 py-1.5 bg-slate-900 hover:bg-black text-amber-300 border border-amber-400/50 rounded font-black text-xs uppercase tracking-wider transition-colors shadow-xs"
              >
                ACKNOWLEDGE (ACK)
              </button>
            ) : (
              <span className="px-2 py-1 bg-red-900 text-red-200 text-[10px] rounded uppercase font-semibold">
                Silenced by Operator
              </span>
            )}
            <button
              onClick={() => triggerAlarmSimulation('NORMAL')}
              className="px-2 py-1 bg-red-900/60 hover:bg-red-900 text-white rounded text-[11px]"
            >
              Reset
            </button>
          </div>
        </div>
      )}

      {/* Simulation Dropdown Bar */}
      {showSimMenu && (
        <div className="px-6 py-2 bg-slate-800 text-white text-xs flex items-center justify-between border-t border-slate-700">
          <div className="flex items-center gap-2">
            <BellRing className="h-4 w-4 text-amber-400" />
            <span className="font-semibold text-slate-200">Industrial SCADA Alarm Testing Console:</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => triggerAlarmSimulation('NORMAL')}
              className="px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-600 text-xs text-slate-200"
            >
              Normal State
            </button>
            <button
              onClick={() => triggerAlarmSimulation('WARNING')}
              className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-xs text-white font-semibold"
            >
              Simulate Warning (TSS 18.8 mg/L)
            </button>
            <button
              onClick={() => triggerAlarmSimulation('CRITICAL')}
              className="px-2.5 py-1 rounded bg-red-600 hover:bg-red-500 text-xs text-white font-semibold"
            >
              Simulate Critical (DO 1.24 mg/L)
            </button>
            <button
              onClick={() => setShowSimMenu(false)}
              className="text-slate-400 hover:text-white text-xs pl-2"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
