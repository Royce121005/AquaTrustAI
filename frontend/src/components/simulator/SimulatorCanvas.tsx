import React, { useState } from 'react';
import {
  Play,
  Square,
  Radio,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Layers,
  Sparkles,
  Zap,
  ArrowRight,
  Gauge,
  Droplets,
  RotateCw,
  Lock,
  Database,
  ShieldCheck,
  Info,
} from 'lucide-react';
import { PipelineNodeInspector, PipelineNodeId } from './PipelineNodeInspector';

interface SimulatorCanvasProps {
  isRunning: boolean;
  activeFacilityName: string;
  stepsGenerated: number;
  readingsIngested: number;
  currentScenario: string;
  lastTickAt: string | null;
  onStart: () => void;
  onStop: () => void;
  isStarting?: boolean;
  isStopping?: boolean;
}

export const SimulatorCanvas: React.FC<SimulatorCanvasProps> = ({
  isRunning,
  activeFacilityName,
  stepsGenerated,
  readingsIngested,
  currentScenario,
  lastTickAt,
  onStart,
  onStop,
  isStarting = false,
  isStopping = false,
}) => {
  const [selectedNodeId, setSelectedNodeId] = useState<PipelineNodeId | null>(null);

  // Live simulated readings based on step count and active scenario
  const isAnomaly = currentScenario && currentScenario !== 'baseline_normal';
  const isOrganicShock = currentScenario === 'organic_shock';
  const isAerationFailure = currentScenario === 'aeration_failure';
  const isPhDrift = currentScenario === 'ph_drift';

  // Computed dynamic values
  const stepMod = stepsGenerated % 30;
  const sinFactor = Math.sin(stepMod / 3);

  const liveBod = isOrganicShock
    ? 265.0 + sinFactor * 15
    : 185.0 + sinFactor * 8;
  const liveCod = isOrganicShock
    ? 580.0 + sinFactor * 25
    : 410.0 + sinFactor * 18;
  const liveDo = isAerationFailure
    ? Math.max(0.2, 0.45 - (stepsGenerated % 10) * 0.03)
    : 2.15 + sinFactor * 0.12;
  const livePh = isPhDrift
    ? 9.35 + sinFactor * 0.2
    : 7.38 + sinFactor * 0.05;
  const liveTss = 210.0 + sinFactor * 10;
  const effBod = isOrganicShock
    ? 38.5 + sinFactor * 3
    : isAerationFailure
    ? 44.0 + sinFactor * 4
    : 20.8 + sinFactor * 0.8;

  const stateVersion = stepsGenerated + 42;

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl select-none relative">
      {/* SCADA Canvas Header Ribbon */}
      <div className="bg-slate-900/95 border-b border-slate-800 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-indigo-950 border border-indigo-800 text-indigo-400">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
                SCADA Telemetry Pipeline & Treatment Basin Visualizer
              </h2>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                  isRunning
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {isRunning ? 'TRANSMITTING 1Hz' : 'OFFLINE / STANDBY'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Target Facility: <span className="text-slate-200 font-semibold">{activeFacilityName || 'Selected STP'}</span> • Synthetic Sensor Telemetry & Ingestion Bus
            </p>
          </div>
        </div>

        {/* Action Controls & Active Status Indicator */}
        <div className="flex items-center gap-2">
          {isAnomaly && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-rose-950/80 border border-rose-800 text-rose-300 text-xs font-mono font-semibold animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span>DISTURBANCE: {currentScenario.toUpperCase()}</span>
            </div>
          )}

          <div className="hidden lg:flex items-center gap-1 text-[11px] font-mono text-slate-400 bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
            <Info className="w-3.5 h-3.5 text-sky-400" />
            <span>Click any node to inspect telemetry & validation rules</span>
          </div>

          {!isRunning ? (
            <button
              onClick={onStart}
              disabled={isStarting}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-semibold shadow-md transition-colors disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isStarting ? 'Starting...' : 'Start Telemetry Generation'}</span>
            </button>
          ) : (
            <button
              onClick={onStop}
              disabled={isStopping}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-semibold shadow-md transition-colors disabled:opacity-50"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>{isStopping ? 'Stopping...' : 'Stop Stream'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Animated SVG Pipeline Canvas */}
      <div className="relative w-full overflow-hidden" style={{ minHeight: '430px' }}>
        <svg viewBox="0 0 1100 420" className="w-full h-full">
          <defs>
            {/* Grid Pattern */}
            <pattern id="simGrid" width="25" height="25" patternUnits="userSpaceOnUse">
              <path d="M 25 0 L 0 0 0 25" fill="none" stroke="#1e293b" strokeWidth="0.6" strokeOpacity="0.4" />
            </pattern>

            {/* Glowing Drop Shadows */}
            <filter id="packetGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            <filter id="selectionGlow" x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Stage Gradients */}
            <linearGradient id="simInletGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={isOrganicShock ? '#78350f' : '#334155'} />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>

            <linearGradient id="simAerationGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={isAerationFailure ? '#451a03' : '#92400e'} />
              <stop offset="100%" stopColor="#451a03" />
            </linearGradient>

            <linearGradient id="simEffluentGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#0e7490" />
            </linearGradient>
          </defs>

          {/* Background */}
          <rect width="1100" height="420" fill="#090d16" />
          <rect width="1100" height="420" fill="url(#simGrid)" />

          {/* ========================================================= */}
          {/* LEVEL 1: SIMULATED TREATMENT BASINS (TOP ROW)             */}
          {/* ========================================================= */}

          {/* Basin 1: Raw Influent */}
          <g
            transform="translate(30, 25)"
            className="cursor-pointer"
            onClick={() => setSelectedNodeId('sensor-101')}
          >
            <rect
              width="180"
              height="125"
              rx="6"
              fill="url(#simInletGrad)"
              stroke={
                selectedNodeId === 'sensor-101'
                  ? '#38bdf8'
                  : isOrganicShock
                  ? '#f59e0b'
                  : '#334155'
              }
              strokeWidth={selectedNodeId === 'sensor-101' ? '2.5' : isOrganicShock ? '2' : '1.5'}
              filter={selectedNodeId === 'sensor-101' ? 'url(#selectionGlow)' : undefined}
            />
            <rect x="6" y="6" width="168" height="18" rx="3" fill="#0f172a" fillOpacity="0.9" />
            <text x="12" y="19" fill="#cbd5e1" fontSize="9" fontFamily="sans-serif" fontWeight="bold">
              1. INFLUENT HEADWORKS
            </text>

            {/* Screen Bars */}
            <line x1="45" y1="35" x2="45" y2="90" stroke="#64748b" strokeWidth="2.5" />
            <line x1="55" y1="35" x2="55" y2="90" stroke="#64748b" strokeWidth="2.5" />
            <line x1="65" y1="35" x2="65" y2="90" stroke="#64748b" strokeWidth="2.5" />

            {/* Inflow Rate & BOD Indicator */}
            <text x="12" y="105" fill="#94a3b8" fontSize="8.5" fontFamily="monospace">
              BOD: <tspan fill={isOrganicShock ? '#f59e0b' : '#f8fafc'} fontWeight="bold">{liveBod.toFixed(0)}</tspan> mg/L
            </text>
            <text x="12" y="118" fill="#64748b" fontSize="8" fontFamily="monospace">
              FLOW: 10.0 MLD
            </text>

            {/* Sensor Tap 1 */}
            <g transform="translate(155, 90)">
              {isRunning && (
                <circle cx="0" cy="0" r="10" fill="none" stroke="#38bdf8" strokeWidth="1" opacity="0.6">
                  <animate attributeName="r" values="5;14" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.8;0" dur="2s" repeatCount="indefinite" />
                </circle>
              )}
              <circle cx="0" cy="0" r="8" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" />
              <circle cx="0" cy="0" r="3" fill="#38bdf8">
                {isRunning && <animate attributeName="opacity" values="0.4;1;0.4" dur="1s" repeatCount="indefinite" />}
              </circle>
              <text x="0" y="17" textAnchor="middle" fill="#38bdf8" fontSize="7.5" fontFamily="monospace" fontWeight="bold">
                SN-101
              </text>
            </g>
          </g>

          {/* Pipe: Basin 1 -> Basin 2 */}
          <path d="M 210 90 L 250 90" stroke="#475569" strokeWidth="4" />
          {isRunning && (
            <circle r="3" fill="#38bdf8">
              <animateMotion path="M 210 90 L 250 90" dur="1.2s" repeatCount="indefinite" />
            </circle>
          )}

          {/* Basin 2: Primary Clarifier */}
          <g
            transform="translate(250, 25)"
            className="cursor-pointer"
            onClick={() => setSelectedNodeId('sensor-201')}
          >
            <rect
              width="180"
              height="125"
              rx="6"
              fill="#1e293b"
              stroke={selectedNodeId === 'sensor-201' ? '#38bdf8' : '#334155'}
              strokeWidth={selectedNodeId === 'sensor-201' ? '2.5' : '1.5'}
              filter={selectedNodeId === 'sensor-201' ? 'url(#selectionGlow)' : undefined}
            />
            <rect x="6" y="6" width="168" height="18" rx="3" fill="#0f172a" fillOpacity="0.9" />
            <text x="12" y="19" fill="#cbd5e1" fontSize="9" fontFamily="sans-serif" fontWeight="bold">
              2. PRIMARY SETTLING
            </text>

            {/* Settling Flocs */}
            <circle cx="50" cy="65" r="2.5" fill="#64748b" opacity="0.8">
              {isRunning && <animate attributeName="cy" values="50;95;50" dur="3s" repeatCount="indefinite" />}
            </circle>
            <circle cx="95" cy="75" r="3" fill="#64748b" opacity="0.8">
              {isRunning && <animate attributeName="cy" values="55;105;55" dur="3.5s" begin="0.5s" repeatCount="indefinite" />}
            </circle>

            <text x="12" y="105" fill="#94a3b8" fontSize="8.5" fontFamily="monospace">
              TSS: <tspan fill="#f8fafc" fontWeight="bold">{(liveTss * 0.4).toFixed(0)}</tspan> mg/L
            </text>
            <text x="12" y="118" fill="#64748b" fontSize="8" fontFamily="monospace">
              SOR: 28.4 m³/m²·d
            </text>

            {/* Sensor Tap 2 */}
            <g transform="translate(155, 90)">
              {isRunning && (
                <circle cx="0" cy="0" r="10" fill="none" stroke="#38bdf8" strokeWidth="1" opacity="0.6">
                  <animate attributeName="r" values="5;14" dur="2s" begin="0.2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.8;0" dur="2s" begin="0.2s" repeatCount="indefinite" />
                </circle>
              )}
              <circle cx="0" cy="0" r="8" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" />
              <circle cx="0" cy="0" r="3" fill="#38bdf8">
                {isRunning && <animate attributeName="opacity" values="0.4;1;0.4" dur="1s" begin="0.2s" repeatCount="indefinite" />}
              </circle>
              <text x="0" y="17" textAnchor="middle" fill="#38bdf8" fontSize="7.5" fontFamily="monospace" fontWeight="bold">
                SN-201
              </text>
            </g>
          </g>

          {/* Pipe: Basin 2 -> Basin 3 */}
          <path d="M 430 90 L 470 90" stroke="#475569" strokeWidth="4" />
          {isRunning && (
            <circle r="3" fill="#38bdf8">
              <animateMotion path="M 430 90 L 470 90" dur="1.2s" repeatCount="indefinite" />
            </circle>
          )}

          {/* Basin 3: Biological Aeration */}
          <g
            transform="translate(470, 25)"
            className="cursor-pointer"
            onClick={() => setSelectedNodeId('sensor-301')}
          >
            <rect
              width="190"
              height="125"
              rx="6"
              fill="url(#simAerationGrad)"
              stroke={
                selectedNodeId === 'sensor-301'
                  ? '#38bdf8'
                  : isAerationFailure
                  ? '#ef4444'
                  : '#78350f'
              }
              strokeWidth={selectedNodeId === 'sensor-301' ? '2.5' : isAerationFailure ? '2.5' : '1.5'}
              filter={selectedNodeId === 'sensor-301' ? 'url(#selectionGlow)' : undefined}
            />
            <rect x="6" y="6" width="178" height="18" rx="3" fill="#0f172a" fillOpacity="0.9" />
            <text x="12" y="19" fill="#f59e0b" fontSize="9" fontFamily="sans-serif" fontWeight="bold">
              3. BIOLOGICAL AERATION
            </text>

            {/* Blower Turbine Rotor */}
            <g transform="translate(160, 48)">
              <circle cx="0" cy="0" r="10" fill="#1e293b" stroke="#f59e0b" strokeWidth="1" />
              <g>
                {isRunning && !isAerationFailure && (
                  <animateTransform attributeName="transform" type="rotate" from="0 0 0" to="360 0 0" dur="1.5s" repeatCount="indefinite" />
                )}
                <line x1="0" y1="-7" x2="0" y2="7" stroke="#fbbf24" strokeWidth="2" />
                <line x1="-7" y1="0" x2="7" y2="0" stroke="#fbbf24" strokeWidth="2" />
              </g>
            </g>

            {/* Rising Bubbles */}
            {isRunning && !isAerationFailure && (
              <g>
                <circle cx="45" cy="90" r="2.5" fill="#fff" opacity="0.8">
                  <animate attributeName="cy" values="95;45" dur="1.8s" repeatCount="indefinite" />
                </circle>
                <circle cx="75" cy="90" r="3" fill="#fef08a" opacity="0.9">
                  <animate attributeName="cy" values="95;45" dur="1.8s" begin="0.4s" repeatCount="indefinite" />
                </circle>
                <circle cx="105" cy="90" r="2" fill="#fff" opacity="0.85">
                  <animate attributeName="cy" values="95;45" dur="1.8s" begin="0.8s" repeatCount="indefinite" />
                </circle>
              </g>
            )}

            <text x="12" y="98" fill="#94a3b8" fontSize="8.5" fontFamily="monospace">
              DO: <tspan fill={liveDo < 2.0 ? '#ef4444' : '#10b981'} fontWeight="bold">{liveDo.toFixed(2)}</tspan> mg/L
            </text>
            <text x="12" y="112" fill="#94a3b8" fontSize="8" fontFamily="monospace">
              MLSS: 2,580 mg/L
            </text>

            {/* Sensor Tap 3 */}
            <g transform="translate(160, 90)">
              {isRunning && (
                <circle cx="0" cy="0" r="10" fill="none" stroke="#f59e0b" strokeWidth="1" opacity="0.6">
                  <animate attributeName="r" values="5;14" dur="2s" begin="0.4s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.8;0" dur="2s" begin="0.4s" repeatCount="indefinite" />
                </circle>
              )}
              <circle cx="0" cy="0" r="8" fill="#1e293b" stroke="#f59e0b" strokeWidth="1.5" />
              <circle cx="0" cy="0" r="3" fill="#f59e0b">
                {isRunning && <animate attributeName="opacity" values="0.4;1;0.4" dur="1s" begin="0.4s" repeatCount="indefinite" />}
              </circle>
              <text x="0" y="17" textAnchor="middle" fill="#f59e0b" fontSize="7.5" fontFamily="monospace" fontWeight="bold">
                SN-301
              </text>
            </g>
          </g>

          {/* Pipe: Basin 3 -> Basin 4 */}
          <path d="M 660 90 L 700 90" stroke="#92400e" strokeWidth="4" />
          {isRunning && (
            <circle r="3" fill="#f59e0b">
              <animateMotion path="M 660 90 L 700 90" dur="1.2s" repeatCount="indefinite" />
            </circle>
          )}

          {/* Basin 4: Secondary Clarifier */}
          <g
            transform="translate(700, 25)"
            className="cursor-pointer"
            onClick={() => setSelectedNodeId('sensor-401')}
          >
            <rect
              width="180"
              height="125"
              rx="6"
              fill="#1e293b"
              stroke={selectedNodeId === 'sensor-401' ? '#38bdf8' : '#334155'}
              strokeWidth={selectedNodeId === 'sensor-401' ? '2.5' : '1.5'}
              filter={selectedNodeId === 'sensor-401' ? 'url(#selectionGlow)' : undefined}
            />
            <rect x="6" y="6" width="168" height="18" rx="3" fill="#0f172a" fillOpacity="0.9" />
            <text x="12" y="19" fill="#cbd5e1" fontSize="9" fontFamily="sans-serif" fontWeight="bold">
              4. SECONDARY DECANTER
            </text>

            {/* Sludge Blanket Interface Line */}
            <line x1="10" y1="78" x2="155" y2="78" stroke="#f59e0b" strokeWidth="1" strokeDasharray="3 2" />
            <text x="12" y="73" fill="#f59e0b" fontSize="7.5" fontFamily="monospace">
              BLANKET: 1.2m
            </text>

            <text x="12" y="105" fill="#94a3b8" fontSize="8.5" fontFamily="monospace">
              SVI: <tspan fill="#f8fafc" fontWeight="bold">110</tspan> mL/g
            </text>
            <text x="12" y="118" fill="#64748b" fontSize="8" fontFamily="monospace">
              RAS RATIO: 60%
            </text>

            {/* Sensor Tap 4 */}
            <g transform="translate(155, 90)">
              {isRunning && (
                <circle cx="0" cy="0" r="10" fill="none" stroke="#38bdf8" strokeWidth="1" opacity="0.6">
                  <animate attributeName="r" values="5;14" dur="2s" begin="0.6s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.8;0" dur="2s" begin="0.6s" repeatCount="indefinite" />
                </circle>
              )}
              <circle cx="0" cy="0" r="8" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" />
              <circle cx="0" cy="0" r="3" fill="#38bdf8">
                {isRunning && <animate attributeName="opacity" values="0.4;1;0.4" dur="1s" begin="0.6s" repeatCount="indefinite" />}
              </circle>
              <text x="0" y="17" textAnchor="middle" fill="#38bdf8" fontSize="7.5" fontFamily="monospace" fontWeight="bold">
                SN-401
              </text>
            </g>
          </g>

          {/* Pipe: Basin 4 -> Basin 5 */}
          <path d="M 880 90 L 915 90" stroke="#0284c7" strokeWidth="4" />
          {isRunning && (
            <circle r="3" fill="#38bdf8">
              <animateMotion path="M 880 90 L 915 90" dur="1.2s" repeatCount="indefinite" />
            </circle>
          )}

          {/* Basin 5: UV Effluent */}
          <g
            transform="translate(915, 25)"
            className="cursor-pointer"
            onClick={() => setSelectedNodeId('sensor-501')}
          >
            <rect
              width="155"
              height="125"
              rx="6"
              fill="url(#simEffluentGrad)"
              stroke={
                selectedNodeId === 'sensor-501'
                  ? '#38bdf8'
                  : effBod > 30 || isPhDrift
                  ? '#ef4444'
                  : '#0891b2'
              }
              strokeWidth={selectedNodeId === 'sensor-501' ? '2.5' : '1.5'}
              filter={selectedNodeId === 'sensor-501' ? 'url(#selectionGlow)' : undefined}
            />
            <rect x="6" y="6" width="143" height="18" rx="3" fill="#0f172a" fillOpacity="0.9" />
            <text x="12" y="19" fill="#38bdf8" fontSize="9" fontFamily="sans-serif" fontWeight="bold">
              5. UV EFFLUENT
            </text>

            {/* UV Lamps (Pulsing Purple) */}
            <rect x="35" y="42" width="60" height="3" rx="1.5" fill="#c084fc">
              {isRunning && <animate attributeName="opacity" values="0.4;1;0.4" dur="1.4s" repeatCount="indefinite" />}
            </rect>
            <rect x="35" y="52" width="60" height="3" rx="1.5" fill="#c084fc">
              {isRunning && <animate attributeName="opacity" values="0.4;1;0.4" dur="1.4s" begin="0.4s" repeatCount="indefinite" />}
            </rect>

            <text x="12" y="100" fill="#94a3b8" fontSize="8.5" fontFamily="monospace">
              BOD: <tspan fill={effBod > 30 ? '#ef4444' : '#34d399'} fontWeight="bold">{effBod.toFixed(1)}</tspan> mg/L
            </text>
            <text x="12" y="114" fill="#94a3b8" fontSize="8" fontFamily="monospace">
              pH: <tspan fill={isPhDrift ? '#ef4444' : '#38bdf8'} fontWeight="bold">{livePh.toFixed(2)}</tspan>
            </text>

            {/* Sensor Tap 5 */}
            <g transform="translate(130, 90)">
              {isRunning && (
                <circle cx="0" cy="0" r="10" fill="none" stroke="#34d399" strokeWidth="1" opacity="0.6">
                  <animate attributeName="r" values="5;14" dur="2s" begin="0.8s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.8;0" dur="2s" begin="0.8s" repeatCount="indefinite" />
                </circle>
              )}
              <circle cx="0" cy="0" r="8" fill="#1e293b" stroke="#34d399" strokeWidth="1.5" />
              <circle cx="0" cy="0" r="3" fill="#34d399">
                {isRunning && <animate attributeName="opacity" values="0.4;1;0.4" dur="1s" begin="0.8s" repeatCount="indefinite" />}
              </circle>
              <text x="0" y="17" textAnchor="middle" fill="#34d399" fontSize="7.5" fontFamily="monospace" fontWeight="bold">
                SN-501
              </text>
            </g>
          </g>

          {/* RAS Sludge Recycle Loop from Basin 4 back to Basin 3 */}
          <path
            d="M 780 150 L 780 168 L 560 168 L 560 150"
            fill="none"
            stroke="#92400e"
            strokeWidth="2.5"
            strokeDasharray="4 2"
          />
          {isRunning && (
            <circle r="2.5" fill="#f59e0b">
              <animateMotion
                path="M 780 150 L 780 168 L 560 168 L 560 150"
                dur="2.5s"
                repeatCount="indefinite"
              />
            </circle>
          )}
          <text x="670" y="178" fill="#f59e0b" fontSize="7" fontFamily="monospace" textAnchor="middle">
            RECYCLE ACTIVATED SLUDGE (RAS) LOOP: 6.0 MLD
          </text>

          {/* ========================================================= */}
          {/* LEVEL 2: TELEMETRY TRANSMISSION BUS & PACKET FLOW        */}
          {/* ========================================================= */}

          {/* Sensor Drop Lines down to the SCADA Bus */}
          <path d="M 185 140 L 185 200" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.6" />
          <path d="M 405 140 L 405 200" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.6" />
          <path d="M 630 140 L 630 200" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.6" />
          <path d="M 855 140 L 855 200" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.6" />
          <path d="M 1045 140 L 1045 200" stroke="#34d399" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.6" />

          {/* Master Telemetry Bus Channel */}
          <rect x="60" y="200" width="1000" height="10" rx="5" fill="#0f172a" stroke="#334155" strokeWidth="1.2" />
          <text x="560" y="208" fill="#64748b" fontSize="7.5" fontFamily="monospace" textAnchor="middle">
            SCADA TELEMETRY DATA BUS • REAL-TIME 1Hz SENSOR AGGREGATION
          </text>

          {/* Animated Telemetry Packets streaming along bus into Gateway Drop (x=150) */}
          {isRunning && (
            <>
              {/* Packet 1 from SN-101 */}
              <circle r="4" fill={isOrganicShock ? '#ef4444' : '#38bdf8'} filter="url(#packetGlow)">
                <animateMotion path="M 185 205 L 150 205" dur="0.6s" repeatCount="indefinite" />
              </circle>
              {/* Packet 2 from SN-201 */}
              <circle r="4" fill="#38bdf8" filter="url(#packetGlow)">
                <animateMotion path="M 405 205 L 150 205" dur="1.2s" begin="0.2s" repeatCount="indefinite" />
              </circle>
              {/* Packet 3 from SN-301 */}
              <circle r="4" fill={isAerationFailure ? '#ef4444' : '#f59e0b'} filter="url(#packetGlow)">
                <animateMotion path="M 630 205 L 150 205" dur="1.8s" begin="0.4s" repeatCount="indefinite" />
              </circle>
              {/* Packet 4 from SN-401 */}
              <circle r="4" fill="#38bdf8" filter="url(#packetGlow)">
                <animateMotion path="M 855 205 L 150 205" dur="2.3s" begin="0.6s" repeatCount="indefinite" />
              </circle>
              {/* Packet 5 from SN-501 */}
              <circle r="4" fill={effBod > 30 || isPhDrift ? '#ef4444' : '#34d399'} filter="url(#packetGlow)">
                <animateMotion path="M 1045 205 L 150 205" dur="2.8s" begin="0.8s" repeatCount="indefinite" />
              </circle>
            </>
          )}

          {/* ========================================================= */}
          {/* LEVEL 3: SCADA RTU GATEWAY & INGESTION PIPELINE BLOCKS   */}
          {/* ========================================================= */}

          {/* Drop link from Bus down to Edge RTU */}
          <path d="M 150 210 L 150 245" stroke="#38bdf8" strokeWidth="2.5" />
          {isRunning && (
            <circle r="3.5" fill="#38bdf8">
              <animateMotion path="M 150 210 L 150 245" dur="0.5s" repeatCount="indefinite" />
            </circle>
          )}

          {/* Node 1: Edge SCADA RTU Gateway */}
          <g
            transform="translate(40, 245)"
            className="cursor-pointer"
            onClick={() => setSelectedNodeId('gateway')}
          >
            <rect
              width="220"
              height="90"
              rx="6"
              fill="#0f172a"
              stroke={selectedNodeId === 'gateway' ? '#38bdf8' : '#38bdf8'}
              strokeWidth={selectedNodeId === 'gateway' ? '2.5' : '1.5'}
              filter={selectedNodeId === 'gateway' ? 'url(#selectionGlow)' : undefined}
            />
            <text x="14" y="22" fill="#38bdf8" fontSize="10" fontFamily="sans-serif" fontWeight="bold">
              SCADA EDGE RTU GATEWAY
            </text>
            <text x="14" y="40" fill="#94a3b8" fontSize="8.5" fontFamily="monospace">
              Cadence: 1Hz Polling • Queue: 0
            </text>
            <text x="14" y="55" fill="#94a3b8" fontSize="8.5" fontFamily="monospace">
              Status: <tspan fill="#34d399">{isRunning ? 'BROADCASTING' : 'STANDBY'}</tspan>
            </text>
            <text x="14" y="70" fill="#64748b" fontSize="8" fontFamily="monospace">
              Tx: {stepsGenerated} Frames ({stepsGenerated * 5} Readings)
            </text>
            <text x="14" y="82" fill="#38bdf8" fontSize="7.5" fontFamily="sans-serif">
              Bridge: Synthetic RTU ({activeFacilityName.slice(0, 18)})
            </text>
          </g>

          {/* Cable: RTU -> Ingestion Engine */}
          <path d="M 260 290 L 305 290" stroke="#475569" strokeWidth="3" />
          {isRunning && (
            <circle r="3" fill="#38bdf8">
              <animateMotion path="M 260 290 L 305 290" dur="0.5s" repeatCount="indefinite" />
            </circle>
          )}

          {/* Node 2: Ingestion & Validation Pipeline */}
          <g
            transform="translate(305, 245)"
            className="cursor-pointer"
            onClick={() => setSelectedNodeId('ingestion')}
          >
            <rect
              width="250"
              height="90"
              rx="6"
              fill="#0f172a"
              stroke={
                selectedNodeId === 'ingestion'
                  ? '#38bdf8'
                  : isAnomaly
                  ? '#f59e0b'
                  : '#10b981'
              }
              strokeWidth={selectedNodeId === 'ingestion' ? '2.5' : '1.5'}
              filter={selectedNodeId === 'ingestion' ? 'url(#selectionGlow)' : undefined}
            />
            <text x="14" y="22" fill="#10b981" fontSize="10" fontFamily="sans-serif" fontWeight="bold">
              INGESTION & VALIDATION ENGINE
            </text>
            <text x="14" y="40" fill="#94a3b8" fontSize="8.5" fontFamily="monospace">
              Checks: SCHEMA • AUTH • BOUNDS • ANOMALY
            </text>
            <text x="14" y="55" fill="#94a3b8" fontSize="8.5" fontFamily="monospace">
              Ingested: <tspan fill="#34d399" fontWeight="bold">{readingsIngested}</tspan> • Bounds:{' '}
              <tspan fill={isAnomaly ? '#ef4444' : '#10b981'} fontWeight="bold">
                {isAnomaly ? 'ALERT' : 'PASS'}
              </tspan>
            </text>
            <text x="14" y="70" fill="#64748b" fontSize="8" fontFamily="monospace">
              Latency: &lt;12ms • Digest: SHA-256 HMAC
            </text>
            <text x="14" y="82" fill="#10b981" fontSize="7.5" fontFamily="sans-serif">
              State Bus: Accepted Readings Dispatched
            </text>
          </g>

          {/* Cable: Ingestion -> Virtual Digital Twin */}
          <path d="M 555 290 L 600 290" stroke="#475569" strokeWidth="3" />
          {isRunning && (
            <circle r="3" fill="#10b981">
              <animateMotion path="M 555 290 L 600 290" dur="0.5s" repeatCount="indefinite" />
            </circle>
          )}

          {/* Node 3: Virtual STP Digital Twin */}
          <g
            transform="translate(600, 245)"
            className="cursor-pointer"
            onClick={() => setSelectedNodeId('digital_twin')}
          >
            <rect
              width="240"
              height="90"
              rx="6"
              fill="#0f172a"
              stroke={selectedNodeId === 'digital_twin' ? '#38bdf8' : '#6366f1'}
              strokeWidth={selectedNodeId === 'digital_twin' ? '2.5' : '1.5'}
              filter={selectedNodeId === 'digital_twin' ? 'url(#selectionGlow)' : undefined}
            />
            <text x="14" y="22" fill="#818cf8" fontSize="10" fontFamily="sans-serif" fontWeight="bold">
              VIRTUAL STP DIGITAL TWIN
            </text>
            <text x="14" y="40" fill="#94a3b8" fontSize="8.5" fontFamily="monospace">
              State: <tspan fill="#38bdf8" fontWeight="bold">v{stateVersion}</tspan> • {isRunning ? 'SYNCHRONIZED' : 'IDLE'}
            </text>
            <text x="14" y="55" fill="#94a3b8" fontSize="8.5" fontFamily="monospace">
              Kinetics: Monod Biological CSTR (1.0s)
            </text>
            <text x="14" y="70" fill="#64748b" fontSize="8" fontFamily="monospace">
              Stream: /facilities/twin/stream
            </text>
            <text x="14" y="82" fill="#818cf8" fontSize="7.5" fontFamily="sans-serif">
              Freshness: {isRunning ? 'FRESH (<1s)' : 'STALE'}
            </text>
          </g>

          {/* Cable: Twin -> DLT Store */}
          <path d="M 840 290 L 885 290" stroke="#475569" strokeWidth="3" />
          {isRunning && (
            <circle r="3" fill="#818cf8">
              <animateMotion path="M 840 290 L 885 290" dur="0.5s" repeatCount="indefinite" />
            </circle>
          )}

          {/* Node 4: Immutable Audit Trail & DLT Anchor */}
          <g
            transform="translate(885, 245)"
            className="cursor-pointer"
            onClick={() => setSelectedNodeId('audit_store')}
          >
            <rect
              width="180"
              height="90"
              rx="6"
              fill="#0f172a"
              stroke={selectedNodeId === 'audit_store' ? '#38bdf8' : '#0284c7'}
              strokeWidth={selectedNodeId === 'audit_store' ? '2.5' : '1.5'}
              filter={selectedNodeId === 'audit_store' ? 'url(#selectionGlow)' : undefined}
            />
            <text x="14" y="22" fill="#38bdf8" fontSize="10" fontFamily="sans-serif" fontWeight="bold">
              IMMUTABLE AUDIT / DLT
            </text>
            <text x="14" y="40" fill="#94a3b8" fontSize="8.5" fontFamily="monospace">
              Mode: SIMULATION SANDBOX
            </text>
            <text x="14" y="55" fill="#94a3b8" fontSize="8.5" fontFamily="monospace">
              Merkle Tree: SHA-256 Chain
            </text>
            <text x="14" y="70" fill="#64748b" fontSize="8" fontFamily="monospace">
              Batches: {Math.floor(stepsGenerated / 10)} Verified
            </text>
            <text x="14" y="82" fill="#34d399" fontSize="7.5" fontFamily="sans-serif">
              Ledger Contamination Guard: ON
            </text>
          </g>
        </svg>
      </div>

      {/* Real-Time Telemetry Gauges Ribbon */}
      <div className="bg-slate-900 border-t border-slate-800 p-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
        {/* Gauge 1: Inflow Rate */}
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5">
          <span className="text-[10px] text-slate-400 font-mono block">PLANT INFLOW</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-base font-bold font-mono text-slate-100">10.0</span>
            <span className="text-[10px] text-slate-500 font-mono">MLD</span>
          </div>
          <span className="text-[10px] text-emerald-400 font-mono mt-0.5 block">NOMINAL</span>
        </div>

        {/* Gauge 2: Influent BOD */}
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5">
          <span className="text-[10px] text-slate-400 font-mono block">RAW BOD</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className={`text-base font-bold font-mono ${isOrganicShock ? 'text-amber-400' : 'text-slate-100'}`}>
              {liveBod.toFixed(0)}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">mg/L</span>
          </div>
          <span className={`text-[10px] font-mono mt-0.5 block ${isOrganicShock ? 'text-amber-400' : 'text-emerald-400'}`}>
            {isOrganicShock ? 'SHOCK SPIKE' : 'NORMAL'}
          </span>
        </div>

        {/* Gauge 3: Influent COD */}
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5">
          <span className="text-[10px] text-slate-400 font-mono block">RAW COD</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className={`text-base font-bold font-mono ${isOrganicShock ? 'text-amber-400' : 'text-slate-100'}`}>
              {liveCod.toFixed(0)}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">mg/L</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">RATIO: 2.22</span>
        </div>

        {/* Gauge 4: Aeration DO */}
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5">
          <span className="text-[10px] text-slate-400 font-mono block">AERATION DO</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className={`text-base font-bold font-mono ${liveDo < 2.0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {liveDo.toFixed(2)}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">mg/L</span>
          </div>
          <span className={`text-[10px] font-mono mt-0.5 block ${liveDo < 2.0 ? 'text-rose-400' : 'text-emerald-400'}`}>
            {liveDo < 2.0 ? 'CRITICAL LOW' : 'SETPOINT OK'}
          </span>
        </div>

        {/* Gauge 5: Discharged BOD */}
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5">
          <span className="text-[10px] text-slate-400 font-mono block">EFFLUENT BOD</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className={`text-base font-bold font-mono ${effBod > 30 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {effBod.toFixed(1)}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">mg/L</span>
          </div>
          <span className={`text-[10px] font-mono mt-0.5 block ${effBod > 30 ? 'text-rose-400' : 'text-emerald-400'}`}>
            {effBod > 30 ? 'EXCEEDED' : 'PASS (≤30)'}
          </span>
        </div>

        {/* Gauge 6: Ingestion Latency */}
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5">
          <span className="text-[10px] text-slate-400 font-mono block">LATENCY</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-base font-bold font-mono text-sky-400">8.4</span>
            <span className="text-[10px] text-slate-500 font-mono">ms</span>
          </div>
          <span className="text-[10px] text-sky-400 font-mono mt-0.5 block">SHA-256 HMAC</span>
        </div>

        {/* Gauge 7: Validation Pass Rate */}
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5">
          <span className="text-[10px] text-slate-400 font-mono block">PASS RATE</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className={`text-base font-bold font-mono ${isAnomaly ? 'text-amber-400' : 'text-emerald-400'}`}>
              {isAnomaly ? '81.8%' : '99.8%'}
            </span>
          </div>
          <span className={`text-[10px] font-mono mt-0.5 block ${isAnomaly ? 'text-amber-400' : 'text-emerald-400'}`}>
            {isAnomaly ? 'OUTLIER FLAGGED' : 'OPTIMAL'}
          </span>
        </div>

        {/* Gauge 8: State Version */}
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5">
          <span className="text-[10px] text-slate-400 font-mono block">STATE VERSION</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-base font-bold font-mono text-indigo-400">v{stateVersion}</span>
          </div>
          <span className="text-[10px] text-indigo-400 font-mono mt-0.5 block">MONOTONIC</span>
        </div>
      </div>

      {/* Slide-Over Pipeline Node Inspector Drawer */}
      <PipelineNodeInspector
        selectedNodeId={selectedNodeId}
        onClose={() => setSelectedNodeId(null)}
        isRunning={isRunning}
        stepsGenerated={stepsGenerated}
        readingsIngested={readingsIngested}
        currentScenario={currentScenario}
        activeFacilityName={activeFacilityName}
        liveBod={liveBod}
        liveCod={liveCod}
        liveDo={liveDo}
        livePh={livePh}
        liveTss={liveTss}
        effBod={effBod}
      />
    </div>
  );
};
