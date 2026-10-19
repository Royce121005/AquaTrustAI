import React, { useState, useEffect, useRef } from 'react';
import {
  TrendingUp,
  Activity,
  Droplets,
  Wind,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { TwinState } from '../../types/digitalTwin';

interface LiveTelemetryTrendsProps {
  twinState: TwinState | null;
  maxPoints?: number;
}

interface TrendPoint {
  timeLabel: string;
  bod: number;
  cod: number;
  tss: number;
  do: number;
  ph: number;
}

export const LiveTelemetryTrends: React.FC<LiveTelemetryTrendsProps> = ({
  twinState,
  maxPoints = 40,
}) => {
  const [history, setHistory] = useState<TrendPoint[]>([]);
  const lastVersionRef = useRef<number>(-1);

  // Extract latest readings from twinState
  useEffect(() => {
    if (!twinState) return;

    // Only append if state_version has incremented
    if (twinState.state_version === lastVersionRef.current) return;
    lastVersionRef.current = twinState.state_version;

    const finalEffluent = twinState.stage_states?.final_effluent;
    const aeration = twinState.stage_states?.biological_aeration;

    const parseVal = (param: unknown, fallback: number): number => {
      if (typeof param === 'number') return isNaN(param) ? fallback : param;
      if (typeof param === 'object' && param !== null && 'value' in param) {
        const v = (param as { value?: unknown }).value;
        if (typeof v === 'number' && !isNaN(v)) return v;
      }
      return fallback;
    };

    const finalParams = finalEffluent?.parameters || {};
    const aerOps = aeration?.operating_variables || {};

    const latestBod = parseVal(finalParams.bod, 20.8);
    const latestCod = parseVal(finalParams.cod, 70.6);
    const latestTss = parseVal(finalParams.tss, 10.4);
    const latestPh = parseVal(finalParams.ph, 7.34);

    let latestDo = 2.0;
    if (aerOps.do_mg_l !== undefined && aerOps.do_mg_l !== null) {
      const v = typeof aerOps.do_mg_l === 'number' ? aerOps.do_mg_l : parseFloat(String(aerOps.do_mg_l));
      if (!isNaN(v)) latestDo = v;
    }

    const timeLabel = new Date().toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit' });

    setHistory((prev) => {
      const next = [
        ...prev,
        {
          timeLabel,
          bod: latestBod,
          cod: latestCod,
          tss: latestTss,
          do: latestDo,
          ph: latestPh,
        },
      ];
      return next.length > maxPoints ? next.slice(next.length - maxPoints) : next;
    });
  }, [twinState, maxPoints]);

  // Mini SVG Sparkline Generator
  const renderSparkline = (
    data: number[],
    color: string,
    fillId: string,
    minVal: number,
    maxVal: number,
    threshold?: number
  ) => {
    if (data.length < 2) {
      return (
        <div className="h-10 flex items-center justify-center text-[10px] text-slate-500 font-mono">
          Awaiting telemetry stream...
        </div>
      );
    }

    const width = 180;
    const height = 42;
    const padY = 4;

    const span = maxVal - minVal || 1;
    const points = data.map((val, idx) => {
      const x = (idx / (data.length - 1)) * width;
      const normY = (val - minVal) / span;
      const clampedNormY = Math.max(0, Math.min(1, normY));
      const y = height - padY - clampedNormY * (height - padY * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    const pathD = `M ${points.join(' L ')}`;
    const areaD = `${pathD} L ${width},${height} L 0,${height} Z`;

    let threshY: number | null = null;
    if (threshold !== undefined && threshold >= minVal && threshold <= maxVal) {
      const normThresh = (threshold - minVal) / span;
      threshY = height - padY - normThresh * (height - padY * 2);
    }

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-11 overflow-visible">
        <defs>
          <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.4" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill={`url(#${fillId})`} />
        {threshY !== null && (
          <line
            x1="0"
            y1={threshY}
            x2={width}
            y2={threshY}
            stroke="#ef4444"
            strokeWidth="0.8"
            strokeDasharray="3 2"
            opacity="0.8"
          />
        )}
        <path d={pathD} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        {/* Latest Point Indicator */}
        {points.length > 0 && (
          <circle
            cx={points[points.length - 1].split(',')[0]}
            cy={points[points.length - 1].split(',')[1]}
            r="3"
            fill={color}
            stroke="#0f172a"
            strokeWidth="1.5"
          />
        )}
      </svg>
    );
  };

  const bodHistory = history.map((h) => h.bod);
  const codHistory = history.map((h) => h.cod);
  const tssHistory = history.map((h) => h.tss);
  const doHistory = history.map((h) => h.do);
  const phHistory = history.map((h) => h.ph);

  const curPoint = history[history.length - 1] || {
    bod: 20.8,
    cod: 70.6,
    tss: 10.4,
    do: 2.0,
    ph: 7.34,
  };

  const sourceMode = twinState?.source_mode || 'simulation';

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-sky-400 animate-pulse" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Real-Time SCADA Telemetry Instrumentation (Rolling 1Hz)
          </h3>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono">
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
              sourceMode === 'live'
                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                : 'bg-sky-950 text-sky-400 border border-sky-800'
            }`}
          >
            [{sourceMode.toUpperCase()}]
          </span>
          <span className="text-slate-500">Points: {history.length}/{maxPoints}</span>
        </div>
      </div>

      {/* Grid of 5 Parameter Sparklines */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* 1. BOD Sparkline */}
        <div className="bg-slate-950/70 border border-slate-800/90 rounded-lg p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-slate-400">Effluent BOD</span>
            <span className="text-[10px] font-mono text-emerald-400">Norm ≤ 30</span>
          </div>
          <div className="flex items-baseline gap-1 my-1 font-mono">
            <span className={`text-xl font-black ${curPoint.bod > 30 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {curPoint.bod.toFixed(1)}
            </span>
            <span className="text-[10px] text-slate-500">mg/L</span>
          </div>
          <div className="mt-1">
            {renderSparkline(bodHistory, '#10b981', 'gradSparkBod', 10, 40, 30)}
          </div>
        </div>

        {/* 2. COD Sparkline */}
        <div className="bg-slate-950/70 border border-slate-800/90 rounded-lg p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-slate-400">Effluent COD</span>
            <span className="text-[10px] font-mono text-sky-400">Norm ≤ 250</span>
          </div>
          <div className="flex items-baseline gap-1 my-1 font-mono">
            <span className={`text-xl font-black ${curPoint.cod > 250 ? 'text-rose-400' : 'text-sky-400'}`}>
              {curPoint.cod.toFixed(1)}
            </span>
            <span className="text-[10px] text-slate-500">mg/L</span>
          </div>
          <div className="mt-1">
            {renderSparkline(codHistory, '#38bdf8', 'gradSparkCod', 40, 300, 250)}
          </div>
        </div>

        {/* 3. TSS Sparkline */}
        <div className="bg-slate-950/70 border border-slate-800/90 rounded-lg p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-slate-400">Effluent TSS</span>
            <span className="text-[10px] font-mono text-amber-400">Norm ≤ 50</span>
          </div>
          <div className="flex items-baseline gap-1 my-1 font-mono">
            <span className={`text-xl font-black ${curPoint.tss > 50 ? 'text-rose-400' : 'text-amber-400'}`}>
              {curPoint.tss.toFixed(1)}
            </span>
            <span className="text-[10px] text-slate-500">mg/L</span>
          </div>
          <div className="mt-1">
            {renderSparkline(tssHistory, '#f59e0b', 'gradSparkTss', 5, 60, 50)}
          </div>
        </div>

        {/* 4. DO Sparkline */}
        <div className="bg-slate-950/70 border border-slate-800/90 rounded-lg p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-slate-400">Aeration DO</span>
            <span className="text-[10px] font-mono text-teal-400">Setpt ≥ 2.0</span>
          </div>
          <div className="flex items-baseline gap-1 my-1 font-mono">
            <span className={`text-xl font-black ${curPoint.do < 1.0 ? 'text-rose-400' : curPoint.do < 2.0 ? 'text-amber-400' : 'text-teal-400'}`}>
              {curPoint.do.toFixed(2)}
            </span>
            <span className="text-[10px] text-slate-500">mg/L</span>
          </div>
          <div className="mt-1">
            {renderSparkline(doHistory, '#14b8a6', 'gradSparkDo', 0.5, 4.0, 2.0)}
          </div>
        </div>

        {/* 5. pH Sparkline */}
        <div className="bg-slate-950/70 border border-slate-800/90 rounded-lg p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-slate-400">Effluent pH</span>
            <span className="text-[10px] font-mono text-purple-400">6.5 – 8.5</span>
          </div>
          <div className="flex items-baseline gap-1 my-1 font-mono">
            <span className={`text-xl font-black ${curPoint.ph < 6.5 || curPoint.ph > 8.5 ? 'text-rose-400' : 'text-purple-400'}`}>
              {curPoint.ph.toFixed(2)}
            </span>
            <span className="text-[10px] text-slate-500">units</span>
          </div>
          <div className="mt-1">
            {renderSparkline(phHistory, '#c084fc', 'gradSparkPh', 6.0, 9.0)}
          </div>
        </div>
      </div>
    </div>
  );
};
