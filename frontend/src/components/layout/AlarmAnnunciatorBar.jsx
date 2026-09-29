import { useState } from 'react'
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
import { useAlarmState } from '../../lib/alarms/useAlarmState.js'
import { scenarioController, SCENARIO_TYPES } from '../../lib/demo/scenarioController.js'

export default function AlarmAnnunciatorBar() {
  const { activeAlarms, isMuted, toggleMute, acknowledgeAlarm } = useAlarmState()
  const [showSimMenu, setShowSimMenu] = useState(false)

  // Find top priority active alarm (Critical over Warning)
  const topCritical = activeAlarms.find((a) => a.priority === 'CRITICAL')
  const topWarning = activeAlarms.find((a) => a.priority === 'WARNING')
  const currentAlarm = topCritical || topWarning || null

  const alarmState = currentAlarm ? currentAlarm.priority : 'NORMAL'
  const isAcknowledged = currentAlarm ? currentAlarm.state === 'Ack-Active' : false

  const handleAcknowledge = () => {
    if (currentAlarm) {
      acknowledgeAlarm(currentAlarm.tagId, 'Plant Operator', 'Annunciator bar ACK')
    }
  }

  const triggerAlarmSimulation = (type) => {
    if (type === 'CRITICAL') {
      scenarioController.startScenario(SCENARIO_TYPES.BLOWER_TRIP, 45000)
    } else if (type === 'WARNING') {
      scenarioController.startScenario(SCENARIO_TYPES.COD_SPIKE, 45000)
    } else {
      scenarioController.stopScenario()
      if (currentAlarm) {
        acknowledgeAlarm(currentAlarm.tagId, 'Plant Operator', 'Sim clear')
      }
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
              · 26 ISA-18.2 Tags Monitored · 0 Active Alarms · CPCB OCEMS Heartbeat OK
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/alarms"
              className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 underline flex items-center gap-1"
            >
              Alarm Console
            </Link>
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
      {alarmState === 'WARNING' && currentAlarm && (
        <div className="flex items-center justify-between px-6 py-2 bg-amber-500 text-slate-900 text-xs font-medium shadow-inner">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-4 w-4 shrink-0 text-slate-900" />
            <span>
              <strong>[ISA-18.2 WARNING]</strong> {currentAlarm.name}: reached{' '}
              <strong>
                {typeof currentAlarm.tripValue === 'number'
                  ? currentAlarm.tripValue.toFixed(2)
                  : currentAlarm.tripValue}{' '}
                {currentAlarm.unit}
              </strong>{' '}
              (Limit {currentAlarm.limitCrossed}: {currentAlarm.limitValue}) [{currentAlarm.tagId}]
            </span>
            {isAcknowledged && (
              <span className="bg-amber-600/30 text-slate-900 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider">
                Acknowledged
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleMute}
              title={isMuted ? 'Unmute alarm horn' : 'Mute alarm horn'}
              className="p-1 rounded bg-amber-600/40 hover:bg-amber-600/60 text-slate-900"
            >
              {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
            </button>
            <Link
              to="/alarms"
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/90 hover:bg-white text-slate-900 rounded font-semibold text-[11px] transition-colors"
            >
              Investigate in /alarms <ExternalLink className="h-3 w-3" />
            </Link>
            {!isAcknowledged && (
              <button
                onClick={handleAcknowledge}
                className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded font-bold text-[11px] transition-colors"
              >
                ACK ALARM
              </button>
            )}
          </div>
        </div>
      )}

      {/* Critical Exceedance Bar */}
      {alarmState === 'CRITICAL' && currentAlarm && (
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
                <span className="font-bold text-sm">{currentAlarm.name} Breach</span>
                <span className="text-red-100 font-mono text-xs">[{currentAlarm.tagId}]</span>
              </div>
              <p className="text-[11px] text-red-100 mt-0.5">
                {currentAlarm.description}: Measured{' '}
                <strong className="text-white underline">
                  {typeof currentAlarm.tripValue === 'number'
                    ? currentAlarm.tripValue.toFixed(2)
                    : currentAlarm.tripValue}{' '}
                  {currentAlarm.unit}
                </strong>{' '}
                vs. {currentAlarm.limitCrossed} Limit ({currentAlarm.limitValue} {currentAlarm.unit}). 
                ISA-18.2 Response: {currentAlarm.responseProcedure}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleMute}
              title={isMuted ? 'Unmute alarm horn' : 'Mute alarm horn'}
              className="p-1.5 rounded bg-red-700/80 hover:bg-red-700 text-white"
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <Link
              to="/alarms"
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-white text-red-800 hover:bg-slate-100 rounded font-bold text-xs transition-colors shadow-xs"
            >
              Alarm Console <ExternalLink className="h-3 w-3" />
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
              Simulate Warning (COD Spike)
            </button>
            <button
              onClick={() => triggerAlarmSimulation('CRITICAL')}
              className="px-2.5 py-1 rounded bg-red-600 hover:bg-red-500 text-xs text-white font-semibold"
            >
              Simulate Critical (Blower Trip)
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

