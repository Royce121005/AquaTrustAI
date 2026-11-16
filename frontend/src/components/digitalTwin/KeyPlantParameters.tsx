import React, { useState, useEffect, useRef } from 'react';
import {
  Droplets,
  Activity,
  Gauge,
  Wind,
  CheckCircle2,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { TwinState } from '../../types/digitalTwin';

interface KeyPlantParametersProps {
  twinState: TwinState | null;
  lastMessageAt?: string | null;
  isRunning?: boolean;
}

interface RollingHistoryPoint {
  influentBod: number;
  tssPrimary: number;
  aerationDo: number;
  mlssAeration: number;
  effluentBod: number;
  effluentPh: number;
}

export const KeyPlantParameters: React.FC<KeyPlantParametersProps> = ({
  twinState,
  lastMessageAt,
  isRunning = false,
}) => {
  const [history, setHistory] = useState<RollingHistoryPoint[]>([]);
  const lastVersionRef = useRef<number>(-1);

  // Helper to extract a numeric parameter safely
  const getParam = (stageKey: string, paramKey: string, fallback: number | null = null): number | null => {
    if (!twinState?.stage_states) return fallback;
    const stage = twinState.stage_states[stageKey];
    if (!stage || !stage.parameters) return fallback;
    const p = stage.parameters[paramKey];
    if (p === null || p === undefined) return fallback;
    if (typeof p === 'number') return isNaN(p) ? fallback : p;
    if (typeof p === 'object' && 'value' in p) {
      const v = (p as { value?: unknown }).value;
      return typeof v === 'number' && !isNaN(v) ? v : fallback;
    }
    return fallback;
  };

  const getInflow = (): number => {
    if (twinState?.operating_variables?.design_capacity_mld !== undefined) {
      const v = Number(twinState.operating_variables.design_capacity_mld);
      if (!isNaN(v) && v > 0) return v;
    }
    return 10.0;
  };

  // Extract current live values from twinState
  const plantInflow = getInflow();
  const influentBod = getParam('inlet', 'bod');
  const tssPrimary = getParam('primary_clarifier', 'tss');
  const aerationDo = getParam('biological_aeration', 'do') ?? (twinState?.operating_variables?.do_mg_l ? Number(twinState.operating_variables.do_mg_l) : null);
  const mlssAeration = getParam('biological_aeration', 'mlss') ?? 2580;
  const effluentBod = getParam('final_effluent', 'bod');
  const effluentPh = getParam('final_effluent', 'ph');

  // Push new point into rolling history on state version change
  useEffect(() => {
    if (!twinState) return;
    if (twinState.state_version === lastVersionRef.current) return;
    lastVersionRef.current = twinState.state_version;

    setHistory((prev) => {
      const nextPoint: RollingHistoryPoint = {
        influentBod: influentBod ?? 21.7,
        tssPrimary: tssPrimary ?? 7.7,
        aerationDo: aerationDo ?? 2.0,
        mlssAeration: mlssAeration ?? 2580,
        effluentBod: effluentBod ?? 3.8,
        effluentPh: effluentPh ?? 7.4,
      };
      const updated = [...prev, nextPoint];
      return updated.length > 30 ? updated.slice(updated.length - 30) : updated;
    });
  }, [twinState, influentBod, tssPrimary, aerationDo, mlssAeration, effluentBod, effluentPh]);

  // Relative age indicator
  const getRelativeAge = (): string => {
    if (!twinState?.observed_at) return '—';
    const obsTime = new Date(twinState.observed_at).getTime();
    const diffSec = Math.max(0, Math.floor((Date.now() - obsTime) / 1000));
    if (diffSec < 4) return '2s ago';
    if (diffSec < 60) return `${diffSec}s ago`;
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    return 'stale';
  };

  const ageText = getRelativeAge();

  // Mini sparkline renderer
  const renderSparkline = (
    data: number[],
    color: string,
    width = 100,
    height = 20
  ) => {
    if (data.length < 2) {
      return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-5 opacity-40">
          <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke={color} strokeWidth="1.2" strokeDasharray="2 2" />
        </svg>
      );
    }
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const points = data
      .map((val, idx) => {
        const x = (idx / (data.length - 1)) * width;
        const y = height - ((val - min) / range) * (height - 4) - 2;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-5 overflow-visible">
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
      </svg>
    );
  };

  const cards = [
    {
      id: 'inflow',
      label: 'Plant Inflow',
      value: plantInflow.toFixed(1),
      unit: 'MLD',
      status: 'Normal',
      statusColor: '#10b981',
      sparkline: [10.0, 10.0, 9.9, 10.1, 10.0, 10.0],
      icon: Droplets,
    },
    {
      id: 'inf_bod',
      label: 'Influent BOD',
      value: influentBod !== null ? influentBod.toFixed(1) : '—',
      unit: 'mg/L',
      status: influentBod !== null && influentBod > 250 ? 'High' : 'Normal',
      statusColor: influentBod !== null && influentBod > 250 ? '#f59e0b' : '#10b981',
      sparkline: history.map((h) => h.influentBod),
      icon: Activity,
    },
    {
      id: 'tss_pri',
      label: 'TSS (Primary Eff.)',
      value: tssPrimary !== null ? tssPrimary.toFixed(1) : '—',
      unit: 'mg/L',
      status: 'Normal',
      statusColor: '#10b981',
      sparkline: history.map((h) => h.tssPrimary),
      icon: Gauge,
    },
    {
      id: 'do_aer',
      label: 'DO (Aeration)',
      value: aerationDo !== null ? aerationDo.toFixed(1) : '—',
      unit: 'mg/L',
      status: aerationDo !== null && aerationDo < 1.0 ? 'Critical' : 'Normal',
      statusColor: aerationDo !== null && aerationDo < 1.0 ? '#ef4444' : '#10b981',
      sparkline: history.map((h) => h.aerationDo),
      icon: Wind,
    },
    {
      id: 'mlss_aer',
      label: 'MLSS (Aeration)',
      value: mlssAeration !== null ? mlssAeration.toLocaleString() : '—',
      unit: 'mg/L',
      status: 'Normal',
      statusColor: '#10b981',
      sparkline: history.map((h) => h.mlssAeration),
      icon: Activity,
    },
    {
      id: 'eff_bod',
      label: 'Effluent BOD',
      value: effluentBod !== null ? effluentBod.toFixed(1) : '—',
      unit: 'mg/L',
      status: effluentBod !== null && effluentBod <= 30.0 ? 'Compliant' : 'Exceeded',
      statusColor: effluentBod !== null && effluentBod <= 30.0 ? '#10b981' : '#ef4444',
      sparkline: history.map((h) => h.effluentBod),
      icon: CheckCircle2,
    },
    {
      id: 'eff_ph',
      label: 'Effluent pH',
      value: effluentPh !== null ? effluentPh.toFixed(2) : '—',
      unit: '',
      status: effluentPh !== null && effluentPh >= 6.5 && effluentPh <= 8.5 ? 'Normal' : 'Outlier',
      statusColor: effluentPh !== null && effluentPh >= 6.5 && effluentPh <= 8.5 ? '#10b981' : '#f59e0b',
      sparkline: history.map((h) => h.effluentPh),
      icon: Gauge,
    },
  ];

  return (
    <div className="bg-[#0b1329] border border-slate-800/80 rounded-xl p-4 shadow-xl select-none">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-sky-400" />
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            Key Plant Parameters
          </h3>
        </div>
        <span className="text-[10px] font-mono text-slate-500">
          Deterministic 1Hz Process Model Telemetry
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.id}
              className="bg-[#070d1e] border border-slate-800/90 rounded-lg p-2.5 flex flex-col justify-between hover:border-slate-700 transition-colors"
            >
              <div>
                <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-medium truncate">
                  <Icon className="w-3 h-3 text-sky-400 shrink-0" />
                  <span className="truncate">{card.label}</span>
                </div>

                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-lg font-bold font-mono text-slate-100">
                    {card.value}
                  </span>
                  {card.unit && (
                    <span className="text-[10px] text-slate-400 font-mono">
                      {card.unit}
                    </span>
                  )}
                </div>
              </div>

              {/* Sparkline & Status Indicator */}
              <div className="mt-2 pt-1 border-t border-slate-800/60">
                <div className="w-full mb-1">
                  {renderSparkline(card.sparkline, card.statusColor)}
                </div>

                <div className="flex items-center justify-between text-[9px] font-mono text-slate-400">
                  <span className="flex items-center gap-1">
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: card.statusColor }}
                    />
                    <span style={{ color: card.statusColor }}>{card.status}</span>
                  </span>
                  <span className="text-slate-500">{ageText}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
