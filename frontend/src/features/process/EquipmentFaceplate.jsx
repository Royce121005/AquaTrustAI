import { useState } from 'react'
import {
  X,
  Play,
  Square,
  Activity,
  AlertTriangle,
  Wrench,
  Gauge,
  Sliders,
  ShieldCheck,
  Zap,
} from 'lucide-react'
import Button from '../../components/ui/Button.jsx'
import Tabs from '../../components/ui/Tabs.jsx'
import ControlAction from '../../components/controls/ControlAction.jsx'
import PidFaceplate from './PidFaceplate.jsx'
import { AUDIT_ACTIONS } from '../../lib/audit/auditStore.js'

export default function EquipmentFaceplate({
  assetId,
  assetMeta,
  assetState,
  historyData = [],
  onTogglePump,
  onClose,
}) {
  const [activeTab, setActiveTab] = useState('overview')
  const [controlMode, setControlMode] = useState(assetState?.mode || 'Auto')

  if (!assetId) return null

  const isRunning = assetState?.status === 'Running'
  const isPumpOrBlower = assetMeta?.assetType === 'PUMP' || assetMeta?.assetType === 'BLOWER' || assetMeta?.assetType === 'DOSING'
  const hasLoop = assetId === 'BLW-201' || assetId === 'BLW-202' || assetId === 'AIT-201' || assetMeta?.loop

  const tabs = [
    { id: 'overview', label: 'Overview' },
    ...(hasLoop ? [{ id: 'pid', label: 'PID Loop' }] : []),
    { id: 'trend', label: 'Trend (1h)' },
    { id: 'alarms', label: 'Alarms (5)' },
    { id: 'maintenance', label: 'Maintenance' },
  ]


  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl border-l border-slate-300 flex flex-col select-none">
      
      {/* Faceplate Header */}
      <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between border-b border-slate-700">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-sky-400 bg-sky-950 px-2 py-0.5 rounded border border-sky-800">
              {assetId}
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                isRunning
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              {assetState?.status || 'Active'}
            </span>
          </div>
          <h2 className="text-sm font-bold text-white mt-1">{assetMeta?.assetName || assetId}</h2>
          <p className="text-[11px] text-slate-400">{assetMeta?.description || 'Treatment Unit Subsystem'}</p>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="Close faceplate"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="px-5 pt-3 border-b border-slate-200 bg-slate-50">
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      </div>

      {/* Faceplate Content Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs text-slate-700">
        
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-5">
            
            {/* Operator Advisory Control Section */}
            {isPumpOrBlower && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                    Operator Advisory Command
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-500 font-mono">Mode:</span>
                    <ControlAction
                      tagId={assetId}
                      actionType={AUDIT_ACTIONS.MODE_CHANGE}
                      currentValue={controlMode}
                      targetValue={controlMode === 'Auto' ? 'Manual' : 'Auto'}
                      label={controlMode === 'Auto' ? 'Auto (Switch)' : 'Manual (Switch)'}
                      variant="outline"
                      onExecute={({ newValue }) => setControlMode(newValue)}
                      className="text-[10px] py-0.5 px-2"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <ControlAction
                    tagId={assetId}
                    actionType={AUDIT_ACTIONS.PUMP_COMMAND}
                    currentValue={isRunning ? 'Running' : 'Stopped'}
                    targetValue={isRunning ? 'Stopped' : 'Running'}
                    label={isRunning ? 'Request Stop Command' : 'Request Start Command'}
                    variant={isRunning ? 'danger' : 'primary'}
                    icon={isRunning ? Square : Play}
                    disabled={controlMode === 'Local'}
                    onExecute={() => onTogglePump(assetId)}
                    className="flex-1 py-2.5 font-bold"
                  />
                </div>

                {/* If Dosing Pump, add chemical dosing rate setpoint */}
                {assetMeta?.assetType === 'DOSING' && (
                  <div className="pt-2 border-t border-slate-200 space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-600 font-medium">Metering Target Rate:</span>
                      <span className="font-mono font-bold text-slate-800">
                        {assetMeta?.normal?.[1] || 15} L/h
                      </span>
                    </div>
                    <ControlAction
                      tagId={assetId}
                      actionType={AUDIT_ACTIONS.SETPOINT_CHANGE}
                      currentValue={assetMeta?.normal?.[1] || 15}
                      label="Adjust Dosing Flow Rate"
                      unit="L/h"
                      className="w-full"
                    />
                  </div>
                )}

                <p className="text-[10px] text-slate-500 italic">
                  * Advisory request dispatched to SCADA PLC gateway. Safety interlocks remain hardware-enforced.
                </p>
              </div>
            )}


            {/* ISA-101 Bar-with-Pointer Analog Limits */}
            {isPumpOrBlower && (
              <div className="space-y-3">
                <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                  Process Control Bars (PV vs SP vs OUT)
                </h3>

                {/* Speed % Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span>Speed Output (OUT%)</span>
                    <strong>{assetState?.speedPct ?? 0}%</strong>
                  </div>
                  <div className="h-3 w-full bg-slate-200 rounded-xs overflow-hidden relative border border-slate-300">
                    <div
                      className="h-full bg-sky-600 transition-all duration-300"
                      style={{ width: `${assetState?.speedPct ?? 0}%` }}
                    />
                  </div>
                </div>

                {/* Motor Amperage Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span>Motor Current (IIT)</span>
                    <strong>{assetState?.currentAmps?.toFixed(1) ?? '0.0'} A / {assetMeta?.fullLoadAmps ?? 78} A</strong>
                  </div>
                  <div className="h-3 w-full bg-slate-200 rounded-xs overflow-hidden relative border border-slate-300">
                    <div
                      className="h-full bg-emerald-600 transition-all duration-300"
                      style={{ width: `${Math.min(100, ((assetState?.currentAmps ?? 0) / (assetMeta?.fullLoadAmps ?? 78)) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Mechanical & Electrical Diagnostics */}
            <div className="rounded-lg border border-slate-200 divide-y divide-slate-100 bg-white">
              <div className="flex justify-between p-2.5">
                <span className="text-slate-500">Vibration (RMS)</span>
                <span className="font-mono font-bold text-slate-800">{assetState?.vibration ?? 1.2} mm/s</span>
              </div>
              <div className="flex justify-between p-2.5">
                <span className="text-slate-500">Total Run Hours</span>
                <span className="font-mono font-bold text-slate-800">{assetState?.runtimeHours?.toLocaleString() ?? 4120} h</span>
              </div>
              <div className="flex justify-between p-2.5">
                <span className="text-slate-500">Total Motor Starts</span>
                <span className="font-mono font-bold text-slate-800">{assetState?.starts ?? 312}</span>
              </div>
              <div className="flex justify-between p-2.5">
                <span className="text-slate-500">Thermal Overload</span>
                <span className="font-semibold text-emerald-700">Normal (54°C)</span>
              </div>
            </div>

            {/* Safety Interlocks (Display-Only) */}
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-slate-800 font-bold uppercase tracking-wider text-[11px]">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>PLC Safety Interlocks (Read-Only)</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="flex items-center justify-between bg-white p-2 rounded border border-slate-200">
                  <span>Emergency Stop</span>
                  <span className="font-bold text-emerald-700">ARMED</span>
                </div>
                <div className="flex items-center justify-between bg-white p-2 rounded border border-slate-200">
                  <span>Dry Run Protection</span>
                  <span className="font-bold text-emerald-700">PASS</span>
                </div>
                <div className="flex items-center justify-between bg-white p-2 rounded border border-slate-200">
                  <span>Seal Leak Probe</span>
                  <span className="font-bold text-emerald-700">CLEAR</span>
                </div>
                <div className="flex items-center justify-between bg-white p-2 rounded border border-slate-200">
                  <span>Permissive Interlock</span>
                  <span className="font-bold text-emerald-700">PERMITTED</span>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* TAB: PID LOOP */}
        {activeTab === 'pid' && (
          <PidFaceplate
            loopTagId={assetId === 'BLW-201' || assetId === 'BLW-202' ? 'AIT-201' : assetId}
          />
        )}

        {/* TAB 2: LIVE TREND (1h) */}

        {activeTab === 'trend' && (
          <div className="space-y-4">
            <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
              Rolling 60-Minute Process Trend
            </h3>
            <div className="h-44 w-full bg-slate-900 rounded-lg p-3 flex flex-col justify-between text-white border border-slate-700 font-mono">
              <div className="flex justify-between text-[10px] text-slate-400 border-b border-slate-800 pb-1">
                <span>Metric: Operational Value</span>
                <span>Interval: 1s Stream</span>
              </div>
              {/* Lightweight SVG Mini-Trend */}
              <div className="h-28 w-full flex items-end gap-1 pt-2">
                {historyData.length > 0 ? (
                  historyData.map((pt, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-sky-400 rounded-t-xs hover:bg-emerald-400 transition-colors"
                      style={{ height: `${Math.max(10, Math.min(100, (pt.value / 60) * 100))}%` }}
                      title={`${pt.time}: ${pt.value}`}
                    />
                  ))
                ) : (
                  <div className="flex items-center justify-center w-full text-slate-500 text-xs">
                    Buffering live telemetry…
                  </div>
                )}
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 pt-1">
                <span>T-60s</span>
                <span>Now</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ALARMS */}
        {activeTab === 'alarms' && (
          <div className="space-y-3">
            <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
              Asset Alarm Log (Last 5 Events)
            </h3>
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg bg-white overflow-hidden">
              <div className="p-3 text-[11px] space-y-1 bg-emerald-50/50">
                <div className="flex justify-between">
                  <span className="font-bold text-emerald-800">NORMAL RETURN</span>
                  <span className="text-slate-400 font-mono">10:45:12</span>
                </div>
                <p className="text-slate-600">Operating within nominal thermal and mechanical thresholds.</p>
              </div>
              <div className="p-3 text-[11px] space-y-1">
                <div className="flex justify-between">
                  <span className="font-bold text-slate-700">AUTO CYCLE START</span>
                  <span className="text-slate-400 font-mono">08:12:00</span>
                </div>
                <p className="text-slate-600">Lead duty pump transition scheduled by diurnal flow sequence.</p>
              </div>
              <div className="p-3 text-[11px] space-y-1">
                <div className="flex justify-between">
                  <span className="font-bold text-slate-700">ROUTINE ACK</span>
                  <span className="text-slate-400 font-mono">04:30:15</span>
                </div>
                <p className="text-slate-600">Shift operator acknowledged daily pump rotation checklist.</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: MAINTENANCE */}
        {activeTab === 'maintenance' && (
          <div className="space-y-4">
            <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
              Asset Maintenance Lifecycle
            </h3>
            <div className="rounded-lg border border-slate-200 p-4 bg-white space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-500">Last Serviced:</span>
                <span className="font-semibold text-slate-800">15 August 2026</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Next Overhaul Due:</span>
                <span className="font-bold text-amber-700">15 November 2026 (480 hrs remaining)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Active Work Order:</span>
                <span className="font-mono font-bold text-sky-700">WO-2026-0842</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Mechanical Seal Type:</span>
                <span className="text-slate-700">Silicon Carbide / FKM Dual Seal</span>
              </div>
            </div>
          </div>
        )}

      </div>

    </div>
  )
}
