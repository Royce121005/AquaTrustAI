import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Play,
  Pause,
  FastForward,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { TwinState, TwinAlarmEvent } from '../../types/digitalTwin';
import {
  ScadaPipe,
  ScadaPump,
  ScadaBlower,
  ScadaTerminalStation,
  ScadaLegend,
} from './scada/ScadaPrimitives';
import { InletScreeningStage } from './scada/InletScreeningStage';
import { PrimaryClarifierStage } from './scada/PrimaryClarifierStage';
import { AerationBasinStage } from './scada/AerationBasinStage';
import { SecondaryClarifierStage } from './scada/SecondaryClarifierStage';
import { EffluentUvStage } from './scada/EffluentUvStage';
import './animations.css';

interface SynopticProcessFlowProps {
  twinState: TwinState | null;
  activeAlarms: TwinAlarmEvent[];
  selectedStageId: string | null;
  onSelectStage: (stageId: string) => void;
  isLoading?: boolean;
  isRunning?: boolean;
}

type AnimSpeed = 'normal' | 'fast' | 'slow' | 'paused';

const STAGE_ORDER = ['inlet', 'primary_clarifier', 'biological_aeration', 'secondary_clarifier', 'final_effluent'];

export const SynopticProcessFlow: React.FC<SynopticProcessFlowProps> = ({
  twinState,
  activeAlarms,
  selectedStageId,
  onSelectStage,
  isLoading = false,
  isRunning,
}) => {
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [animSpeed, setAnimSpeed] = useState<AnimSpeed>('normal');
  const [hoveredStage, setHoveredStage] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Check reduced motion preference safely (supporting JSDOM / SSR)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(false);
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    try {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(mediaQuery.matches);
      const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    } catch {
      // Ignore in environments without full matchMedia event support
    }
  }, []);

  // Determine engine lifecycle state: running if isRunning=true or lifecycle_state==='running'
  const engineRunning = isRunning !== undefined
    ? isRunning
    : (twinState?.engine_status?.lifecycle_state === 'running');
  const isAnimated = engineRunning && animSpeed !== 'paused' && !prefersReducedMotion;
  const flowSpeed = animSpeed === 'fast' ? 0.7 : animSpeed === 'slow' ? 2.8 : 1.4;

  // Real data extraction helpers (never fabricate missing numbers!)
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

  const getStageStatus = (stageKey: string): 'nominal' | 'warning' | 'alarm' | 'stale' => {
    if (twinState?.state_freshness === 'expired') return 'stale';
    const stageAlarms = activeAlarms.filter((a) => a.stage_id === stageKey && a.status !== 'resolved');
    if (stageAlarms.some((a) => a.severity === 'critical')) return 'alarm';
    if (stageAlarms.some((a) => a.severity === 'warning')) return 'warning';
    return 'nominal';
  };

  // Zoom / Pan handlers
  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.15, 2.0));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.15, 0.6));
  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
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

  // Keyboard navigation across stages (ArrowLeft / ArrowRight)
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        const currIdx = selectedStageId ? STAGE_ORDER.indexOf(selectedStageId) : -1;
        const nextIdx = (currIdx + 1) % STAGE_ORDER.length;
        onSelectStage(STAGE_ORDER[nextIdx]);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        const currIdx = selectedStageId ? STAGE_ORDER.indexOf(selectedStageId) : 0;
        const prevIdx = (currIdx - 1 + STAGE_ORDER.length) % STAGE_ORDER.length;
        onSelectStage(STAGE_ORDER[prevIdx]);
      } else if (e.key === 'Escape') {
        onSelectStage('');
      }
    },
    [selectedStageId, onSelectStage]
  );

  // Calibrated real stage telemetry metrics from twinState
  const inletBod = getParam('inlet', 'bod');
  const inletCod = getParam('inlet', 'cod');
  const inletTss = getParam('inlet', 'tss');
  const inletPh = getParam('inlet', 'ph');
  const inletFlow = getOperatingVar('inlet', 'inflow_mld') ?? 10.0;

  const priBod = getParam('primary_clarifier', 'bod');
  const priTss = getParam('primary_clarifier', 'tss');

  const aerBod = getParam('biological_aeration', 'bod');
  const aerDo = getOperatingVar('biological_aeration', 'do_mg_l') ?? getParam('biological_aeration', 'do');
  const aerMlss = getParam('biological_aeration', 'tss') ?? getParam('biological_aeration', 'mlss');

  const secBod = getParam('secondary_clarifier', 'bod');
  const secTss = getParam('secondary_clarifier', 'tss');

  const effBod = getParam('final_effluent', 'bod');
  const effCod = getParam('final_effluent', 'cod');
  const effTss = getParam('final_effluent', 'tss');
  const effPh = getParam('final_effluent', 'ph');

  const sourceMode = twinState?.source_mode || 'simulation';
  const modeBadge = sourceMode === 'live' ? 'LIVE TELEMETRY' : 'LIVE SIMULATION';

  return (
    <div
      className="relative bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl select-none focus:outline-none"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="region"
      aria-label="STP 5-Stage Animated SCADA Process Canvas"
    >
      {/* Top SCADA Control Overlay */}
      <div className="absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Left: Mode Badge & State Version */}
        <div className="flex items-center gap-2 pointer-events-auto bg-slate-900/90 backdrop-blur border border-slate-700/80 px-3 py-1.5 rounded-lg shadow-md text-xs">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-mono font-bold tracking-wider text-emerald-400 uppercase">
            [{modeBadge}]
          </span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-200 font-mono font-medium">
            STP Process Synoptic Flow
          </span>
          <span className="text-slate-500">|</span>
          <span className="text-sky-400 font-mono font-semibold">
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
            title={`Toggle Animation Speed (Current: ${animSpeed.toUpperCase()})`}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-mono font-medium rounded hover:bg-slate-800 text-slate-300 transition-colors"
          >
            {animSpeed === 'paused' ? (
              <>
                <Pause className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-amber-400">0x Paused</span>
              </>
            ) : animSpeed === 'fast' ? (
              <>
                <FastForward className="w-3.5 h-3.5 text-sky-400" />
                <span className="text-sky-400">2x Fast</span>
              </>
            ) : animSpeed === 'slow' ? (
              <>
                <Play className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-400">0.5x Slow</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">1x Normal</span>
              </>
            )}
          </button>

          <div className="h-4 w-px bg-slate-700" />

          {/* Zoom controls */}
          <button
            onClick={handleZoomIn}
            title="Zoom In (+)"
            className="p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleZoomOut}
            title="Zoom Out (-)"
            className="p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleResetView}
            title="Reset View & Scale"
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
        className={`w-full overflow-hidden select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{ minHeight: '480px', height: 'clamp(480px, 40vw, 560px)' }}
      >
        <svg
          viewBox="0 0 1200 480"
          preserveAspectRatio="xMidYMid meet"
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

            {/* Glowing filter for neon outlines */}
            <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Amber Glow filter for Aeration Basin selection */}
            <filter id="amberGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4.5" result="blur" />
              <feColorMatrix
                type="matrix"
                values="1 0 0 0 0.96   0 0.62 0 0 0   0 0 0.04 0 0  0 0 0 1 0"
              />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Fluid Depth Gradients */}
            <linearGradient id="gradInletWater" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0284c7" stopOpacity="0.8" />
              <stop offset="60%" stopColor="#0369a1" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0.95" />
            </linearGradient>

            {/* Primary Clarifier: Settling Raw Organic Sludge / Earthy Brown Gradient */}
            <linearGradient id="gradPrimaryClarifierWater" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#78350f" stopOpacity="0.88" />
              <stop offset="35%" stopColor="#92400e" stopOpacity="0.92" />
              <stop offset="70%" stopColor="#451a03" stopOpacity="0.96" />
              <stop offset="100%" stopColor="#1e0b02" stopOpacity="0.99" />
            </linearGradient>

            {/* Secondary Clarifier: Quiescent Clarified Treated Supernatant (Crystal Blue) */}
            <linearGradient id="gradSecondaryClarifierWater" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0284c7" stopOpacity="0.8" />
              <stop offset="45%" stopColor="#0ea5e9" stopOpacity="0.85" />
              <stop offset="85%" stopColor="#0369a1" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#082f49" stopOpacity="0.95" />
            </linearGradient>

            {/* Backward-compatible alias */}
            <linearGradient id="gradClarifierWater" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0284c7" stopOpacity="0.8" />
              <stop offset="45%" stopColor="#0ea5e9" stopOpacity="0.85" />
              <stop offset="85%" stopColor="#0369a1" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#082f49" stopOpacity="0.95" />
            </linearGradient>

            <linearGradient id="gradAerationWater" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0369a1" stopOpacity="0.9" />
              <stop offset="40%" stopColor="#0284c7" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#075985" stopOpacity="0.98" />
            </linearGradient>

            <linearGradient id="gradUvWater" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#7c3aed" stopOpacity="0.65" />
              <stop offset="100%" stopColor="#0891b2" stopOpacity="0.9" />
            </linearGradient>

            {/* 3D Cylindrical Tank Body Directional Lighting Gradient */}
            <linearGradient id="gradClarifierBody" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#081426" />
              <stop offset="25%" stopColor="#1e3a5f" />
              <stop offset="55%" stopColor="#0f2238" />
              <stop offset="85%" stopColor="#0a1628" />
              <stop offset="100%" stopColor="#040812" />
            </linearGradient>

            {/* 3D Concrete Coping Top Highlight Gradient */}
            <linearGradient id="gradConcreteCoping" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="50%" stopColor="#475569" />
              <stop offset="100%" stopColor="#334155" />
            </linearGradient>

            {/* Pipe Flow Arrow Markers */}
            <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#38bdf8" />
            </marker>
            <marker id="arrowRas" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#f59e0b" />
            </marker>
            <marker id="arrowUv" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#c084fc" />
            </marker>
            <marker id="arrowSludge" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#b45309" />
            </marker>
            <marker id="arrowAir" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#38bdf8" />
            </marker>
          </defs>

          {/* Canvas Background & SCADA Grid */}
          <rect width="1200" height="480" fill="#0b1120" />
          <rect width="1200" height="480" fill="url(#scadaGrid)" />

          {/* ========================================================= */}
          {/* 1. INTER-STAGE PIPING NETWORKS (DRAWN BEHIND TANKS)       */}
          {/* ========================================================= */}

          {/* Pipe 1: Stage 1 Inlet -> Stage 2 Primary Clarifier */}
          <ScadaPipe
            id="pipe-inlet-primary"
            path="M 214 205 L 262 205"
            variant="process"
            strokeWidth={7}
            flowSpeedSeconds={flowSpeed}
            isAnimated={isAnimated}
            particleCount={2}
          />

          {/* Pipe 2: Stage 2 Primary Clarifier -> Stage 3 Aeration Basin */}
          <ScadaPipe
            id="pipe-primary-aeration"
            path="M 452 205 L 500 205"
            variant="process"
            strokeWidth={7}
            flowSpeedSeconds={flowSpeed}
            isAnimated={isAnimated}
            particleCount={2}
          />

          {/* Pipe 3: Stage 3 Aeration Basin -> Stage 4 Secondary Clarifier */}
          <ScadaPipe
            id="pipe-aeration-secondary"
            path="M 694 205 L 747 205"
            variant="process"
            strokeWidth={7}
            flowSpeedSeconds={flowSpeed}
            isAnimated={isAnimated}
            particleCount={2}
          />

          {/* Pipe 4: Stage 4 Secondary Clarifier -> Stage 5 UV Disinfection */}
          <ScadaPipe
            id="pipe-secondary-effluent"
            path="M 937 205 L 985 205"
            variant="process"
            strokeWidth={7}
            flowSpeedSeconds={flowSpeed}
            isAnimated={isAnimated}
            particleCount={2}
          />

          {/* Pipe 5: Stage 5 UV Disinfection -> OUTFALL-701 Terminal Node */}
          <ScadaPipe
            id="pipe-uv-outfall"
            path="M 1080 205 L 1110 205"
            variant="process"
            strokeWidth={7}
            flowSpeedSeconds={flowSpeed}
            isAnimated={isAnimated}
            particleCount={1}
          />

          {/* ========================================================= */}
          {/* 2. AIR BLOWER COMPRESSED AIR PIPING (BLW-301 -> AB-301)   */}
          {/* ========================================================= */}
          <ScadaPipe
            id="pipe-blower-air"
            path="M 444 370 L 444 273 L 508 273"
            variant="air"
            strokeWidth={5}
            flowSpeedSeconds={flowSpeed * 0.8}
            isAnimated={isAnimated}
            particleCount={3}
            arrowMarkerId="arrowAir"
            label="Compressed Air Feed"
            labelX={475}
            labelY={315}
          />

          {/* ========================================================= */}
          {/* 3. SLUDGE PIPING NETWORKS (PRIMARY SLUDGE, RAS, WAS)      */}
          {/* ========================================================= */}

          {/* Primary Clarifier Sludge: drops from (357, 245) down to y=425, runs left across floor to SLD-601 at (190, 425) */}
          <ScadaPipe
            id="pipe-primary-sludge"
            path="M 357 245 L 357 425 L 190 425"
            variant="sludge"
            strokeWidth={6}
            flowSpeedSeconds={flowSpeed * 1.6}
            isAnimated={isAnimated}
            particleCount={3}
            arrowMarkerId="arrowSludge"
            label="Primary Sludge"
            labelX={270}
            labelY={420}
          />

          {/* Secondary Clarifier Sludge: drops from (842, 245) down to splitter at (842, 395) */}
          <ScadaPipe
            id="pipe-sec-sludge-drop"
            path="M 842 245 L 842 395"
            variant="ras"
            strokeWidth={6}
            flowSpeedSeconds={flowSpeed * 1.5}
            isAnimated={isAnimated}
            particleCount={2}
          />

          {/* Return Activated Sludge (RAS - 85%): from (842, 395) left through PMP-401 at (610, 395) to (505, 395), rising into AB-301 at (505, 255) */}
          <ScadaPipe
            id="pipe-ras-loop"
            path="M 842 395 L 505 395 L 505 255"
            variant="ras"
            strokeWidth={6}
            flowSpeedSeconds={flowSpeed * 1.5}
            isAnimated={isAnimated}
            particleCount={4}
            arrowMarkerId="arrowRas"
            label="Return Activated Sludge (RAS - 85%)"
            labelX={725}
            labelY={385}
          />

          {/* Waste Activated Sludge (WAS - 15%): drops from splitter at (842, 395) to y=425, runs left across floor merging into the sludge manifold at (357, 425) entering SLD-601 */}
          <ScadaPipe
            id="pipe-was-sludge"
            path="M 842 395 L 842 425 L 357 425"
            variant="was"
            strokeWidth={5}
            flowSpeedSeconds={flowSpeed * 1.8}
            isAnimated={isAnimated}
            particleCount={3}
            arrowMarkerId="arrowSludge"
            label="Waste Activated Sludge (WAS - 15%)"
            labelX={600}
            labelY={433}
          />

          {/* Floor-level Sludge Splitter Fitting at (842, 395) */}
          <g id="sludge-splitter-station" transform="translate(842, 395)">
            <circle cx="0" cy="0" r="7" fill="#0f172a" stroke="#f59e0b" strokeWidth="1.8" />
            <circle cx="0" cy="0" r="3" fill="#f59e0b" />
            <line x1="0" y1="-8" x2="0" y2="8" stroke="#d97706" strokeWidth="1.2" />
            <line x1="-8" y1="0" x2="8" y2="0" stroke="#d97706" strokeWidth="1.2" />
            <rect x="8" y="-14" width="46" height="13" rx="2.5" fill="#090d16" stroke="#f59e0b" strokeWidth="0.8" />
            <text x="31" y="-5" textAnchor="middle" fill="#f59e0b" fontSize="7" fontFamily="monospace" fontWeight="bold">
              85% RAS
            </text>
            <rect x="8" y="4" width="46" height="13" rx="2.5" fill="#090d16" stroke="#b45309" strokeWidth="0.8" />
            <text x="31" y="13" textAnchor="middle" fill="#f59e0b" fontSize="7" fontFamily="monospace" fontWeight="bold">
              15% WAS
            </text>
          </g>

          {/* ========================================================= */}
          {/* 4. ANCILLARY ROTATING EQUIPMENT (BLOWERS & PUMPS)          */}
          {/* ========================================================= */}

          {/* BLW-301 Air Blower at x=430, y=370 */}
          <ScadaBlower
            id="blw-301"
            tag="BLW-301"
            name="Air Blower"
            x={430}
            y={370}
            isRunning={isAnimated}
            color="#38bdf8"
          />

          {/* PMP-401 RAS Pump at x=610, y=380 */}
          <ScadaPump
            id="pmp-401"
            x={610}
            y={380}
            tag="PMP-401"
            name="RAS Pump"
            isRunning={isAnimated}
            color="#f59e0b"
          />

          {/* ========================================================= */}
          {/* 5. TERMINAL BOUNDARY STATIONS (BATTERY LIMIT NODES)        */}
          {/* ========================================================= */}

          {/* INLET-001 (Municipal Influent Headworks) at x=8, y=210 */}
          <ScadaTerminalStation
            id="inlet-001"
            tag="INLET-001"
            name="Municipal Influent"
            subtext="Headworks Flume"
            x={8}
            y={210}
            width={68}
            height={42}
            variant="inlet"
            isAnimated={isAnimated}
          />

          {/* SLD-601 (Solids Handling & Dewatering) at x=80, y=390 */}
          <ScadaTerminalStation
            id="sld-601"
            tag="SLD-601"
            name="Solids Handling"
            subtext="Filter Press & Dewatering"
            x={80}
            y={390}
            width={110}
            height={48}
            variant="sludge"
            isAnimated={isAnimated}
          />

          {/* OUTFALL-701 (Treated Effluent Outfall & Reuse) at x=1110, y=190 */}
          <ScadaTerminalStation
            id="outfall-701"
            tag="OUTFALL-701"
            name="Treated Outfall"
            subtext="Discharge & Reuse"
            x={1110}
            y={190}
            width={70}
            height={44}
            variant="outfall"
            isAnimated={isAnimated}
          />

          {/* ========================================================= */}
          {/* THE 5 MODULAR PROCESS STAGES                              */}
          {/* ========================================================= */}

          {/* Stage 1: Raw Influent & Screening */}
          <InletScreeningStage
            isSelected={selectedStageId === 'inlet'}
            isHovered={hoveredStage === 'inlet'}
            status={getStageStatus('inlet')}
            inflowMld={inletFlow}
            bod={inletBod}
            cod={inletCod}
            tss={inletTss}
            ph={inletPh}
            onSelect={() => onSelectStage('inlet')}
            onMouseEnter={() => setHoveredStage('inlet')}
            onMouseLeave={() => setHoveredStage(null)}
            isAnimated={isAnimated}
          />

          {/* Stage 2: Primary Clarifier */}
          <PrimaryClarifierStage
            isSelected={selectedStageId === 'primary_clarifier'}
            isHovered={hoveredStage === 'primary_clarifier'}
            status={getStageStatus('primary_clarifier')}
            bod={priBod}
            tss={priTss}
            onSelect={() => onSelectStage('primary_clarifier')}
            onMouseEnter={() => setHoveredStage('primary_clarifier')}
            onMouseLeave={() => setHoveredStage(null)}
            isAnimated={isAnimated}
          />

          {/* Stage 3: Biological Aeration Basin (CSTR) */}
          <AerationBasinStage
            isSelected={selectedStageId === 'biological_aeration'}
            isHovered={hoveredStage === 'biological_aeration'}
            status={getStageStatus('biological_aeration')}
            bod={aerBod}
            doMgL={aerDo}
            mlssMgL={aerMlss}
            onSelect={() => onSelectStage('biological_aeration')}
            onMouseEnter={() => setHoveredStage('biological_aeration')}
            onMouseLeave={() => setHoveredStage(null)}
            isAnimated={isAnimated}
          />

          {/* Stage 4: Secondary Clarifier & Decanter */}
          <SecondaryClarifierStage
            isSelected={selectedStageId === 'secondary_clarifier'}
            isHovered={hoveredStage === 'secondary_clarifier'}
            status={getStageStatus('secondary_clarifier')}
            bod={secBod}
            tss={secTss}
            onSelect={() => onSelectStage('secondary_clarifier')}
            onMouseEnter={() => setHoveredStage('secondary_clarifier')}
            onMouseLeave={() => setHoveredStage(null)}
            isAnimated={isAnimated}
          />

          {/* Stage 5: Final Effluent & UV Disinfection */}
          <EffluentUvStage
            isSelected={selectedStageId === 'final_effluent'}
            isHovered={hoveredStage === 'final_effluent'}
            status={getStageStatus('final_effluent')}
            bod={effBod}
            cod={effCod}
            tss={effTss}
            ph={effPh}
            onSelect={() => onSelectStage('final_effluent')}
            onMouseEnter={() => setHoveredStage('final_effluent')}
            onMouseLeave={() => setHoveredStage(null)}
            isAnimated={isAnimated}
          />

          {/* Bottom Piping Legend inside SVG */}
          <ScadaLegend x={20} y={450} />
        </svg>
      </div>

      {/* Bottom Industrial Synoptic Legend & Navigation Help */}
      <div className="bg-slate-900/95 border-t border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-400">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="flex items-center gap-1.5 font-medium text-slate-300">
            <span className="w-3.5 h-1 bg-sky-400 rounded-full inline-block animate-pulse"></span> Main Process Flow
          </span>
          <span className="flex items-center gap-1.5 font-medium text-amber-400">
            <span className="w-3.5 h-1 bg-amber-400 rounded-full inline-block animate-pulse"></span> Return Activated Sludge (RAS)
          </span>
          <span className="flex items-center gap-1.5 font-medium text-purple-300">
            <Sparkles className="w-3.5 h-3.5 text-purple-400 inline" /> UV Photochemical Inactivation
          </span>
          <span className="flex items-center gap-1.5 font-medium text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 inline" /> CPCB Schedule VI Standard Norms
          </span>
        </div>

        <div className="flex items-center gap-2 text-slate-400 font-mono text-[10px]">
          <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-sky-400 font-semibold">
            CLICK OR USE ARROW KEYS TO INSPECT STAGE
          </span>
        </div>
      </div>
    </div>
  );
};
