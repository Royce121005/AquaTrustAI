import React, { useState, useRef } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Play,
  Pause,
  FastForward,
  Info,
  AlertTriangle,
  Flame,
  Activity,
  Wind,
  RotateCw,
  Sparkles,
} from 'lucide-react';
import { TwinState, TwinAlarmEvent, StageState } from '../../types/digitalTwin';
import './animations.css';

interface SynopticProcessFlowProps {
  twinState: TwinState | null;
  activeAlarms: TwinAlarmEvent[];
  selectedStageId: string | null;
  onSelectStage: (stageId: string) => void;
  isLoading?: boolean;
}

type AnimSpeed = 'normal' | 'fast' | 'slow' | 'paused';

export const SynopticProcessFlow: React.FC<SynopticProcessFlowProps> = ({
  twinState,
  activeAlarms,
  selectedStageId,
  onSelectStage,
  isLoading = false,
}) => {
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [animSpeed, setAnimSpeed] = useState<AnimSpeed>('normal');
  const [hoveredStage, setHoveredStage] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Helper to extract numeric value from stage parameter
  const getParam = (stageKey: string, paramKey: string): number | null => {
    if (!twinState?.stage_states) return null;
    const stage = twinState.stage_states[stageKey];
    if (!stage || !stage.parameters) return null;
    const p = stage.parameters[paramKey];
    if (p === null || p === undefined) return null;
    if (typeof p === 'number') return isNaN(p) ? null : p;
    if (typeof p === 'object' && 'value' in p) {
      const v = (p as { value?: unknown }).value;
      return typeof v === 'number' && !isNaN(v) ? v : null;
    }
    return null;
  };

  const getOperatingVar = (stageKey: string, varKey: string): number | null => {
    if (!twinState?.stage_states) return null;
    const stage = twinState.stage_states[stageKey];
    if (!stage || !stage.operating_variables) return null;
    const v = stage.operating_variables[varKey];
    if (typeof v === 'number') return isNaN(v) ? null : v;
    if (typeof v === 'string') {
      const parsed = parseFloat(v);
      return isNaN(parsed) ? null : parsed;
    }
    return null;
  };

  // Stage alarms filter
  const getStageAlarms = (stageKey: string): TwinAlarmEvent[] => {
    return activeAlarms.filter((a) => a.stage_id === stageKey && a.status !== 'resolved');
  };

  // Zoom / Pan handlers
  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.15, 2.0));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.15, 0.6));
  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Speed class for container
  const speedClass =
    animSpeed === 'paused'
      ? 'anim-paused'
      : animSpeed === 'fast'
      ? 'anim-fast'
      : animSpeed === 'slow'
      ? 'anim-slow'
      : '';

  // Stage metrics shortcuts
  const inletBod = getParam('inlet', 'bod') ?? 185.0;
  const inletTss = getParam('inlet', 'tss') ?? 210.0;
  const inletCod = getParam('inlet', 'cod') ?? 410.0;
  const inletPh = getParam('inlet', 'ph') ?? 7.4;

  const priBod = getParam('primary_clarifier', 'bod') ?? 146.2;
  const priTss = getParam('primary_clarifier', 'tss') ?? 84.0;

  const aerBod = getParam('biological_aeration', 'bod') ?? 22.7;
  const aerDo = getOperatingVar('biological_aeration', 'do_mg_l') ?? 2.0;
  const aerTss = getParam('biological_aeration', 'tss') ?? 2580.0;

  const secBod = getParam('secondary_clarifier', 'bod') ?? 20.8;
  const secTss = getParam('secondary_clarifier', 'tss') ?? 10.4;

  const effBod = getParam('final_effluent', 'bod') ?? 20.8;
  const effCod = getParam('final_effluent', 'cod') ?? 70.6;
  const effTss = getParam('final_effluent', 'tss') ?? 10.4;
  const effPh = getParam('final_effluent', 'ph') ?? 7.34;

  const inletAlarms = getStageAlarms('inlet');
  const priAlarms = getStageAlarms('primary_clarifier');
  const aerAlarms = getStageAlarms('biological_aeration');
  const secAlarms = getStageAlarms('secondary_clarifier');
  const effAlarms = getStageAlarms('final_effluent');

  return (
    <div className={`relative bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl select-none ${speedClass}`}>
      {/* Top SCADA Control Overlay */}
      <div className="absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Left: Diagram Title & State Indicator */}
        <div className="flex items-center gap-2 pointer-events-auto bg-slate-900/90 backdrop-blur border border-slate-700/80 px-3 py-1.5 rounded-lg shadow-md text-xs">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-mono font-semibold tracking-wider text-slate-200 uppercase">
            STP 5-Stage Synoptic Process Flow
          </span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-400 font-mono">
            v{twinState?.state_version ?? 1}
          </span>
        </div>

        {/* Right: Zoom / Pan & Animation Speed Controls */}
        <div className="flex items-center gap-1.5 pointer-events-auto bg-slate-900/90 backdrop-blur border border-slate-700/80 p-1 rounded-lg shadow-md">
          {/* Speed Toggle */}
          <button
            onClick={() => {
              if (animSpeed === 'normal') setAnimSpeed('fast');
              else if (animSpeed === 'fast') setAnimSpeed('slow');
              else if (animSpeed === 'slow') setAnimSpeed('paused');
              else setAnimSpeed('normal');
            }}
            title={`Animation Speed: ${animSpeed.toUpperCase()}`}
            className="flex items-center gap-1 px-2 py-1 text-xs font-mono font-medium rounded hover:bg-slate-800 text-slate-300 transition-colors"
          >
            {animSpeed === 'paused' ? (
              <>
                <Pause className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-amber-400">0x</span>
              </>
            ) : animSpeed === 'fast' ? (
              <>
                <FastForward className="w-3.5 h-3.5 text-sky-400" />
                <span className="text-sky-400">2x</span>
              </>
            ) : animSpeed === 'slow' ? (
              <>
                <Play className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-400">0.5x</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">1x</span>
              </>
            )}
          </button>

          <div className="h-4 w-px bg-slate-700" />

          {/* Zoom controls */}
          <button
            onClick={handleZoomIn}
            title="Zoom In"
            className="p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleZoomOut}
            title="Zoom Out"
            className="p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleResetView}
            title="Reset View"
            className="p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Interactive SVG Canvas */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`w-full overflow-hidden ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{ minHeight: '440px', height: '480px' }}
      >
        <svg
          viewBox="0 0 1220 460"
          className="w-full h-full transition-transform duration-75 ease-out"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
          }}
        >
          <defs>
            {/* Background Grid Pattern */}
            <pattern id="scadaGrid" width="30" height="30" patternUnits="userSpaceOnUse">
              <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#1e293b" strokeWidth="0.75" strokeOpacity="0.4" />
            </pattern>

            {/* Glowing filter for selected tanks */}
            <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Gradients for tanks */}
            <linearGradient id="gradInlet" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#334155" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#1e293b" stopOpacity="0.9" />
            </linearGradient>

            <linearGradient id="gradPrimary" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#334155" stopOpacity="0.8" />
              <stop offset="60%" stopColor="#1e293b" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0.95" />
            </linearGradient>

            <linearGradient id="gradAeration" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#92400e" stopOpacity="0.85" />
              <stop offset="50%" stopColor="#78350f" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#451a03" stopOpacity="0.95" />
            </linearGradient>

            <linearGradient id="gradSecondary" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0284c7" stopOpacity="0.6" />
              <stop offset="45%" stopColor="#0369a1" stopOpacity="0.7" />
              <stop offset="75%" stopColor="#78350f" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#451a03" stopOpacity="0.95" />
            </linearGradient>

            <linearGradient id="gradEffluent" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#0e7490" stopOpacity="0.9" />
            </linearGradient>

            {/* Pipe Flow Arrow Markers */}
            <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#38bdf8" />
            </marker>
            <marker id="arrowRas" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#f59e0b" />
            </marker>
          </defs>

          {/* Canvas Background & SCADA Grid */}
          <rect width="1220" height="460" fill="#0b1120" />
          <rect width="1220" height="460" fill="url(#scadaGrid)" />

          {/* ========================================================= */}
          {/* INTER-STAGE PIPING NETWORKS (DRAWN BEHIND TANKS)          */}
          {/* ========================================================= */}

          {/* 1. Raw Inflow into Stage 1 */}
          <path d="M 0 200 L 40 200" stroke="#64748b" strokeWidth="6" strokeLinecap="round" />
          <path d="M 0 200 L 40 200" stroke="#94a3b8" strokeWidth="2" className="pipe-flow" />

          {/* 2. Pipe: Inlet -> Primary Clarifier */}
          <path d="M 195 200 L 255 200" stroke="#475569" strokeWidth="6" strokeLinecap="round" />
          <path d="M 195 200 L 255 200" stroke="#38bdf8" strokeWidth="2.5" className="pipe-flow" />

          {/* 3. Pipe: Primary Clarifier Weir Overflow -> Aeration Basin */}
          <path d="M 425 180 L 485 180" stroke="#475569" strokeWidth="6" strokeLinecap="round" />
          <path d="M 425 180 L 485 180" stroke="#38bdf8" strokeWidth="2.5" className="pipe-flow" />

          {/* 4. Pipe: Aeration Basin Mixed Liquor -> Secondary Clarifier */}
          <path d="M 705 210 L 765 210" stroke="#92400e" strokeWidth="6" strokeLinecap="round" />
          <path d="M 705 210 L 765 210" stroke="#fbbf24" strokeWidth="2.5" className="pipe-flow" />

          {/* 5. Pipe: Secondary Clarifier Overflow -> Final Disinfection */}
          <path d="M 945 180 L 1005 180" stroke="#0284c7" strokeWidth="6" strokeLinecap="round" />
          <path d="M 945 180 L 1005 180" stroke="#38bdf8" strokeWidth="2.5" className="pipe-flow" />

          {/* 6. RAS RECYCLE LOOP: Secondary Clarifier Bottom Hopper -> Aeration Basin */}
          {/* Starts at Sec Clarifier Hopper (855, 360), drops to y: 415, runs left to x: 595, rises into Aeration (595, 335) */}
          <path
            d="M 855 355 L 855 415 L 595 415 L 595 335"
            fill="none"
            stroke="#78350f"
            strokeWidth="5"
            strokeLinejoin="round"
          />
          <path
            d="M 855 355 L 855 415 L 595 415 L 595 335"
            fill="none"
            stroke="#f59e0b"
            strokeWidth="2.5"
            className="pipe-flow-ras"
            markerEnd="url(#arrowRas)"
          />
          {/* RAS Pump Glyph */}
          <g transform="translate(710, 403)">
            <circle cx="12" cy="12" r="10" fill="#1e293b" stroke="#f59e0b" strokeWidth="1.5" />
            <path d="M 7 12 L 17 8 L 17 16 Z" fill="#f59e0b" />
            <text x="12" y="27" textAnchor="middle" fill="#f59e0b" fontSize="8" fontFamily="monospace" fontWeight="bold">
              RAS PUMP
            </text>
          </g>

          {/* 7. Outflow Gates from Final Effluent */}
          {/* Reuse Gate (Top branch to Irrigation/Cooling) */}
          <path d="M 1165 170 L 1215 140" stroke="#06b6d4" strokeWidth="4" />
          <path d="M 1165 170 L 1215 140" stroke="#67e8f9" strokeWidth="2" className="pipe-flow" markerEnd="url(#arrow)" />
          {/* Discharge Outfall (Bottom branch to River Corridor) */}
          <path d="M 1165 210 L 1215 240" stroke="#0284c7" strokeWidth="4" />
          <path d="M 1165 210 L 1215 240" stroke="#38bdf8" strokeWidth="2" className="pipe-flow" markerEnd="url(#arrow)" />

          {/* Labels for Outflows */}
          <text x="1215" y="132" textAnchor="end" fill="#34d399" fontSize="9" fontFamily="monospace" fontWeight="bold">
            REUSE GATE [SAFE]
          </text>
          <text x="1215" y="255" textAnchor="end" fill="#38bdf8" fontSize="9" fontFamily="monospace" fontWeight="bold">
            OUTFALL CORRIDOR
          </text>

          {/* ========================================================= */}
          {/* STAGE 1: RAW INFLUENT INLET & BAR SCREEN                  */}
          {/* ========================================================= */}
          <g
            id="stage-inlet"
            onClick={() => onSelectStage('inlet')}
            onMouseEnter={() => setHoveredStage('inlet')}
            onMouseLeave={() => setHoveredStage(null)}
            className="cursor-pointer transition-all duration-200"
          >
            {/* Stage Tank Shell */}
            <rect
              x="40"
              y="120"
              width="155"
              height="215"
              rx="8"
              fill="url(#gradInlet)"
              stroke={selectedStageId === 'inlet' ? '#38bdf8' : hoveredStage === 'inlet' ? '#64748b' : '#334155'}
              strokeWidth={selectedStageId === 'inlet' ? '3' : '1.5'}
              filter={selectedStageId === 'inlet' ? 'url(#neonGlow)' : undefined}
            />

            {/* Tank Header Pill */}
            <rect x="48" y="128" width="139" height="22" rx="4" fill="#0f172a" fillOpacity="0.85" />
            <text x="56" y="143" fill="#94a3b8" fontSize="10" fontFamily="sans-serif" fontWeight="bold">
              1. RAW INFLUENT
            </text>

            {/* Bar Screen Grating */}
            <g transform="translate(68, 160)">
              <rect x="0" y="0" width="4" height="85" fill="#475569" />
              <rect x="10" y="0" width="4" height="85" fill="#475569" />
              <rect x="20" y="0" width="4" height="85" fill="#475569" />
              <rect x="30" y="0" width="4" height="85" fill="#475569" />
              <line x1="-5" y1="20" x2="35" y2="20" stroke="#64748b" strokeWidth="2" />
              <line x1="-5" y1="65" x2="35" y2="65" stroke="#64748b" strokeWidth="2" />
            </g>

            {/* Debris / Grit Particles */}
            <circle cx="60" cy="180" r="3" fill="#94a3b8" opacity="0.6" />
            <circle cx="55" cy="215" r="2.5" fill="#64748b" opacity="0.7" />
            <circle cx="63" cy="235" r="3.5" fill="#475569" opacity="0.8" />

            {/* Telemetry Metric Readouts */}
            <g transform="translate(48, 255)">
              <rect x="0" y="0" width="139" height="72" rx="4" fill="#020617" fillOpacity="0.75" />
              <text x="8" y="16" fill="#94a3b8" fontSize="9" fontFamily="monospace">
                BOD: <tspan fill="#f8fafc" fontWeight="bold">{inletBod.toFixed(1)}</tspan> mg/L
              </text>
              <text x="8" y="32" fill="#94a3b8" fontSize="9" fontFamily="monospace">
                COD: <tspan fill="#f8fafc" fontWeight="bold">{inletCod.toFixed(1)}</tspan> mg/L
              </text>
              <text x="8" y="48" fill="#94a3b8" fontSize="9" fontFamily="monospace">
                TSS: <tspan fill="#f8fafc" fontWeight="bold">{inletTss.toFixed(1)}</tspan> mg/L
              </text>
              <text x="8" y="64" fill="#94a3b8" fontSize="9" fontFamily="monospace">
                pH:  <tspan fill="#38bdf8" fontWeight="bold">{inletPh.toFixed(2)}</tspan>
              </text>
            </g>

            {/* Alarm Badge Indicator */}
            {inletAlarms.length > 0 && (
              <g transform="translate(175, 115)">
                <circle cx="0" cy="0" r="10" fill="#ef4444" className="scada-radar" />
                <circle cx="0" cy="0" r="7" fill="#dc2626" />
                <text x="0" y="3" textAnchor="middle" fill="#fff" fontSize="8" fontWeight="bold">
                  {inletAlarms.length}
                </text>
              </g>
            )}
          </g>

          {/* ========================================================= */}
          {/* STAGE 2: PRIMARY CLARIFIER (CONICAL HOPPER & WEIR)        */}
          {/* ========================================================= */}
          <g
            id="stage-primary-clarifier"
            onClick={() => onSelectStage('primary_clarifier')}
            onMouseEnter={() => setHoveredStage('primary_clarifier')}
            onMouseLeave={() => setHoveredStage(null)}
            className="cursor-pointer transition-all duration-200"
          >
            {/* Conical Hopper Tank Polygon */}
            <path
              d="M 255 120 L 425 120 L 425 280 L 350 355 L 330 355 L 255 280 Z"
              fill="url(#gradPrimary)"
              stroke={selectedStageId === 'primary_clarifier' ? '#38bdf8' : hoveredStage === 'primary_clarifier' ? '#64748b' : '#334155'}
              strokeWidth={selectedStageId === 'primary_clarifier' ? '3' : '1.5'}
              filter={selectedStageId === 'primary_clarifier' ? 'url(#neonGlow)' : undefined}
            />

            {/* Header Pill */}
            <rect x="263" y="128" width="154" height="22" rx="4" fill="#0f172a" fillOpacity="0.85" />
            <text x="271" y="143" fill="#94a3b8" fontSize="10" fontFamily="sans-serif" fontWeight="bold">
              2. PRIMARY CLARIFIER
            </text>

            {/* V-Notch Weir Crest Teeth at Top-Right */}
            <path
              d="M 405 160 L 409 166 L 413 160 L 417 166 L 421 160 L 425 166"
              fill="none"
              stroke="#64748b"
              strokeWidth="1.5"
            />

            {/* Settling Sludge Floc Particles */}
            <g className="scada-sludge" style={{ transformOrigin: '340px 180px' }}>
              <circle cx="310" cy="180" r="3" fill="#64748b" opacity="0.8" />
              <circle cx="340" cy="195" r="2.5" fill="#475569" opacity="0.9" />
              <circle cx="370" cy="175" r="3.5" fill="#64748b" opacity="0.7" />
              <circle cx="325" cy="220" r="2" fill="#475569" opacity="0.8" />
              <circle cx="355" cy="235" r="3" fill="#334155" opacity="0.9" />
            </g>

            {/* Bottom Sludge Hopper Drawoff Valve */}
            <rect x="333" y="355" width="14" height="15" fill="#334155" stroke="#475569" strokeWidth="1" />
            <line x1="340" y1="370" x2="340" y2="390" stroke="#475569" strokeWidth="3" />

            {/* Telemetry Readouts */}
            <g transform="translate(263, 260)">
              <rect x="0" y="0" width="154" height="52" rx="4" fill="#020617" fillOpacity="0.75" />
              <text x="8" y="16" fill="#94a3b8" fontSize="9" fontFamily="monospace">
                Clarified BOD: <tspan fill="#f8fafc" fontWeight="bold">{priBod.toFixed(1)}</tspan> mg/L
              </text>
              <text x="8" y="32" fill="#94a3b8" fontSize="9" fontFamily="monospace">
                Settled TSS:   <tspan fill="#f8fafc" fontWeight="bold">{priTss.toFixed(1)}</tspan> mg/L
              </text>
              <text x="8" y="46" fill="#10b981" fontSize="8" fontFamily="monospace">
                TSS Removal: ~60%
              </text>
            </g>

            {/* Alarms */}
            {priAlarms.length > 0 && (
              <g transform="translate(415, 115)">
                <circle cx="0" cy="0" r="10" fill="#f59e0b" className="scada-radar" />
                <circle cx="0" cy="0" r="7" fill="#d97706" />
                <text x="0" y="3" textAnchor="middle" fill="#fff" fontSize="8" fontWeight="bold">
                  {priAlarms.length}
                </text>
              </g>
            )}
          </g>

          {/* ========================================================= */}
          {/* STAGE 3: BIOLOGICAL AERATION BASIN (DIFFUSERS & TURBINE)  */}
          {/* ========================================================= */}
          <g
            id="stage-biological-aeration"
            onClick={() => onSelectStage('biological_aeration')}
            onMouseEnter={() => setHoveredStage('biological_aeration')}
            onMouseLeave={() => setHoveredStage(null)}
            className="cursor-pointer transition-all duration-200"
          >
            {/* Main Aeration Tank */}
            <rect
              x="485"
              y="120"
              width="220"
              height="215"
              rx="8"
              fill="url(#gradAeration)"
              stroke={selectedStageId === 'biological_aeration' ? '#38bdf8' : hoveredStage === 'biological_aeration' ? '#d97706' : '#78350f'}
              strokeWidth={selectedStageId === 'biological_aeration' ? '3' : '1.5'}
              filter={selectedStageId === 'biological_aeration' ? 'url(#neonGlow)' : undefined}
            />

            {/* Header Pill */}
            <rect x="493" y="128" width="204" height="22" rx="4" fill="#0f172a" fillOpacity="0.85" />
            <text x="501" y="143" fill="#f59e0b" fontSize="10" fontFamily="sans-serif" fontWeight="bold">
              3. BIOLOGICAL AERATION (CSTR)
            </text>

            {/* Rotating Blower Turbine Icon */}
            <g transform="translate(670, 165)">
              <circle cx="0" cy="0" r="14" fill="#1e293b" stroke="#f59e0b" strokeWidth="1.5" />
              <g className="scada-turbine">
                <line x1="0" y1="-10" x2="0" y2="10" stroke="#fbbf24" strokeWidth="2.5" />
                <line x1="-10" y1="0" x2="10" y2="0" stroke="#fbbf24" strokeWidth="2.5" />
                <line x1="-7" y1="-7" x2="7" y2="7" stroke="#fbbf24" strokeWidth="2" />
                <line x1="-7" y1="7" x2="7" y2="-7" stroke="#fbbf24" strokeWidth="2" />
              </g>
              <circle cx="0" cy="0" r="3" fill="#f59e0b" />
            </g>

            {/* Bottom Aeration Diffuser Grid */}
            <g transform="translate(505, 315)">
              <line x1="0" y1="0" x2="180" y2="0" stroke="#78350f" strokeWidth="4" />
              <circle cx="20" cy="0" r="3" fill="#f59e0b" />
              <circle cx="50" cy="0" r="3" fill="#f59e0b" />
              <circle cx="80" cy="0" r="3" fill="#f59e0b" />
              <circle cx="110" cy="0" r="3" fill="#f59e0b" />
              <circle cx="140" cy="0" r="3" fill="#f59e0b" />
              <circle cx="160" cy="0" r="3" fill="#f59e0b" />
            </g>

            {/* Rising Micro-Bubbles */}
            <g className="scada-bubble" style={{ transformOrigin: '595px 230px' }}>
              <circle cx="525" cy="290" r="2.5" fill="#fef08a" opacity="0.8" />
              <circle cx="535" cy="250" r="3" fill="#fff" opacity="0.9" />
              <circle cx="555" cy="275" r="2" fill="#fef08a" opacity="0.7" />
              <circle cx="565" cy="230" r="3.5" fill="#fff" opacity="0.85" />
              <circle cx="585" cy="285" r="2.5" fill="#fef08a" opacity="0.9" />
              <circle cx="595" cy="240" r="3" fill="#fff" opacity="0.8" />
              <circle cx="615" cy="270" r="2.5" fill="#fef08a" opacity="0.8" />
              <circle cx="635" cy="235" r="3.5" fill="#fff" opacity="0.9" />
              <circle cx="645" cy="280" r="2" fill="#fef08a" opacity="0.75" />
              <circle cx="665" cy="245" r="3" fill="#fff" opacity="0.85" />
            </g>

            {/* Telemetry Readouts */}
            <g transform="translate(493, 175)">
              <rect x="0" y="0" width="165" height="66" rx="4" fill="#020617" fillOpacity="0.8" />
              <text x="8" y="16" fill="#94a3b8" fontSize="9" fontFamily="monospace">
                DO Conc:  <tspan fill={aerDo < 2.0 ? '#ef4444' : '#10b981'} fontWeight="bold">{aerDo.toFixed(2)}</tspan> mg/L
              </text>
              <text x="8" y="32" fill="#94a3b8" fontSize="9" fontFamily="monospace">
                MLSS/TSS: <tspan fill="#f8fafc" fontWeight="bold">{aerTss.toFixed(0)}</tspan> mg/L
              </text>
              <text x="8" y="48" fill="#94a3b8" fontSize="9" fontFamily="monospace">
                Stage BOD: <tspan fill="#f8fafc" fontWeight="bold">{aerBod.toFixed(1)}</tspan> mg/L
              </text>
              <text x="8" y="60" fill="#f59e0b" fontSize="8" fontFamily="monospace">
                Nitrification: ACTIVE
              </text>
            </g>

            {/* Alarms */}
            {aerAlarms.length > 0 && (
              <g transform="translate(695, 115)">
                <circle cx="0" cy="0" r="10" fill="#ef4444" className="scada-radar" />
                <circle cx="0" cy="0" r="7" fill="#dc2626" />
                <text x="0" y="3" textAnchor="middle" fill="#fff" fontSize="8" fontWeight="bold">
                  {aerAlarms.length}
                </text>
              </g>
            )}
          </g>

          {/* ========================================================= */}
          {/* STAGE 4: SECONDARY CLARIFIER (BIOMASS SEPARATION & RAS)   */}
          {/* ========================================================= */}
          <g
            id="stage-secondary-clarifier"
            onClick={() => onSelectStage('secondary_clarifier')}
            onMouseEnter={() => setHoveredStage('secondary_clarifier')}
            onMouseLeave={() => setHoveredStage(null)}
            className="cursor-pointer transition-all duration-200"
          >
            {/* Conical Tank Polygon */}
            <path
              d="M 765 120 L 945 120 L 945 280 L 865 355 L 845 355 L 765 280 Z"
              fill="url(#gradSecondary)"
              stroke={selectedStageId === 'secondary_clarifier' ? '#38bdf8' : hoveredStage === 'secondary_clarifier' ? '#64748b' : '#334155'}
              strokeWidth={selectedStageId === 'secondary_clarifier' ? '3' : '1.5'}
              filter={selectedStageId === 'secondary_clarifier' ? 'url(#neonGlow)' : undefined}
            />

            {/* Header Pill */}
            <rect x="773" y="128" width="164" height="22" rx="4" fill="#0f172a" fillOpacity="0.85" />
            <text x="781" y="143" fill="#94a3b8" fontSize="10" fontFamily="sans-serif" fontWeight="bold">
              4. SECONDARY CLARIFIER
            </text>

            {/* Center Feed Well Column */}
            <rect x="847" y="150" width="16" height="55" fill="#1e293b" stroke="#334155" strokeWidth="1" />

            {/* Sludge Blanket Level Indicator Line */}
            <line x1="770" y1="260" x2="940" y2="260" stroke="#f59e0b" strokeWidth="1" strokeDasharray="3 3" opacity="0.7" />
            <text x="775" y="255" fill="#f59e0b" fontSize="7.5" fontFamily="monospace">
              SLUDGE BLANKET
            </text>

            {/* Telemetry Readouts */}
            <g transform="translate(773, 268)">
              <rect x="0" y="0" width="164" height="52" rx="4" fill="#020617" fillOpacity="0.75" />
              <text x="8" y="16" fill="#94a3b8" fontSize="9" fontFamily="monospace">
                Effluent BOD: <tspan fill="#f8fafc" fontWeight="bold">{secBod.toFixed(1)}</tspan> mg/L
              </text>
              <text x="8" y="32" fill="#94a3b8" fontSize="9" fontFamily="monospace">
                Clarified TSS: <tspan fill="#f8fafc" fontWeight="bold">{secTss.toFixed(1)}</tspan> mg/L
              </text>
              <text x="8" y="46" fill="#38bdf8" fontSize="8" fontFamily="monospace">
                RAS Recycle: 0.85 MLD
              </text>
            </g>

            {/* Alarms */}
            {secAlarms.length > 0 && (
              <g transform="translate(935, 115)">
                <circle cx="0" cy="0" r="10" fill="#f59e0b" className="scada-radar" />
                <circle cx="0" cy="0" r="7" fill="#d97706" />
                <text x="0" y="3" textAnchor="middle" fill="#fff" fontSize="8" fontWeight="bold">
                  {secAlarms.length}
                </text>
              </g>
            )}
          </g>

          {/* ========================================================= */}
          {/* STAGE 5: DISINFECTION & FINAL EFFLUENT                    */}
          {/* ========================================================= */}
          <g
            id="stage-final-effluent"
            onClick={() => onSelectStage('final_effluent')}
            onMouseEnter={() => setHoveredStage('final_effluent')}
            onMouseLeave={() => setHoveredStage(null)}
            className="cursor-pointer transition-all duration-200"
          >
            {/* Basin Shell */}
            <rect
              x="1005"
              y="120"
              width="160"
              height="215"
              rx="8"
              fill="url(#gradEffluent)"
              stroke={selectedStageId === 'final_effluent' ? '#38bdf8' : hoveredStage === 'final_effluent' ? '#06b6d4' : '#0891b2'}
              strokeWidth={selectedStageId === 'final_effluent' ? '3' : '1.5'}
              filter={selectedStageId === 'final_effluent' ? 'url(#neonGlow)' : undefined}
            />

            {/* Header Pill */}
            <rect x="1013" y="128" width="144" height="22" rx="4" fill="#0f172a" fillOpacity="0.85" />
            <text x="1021" y="143" fill="#38bdf8" fontSize="10" fontFamily="sans-serif" fontWeight="bold">
              5. FINAL EFFLUENT (UV)
            </text>

            {/* UV Disinfection Lamps (Neon Purple Glow Bars) */}
            <g transform="translate(1040, 160)">
              <rect x="0" y="0" width="80" height="4" rx="2" fill="#c084fc" filter="drop-shadow(0 0 4px #a855f7)" />
              <rect x="0" y="16" width="80" height="4" rx="2" fill="#c084fc" filter="drop-shadow(0 0 4px #a855f7)" />
              <rect x="0" y="32" width="80" height="4" rx="2" fill="#c084fc" filter="drop-shadow(0 0 4px #a855f7)" />
            </g>

            {/* Surface Ripple Waves */}
            <g className="scada-wave" style={{ transformOrigin: '1085px 220px' }}>
              <path
                d="M 1025 210 Q 1045 206 1065 210 T 1105 210 T 1145 210"
                fill="none"
                stroke="#a5f3fc"
                strokeWidth="1.5"
                opacity="0.8"
              />
              <path
                d="M 1030 220 Q 1050 216 1070 220 T 1110 220 T 1150 220"
                fill="none"
                stroke="#67e8f9"
                strokeWidth="1.2"
                opacity="0.6"
              />
            </g>

            {/* Telemetry Readouts */}
            <g transform="translate(1013, 245)">
              <rect x="0" y="0" width="144" height="82" rx="4" fill="#020617" fillOpacity="0.8" />
              <text x="8" y="16" fill="#94a3b8" fontSize="9" fontFamily="monospace">
                BOD: <tspan fill={effBod > 30 ? '#ef4444' : '#34d399'} fontWeight="bold">{effBod.toFixed(1)}</tspan> mg/L
              </text>
              <text x="8" y="32" fill="#94a3b8" fontSize="9" fontFamily="monospace">
                COD: <tspan fill={effCod > 250 ? '#ef4444' : '#34d399'} fontWeight="bold">{effCod.toFixed(1)}</tspan> mg/L
              </text>
              <text x="8" y="48" fill="#94a3b8" fontSize="9" fontFamily="monospace">
                TSS: <tspan fill={effTss > 50 ? '#ef4444' : '#34d399'} fontWeight="bold">{effTss.toFixed(1)}</tspan> mg/L
              </text>
              <text x="8" y="64" fill="#94a3b8" fontSize="9" fontFamily="monospace">
                pH:  <tspan fill="#38bdf8" fontWeight="bold">{effPh.toFixed(2)}</tspan>
              </text>
              <text x="8" y="76" fill="#10b981" fontSize="8" fontFamily="monospace" fontWeight="bold">
                CPCB DISCHARGE: PASS
              </text>
            </g>

            {/* Alarms */}
            {effAlarms.length > 0 && (
              <g transform="translate(1155, 115)">
                <circle cx="0" cy="0" r="10" fill="#ef4444" className="scada-radar" />
                <circle cx="0" cy="0" r="7" fill="#dc2626" />
                <text x="0" y="3" textAnchor="middle" fill="#fff" fontSize="8" fontWeight="bold">
                  {effAlarms.length}
                </text>
              </g>
            )}
          </g>
        </svg>
      </div>

      {/* Bottom Industrial Synoptic Legend */}
      <div className="bg-slate-900/95 border-t border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-400">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="flex items-center gap-1.5 font-medium text-slate-300">
            <span className="w-4 h-0.5 bg-sky-400 inline-block"></span> Fluid Process Flow
          </span>
          <span className="flex items-center gap-1.5 font-medium text-amber-400">
            <span className="w-4 h-0.5 bg-amber-400 inline-block"></span> Return Sludge (RAS) Loop
          </span>
          <span className="flex items-center gap-1.5 font-medium text-purple-300">
            <Sparkles className="w-3 h-3 text-purple-400 inline" /> UV Disinfection
          </span>
          <span className="flex items-center gap-1.5 font-medium text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span> CPCB Standard Norms
          </span>
        </div>

        <div className="flex items-center gap-2 text-slate-500 font-mono text-[10px]">
          <span>CLICK ANY TANK TO INSPECT TELEMETRY & KINETICS</span>
        </div>
      </div>
    </div>
  );
};
