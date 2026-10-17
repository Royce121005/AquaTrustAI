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
} from 'lucide-react';
import { TwinState, TwinAlarmEvent } from '../../types/digitalTwin';

interface StageInspectionDrawerProps {
  stageId: string | null;
  twinState: TwinState | null;
  alarms: TwinAlarmEvent[];
  onClose: () => void;
  onAcknowledgeAlarm: (alarmId: string) => void;
}

interface StageMetadata {
  name: string;
  type: string;
  kinetics: string;
  hrtHours: number;
  designObjective: string;
  equipment: string[];
}

const STAGE_METADATA: Record<string, StageMetadata> = {
  inlet: {
    name: 'Raw Influent Inlet & Bar Screening',
    type: 'Mechanical Pretreatment',
    kinetics: 'Physical interceptor screen separating coarse debris (>10mm) and grit particles without biological conversion.',
    hrtHours: 0.25,
    designObjective: 'Debris removal & flow dampening',
    equipment: ['Coarse Bar Screen', 'Fine Rotary Drum Screen', 'Vortex Grit Chamber', 'Ultrasonic Level Sensor'],
  },
  primary_clarifier: {
    name: 'Primary Clarification Basin',
    type: 'Physical Sedimentation',
    kinetics: 'Gravitational discrete particle settling governed by Stokes Law. Attenuates organic suspended solids prior to biological aeration.',
    hrtHours: 2.0,
    designObjective: '55-65% TSS removal, 25-35% BOD removal',
    equipment: ['Radial Sludge Scraper Bridge', 'Peripheral V-Notch Weir Crest', 'Submerged Scum Baffle', 'Telescopic Sludge Valve'],
  },
  biological_aeration: {
    name: 'Biological Aeration Basin (CSTR)',
    type: 'Biochemical Degradation',
    kinetics: 'Suspended-growth mixed liquor with Monod substrate uptake kinetics. Autotrophic Nitrosomonas/Nitrobacter nitrification converting NH4-N to NO3-N.',
    hrtHours: 8.0,
    designObjective: 'Heterotrophic BOD oxidation & complete nitrification',
    equipment: ['Fine-Bubble Ceramic Diffuser Grid', 'Twin Multistage Centrifugal Blowers', 'Optical Luminescent DO Probe', 'Submersible Nitrate Sensor'],
  },
  secondary_clarifier: {
    name: 'Secondary Clarifier & Biomass Decanter',
    type: 'Zone Settling & Phase Separation',
    kinetics: 'Hindered zone sedimentation with Return Activated Sludge (RAS) concentration and Waste Activated Sludge (WAS) drawoff.',
    hrtHours: 3.5,
    designObjective: 'Biomass separation, RAS recycle maintenance (>8000 mg/L MLSS)',
    equipment: ['Center-Feed Energy Dissipating Well', 'Spiral Blade Sludge Scraper', 'RAS Recirculation Centrifugal Pumps', 'WAS Drawoff Meter'],
  },
  final_effluent: {
    name: 'UV Disinfection & Safe Effluent Reuse',
    type: 'Pathogen Inactivation & Polishing',
    kinetics: 'Photochemical UV-C germicidal cross-linking (254 nm wavelength) providing 3-log (99.9%) pathogen inactivation with zero chemical residual.',
    hrtHours: 0.75,
    designObjective: 'CPCB Schedule VI compliance & Safe Circular Water Reuse',
    equipment: ['Medium-Pressure UV Lamp Banks', 'Dual Automatic Wiper Sleeves', 'Turbidity Spectrophotometer', 'Automated Three-Way Reuse Diverter'],
  },
};

const CPCB_LIMITS: Record<string, { limit: number; unit: string; operator: '<=' | '>=' }> = {
  bod: { limit: 30.0, unit: 'mg/L', operator: '<=' },
  cod: { limit: 250.0, unit: 'mg/L', operator: '<=' },
  tss: { limit: 50.0, unit: 'mg/L', operator: '<=' },
  nh4_n: { limit: 25.0, unit: 'mg/L', operator: '<=' },
  ph_low: { limit: 6.5, unit: 'pH units', operator: '>=' },
  ph_high: { limit: 8.5, unit: 'pH units', operator: '<=' },
  do: { limit: 2.0, unit: 'mg/L', operator: '>=' },
};

export const StageInspectionDrawer: React.FC<StageInspectionDrawerProps> = ({
  stageId,
  twinState,
  alarms,
  onClose,
  onAcknowledgeAlarm,
}) => {
  if (!stageId) return null;

  const meta = STAGE_METADATA[stageId] || {
    name: stageId,
    type: 'Treatment Unit',
    kinetics: 'Standard wastewater treatment process model.',
    hrtHours: 4.0,
    designObjective: 'Effluent quality maintenance',
    equipment: ['Process Sensors', 'Pumping Equipment'],
  };

  const stageState = twinState?.stage_states?.[stageId];
  const parameters = stageState?.parameters || {};
  const operatingVars = stageState?.operating_variables || {};

  // Extract clean number
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
    <div className="fixed inset-y-0 right-0 z-50 flex max-w-full pl-10">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Slide-Over Panel */}
      <div className="relative w-screen max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col z-10 overflow-y-auto">
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-950/80 sticky top-0 z-20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-sky-950/60 border border-sky-800/60 text-sky-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-sky-400">
                {meta.type}
              </span>
              <h2 className="text-base font-bold text-slate-100">{meta.name}</h2>
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
          {/* Active Alarms for this Stage */}
          {stageAlarms.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-slate-200">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Active Stage Alarms ({stageAlarms.length})</span>
              </div>
              <div className="space-y-2">
                {stageAlarms.map((alarm) => (
                  <div
                    key={alarm.alarm_id}
                    className={`p-3 rounded-lg border flex flex-col gap-2 ${
                      alarm.severity === 'critical'
                        ? 'bg-rose-950/40 border-rose-800 text-rose-200'
                        : 'bg-amber-950/40 border-amber-800 text-amber-200'
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

          {/* Real-Time Parameter Telemetry */}
          <div className="space-y-2">
            <h3 className="font-bold text-slate-200 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-sky-400" />
              Live Stage Concentrations & Limits
            </h3>
            <div className="bg-slate-950 border border-slate-800 rounded-lg overflow-hidden">
              <table className="w-full text-left font-mono text-[11px]">
                <thead>
                  <tr className="bg-slate-900 text-slate-400 border-b border-slate-800">
                    <th className="py-2 px-3 font-semibold">Parameter</th>
                    <th className="py-2 px-3 font-semibold">Value</th>
                    <th className="py-2 px-3 font-semibold">CPCB Norm</th>
                    <th className="py-2 px-3 font-semibold text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {['bod', 'cod', 'tss', 'nh4_n', 'ph'].map((paramKey) => {
                    const rawVal = parseNum(parameters[paramKey]);
                    const limitObj = CPCB_LIMITS[paramKey];
                    let isExceeded = false;
                    if (rawVal !== null && limitObj) {
                      isExceeded = limitObj.operator === '<=' ? rawVal > limitObj.limit : rawVal < limitObj.limit;
                    }
                    if (paramKey === 'ph' && rawVal !== null) {
                      isExceeded = rawVal < 6.5 || rawVal > 8.5;
                    }

                    return (
                      <tr key={paramKey} className="hover:bg-slate-900/50">
                        <td className="py-2 px-3 uppercase text-slate-300 font-medium">
                          {paramKey === 'nh4_n' ? 'NH4-N' : paramKey}
                        </td>
                        <td className="py-2 px-3 text-slate-100 font-bold">
                          {rawVal !== null ? rawVal.toFixed(paramKey === 'ph' ? 2 : 1) : '—'}{' '}
                          <span className="text-[10px] text-slate-500 font-normal">
                            {paramKey === 'ph' ? '' : 'mg/L'}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-400">
                          {paramKey === 'ph' ? '6.5 – 8.5' : limitObj ? `≤ ${limitObj.limit}` : '—'}
                        </td>
                        <td className="py-2 px-3 text-right">
                          {rawVal === null ? (
                            <span className="text-slate-600">—</span>
                          ) : isExceeded ? (
                            <span className="px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 text-[10px] font-bold">
                              VIOLATION
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold">
                              PASS
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

          {/* Hydraulic & Kinetic Engineering Specifications */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-200 flex items-center gap-1.5">
              <Gauge className="w-4 h-4 text-amber-400" />
              Kinetic & Hydraulic Assumptions
            </h3>
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-2 text-slate-300">
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Nominal HRT:</span>
                <span className="font-mono font-bold text-slate-200">{meta.hrtHours} Hours</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Design Objective:</span>
                <span className="font-medium text-slate-200">{meta.designObjective}</span>
              </div>
              <div className="pt-1">
                <span className="text-slate-400 block text-[11px] mb-1">Process Mechanics:</span>
                <p className="text-[11px] leading-relaxed text-slate-400 bg-slate-900 p-2 rounded border border-slate-800">
                  {meta.kinetics}
                </p>
              </div>
            </div>
          </div>

          {/* Active Equipment Assets */}
          <div className="space-y-2">
            <h3 className="font-bold text-slate-200 flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-purple-400" />
              SCADA Instrumentation & Assets
            </h3>
            <div className="grid grid-cols-1 gap-1.5">
              {meta.equipment.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-slate-950 border border-slate-800/80 px-2.5 py-1.5 rounded flex items-center justify-between text-slate-300"
                >
                  <span className="text-[11px]">{item}</span>
                  <span className="flex items-center gap-1 font-mono text-[10px] text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> ONLINE
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/90 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
