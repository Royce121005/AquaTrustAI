import { useState, useEffect } from 'react'
import {
  Play,
  Square,
  AlertOctagon,
  Activity,
  Flame,
  Wrench,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Sparkles,
  CheckCircle,
} from 'lucide-react'
import Button from '../../components/ui/Button.jsx'
import { scenarioController, SCENARIO_TYPES } from '../../lib/demo/scenarioController.js'

export default function ScenarioInjector() {
  const [isVisible, setIsVisible] = useState(false)
  const [isExpanded, setIsExpanded] = useState(true)
  const [activeScenario, setActiveScenario] = useState(() => scenarioController.getActiveScenario())
  const [remainingSec, setRemainingSec] = useState(0)

  // Verify visibility condition: ?demo=true or DEV mode override
  useEffect(() => {
    const isDemoQuery = window.location.search.includes('demo=true')
    const isDevFlag = import.meta.env.DEV && window.__AQUATRUST_DEMO__
    setIsVisible(Boolean(isDemoQuery || isDevFlag))
  }, [])

  // Subscribe to scenarioController updates
  useEffect(() => {
    const unsubscribe = scenarioController.subscribe((scen) => {
      setActiveScenario(scen)
      if (scen && scen.durationMs) {
        setRemainingSec(Math.ceil(scen.durationMs / 1000))
      }
    })
    return unsubscribe
  }, [])

  // Timer countdown
  useEffect(() => {
    if (!activeScenario) {
      setRemainingSec(0)
      return
    }

    const interval = setInterval(() => {
      const elapsed = Date.now() - activeScenario.startTime
      const left = Math.max(0, Math.ceil((activeScenario.durationMs - elapsed) / 1000))
      setRemainingSec(left)
      if (left === 0) {
        clearInterval(interval)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [activeScenario])

  if (!isVisible) return null

  const handleStart = (id) => {
    scenarioController.startScenario(id)
  }

  const handleStop = () => {
    scenarioController.stopScenario()
  }

  const handleWalkthrough = () => {
    scenarioController.runWalkthrough()
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm w-full">
      {/* Narrative Caption Banner (When scenario is running) */}
      {activeScenario && activeScenario.caption && (
        <div className="mb-2 p-3 bg-slate-950 text-white rounded-xl shadow-2xl border border-sky-500/40 text-xs animate-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5 mb-1.5">
            <span className="font-bold text-sky-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              SCADA Scenario Active
            </span>
            <span className="font-mono text-[11px] text-amber-400 font-bold">
              {remainingSec}s remaining
            </span>
          </div>
          <p className="text-slate-200 leading-snug">{activeScenario.caption}</p>
        </div>
      )}

      {/* Main Floating Panel */}
      <div className="bg-slate-900 text-white rounded-xl shadow-2xl border border-slate-700 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-800/90 border-b border-slate-700 cursor-pointer select-none" onClick={() => setIsExpanded(!isExpanded)}>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-sky-400 animate-pulse" />
            <span className="text-xs font-bold tracking-wide">
              SCADA Scenario & Fault Injector
            </span>
            <span className="text-[9px] bg-sky-500/20 text-sky-300 font-mono px-1.5 py-0.5 rounded border border-sky-500/30">
              DEMO
            </span>
          </div>

          <div className="flex items-center gap-1 text-slate-400 hover:text-white">
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </div>
        </div>

        {/* Body */}
        {isExpanded && (
          <div className="p-3.5 space-y-3">
            {/* Walkthrough Button */}
            <button
              onClick={handleWalkthrough}
              disabled={Boolean(activeScenario)}
              className="w-full py-2 px-3 bg-gradient-to-r from-sky-600 via-indigo-600 to-purple-600 hover:from-sky-500 hover:to-purple-500 text-white text-xs font-bold rounded-lg shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Run 5-Minute Scripted Walkthrough
            </button>

            {/* Individual Injections Grid */}
            <div className="space-y-1.5 pt-1 border-t border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">
                Individual Fault Scenarios:
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                {/* 1. COD Spike */}
                <button
                  onClick={() => handleStart(SCENARIO_TYPES.COD_SPIKE)}
                  disabled={Boolean(activeScenario)}
                  className="p-2 rounded bg-slate-800 hover:bg-slate-700 text-left border border-slate-700 transition-colors disabled:opacity-50"
                >
                  <div className="flex items-center gap-1 text-[11px] font-bold text-amber-400">
                    <Flame className="w-3 h-3 shrink-0" />
                    COD Spike
                  </div>
                  <div className="text-[9px] text-slate-400 mt-0.5 truncate">
                    AIT-503 &gt; 50 mg/L (90s)
                  </div>
                </button>

                {/* 2. DO Drift */}
                <button
                  onClick={() => handleStart(SCENARIO_TYPES.DO_DRIFT)}
                  disabled={Boolean(activeScenario)}
                  className="p-2 rounded bg-slate-800 hover:bg-slate-700 text-left border border-slate-700 transition-colors disabled:opacity-50"
                >
                  <div className="flex items-center gap-1 text-[11px] font-bold text-sky-400">
                    <Activity className="w-3 h-3 shrink-0" />
                    DO Sensor Drift
                  </div>
                  <div className="text-[9px] text-slate-400 mt-0.5 truncate">
                    AIT-201 to UNCERTAIN
                  </div>
                </button>

                {/* 3. Blower Trip */}
                <button
                  onClick={() => handleStart(SCENARIO_TYPES.BLOWER_TRIP)}
                  disabled={Boolean(activeScenario)}
                  className="p-2 rounded bg-slate-800 hover:bg-slate-700 text-left border border-slate-700 transition-colors disabled:opacity-50"
                >
                  <div className="flex items-center gap-1 text-[11px] font-bold text-red-400">
                    <AlertOctagon className="w-3 h-3 shrink-0" />
                    Blower Trip
                  </div>
                  <div className="text-[9px] text-slate-400 mt-0.5 truncate">
                    BLW-201 Fault + Halts Flow
                  </div>
                </button>

                {/* 4. Pump P-102 Fault */}
                <button
                  onClick={() => handleStart(SCENARIO_TYPES.PUMP_FAULT)}
                  disabled={Boolean(activeScenario)}
                  className="p-2 rounded bg-slate-800 hover:bg-slate-700 text-left border border-slate-700 transition-colors disabled:opacity-50"
                >
                  <div className="flex items-center gap-1 text-[11px] font-bold text-purple-400">
                    <Wrench className="w-3 h-3 shrink-0" />
                    Lift Pump Trip
                  </div>
                  <div className="text-[9px] text-slate-400 mt-0.5 truncate">
                    P-102 Trip / P-101 Pickup
                  </div>
                </button>
              </div>

              {/* 5. Tamper Record */}
              <button
                onClick={() => handleStart(SCENARIO_TYPES.TAMPER_RECORD)}
                disabled={Boolean(activeScenario)}
                className="w-full mt-1.5 p-2 rounded bg-red-950/60 hover:bg-red-900/80 text-left border border-red-800/80 transition-colors disabled:opacity-50"
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-[11px] font-bold text-red-300">
                    <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                    Tamper a Record
                  </span>
                  <span className="text-[9px] bg-red-800/60 text-red-200 px-1 py-0.5 rounded font-mono">
                    Verifier Test
                  </span>
                </div>
                <div className="text-[9px] text-red-300/80 mt-0.5">
                  Mutates 1-byte in audit store payload. Causes Stage 1 SHA-256 verifier failure!
                </div>
              </button>
            </div>

            {/* Active Control Bar */}
            {activeScenario && (
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <span className="text-[10px] text-slate-400">Scenario running...</span>
                <button
                  onClick={handleStop}
                  className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-[10px] font-bold inline-flex items-center gap-1"
                >
                  <Square className="w-3 h-3 fill-white" />
                  Stop / Revert
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
