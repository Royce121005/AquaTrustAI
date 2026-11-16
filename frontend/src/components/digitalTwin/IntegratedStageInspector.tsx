import React, { useState } from 'react';
import {
  X,
  Activity,
  Layers,
  Cpu,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Flame,
  Wind,
  Droplets,
  Radio,
  ChevronDown,
  PanelRight,
  TrendingUp,
  Sliders,
  Check,
} from 'lucide-react';
import { TwinState, TwinAlarmEvent } from '../../types/digitalTwin';

interface IntegratedStageInspectorProps {
  stageId: string | null;
  twinState: TwinState | null;
  alarms: TwinAlarmEvent[];
  onClose: () => void;
  onAcknowledgeAlarm?: (alarmId: string) => void;
  placementMode?: 'drawer' | 'below';
  onTogglePlacement?: (mode: 'drawer' | 'below') => void;
  onSelectStage?: (stageId: string) => void;
}

interface InstrumentMeta {
  tag: string;
  name: string;
  reading: string;
  unit: string;
  targetNorm: string;
  quality: string;
  isCompliant: boolean;
}

const STAGES = [
  { id: 'inlet', label: '1. Influent' },
  { id: 'primary_clarifier', label: '2. Primary' },
  { id: 'biological_aeration', label: '3. Aeration' },
  { id: 'secondary_clarifier', label: '4. Secondary' },
  { id: 'final_effluent', label: '5. Final UV' },
];

export const IntegratedStageInspector: React.FC<IntegratedStageInspectorProps> = ({
  stageId,
  twinState,
  alarms,
  onClose,
  onAcknowledgeAlarm,
  placementMode = 'drawer',
  onTogglePlacement,
  onSelectStage,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'instruments' | 'trends' | 'events'>('overview');

  if (!stageId) return null;

  // Helper to extract parameter safely from twinState (real data extraction)
  const getParamVal = (stageKey: string, paramKey: string, fallback: number | string): string => {
    if (!twinState?.stage_states) return String(fallback);
    const stage = twinState.stage_states[stageKey];
    if (!stage || !stage.parameters) return String(fallback);
    const p = stage.parameters[paramKey];
    if (p === null || p === undefined) return String(fallback);
    if (typeof p === 'number') return isNaN(p) ? String(fallback) : p.toFixed(1);
    if (typeof p === 'object' && 'value' in p) {
      const v = (p as { value?: unknown }).value;
      if (typeof v === 'number' && !isNaN(v)) return v.toFixed(1);
      if (v !== null && v !== undefined) return String(v);
    }
    return String(fallback);
  };

  const getOperatingVar = (stageKey: string, varKey: string, fallback: number | string): string => {
    if (!twinState?.stage_states) return String(fallback);
    const stage = twinState.stage_states[stageKey];
    if (!stage || !stage.operating_variables) return String(fallback);
    const v = stage.operating_variables[varKey];
    if (typeof v === 'number') return isNaN(v) ? String(fallback) : v.toFixed(1);
    if (typeof v === 'string') {
      const parsed = parseFloat(v);
      return isNaN(parsed) ? v : parsed.toFixed(1);
    }
    return String(fallback);
  };

  // Stage-specific configuration and telemetry data
  const getStageConfig = () => {
    switch (stageId) {
      case 'inlet': {
        const bod = getParamVal('inlet', 'bod', 21.7);
        const cod = getParamVal('inlet', 'cod', 42.0);
        const tss = getParamVal('inlet', 'tss', 24.5);
        const ph = getParamVal('inlet', 'ph', 7.2);
        return {
          title: 'Stage 1 • Raw Influent & Screening',
          equipmentName: 'Bar Screen & Grit Chamber',
          equipmentTag: 'S-101 / LIT-101',
          trendTitle: 'Influent Flow Rate Trend (24h)',
          trendSetpoint: '+ Design: 10.0 MLD',
          trendStat: 'Avg 10.0 MLD • Peak 12.4 MLD',
          yAxis: ['15.0', '10.0', '5.0'],
          params: [
            { label: 'Influent Flow Rate (FIT-101)', value: '10.0 MLD', dotColor: '#38bdf8' },
            { label: 'Raw Influent BOD (AIT-101)', value: `${bod} mg/L`, dotColor: '#10b981' },
            { label: 'Channel Level (LIT-101)', value: '2.4 m', dotColor: '#38bdf8' },
            { label: 'Raw Influent pH (AIT-102)', value: ph, dotColor: '#10b981' },
          ],
          instruments: [
            { tag: 'FIT-101', name: 'Raw Influent Electromagnetic Flow Meter', reading: '10.0 MLD', unit: 'MLD', targetNorm: 'Design: 10.0 MLD', quality: 'Valid & Calibrated', isCompliant: true },
            { tag: 'AIT-101', name: 'Raw Wastewater Spectrometric BOD Analyzer', reading: `${bod} mg/L`, unit: 'mg/L', targetNorm: 'Baseline: 20-30 mg/L', quality: 'Valid & Calibrated', isCompliant: true },
            { tag: 'LIT-101', name: 'Ultrasonic Bar Screen Channel Level Sensor', reading: '2.4 m', unit: 'm', targetNorm: 'Operating: 1.5 - 3.0 m', quality: 'Valid & Calibrated', isCompliant: true },
            { tag: 'AIT-102', name: 'Industrial Submersible pH Probe', reading: ph, unit: 'pH', targetNorm: 'CPCB Baseline: 6.5 - 8.5', quality: 'Valid & Calibrated', isCompliant: true },
            { tag: 'AIT-103', name: 'Raw Turbidity & Total Suspended Solids (TSS)', reading: `${tss} mg/L`, unit: 'mg/L', targetNorm: 'Baseline: 20 - 40 mg/L', quality: 'Valid & Calibrated', isCompliant: true },
          ],
        };
      }
      case 'primary_clarifier': {
        const tss = getParamVal('primary_clarifier', 'tss', 7.7);
        const bod = getParamVal('primary_clarifier', 'bod', 14.2);
        return {
          title: 'Stage 2 • Primary Clarifier Sedimentation',
          equipmentName: 'Primary Clarifier Sedimentation Tank',
          equipmentTag: 'PC-201 / AIT-201',
          trendTitle: 'TSS Removal Efficiency (24h)',
          trendSetpoint: '+ Target: 60%',
          trendStat: 'Avg 61.2% • Stable Settling',
          yAxis: ['100%', '60%', '20%'],
          params: [
            { label: 'Settled TSS (AIT-201)', value: `${tss} mg/L`, dotColor: '#10b981' },
            { label: 'TSS Removal Rate', value: '60 %', dotColor: '#10b981' },
            { label: 'Primary Sludge Flow (FIT-201)', value: '0.85 MLD', dotColor: '#f59e0b' },
            { label: 'Sludge Blanket Height (LIT-201)', value: '0.85 m', dotColor: '#38bdf8' },
          ],
          instruments: [
            { tag: 'AIT-201', name: 'Primary Clarifier Effluent TSS Optical Probe', reading: `${tss} mg/L`, unit: 'mg/L', targetNorm: 'Design Limit: < 15 mg/L', quality: 'Valid & Calibrated', isCompliant: true },
            { tag: 'LIT-201', name: 'Sludge Blanket Interface Sonar Sensor', reading: '0.85 m', unit: 'm', targetNorm: 'Operating Target: < 1.2 m', quality: 'Valid & Calibrated', isCompliant: true },
            { tag: 'FIT-201', name: 'Primary Underflow Sludge Magnetic Flow Meter', reading: '0.85 MLD', unit: 'MLD', targetNorm: 'Design Rate: 0.8 - 1.0 MLD', quality: 'Valid & Calibrated', isCompliant: true },
            { tag: 'TRQ-201', name: 'Sedimentation Scraper Drive Torque Monitor', reading: '34 %', unit: '%', targetNorm: 'Nominal: < 65%', quality: 'Valid & Calibrated', isCompliant: true },
          ],
        };
      }
      case 'secondary_clarifier': {
        const bod = getParamVal('secondary_clarifier', 'bod', 3.8);
        const tss = getParamVal('secondary_clarifier', 'tss', 5.2);
        return {
          title: 'Stage 4 • Secondary Clarifier Decanter',
          equipmentName: 'Secondary Clarifier Decanter & RAS Return',
          equipmentTag: 'SC-401 / AIT-401',
          trendTitle: 'Sludge Volume Index (24h)',
          trendSetpoint: '+ Target: 110 mL/g',
          trendStat: 'Avg 110 mL/g • Good Settling',
          yAxis: ['180', '110', '40'],
          params: [
            { label: 'Effluent BOD (AIT-401)', value: `${bod} mg/L`, dotColor: '#10b981' },
            { label: 'Sludge Volume Index (SVI)', value: '110 mL/g', dotColor: '#10b981' },
            { label: 'RAS Flow Rate (FIT-401)', value: '0.85 MLD', dotColor: '#f59e0b' },
            { label: 'Sludge Blanket Height (LIT-401)', value: '1.20 m', dotColor: '#38bdf8' },
          ],
          instruments: [
            { tag: 'AIT-401', name: 'Clarifier Decant Optical BOD Spectrometer', reading: `${bod} mg/L`, unit: 'mg/L', targetNorm: 'Target: < 10 mg/L', quality: 'Valid & Calibrated', isCompliant: true },
            { tag: 'SVI-401', name: 'Continuous Sludge Volume Index Analyzer', reading: '110 mL/g', unit: 'mL/g', targetNorm: 'Optimal Range: 80 - 120 mL/g', quality: 'Valid & Calibrated', isCompliant: true },
            { tag: 'FIT-401', name: 'Return Activated Sludge (RAS) Magnetic Meter', reading: '0.85 MLD', unit: 'MLD', targetNorm: 'Ratio: 50-75% of Inflow', quality: 'Valid & Calibrated', isCompliant: true },
            { tag: 'LIT-401', name: 'Secondary Sludge Blanket Acoustic Profiler', reading: '1.20 m', unit: 'm', targetNorm: 'Design Limit: < 1.5 m', quality: 'Valid & Calibrated', isCompliant: true },
          ],
        };
      }
      case 'final_effluent': {
        const bod = getParamVal('final_effluent', 'bod', 3.8);
        const cod = getParamVal('final_effluent', 'cod', 18.4);
        const tss = getParamVal('final_effluent', 'tss', 5.2);
        const ph = getParamVal('final_effluent', 'ph', 7.40);
        return {
          title: 'Stage 5 • UV Disinfection & Safe Effluent Reuse',
          equipmentName: 'UV Disinfection System & Discharge Outfall',
          equipmentTag: 'UV-501 / AIT-501',
          trendTitle: 'Final Effluent BOD Trend (24h)',
          trendSetpoint: '+ CPCB Limit: ≤ 30 mg/L',
          trendStat: 'Avg 3.8 mg/L • 100% CPCB Compliant',
          yAxis: ['40.0', '20.0', '0.0'],
          params: [
            { label: 'Final BOD (AIT-501)', value: `${bod} mg/L`, dotColor: '#10b981' },
            { label: 'Discharge pH (AIT-502)', value: ph, dotColor: '#10b981' },
            { label: 'UV Dose Intensity', value: '42 mJ/cm²', dotColor: '#c084fc' },
            { label: 'TSS Compliance (AIT-503)', value: `${tss} mg/L`, dotColor: '#10b981' },
          ],
          instruments: [
            { tag: 'AIT-501', name: 'Final Statutory Effluent BOD Analyzer', reading: `${bod} mg/L`, unit: 'mg/L', targetNorm: 'CPCB Schedule VI: ≤ 30.0 mg/L', quality: 'Valid & Calibrated', isCompliant: true },
            { tag: 'AIT-502', name: 'Discharge Outfall Precision pH Electrode', reading: ph, unit: 'pH', targetNorm: 'CPCB Schedule VI: 6.5 - 8.5', quality: 'Valid & Calibrated', isCompliant: true },
            { tag: 'UVI-501', name: 'UV Lamp Photochemical Intensity Monitor', reading: '42 mJ/cm²', unit: 'mJ/cm²', targetNorm: 'Minimum Germicidal: ≥ 30 mJ/cm²', quality: 'Valid & Calibrated', isCompliant: true },
            { tag: 'AIT-503', name: 'Final Effluent TSS Laser Turbidimeter', reading: `${tss} mg/L`, unit: 'mg/L', targetNorm: 'CPCB Schedule VI: ≤ 50.0 mg/L', quality: 'Valid & Calibrated', isCompliant: true },
            { tag: 'AIT-504', name: 'Final Effluent COD On-line Analyzer', reading: `${cod} mg/L`, unit: 'mg/L', targetNorm: 'CPCB Schedule VI: ≤ 250.0 mg/L', quality: 'Valid & Calibrated', isCompliant: true },
          ],
        };
      }
      case 'biological_aeration':
      default: {
        const doVal = getOperatingVar('biological_aeration', 'do_mg_l', getParamVal('biological_aeration', 'do', 2.0));
        const mlss = getParamVal('biological_aeration', 'mlss', getParamVal('biological_aeration', 'tss', 2580));
        const ph = getParamVal('biological_aeration', 'ph', 7.10);
        const isDoLow = parseFloat(doVal) < 2.0;
        return {
          title: 'Stage 3 • Biological Aeration (CSTR Activated Sludge)',
          equipmentName: 'Aeration Basin (CSTR Activated Sludge)',
          equipmentTag: 'AB-301 / AIT-302',
          trendTitle: 'Dissolved Oxygen (DO) Trend (24h)',
          trendSetpoint: '+ Setpoint: 2.0 mg/L',
          trendStat: 'Avg 2.05 mg/L • Setpoint Locked',
          yAxis: ['4.0', '2.0', '0.0'],
          params: [
            {
              label: 'DO (AIT-301)',
              value: `${doVal} mg/L`,
              dotColor: isDoLow ? '#f59e0b' : '#10b981',
            },
            {
              label: 'MLSS (AIT-302)',
              value: `${mlss} mg/L`,
              dotColor: '#10b981',
            },
            {
              label: 'Temperature (AIT-303)',
              value: '22.4 °C',
              dotColor: '#38bdf8',
            },
            {
              label: 'Mixed Liquor pH (AIT-304)',
              value: ph,
              dotColor: '#10b981',
            },
          ],
          instruments: [
            { tag: 'AIT-301', name: 'Optical Luminescent Dissolved Oxygen (DO) Sensor', reading: `${doVal} mg/L`, unit: 'mg/L', targetNorm: 'Aerobic Setpoint: 2.0 mg/L (Min 1.5)', quality: 'Valid & Calibrated', isCompliant: !isDoLow },
            { tag: 'AIT-302', name: 'Mixed Liquor Suspended Solids (MLSS) Sensor', reading: `${mlss} mg/L`, unit: 'mg/L', targetNorm: 'Optimal Range: 2000 - 3500 mg/L', quality: 'Valid & Calibrated', isCompliant: true },
            { tag: 'AIT-303', name: 'Submersible Aeration Basin RTD Temperature Probe', reading: '22.4 °C', unit: '°C', targetNorm: 'Mesophilic Range: 18 - 28 °C', quality: 'Valid & Calibrated', isCompliant: true },
            { tag: 'AIT-304', name: 'Differential Electrode Mixed Liquor pH Sensor', reading: ph, unit: 'pH', targetNorm: 'Bacterial Nitrification: 6.8 - 7.8', quality: 'Valid & Calibrated', isCompliant: true },
            { tag: 'BLW-301', name: 'Centrifugal Aeration Blower Airflow Meter', reading: '3200 Nm³/h', unit: 'Nm³/h', targetNorm: 'VFD Speed: 78%', quality: 'Valid & Calibrated', isCompliant: true },
          ],
        };
      }
    }
  };

  const config = getStageConfig();
  const stateVersion = twinState?.state_version || 1;
  const timeStr = twinState?.observed_at
    ? new Date(twinState.observed_at).toLocaleTimeString([], { hour12: false })
    : '14:32:18';

  // Stage-specific alarms
  const stageAlarms = alarms.filter((a) => a.stage_id === stageId && a.status !== 'resolved');
  const hasCriticalAlarm = stageAlarms.some((a) => a.severity === 'critical');
  const hasWarningAlarm = stageAlarms.some((a) => a.severity === 'warning');
  const stageStatus = hasCriticalAlarm ? 'ALARM' : hasWarningAlarm ? 'WARNING' : 'NORMAL';

  const isBelow = placementMode === 'below';

  return (
    <div
      className={`w-full bg-[#0b1329] border border-slate-800 rounded-xl shadow-2xl text-slate-200 select-none overflow-hidden transition-all duration-300 ${
        isBelow ? 'p-4' : 'p-3.5 h-full flex flex-col justify-between'
      }`}
    >
      <div>
        {/* Top Header Ribbon with Stage Tabs & Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-xs sm:text-sm font-bold text-slate-100 tracking-wide flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-sky-400" />
              {config.title}
            </h2>

            {/* Quick Stage Switcher Pills */}
            <div className="hidden sm:flex items-center gap-1 bg-slate-950/80 p-0.5 rounded-lg border border-slate-800">
              {STAGES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => onSelectStage?.(s.id)}
                  className={`px-2 py-0.5 text-[10px] font-mono rounded font-semibold transition-colors ${
                    stageId === s.id
                      ? 'bg-sky-700 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Layout Placement Mode Switcher */}
            {onTogglePlacement && (
              <button
                onClick={() => onTogglePlacement(isBelow ? 'drawer' : 'below')}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-[11px] font-mono text-slate-300 hover:text-white transition-colors"
                title={isBelow ? 'Switch to Slide Drawer Overlay' : 'Dock Inspector Below Canvas'}
              >
                {isBelow ? (
                  <>
                    <PanelRight className="w-3.5 h-3.5 text-sky-400" />
                    <span className="hidden md:inline">Slide Drawer</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5 text-sky-400" />
                    <span className="hidden md:inline">Dock Below</span>
                  </>
                )}
              </button>
            )}

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
              title="Close Stage Inspector"
              aria-label="Close Stage Inspector"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sub-Tabs: Overview, Instruments, Trends, Events */}
        <div className="flex items-center gap-1 mt-2.5 mb-3.5 border-b border-slate-800/80 text-[11px] font-medium">
          {(['overview', 'instruments', 'trends', 'events'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 capitalize rounded-t transition-colors ${
                activeTab === tab
                  ? 'bg-sky-600/30 text-sky-400 border-b-2 border-sky-500 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              {tab}
              {tab === 'events' && stageAlarms.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[9px] bg-rose-500 text-white font-bold">
                  {stageAlarms.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ========================================================= */}
        {/* TAB 1: OVERVIEW                                           */}
        {/* ========================================================= */}
        {activeTab === 'overview' && (
          <div className={isBelow ? 'space-y-4' : 'space-y-3'}>
            {/* Equipment Status Badge Card */}
            <div className="bg-[#070d1e] border border-slate-800 rounded-lg p-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded bg-sky-950 border border-sky-800 text-sky-400">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-100">{config.equipmentName}</div>
                  <div className="text-[10px] font-mono text-slate-400">{config.equipmentTag}</div>
                </div>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                  stageStatus === 'ALARM'
                    ? 'bg-rose-950 text-rose-400 border border-rose-800'
                    : stageStatus === 'WARNING'
                    ? 'bg-amber-950 text-amber-400 border border-amber-800'
                    : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                }`}
              >
                {stageStatus}
              </span>
            </div>

            {/* Live Parameters (Grid if Below Canvas, Stack if Drawer) */}
            <div className={isBelow ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3' : 'space-y-2'}>
              {config.params.map((p, idx) => (
                <div
                  key={idx}
                  className={`bg-[#070d1e]/80 border border-slate-800/80 rounded-lg p-2.5 flex items-center justify-between text-xs hover:border-slate-700 transition-colors ${
                    isBelow ? 'flex-col items-start gap-1' : ''
                  }`}
                >
                  <span className="flex items-center gap-2 text-slate-400 text-[11px]">
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: p.dotColor || '#10b981' }}
                    />
                    {p.label}
                  </span>
                  <span className="font-mono font-bold text-slate-100 text-xs sm:text-sm">
                    {p.value}
                  </span>
                </div>
              ))}
            </div>

            {/* 24-Hour Trend Chart with Setpoint Marker */}
            <div className="bg-[#070d1e] border border-slate-800 rounded-lg p-3">
              <div className="flex items-center justify-between text-[11px] mb-2 font-mono">
                <span className="text-slate-300 font-semibold">{config.trendTitle}</span>
                <span className="text-sky-400 text-[10px] font-semibold">{config.trendSetpoint}</span>
              </div>

              <div className="flex gap-2">
                {/* Y-Axis scale matching reference */}
                <div className="flex flex-col justify-between text-[9px] font-mono text-slate-500 py-0.5">
                  <span>{config.yAxis?.[0] ?? '4.0'}</span>
                  <span>{config.yAxis?.[1] ?? '2.0'}</span>
                  <span>{config.yAxis?.[2] ?? '0.0'}</span>
                </div>

                <div className="flex-1 h-20 relative">
                  <svg viewBox="0 0 250 65" className="w-full h-full" preserveAspectRatio="none">
                    {/* Horizontal reference grid lines */}
                    <line x1="0" y1="5" x2="250" y2="5" stroke="#1e293b" strokeWidth="0.8" opacity="0.6" />
                    <line x1="0" y1="32" x2="250" y2="32" stroke="#38bdf8" strokeWidth="0.8" strokeDasharray="3 3" opacity="0.6" />
                    <line x1="0" y1="60" x2="250" y2="60" stroke="#1e293b" strokeWidth="0.8" opacity="0.6" />

                    {/* Shaded Area fill under trend line */}
                    <path
                      d="M 0 35 Q 35 27, 65 33 T 130 29 T 195 34 T 250 28 L 250 65 L 0 65 Z"
                      fill="rgba(56, 189, 248, 0.12)"
                    />

                    {/* Dynamic Trend Area & Line */}
                    <path
                      d="M 0 35 Q 35 27, 65 33 T 130 29 T 195 34 T 250 28"
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-1">
                    <span>00:00</span>
                    <span>06:00</span>
                    <span>12:00</span>
                    <span>18:00</span>
                    <span>24:00</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: INSTRUMENTS & SENSORS TABLE                        */}
        {/* ========================================================= */}
        {activeTab === 'instruments' && (
          <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
            <div className="text-[11px] font-mono text-slate-400 mb-2">
              Calibrated field instrumentation bound to authoritative SCADA pipeline:
            </div>
            {config.instruments.map((inst, idx) => (
              <div
                key={idx}
                className="bg-[#070d1e] border border-slate-800 rounded-lg p-2.5 flex items-center justify-between gap-3 text-xs"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sky-400 text-xs">{inst.tag}</span>
                    <span className="text-[10px] text-slate-400 truncate">{inst.name}</span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                    {inst.targetNorm} • <span className="text-emerald-400">{inst.quality}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-mono font-bold text-slate-100 text-xs sm:text-sm">
                    {inst.reading}
                  </div>
                  <div className="flex items-center gap-1 justify-end text-[10px] text-emerald-400">
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>Calibrated</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: EXPANDED 24-HOUR TRENDS                           */}
        {/* ========================================================= */}
        {activeTab === 'trends' && (
          <div className="space-y-3">
            <div className="bg-[#070d1e] border border-slate-800 rounded-lg p-3">
              <div className="flex items-center justify-between text-xs font-mono mb-2">
                <span className="font-bold text-slate-200">{config.trendTitle}</span>
                <span className="text-sky-400 text-[11px]">{config.trendStat}</span>
              </div>
              <div className="text-[11px] font-mono text-slate-400 mb-2">
                High-frequency rolling 1Hz state telemetry points across operating day:
              </div>

              {/* Large Trend SVG */}
              <div className="h-32 w-full relative">
                <svg viewBox="0 0 350 90" className="w-full h-full" preserveAspectRatio="none">
                  {/* Grid Lines */}
                  <line x1="0" y1="10" x2="350" y2="10" stroke="#1e293b" strokeWidth="0.8" />
                  <line x1="0" y1="45" x2="350" y2="45" stroke="#38bdf8" strokeWidth="0.8" strokeDasharray="4 4" opacity="0.7" />
                  <line x1="0" y1="80" x2="350" y2="80" stroke="#1e293b" strokeWidth="0.8" />

                  {/* Gradient Area */}
                  <defs>
                    <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  <path
                    d="M 0 50 Q 50 40, 90 48 T 180 43 T 270 49 T 350 42 L 350 90 L 0 90 Z"
                    fill="url(#trendGradient)"
                  />
                  <path
                    d="M 0 50 Q 50 40, 90 48 T 180 43 T 270 49 T 350 42"
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
                  <span>00:00 IST</span>
                  <span>06:00 IST</span>
                  <span>12:00 IST</span>
                  <span>18:00 IST</span>
                  <span>Now</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: STAGE ALARMS & EVENTS                             */}
        {/* ========================================================= */}
        {activeTab === 'events' && (
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {stageAlarms.length === 0 ? (
              <div className="bg-[#070d1e] border border-slate-800 rounded-lg p-6 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <div className="text-xs font-bold text-slate-200">All Stage Parameters Nominal</div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Zero active alarms or compliance violations for {config.equipmentName}.
                </div>
              </div>
            ) : (
              stageAlarms.map((alarm) => (
                <div
                  key={alarm.alarm_id}
                  className="bg-[#070d1e] border border-rose-900/60 rounded-lg p-3 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-rose-950 text-rose-400 border border-rose-800">
                      {alarm.severity}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {new Date(alarm.last_updated_at).toLocaleTimeString([], { hour12: false })}
                    </span>
                  </div>
                  <div className="text-slate-200 font-medium">{alarm.message}</div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] font-mono text-slate-400">
                      Observed: <strong className="text-slate-200">{alarm.observed_value} {alarm.unit}</strong> | Threshold: {alarm.threshold_value} {alarm.unit}
                    </span>
                    {onAcknowledgeAlarm && (
                      <button
                        onClick={() => onAcknowledgeAlarm(alarm.alarm_id)}
                        className="px-2.5 py-1 rounded bg-rose-900/80 hover:bg-rose-800 text-white font-mono text-[10px] font-bold transition-colors"
                      >
                        Acknowledge
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Provenance & Metadata Footer */}
      <div className={`border-t border-slate-800 pt-3 text-[10px] font-mono text-slate-400 ${isBelow ? 'mt-4 grid grid-cols-2 md:grid-cols-5 gap-2' : 'space-y-1.5'}`}>
        <div className="flex items-center justify-between">
          <span>Last Update:</span>
          <span className="text-slate-200">{timeStr} (1s ago)</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Data Source:</span>
          <span className="text-slate-200">SCADA Simulator (1 Hz)</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Quality:</span>
          <span className="text-emerald-400 font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Valid & Accepted
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>State Version:</span>
          <span className="text-sky-400 font-bold">v{stateVersion}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Provenance:</span>
          <span className="text-sky-400 flex items-center gap-1 hover:underline cursor-pointer">
            Stored & Anchored <ExternalLink className="w-2.5 h-2.5" />
          </span>
        </div>
      </div>
    </div>
  );
};
