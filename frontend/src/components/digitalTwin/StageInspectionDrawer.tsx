import React from 'react';
import {
  X,
  Layers,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Gauge,
  Flame,
  ArrowRight,
  ShieldCheck,
  Cpu,
  Droplets,
  Zap,
  Wind,
  RotateCw,
  Waves,
  Radio,
  FileCheck2,
} from 'lucide-react';
import { TwinState, TwinAlarmEvent } from '../../types/digitalTwin';

interface StageInspectionDrawerProps {
  stageId: string | null;
  twinState: TwinState | null;
  alarms: TwinAlarmEvent[];
  onClose: () => void;
  onAcknowledgeAlarm: (alarmId: string) => void;
}

interface StageEquipment {
  name: string;
  tag: string;
  status: 'online' | 'nominal' | 'standby';
  metric: string;
}

interface OperationalKpi {
  label: string;
  key: string;
  defaultVal: number | string;
  unit: string;
  status: 'optimal' | 'normal' | 'caution';
  tag: string;
}

interface StageParamDef {
  key: string;
  label: string;
  defaultVal: number;
  unit: string;
  standardNorm: string;
  isCpcbStatutory?: boolean;
  minLimit?: number;
  maxLimit?: number;
}

interface StageDefinition {
  id: string;
  name: string;
  subtitle: string;
  type: string;
  sequenceOrder: number;
  nominalHrtHours: number;
  designObjective: string;
  kineticsDescription: string;
  mechanicsNote: string;
  equipment: StageEquipment[];
  kpis: OperationalKpi[];
  parameters: StageParamDef[];
}

const STAGE_DEFINITIONS: Record<string, StageDefinition> = {
  inlet: {
    id: 'inlet',
    name: 'Raw Influent Inlet & Bar Screening',
    subtitle: 'Stage 1 of 5 • Headworks & Mechanical Pretreatment',
    type: 'Mechanical Pretreatment & Screening',
    sequenceOrder: 1,
    nominalHrtHours: 0.25,
    designObjective: 'Debris interception (>10mm), hydraulic dampening & grit protection',
    kineticsDescription:
      'Physical interceptor screening that extracts non-biodegradable debris and rags. Raw unattenuated municipal sewage enters with high diurnal concentration variances.',
    mechanicsNote: 'Governed by hydraulic head loss across inclined bar rack Δh = β(s/b)^(4/3)·(v²/2g)·sin(θ).',
    equipment: [
      { name: 'Mechanically Raked Coarse Screen', tag: 'SCR-101A', status: 'online', metric: 'Headloss: 18 mm' },
      { name: 'Fine Rotary Drum Screen (3mm)', tag: 'SCR-102B', status: 'online', metric: 'Speed: 12 RPM' },
      { name: 'Vortex Grit Degritter Chamber', tag: 'VGC-101', status: 'online', metric: 'Capture: 0.85 t/d' },
      { name: 'Ultrasonic Open Channel Level Sensor', tag: 'LIT-101', status: 'online', metric: 'Channel: 1.42 m' },
    ],
    kpis: [
      { label: 'Influent Flow Rate', key: 'inflow_rate', defaultVal: 10.0, unit: 'MLD', status: 'optimal', tag: 'FIT-101' },
      { label: 'Screen Differential Head', key: 'screen_diff_head', defaultVal: 18.2, unit: 'mm', status: 'optimal', tag: 'PDIT-102' },
      { label: 'Influent Water Temp', key: 'water_temp', defaultVal: 22.5, unit: '°C', status: 'optimal', tag: 'TIT-101' },
      { label: 'Grit Extraction Rate', key: 'grit_extraction', defaultVal: 0.85, unit: 'tons/d', status: 'normal', tag: 'WIT-104' },
    ],
    parameters: [
      { key: 'bod', label: 'Raw Influent BOD', defaultVal: 185.0, unit: 'mg/L', standardNorm: 'Design Inflow: 150–250' },
      { key: 'cod', label: 'Raw Influent COD', defaultVal: 410.0, unit: 'mg/L', standardNorm: 'Design Inflow: 350–550' },
      { key: 'tss', label: 'Raw Influent TSS', defaultVal: 210.0, unit: 'mg/L', standardNorm: 'Design Inflow: 180–300' },
      { key: 'ph', label: 'Influent pH', defaultVal: 7.40, unit: 'pH', standardNorm: 'Boundary: 6.5 – 8.5', minLimit: 6.5, maxLimit: 8.5 },
      { key: 'nh4_n', label: 'Raw Ammonia (NH4-N)', defaultVal: 30.0, unit: 'mg/L', standardNorm: 'Design Inflow: 25–45' },
    ],
  },
  primary_clarifier: {
    id: 'primary_clarifier',
    name: 'Primary Clarification Sedimentation Basin',
    subtitle: 'Stage 2 of 5 • Gravitational Phase Separation',
    type: 'Gravitational Discrete Sedimentation',
    sequenceOrder: 2,
    nominalHrtHours: 2.0,
    designObjective: '55–65% TSS removal, 25–35% particulate BOD attenuation prior to biological aeration',
    kineticsDescription:
      'Discrete particle settling under quiescent laminar conditions governed by Stokes Law. Heavy settleable solids consolidate in the bottom conical hopper while clarified supernatant overflows the peripheral V-notch weirs.',
    mechanicsNote: 'Terminal settling velocity Vs = g(ρp - ρ)d² / (18μ). Surface overflow rate design: 25–35 m³/m²·d.',
    equipment: [
      { name: 'Radial Sludge Scraper Bridge', tag: 'SCR-201', status: 'online', metric: 'Torque: 18% nominal' },
      { name: 'Peripheral V-Notch Weir Trough', tag: 'WEIR-201', status: 'online', metric: 'Crest: Level' },
      { name: 'Sludge Blanket Ultrasonic Probe', tag: 'LIT-202', status: 'online', metric: 'Blanket: 0.85 m' },
      { name: 'Primary Sludge Drawoff Pump A', tag: 'PMP-201A', status: 'online', metric: 'Flow: 0.42 MLD' },
    ],
    kpis: [
      { label: 'Surface Overflow Rate (SOR)', key: 'sor', defaultVal: 28.4, unit: 'm³/m²·d', status: 'optimal', tag: 'CALC-201' },
      { label: 'Detention Time', key: 'detention_time', defaultVal: 2.0, unit: 'Hours', status: 'optimal', tag: 'CALC-202' },
      { label: 'Sludge Blanket Depth', key: 'sludge_blanket_depth', defaultVal: 0.85, unit: 'm', status: 'optimal', tag: 'LIT-202' },
      { label: 'TSS Removal Efficiency', key: 'tss_removal', defaultVal: 60.0, unit: '%', status: 'optimal', tag: 'EFF-201' },
    ],
    parameters: [
      { key: 'bod', label: 'Clarified BOD', defaultVal: 146.2, unit: 'mg/L', standardNorm: '21% Attenuation' },
      { key: 'cod', label: 'Clarified COD', defaultVal: 336.2, unit: 'mg/L', standardNorm: '18% Attenuation' },
      { key: 'tss', label: 'Settled Supernatant TSS', defaultVal: 84.0, unit: 'mg/L', standardNorm: '60% TSS Reduction' },
      { key: 'ph', label: 'Basin pH', defaultVal: 7.40, unit: 'pH', standardNorm: 'Laminar Stable (6.5 – 8.5)', minLimit: 6.5, maxLimit: 8.5 },
      { key: 'nh4_n', label: 'Soluble Ammonia (NH4-N)', defaultVal: 30.0, unit: 'mg/L', standardNorm: 'Conservative (Soluble)' },
    ],
  },
  biological_aeration: {
    id: 'biological_aeration',
    name: 'Biological Aeration Basin (CSTR Activated Sludge)',
    subtitle: 'Stage 3 of 5 • Core Biochemical Oxidation & Nitrification',
    type: 'Biochemical Degradation & Nitrification',
    sequenceOrder: 3,
    nominalHrtHours: 8.0,
    designObjective: 'Heterotrophic BOD mineralisation & autotrophic Nitrosomonas/Nitrobacter nitrification',
    kineticsDescription:
      'Continuous Stirred-Tank Reactor (CSTR) hosting mixed liquor suspended biomass. Fine-bubble ceramic diffusers provide dissolved oxygen for organic carbon catabolism and two-step ammonia nitrification into nitrate.',
    mechanicsNote:
      'Substrate uptake: dS/dt = - (μmax / Y) · [S / (Ks + S)] · [DO / (Ko + DO)] · X. Nitrification consumes ~7.14 mg CaCO3 alkalinity per mg NH4-N oxidized.',
    equipment: [
      { name: 'Twin Multistage Centrifugal Blowers', tag: 'BLW-301A/B', status: 'online', metric: 'Airflow: 4,200 Nm³/h' },
      { name: 'Fine-Bubble Ceramic Grid Diffusers', tag: 'DIF-301', status: 'online', metric: 'Pressure: 0.62 bar' },
      { name: 'Optical Luminescent DO Probe', tag: 'AIT-301', status: 'online', metric: 'DO: 2.15 mg/L' },
      { name: 'Submersible MLSS Optical Turbidimeter', tag: 'AIT-302', status: 'online', metric: 'MLSS: 2,580 mg/L' },
    ],
    kpis: [
      { label: 'Dissolved Oxygen (DO)', key: 'do_mg_l', defaultVal: 2.15, unit: 'mg/L', status: 'optimal', tag: 'AIT-301' },
      { label: 'Mixed Liquor MLSS', key: 'mlss', defaultVal: 2580, unit: 'mg/L', status: 'optimal', tag: 'AIT-302' },
      { label: 'Food-to-Mass (F/M) Ratio', key: 'fm_ratio', defaultVal: 0.28, unit: 'kg BOD/kg MLSS·d', status: 'optimal', tag: 'CALC-301' },
      { label: 'Solids Retention Time (SRT)', key: 'srt_days', defaultVal: 10.5, unit: 'Days', status: 'optimal', tag: 'CALC-302' },
    ],
    parameters: [
      { key: 'bod', label: 'Aeration Stage BOD', defaultVal: 22.7, unit: 'mg/L', standardNorm: '84.5% Oxidation', maxLimit: 35.0 },
      { key: 'cod', label: 'Degraded Soluble COD', defaultVal: 75.2, unit: 'mg/L', standardNorm: '77.6% Mineralisation', maxLimit: 120.0 },
      { key: 'tss', label: 'Mixed Liquor Solids (MLSS)', defaultVal: 2580.0, unit: 'mg/L', standardNorm: 'Target: 2000–3500', minLimit: 2000, maxLimit: 4000 },
      { key: 'nh4_n', label: 'Nitrified Ammonia (NH4-N)', defaultVal: 4.5, unit: 'mg/L', standardNorm: '85% Nitrification', maxLimit: 10.0 },
      { key: 'ph', label: 'Basin pH (Alkalinity Buffered)', defaultVal: 7.10, unit: 'pH', standardNorm: 'Optimal: 6.8 – 7.8', minLimit: 6.8, maxLimit: 7.8 },
    ],
  },
  secondary_clarifier: {
    id: 'secondary_clarifier',
    name: 'Secondary Clarifier & Biomass Decanter',
    subtitle: 'Stage 4 of 5 • Sludge Compaction & RAS Recirculation',
    type: 'Hindered Zone Settling & Phase Separation',
    sequenceOrder: 4,
    nominalHrtHours: 3.5,
    designObjective: 'Biomass phase separation, RAS concentration maintenance (>8000 mg/L) and clear supernatant decanting',
    kineticsDescription:
      'Hindered zone sedimentation separating activated sludge flocs from treated water. Concentrated biomass is recycled back to Stage 3 via the Return Activated Sludge (RAS) loop to sustain mixed liquor inventory, while excess biomass is drawn off as WAS.',
    mechanicsNote: 'Sludge Volume Index SVI = (Settled Sludge Vol in 30 min, mL/L) · 1000 / (MLSS, mg/L). Nominal SVI: 80–120 mL/g.',
    equipment: [
      { name: 'Spiral Blade Sludge Collector Scraper', tag: 'SCR-401', status: 'online', metric: 'Drive: 0.03 RPM' },
      { name: 'RAS Recirculation Centrifugal Pumps', tag: 'PMP-401A/B', status: 'online', metric: 'Recycle: 0.85 MLD' },
      { name: 'WAS Surplus Sludge Drawoff Flowmeter', tag: 'FIT-402', status: 'online', metric: 'Drawoff: 0.08 MLD' },
      { name: 'Sonar Sludge Blanket Level Interface', tag: 'LIT-401', status: 'online', metric: 'Blanket: 1.20 m' },
    ],
    kpis: [
      { label: 'Sludge Volume Index (SVI)', key: 'svi', defaultVal: 110, unit: 'mL/g', status: 'optimal', tag: 'LAB-401' },
      { label: 'Sludge Blanket Depth', key: 'blanket_depth', defaultVal: 1.20, unit: 'm', status: 'optimal', tag: 'LIT-401' },
      { label: 'RAS Recirculation Flow', key: 'ras_flow', defaultVal: 0.85, unit: 'MLD', status: 'optimal', tag: 'FIT-401' },
      { label: 'RAS Underflow Concentration', key: 'ras_mlss', defaultVal: 8200, unit: 'mg/L', status: 'optimal', tag: 'AIT-403' },
    ],
    parameters: [
      { key: 'bod', label: 'Clarified Effluent BOD', defaultVal: 20.8, unit: 'mg/L', standardNorm: 'Pre-Disinfection' },
      { key: 'cod', label: 'Clarified Effluent COD', defaultVal: 70.6, unit: 'mg/L', standardNorm: 'Pre-Disinfection' },
      { key: 'tss', label: 'Clarified Suspended Solids', defaultVal: 10.4, unit: 'mg/L', standardNorm: 'Polished Overflow: < 15', maxLimit: 20.0 },
      { key: 'nh4_n', label: 'Residual Ammonia (NH4-N)', defaultVal: 4.5, unit: 'mg/L', standardNorm: 'Nitrified State' },
      { key: 'ph', label: 'Clarifier Effluent pH', defaultVal: 7.10, unit: 'pH', standardNorm: 'Optimal: 6.8 – 7.8', minLimit: 6.5, maxLimit: 8.5 },
    ],
  },
  final_effluent: {
    id: 'final_effluent',
    name: 'UV Disinfection & Safe Effluent Reuse',
    subtitle: 'Stage 5 of 5 • Pathogen Inactivation & Compliance Gating',
    type: 'Photochemical UV-C Germicidal Inactivation',
    sequenceOrder: 5,
    nominalHrtHours: 0.75,
    designObjective: 'Statutory CPCB Schedule VI compliance & Safe Circular Water Reuse gating',
    kineticsDescription:
      'Photochemical germicidal inactivation utilizing medium-pressure UV-C lamps at 254 nm wavelength. Induces thymine dimer cross-linking in microbial DNA, achieving 3-log (99.9%) pathogen inactivation with zero chlorinated DBPs.',
    mechanicsNote: 'Germicidal dose D = Iavg · t (mJ/cm²). Continuous CPCB Schedule VI water quality compliance monitoring.',
    equipment: [
      { name: 'Medium-Pressure UV Lamp Banks', tag: 'UV-501A/B', status: 'online', metric: 'Intensity: 98% nominal' },
      { name: 'Dual Automatic Pneumatic Wipers', tag: 'WPR-501', status: 'online', metric: 'Cycle: Every 60 min' },
      { name: 'Online UVT Spectrophotometer (254nm)', tag: 'AIT-501', status: 'online', metric: 'UVT: 68.5%' },
      { name: 'Automated 3-Way Reuse Diverter Gate', tag: 'XCV-501', status: 'online', metric: 'Reuse: 6.5 MLD' },
    ],
    kpis: [
      { label: 'Delivered UV-C Dose', key: 'uv_dose', defaultVal: 42.0, unit: 'mJ/cm²', status: 'optimal', tag: 'CALC-501' },
      { label: 'UV Transmittance (@254nm)', key: 'uvt', defaultVal: 68.5, unit: '%', status: 'optimal', tag: 'AIT-501' },
      { label: 'Fecal Coliform Count', key: 'coliform', defaultVal: '< 100', unit: 'MPN/100 mL', status: 'optimal', tag: 'LAB-502' },
      { label: 'Circular Water Allocation', key: 'reuse_flow', defaultVal: '65% Reuse / 35% Outfall', unit: 'MLD split', status: 'optimal', tag: 'VALV-501' },
    ],
    parameters: [
      { key: 'bod', label: 'Final Discharged BOD', defaultVal: 20.8, unit: 'mg/L', standardNorm: 'CPCB Limit: ≤ 30.0', isCpcbStatutory: true, maxLimit: 30.0 },
      { key: 'cod', label: 'Final Discharged COD', defaultVal: 70.6, unit: 'mg/L', standardNorm: 'CPCB Limit: ≤ 250.0', isCpcbStatutory: true, maxLimit: 250.0 },
      { key: 'tss', label: 'Final Discharged TSS', defaultVal: 10.4, unit: 'mg/L', standardNorm: 'CPCB Limit: ≤ 50.0', isCpcbStatutory: true, maxLimit: 50.0 },
      { key: 'nh4_n', label: 'Final Discharged NH4-N', defaultVal: 4.5, unit: 'mg/L', standardNorm: 'CPCB Limit: ≤ 25.0', isCpcbStatutory: true, maxLimit: 25.0 },
      { key: 'ph', label: 'Final Discharged pH', defaultVal: 7.34, unit: 'pH', standardNorm: 'CPCB Range: 6.5 – 8.5', isCpcbStatutory: true, minLimit: 6.5, maxLimit: 8.5 },
    ],
  },
};

export const StageInspectionDrawer: React.FC<StageInspectionDrawerProps> = ({
  stageId,
  twinState,
  alarms,
  onClose,
  onAcknowledgeAlarm,
}) => {
  if (!stageId) return null;

  const stageDef = STAGE_DEFINITIONS[stageId] || STAGE_DEFINITIONS['inlet'];
  const stageState = twinState?.stage_states?.[stageId];
  const liveParams = stageState?.parameters || {};
  const liveOpVars = stageState?.operating_variables || {};

  // Extract clean number helper
  const parseNum = (v: unknown): number | null => {
    if (v === null || v === undefined) return null;
    if (typeof v === 'number') return isNaN(v) ? null : v;
    if (typeof v === 'object' && 'value' in v) {
      const val = (v as { value?: unknown }).value;
      return typeof val === 'number' && !isNaN(val) ? val : null;
    }
    return null;
  };

  const stageAlarms = alarms.filter((a) => a.stage_id === stageId && a.status !== 'resolved');

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex max-w-full pl-6 sm:pl-10">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Slide-Over Panel */}
      <div className="relative w-screen max-w-lg bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col z-10 overflow-y-auto">
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-950/90 sticky top-0 z-20 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-lg bg-sky-950/80 border border-sky-800 text-sky-400 mt-0.5">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-mono font-bold tracking-wider px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800">
                  {stageDef.type}
                </span>
                <span className="text-[10px] font-mono font-semibold text-slate-400">
                  Stage {stageDef.sequenceOrder} of 5
                </span>
              </div>
              <h2 className="text-base font-bold text-slate-100 mt-1">{stageDef.name}</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">{stageDef.subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="p-5 space-y-6 flex-1 text-xs">
          {/* Active Alarms for this Specific Stage */}
          {stageAlarms.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-rose-300">
                <AlertTriangle className="w-4 h-4 text-rose-400 animate-pulse" />
                <span>Active Alarms in this Basin ({stageAlarms.length})</span>
              </div>
              <div className="space-y-2">
                {stageAlarms.map((alarm) => (
                  <div
                    key={alarm.alarm_id}
                    className={`p-3 rounded-lg border flex flex-col gap-2 ${
                      alarm.severity === 'critical'
                        ? 'bg-rose-950/50 border-rose-800 text-rose-200'
                        : 'bg-amber-950/50 border-amber-800 text-amber-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-[10px] uppercase px-1.5 py-0.5 rounded bg-slate-900/80 border border-current">
                        {alarm.severity}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">
                        {new Date(alarm.last_updated_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="font-sans text-xs leading-relaxed">{alarm.message}</p>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                      <span className="font-mono text-[10px]">
                        Observed: {alarm.observed_value !== null ? alarm.observed_value : '—'} {alarm.unit}
                      </span>
                      {!alarm.acknowledged ? (
                        <button
                          onClick={() => onAcknowledgeAlarm(alarm.alarm_id)}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-[10px] font-semibold border border-slate-600 transition-colors"
                        >
                          Acknowledge
                        </button>
                      ) : (
                        <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Acknowledged
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Real-Time Operational Variables & KPIs */}
          <div className="space-y-2.5">
            <h3 className="font-bold text-slate-200 flex items-center gap-1.5">
              <Gauge className="w-4 h-4 text-sky-400" />
              Stage Operational Variables & KPIs
            </h3>
            <div className="grid grid-cols-2 gap-2.5">
              {stageDef.kpis.map((kpi) => {
                // Check if live operating variable is available
                const liveVal = liveOpVars[kpi.key];
                const displayVal = liveVal !== undefined ? liveVal : kpi.defaultVal;

                return (
                  <div
                    key={kpi.key}
                    className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>{kpi.tag}</span>
                      <span className="text-emerald-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        {kpi.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="mt-1.5">
                      <span className="text-slate-400 text-[11px] block">{kpi.label}</span>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className="text-sm font-bold font-mono text-slate-100">
                          {typeof displayVal === 'number' ? displayVal.toLocaleString() : displayVal}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">{kpi.unit}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Real-Time Biochemical / Physico-Chemical Telemetry Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-200 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-amber-400" />
                Live Stage Concentrations & Limits
              </h3>
              {stageDef.id === 'final_effluent' && (
                <span className="text-[10px] font-mono font-bold text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-800 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> CPCB Schedule VI
                </span>
              )}
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-lg overflow-hidden">
              <table className="w-full text-left font-mono text-[11px]">
                <thead>
                  <tr className="bg-slate-900/90 text-slate-400 border-b border-slate-800">
                    <th className="py-2 px-3 font-semibold">Parameter</th>
                    <th className="py-2 px-3 font-semibold">Stage Value</th>
                    <th className="py-2 px-3 font-semibold">Stage Objective / Limit</th>
                    <th className="py-2 px-3 font-semibold text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {stageDef.parameters.map((param) => {
                    const parsedLive = parseNum(liveParams[param.key]);
                    const effectiveVal = parsedLive !== null ? parsedLive : param.defaultVal;

                    let isViolation = false;
                    if (param.maxLimit !== undefined && effectiveVal > param.maxLimit) {
                      isViolation = true;
                    }
                    if (param.minLimit !== undefined && effectiveVal < param.minLimit) {
                      isViolation = true;
                    }

                    return (
                      <tr key={param.key} className="hover:bg-slate-900/50">
                        <td className="py-2.5 px-3 text-slate-300 font-medium">
                          {param.label}
                        </td>
                        <td className="py-2.5 px-3 text-slate-100 font-bold">
                          {effectiveVal.toFixed(param.key === 'ph' ? 2 : 1)}{' '}
                          <span className="text-[10px] text-slate-500 font-normal">
                            {param.unit}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-400">
                          {param.standardNorm}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {isViolation ? (
                            <span className="px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 text-[10px] font-bold">
                              EXCEEDED
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold">
                              {param.isCpcbStatutory ? 'PASS' : 'NOMINAL'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Kinetic & Hydraulic Process Modeling Mechanics */}
          <div className="space-y-2.5">
            <h3 className="font-bold text-slate-200 flex items-center gap-1.5">
              <FileCheck2 className="w-4 h-4 text-purple-400" />
              Kinetic & Hydraulic Assumptions
            </h3>
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-2.5 text-slate-300">
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Nominal Stage HRT:</span>
                <span className="font-mono font-bold text-slate-200">{stageDef.nominalHrtHours} Hours</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Design Treatment Objective:</span>
                <span className="font-medium text-slate-200 text-right">{stageDef.designObjective}</span>
              </div>
              <div className="pt-1">
                <span className="text-slate-400 block text-[11px] mb-1 font-semibold">Biological / Physical Kinetics:</span>
                <p className="text-[11px] leading-relaxed text-slate-300 bg-slate-900/80 p-2.5 rounded border border-slate-800">
                  {stageDef.kineticsDescription}
                </p>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px] mb-1 font-semibold">Governing Mechanics:</span>
                <p className="text-[11px] font-mono leading-relaxed text-sky-300 bg-slate-900/80 p-2 rounded border border-slate-800">
                  {stageDef.mechanicsNote}
                </p>
              </div>
            </div>
          </div>

          {/* Active SCADA Instrumentation & Equipment Assets */}
          <div className="space-y-2">
            <h3 className="font-bold text-slate-200 flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-indigo-400" />
              SCADA Instrumentation & Actuators
            </h3>
            <div className="grid grid-cols-1 gap-1.5">
              {stageDef.equipment.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-slate-950 border border-slate-800/80 px-3 py-2 rounded-lg flex items-center justify-between text-slate-300"
                >
                  <div>
                    <span className="text-[11px] font-medium text-slate-200 block">{item.name}</span>
                    <span className="text-[10px] font-mono text-slate-500">{item.tag}</span>
                  </div>
                  <div className="text-right">
                    <span className="flex items-center gap-1 font-mono text-[10px] text-emerald-400 justify-end">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> ONLINE
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 block mt-0.5">{item.metric}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/90 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors border border-slate-700 shadow-sm"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
