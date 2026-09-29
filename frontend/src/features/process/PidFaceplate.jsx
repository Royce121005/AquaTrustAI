import { useState, useEffect, useRef } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts'
import {
  Activity,
  Sliders,
  Settings2,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  X,
  Gauge,
  Lock,
} from 'lucide-react'
import ControlAction from '../../components/controls/ControlAction.jsx'
import { AUDIT_ACTIONS } from '../../lib/audit/auditStore.js'
import { getTag } from '../../lib/tags/registry.js'

export default function PidFaceplate({ loopTagId = 'AIT-201', onClose }) {
  const loopTag = getTag(loopTagId) || {
    id: 'AIT-201',
    name: 'Aeration Basin DO Control Loop',
    unit: 'mg/L',
    range: [0, 8.0],
  }

  // PID Internal State
  const [mode, setMode] = useState('Auto') // 'Auto' | 'Manual' | 'Cascade'
  const [sp, setSp] = useState(2.8) // Setpoint (mg/L)
  const [pv, setPv] = useState(2.65) // Process Variable (mg/L)
  const [out, setOut] = useState(58.0) // Output % (Blower Speed)
  const [kp, setKp] = useState(2.4)
  const [ki, setKi] = useState(0.08)
  const [kd, setKd] = useState(0.12)
  const [isTransferring, setIsTransferring] = useState(false)

  // 3-Pen Trend Data Buffer (last 30 samples)
  const [trendData, setTrendData] = useState(() => {
    const initial = []
    const now = Date.now()
    for (let i = 25; i >= 0; i--) {
      initial.push({
        time: new Date(now - i * 1500).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        pv: +(2.5 + Math.sin(i / 3) * 0.2).toFixed(2),
        sp: 2.8,
        out: +(55 + Math.sin(i / 3) * 8).toFixed(1),
      })
    }
    return initial
  })

  // Client-Side Dynamic PID Simulation Engine
  const integralRef = useRef(0)
  const lastErrRef = useRef(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setPv((currentPv) => {
        let currentOut = out
        const error = sp - currentPv

        if (mode === 'Auto' || mode === 'Cascade') {
          integralRef.current = Math.max(-50, Math.min(50, integralRef.current + error * ki))
          const derivative = (error - lastErrRef.current) * kd
          lastErrRef.current = error

          // PID output calculation
          let calculatedOut = kp * error + integralRef.current + derivative + 50
          calculatedOut = Math.max(15, Math.min(100, calculatedOut))
          setOut(+calculatedOut.toFixed(1))
          currentOut = calculatedOut
        }

        // Biological process response: PV moves toward SP based on blower air output
        const targetPv = 1.0 + (currentOut / 100) * 3.2
        const noise = (Math.random() - 0.5) * 0.04
        const nextPv = +(currentPv + (targetPv - currentPv) * 0.08 + noise).toFixed(2)

        setTrendData((prev) => {
          const newPoint = {
            time: new Date().toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            }),
            pv: nextPv,
            sp,
            out: currentOut,
          }
          return [...prev.slice(1), newPoint]
        })

        return nextPv
      })
    }, 1500)

    return () => clearInterval(timer)
  }, [sp, out, mode, kp, ki, kd])

  // Bumpless Transfer Simulation Handler
  const handleModeChange = ({ newValue }) => {
    setIsTransferring(true)
    setTimeout(() => {
      setMode(newValue)
      setIsTransferring(false)
    }, 600)
  }

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 text-slate-100 p-5 shadow-2xl space-y-4 select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Gauge className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-sky-400">{loopTag.id}</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                PID Loop Controller
              </span>
            </div>
            <h3 className="text-sm font-bold text-white mt-0.5">{loopTag.name}</h3>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Bumpless Mode Switcher via ControlAction */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <span
              className={`px-2.5 py-1 rounded text-xs font-bold transition-all duration-300 ${
                isTransferring
                  ? 'bg-amber-500/20 text-amber-300 animate-pulse'
                  : mode === 'Auto'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'bg-emerald-700 text-white'
              }`}
            >
              {isTransferring ? 'BUMPLESS TRANSFER...' : `${mode} Mode`}
            </span>
            <ControlAction
              tagId={loopTag.id}
              actionType={AUDIT_ACTIONS.MODE_CHANGE}
              currentValue={mode}
              targetValue={mode === 'Auto' ? 'Manual' : 'Auto'}
              label={mode === 'Auto' ? 'Switch to Manual' : 'Switch to Auto'}
              onExecute={handleModeChange}
              variant="outline"
              className="text-[11px] py-1 bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800"
            />
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main 3-Pen Trend (PV, SP, OUT) */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs px-1">
          <span className="font-mono text-slate-400 text-[11px]">Real-time 3-Pen Dynamic Trend</span>
          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="flex items-center gap-1 text-emerald-400 font-bold">
              <span className="h-2 w-2 rounded-full bg-emerald-400" /> PV: {pv.toFixed(2)} mg/L
            </span>
            <span className="flex items-center gap-1 text-sky-400 font-bold">
              <span className="h-2 w-2 rounded-full bg-sky-400" /> SP: {sp.toFixed(2)} mg/L
            </span>
            <span className="flex items-center gap-1 text-purple-400 font-bold">
              <span className="h-2 w-2 rounded-full bg-purple-400" /> OUT: {out.toFixed(1)}%
            </span>
          </div>
        </div>

        <div className="h-56 w-full rounded-lg bg-slate-950 p-2 border border-slate-800">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
              <XAxis dataKey="time" stroke="#475569" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="pv" domain={[0, 5]} stroke="#10b981" tick={{ fontSize: 10 }} />
              <YAxis
                yAxisId="out"
                orientation="right"
                domain={[0, 100]}
                stroke="#a855f7"
                tick={{ fontSize: 10 }}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }}
              />
              <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '4px' }} />
              <Line
                yAxisId="pv"
                type="monotone"
                dataKey="pv"
                name="PV (Dissolved Oxygen)"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                yAxisId="pv"
                type="stepAfter"
                dataKey="sp"
                name="SP (Target Setpoint)"
                stroke="#38bdf8"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
                isAnimationActive={false}
              />
              <Line
                yAxisId="out"
                type="monotone"
                dataKey="out"
                name="OUT% (Blower Speed)"
                stroke="#c084fc"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Setpoint & Manual Output Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* SP Control Card */}
        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400 font-medium">Target DO Setpoint</span>
            <span className="font-mono text-sm font-bold text-sky-400">{sp.toFixed(2)} mg/L</span>
          </div>
          <ControlAction
            tagId={loopTag.id}
            actionType={AUDIT_ACTIONS.SETPOINT_CHANGE}
            currentValue={sp}
            targetValue={sp}
            label="Adjust DO Setpoint"
            unit="mg/L"
            onExecute={({ newValue }) => setSp(+Number(newValue).toFixed(2))}
            className="w-full"
          />
        </div>

        {/* Manual OUT% Control Card */}
        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400 font-medium">Blower Output (OUT%)</span>
            <span className="font-mono text-sm font-bold text-purple-400">{out.toFixed(1)}%</span>
          </div>
          {mode === 'Manual' ? (
            <ControlAction
              tagId="BLW-201"
              actionType={AUDIT_ACTIONS.SETPOINT_CHANGE}
              currentValue={out}
              targetValue={out}
              label="Manual Blower Output"
              unit="%"
              onExecute={({ newValue }) => setOut(+Number(newValue).toFixed(1))}
              className="w-full bg-purple-600 hover:bg-purple-700"
            />
          ) : (
            <div className="flex items-center gap-1.5 p-1.5 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-500">
              <Lock className="h-3 w-3 shrink-0" />
              <span>OUT is locked in Auto. Switch to Manual to override.</span>
            </div>
          )}
        </div>
      </div>

      {/* PID Tuning Coefficients Panel (Kp, Ki, Kd) */}
      <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1">
            <Settings2 className="h-3.5 w-3.5 text-sky-400" />
            PID Tuning Parameters
          </span>
          {mode !== 'Manual' && (
            <span className="text-[10px] text-amber-400 italic">
              * Tuning locked in Auto mode
            </span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {/* Kp */}
          <div className="p-2 rounded bg-slate-900 border border-slate-800 text-center space-y-1">
            <span className="text-[10px] text-slate-400 font-mono block">Proportional (Kp)</span>
            <span className="font-mono font-bold text-sm text-slate-200 block">{kp.toFixed(2)}</span>
            {mode === 'Manual' ? (
              <ControlAction
                tagId={`${loopTag.id}.Kp`}
                currentValue={kp}
                label="Tune Kp"
                onExecute={({ newValue }) => setKp(+Number(newValue).toFixed(2))}
                className="w-full text-[10px] py-0.5"
              />
            ) : null}
          </div>

          {/* Ki */}
          <div className="p-2 rounded bg-slate-900 border border-slate-800 text-center space-y-1">
            <span className="text-[10px] text-slate-400 font-mono block">Integral (Ki)</span>
            <span className="font-mono font-bold text-sm text-slate-200 block">{ki.toFixed(3)}</span>
            {mode === 'Manual' ? (
              <ControlAction
                tagId={`${loopTag.id}.Ki`}
                currentValue={ki}
                label="Tune Ki"
                onExecute={({ newValue }) => setKi(+Number(newValue).toFixed(3))}
                className="w-full text-[10px] py-0.5"
              />
            ) : null}
          </div>

          {/* Kd */}
          <div className="p-2 rounded bg-slate-900 border border-slate-800 text-center space-y-1">
            <span className="text-[10px] text-slate-400 font-mono block">Derivative (Kd)</span>
            <span className="font-mono font-bold text-sm text-slate-200 block">{kd.toFixed(3)}</span>
            {mode === 'Manual' ? (
              <ControlAction
                tagId={`${loopTag.id}.Kd`}
                currentValue={kd}
                label="Tune Kd"
                onExecute={({ newValue }) => setKd(+Number(newValue).toFixed(3))}
                className="w-full text-[10px] py-0.5"
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
