import React, { useEffect } from 'react';
import {
  X,
  Radio,
  Cpu,
  Layers,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  Database,
  FileCode,
  Activity,
  Zap,
  Lock,
} from 'lucide-react';

export type PipelineNodeId =
  | 'sensor-101'
  | 'sensor-201'
  | 'sensor-301'
  | 'sensor-401'
  | 'sensor-501'
  | 'gateway'
  | 'ingestion'
  | 'digital_twin'
  | 'audit_store';

interface PipelineNodeInspectorProps {
  selectedNodeId: PipelineNodeId | null;
  onClose: () => void;
  isRunning: boolean;
  stepsGenerated: number;
  readingsIngested: number;
  currentScenario: string;
  activeFacilityName: string;
  liveBod: number;
  liveCod: number;
  liveDo: number;
  livePh: number;
  liveTss: number;
  effBod: number;
}

export const PipelineNodeInspector: React.FC<PipelineNodeInspectorProps> = ({
  selectedNodeId,
  onClose,
  isRunning,
  stepsGenerated,
  readingsIngested,
  currentScenario,
  activeFacilityName,
  liveBod,
  liveCod,
  liveDo,
  livePh,
  liveTss,
  effBod,
}) => {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!selectedNodeId) return null;

  const isOrganicShock = currentScenario === 'organic_shock';
  const isAerationFailure = currentScenario === 'aeration_failure';
  const isPhDrift = currentScenario === 'ph_drift';
  const isAnomaly = currentScenario && currentScenario !== 'baseline_normal';

  // Compute node-specific details
  const getNodeDetails = () => {
    switch (selectedNodeId) {
      case 'sensor-101':
        return {
          tag: 'SN-101 / FIT-101',
          name: 'Stage 1: Raw Influent Sensor Tap',
          stage: 'Influent Headworks & Screening',
          category: 'Optical & Electrochemical Sensor Hub',
          protocol: 'Modbus TCP / RTU (Polled at 1Hz)',
          location: 'Inlet Channel #1 - Chamber A',
          status: isOrganicShock ? 'alarm' : isRunning ? 'nominal' : 'offline',
          statusMessage: isOrganicShock
            ? 'ORGANIC SHOCK INFLUX DETECTED (High BOD/COD)'
            : isRunning
            ? 'NOMINAL ACQUISITION'
            : 'SENSOR OFFLINE / STANDBY',
          parameters: [
            { label: 'Biochemical Oxygen Demand (BOD)', value: `${liveBod.toFixed(1)} mg/L`, standard: 'Design: 150 - 250 mg/L', ok: !isOrganicShock },
            { label: 'Chemical Oxygen Demand (COD)', value: `${liveCod.toFixed(0)} mg/L`, standard: 'Design: 350 - 550 mg/L', ok: !isOrganicShock },
            { label: 'Total Suspended Solids (TSS)', value: `${liveTss.toFixed(1)} mg/L`, standard: 'Design: 180 - 300 mg/L', ok: true },
            { label: 'Hydraulic Inflow Rate', value: '10.0 MLD', standard: 'Capacity: 15.0 MLD', ok: true },
            { label: 'Water Temperature', value: '22.8 °C', standard: 'Ambient: 15 - 35 °C', ok: true },
          ],
          validationChecks: [
            { rule: 'JSON Schema Structure', status: 'PASS', detail: 'Conforms to ITelemetryReading v1.2' },
            { rule: 'Facility Scope Authorization', status: 'PASS', detail: `Tenant: ${activeFacilityName}` },
            {
              rule: 'Pre-AI Statistical Bounds',
              status: isOrganicShock ? 'FAIL' : 'PASS',
              detail: isOrganicShock ? 'BOD exceeds upper 3σ threshold (>250 mg/L)' : 'Readings within historical 3σ bounds',
            },
            {
              rule: 'Measurement Quality Tag',
              status: isOrganicShock ? 'SUSPECT' : 'GOOD',
              detail: isOrganicShock ? 'Tag: QUALITY_DISTURBANCE_FLAGGED' : 'Tag: QUALITY_VALIDATED_NORMAL',
            },
          ],
        };

      case 'sensor-201':
        return {
          tag: 'SN-201 / TIT-201',
          name: 'Stage 2: Primary Clarifier Sensor Tap',
          stage: 'Gravitational Primary Settling',
          category: 'Turbidity & Solids Gravimetric Probe',
          protocol: '4-20mA Current Loop via Remote I/O',
          location: 'Primary Basin Peripheral Weir Box',
          status: isRunning ? 'nominal' : 'offline',
          statusMessage: isRunning ? 'NOMINAL CLARIFICATION' : 'SENSOR OFFLINE',
          parameters: [
            { label: 'Settled Supernatant TSS', value: `${(liveTss * 0.4).toFixed(1)} mg/L`, standard: 'Target: 60% Settling Removal', ok: true },
            { label: 'Clarified BOD', value: `${(liveBod * 0.79).toFixed(1)} mg/L`, standard: 'Target: 21% Particulate Attenuation', ok: true },
            { label: 'Sludge Blanket Depth', value: '0.82 m', standard: 'Limit: < 1.50 m', ok: true },
            { label: 'Surface Overflow Rate (SOR)', value: '28.4 m³/m²·d', standard: 'Design: 25 - 35 m³/m²·d', ok: true },
          ],
          validationChecks: [
            { rule: 'JSON Schema Structure', status: 'PASS', detail: 'Conforms to ITelemetryReading v1.2' },
            { rule: 'Facility Scope Authorization', status: 'PASS', detail: `Tenant: ${activeFacilityName}` },
            { rule: 'Stokes Settling Rate Bounds', status: 'PASS', detail: 'Within valid gravitational terminal velocities' },
            { rule: 'Measurement Quality Tag', status: 'GOOD', detail: 'Tag: QUALITY_VALIDATED_NORMAL' },
          ],
        };

      case 'sensor-301':
        return {
          tag: 'SN-301 / DO-301',
          name: 'Stage 3: Biological Aeration Sensor Tap',
          stage: 'Activated Sludge Biological CSTR',
          category: 'Luminescent Optical Dissolved Oxygen & MLSS Hub',
          protocol: 'RS-485 Modbus ASCII into SCADA PLC',
          location: 'Aeration Basin Cell B - Mid-depth',
          status: isAerationFailure ? 'alarm' : isRunning ? 'nominal' : 'offline',
          statusMessage: isAerationFailure
            ? 'AERATION BLOWER TRIP / HYPOXIC COLLAPSE'
            : isRunning
            ? 'DISSOLVED OXYGEN SATISFIED'
            : 'SENSOR OFFLINE',
          parameters: [
            { label: 'Dissolved Oxygen (DO)', value: `${liveDo.toFixed(2)} mg/L`, standard: 'Setpoint: 2.00 ± 0.3 mg/L', ok: !isAerationFailure },
            { label: 'Mixed Liquor Suspended Solids', value: '2,580 mg/L', standard: 'Optimal: 2,000 - 3,500 mg/L', ok: true },
            { label: 'Basin pH', value: `${livePh.toFixed(2)}`, standard: 'Boundary: 6.5 - 8.5', ok: !isPhDrift },
            { label: 'Hydraulic Retention Time', value: '8.00 Hours', standard: 'Kinetics Design: 8.0 h', ok: true },
            { label: 'Blower Air Flow Rate', value: isAerationFailure ? '0.0 Nm³/h' : '4,250 Nm³/h', standard: 'Nominal: 4,000 - 5,000 Nm³/h', ok: !isAerationFailure },
          ],
          validationChecks: [
            { rule: 'JSON Schema Structure', status: 'PASS', detail: 'Conforms to ITelemetryReading v1.2' },
            { rule: 'Facility Scope Authorization', status: 'PASS', detail: `Tenant: ${activeFacilityName}` },
            {
              rule: 'Pre-AI Statistical Bounds',
              status: isAerationFailure ? 'FAIL' : 'PASS',
              detail: isAerationFailure ? 'DO dropped below critical minimum (<1.0 mg/L)' : 'Dissolved oxygen within statutory envelope',
            },
            {
              rule: 'Monod Kinetics Consistency',
              status: isAerationFailure ? 'FAIL' : 'PASS',
              detail: isAerationFailure ? 'Microbial respiration starved: autotrophic nitrification inhibited' : 'Substrate decay rate μ_max satisfied',
            },
          ],
        };

      case 'sensor-401':
        return {
          tag: 'SN-401 / LIT-401',
          name: 'Stage 4: Secondary Clarifier Sensor Tap',
          stage: 'Secondary Clarification & RAS Decanter',
          category: 'High-Frequency Ultrasonic Sludge Blanket Meter',
          protocol: 'HART over 4-20mA to Substation Gateway',
          location: 'Decanter Clarifier #2 Hopper Well',
          status: isRunning ? 'nominal' : 'offline',
          statusMessage: isRunning ? 'QUIESCENT PHASE SEPARATION' : 'SENSOR OFFLINE',
          parameters: [
            { label: 'Sludge Blanket Height', value: '1.20 m', standard: 'Limit: < 1.80 m', ok: true },
            { label: 'Sludge Volume Index (SVI)', value: '110 mL/g', standard: 'Optimal: 80 - 140 mL/g', ok: true },
            { label: 'Return Sludge Flow (RAS)', value: '6.0 MLD', standard: 'Ratio: 60% of Inflow', ok: true },
            { label: 'Waste Sludge (WAS)', value: '0.25 MLD', standard: 'SRT Control Target: 10 days', ok: true },
          ],
          validationChecks: [
            { rule: 'JSON Schema Structure', status: 'PASS', detail: 'Conforms to ITelemetryReading v1.2' },
            { rule: 'Facility Scope Authorization', status: 'PASS', detail: `Tenant: ${activeFacilityName}` },
            { rule: 'Mass Balance Solids Conservation', status: 'PASS', detail: 'Inflow solids balance equals settled + recycled sludge' },
            { rule: 'Measurement Quality Tag', status: 'GOOD', detail: 'Tag: QUALITY_VALIDATED_NORMAL' },
          ],
        };

      case 'sensor-501':
        return {
          tag: 'SN-501 / WQ-501',
          name: 'Stage 5: Final Effluent & UV Sensor Tap',
          stage: 'UV Disinfection & Environmental Outfall',
          category: 'Statutory Online Continuous Effluent Monitoring (OCEMS)',
          protocol: 'CPCB Protocol v2.1 Secure Cryptographic Link',
          location: 'Treated Water Outfall Discharge Chamber',
          status: effBod > 30 || isPhDrift ? 'alarm' : isRunning ? 'nominal' : 'offline',
          statusMessage: effBod > 30
            ? 'CPCB STATUTORY BOD EXCEEDANCE (>30 mg/L)'
            : isPhDrift
            ? 'STATUTORY pH DEVIATION'
            : isRunning
            ? 'CPCB COMPLIANT DISCHARGE'
            : 'SENSOR OFFLINE',
          parameters: [
            { label: 'Effluent BOD', value: `${effBod.toFixed(1)} mg/L`, standard: 'CPCB Statutory: ≤ 30.0 mg/L', ok: effBod <= 30 },
            { label: 'Effluent COD', value: `${(effBod * 3.4).toFixed(1)} mg/L`, standard: 'CPCB Statutory: ≤ 250.0 mg/L', ok: true },
            { label: 'Effluent pH', value: `${livePh.toFixed(2)}`, standard: 'CPCB Statutory: 6.5 - 8.5', ok: livePh >= 6.5 && livePh <= 8.5 },
            { label: 'Effluent TSS', value: '14.2 mg/L', standard: 'CPCB Statutory: ≤ 50.0 mg/L', ok: true },
            { label: 'UV Transmittance', value: '68 %', standard: 'Minimum: ≥ 65 %', ok: true },
          ],
          validationChecks: [
            { rule: 'JSON Schema Structure', status: 'PASS', detail: 'Conforms to ITelemetryReading v1.2' },
            { rule: 'Facility Scope Authorization', status: 'PASS', detail: `Tenant: ${activeFacilityName}` },
            {
              rule: 'CPCB Schedule VI Bounds',
              status: effBod > 30 || isPhDrift ? 'FAIL' : 'PASS',
              detail: effBod > 30 ? `BOD ${effBod.toFixed(1)} mg/L violates statutory ceiling` : 'Meets Indian Ministry MoEF&CC 2017 norms',
            },
            {
              rule: 'Cryptographic Hash Integrity',
              status: 'PASS',
              detail: 'Signed with facility private key (SHA-256 HMAC)',
            },
          ],
        };

      case 'gateway':
        return {
          tag: 'RTU-GW-01',
          name: 'SCADA Edge RTU Telemetry Gateway',
          stage: 'Edge Ingestion & Packet Serialization',
          category: 'Industrial Industrial PC Gateway Bridge',
          protocol: 'MQTT / WebSockets with TLS 1.3 Encryption',
          location: 'Control Building - Server Rack 2, Unit 4',
          status: isRunning ? 'nominal' : 'offline',
          statusMessage: isRunning ? 'SERIALIZING 1Hz TELEMETRY STREAM' : 'GATEWAY IDLE / DISCONNECTED',
          parameters: [
            { label: 'Simulator Engine Identity', value: `Synthetic RTU Bridge - ${activeFacilityName}`, standard: 'Software Sandbox Mode', ok: true },
            { label: 'Telemetry Polling Interval', value: '1.00 Second (1Hz)', standard: 'Cadence: 1 - 5 sec', ok: true },
            { label: 'Packets Transmitted (Tx)', value: `${stepsGenerated} Frames (${stepsGenerated * 5} Readings)`, standard: 'Loss Rate: 0.00%', ok: true },
            { label: 'Edge Queue Depth', value: '0 Packets (Nominal)', standard: 'Max Buffer: 1,024', ok: true },
            { label: 'Packet Ingestion Latency', value: '8.4 ms', standard: 'Threshold: < 50 ms', ok: true },
          ],
          validationChecks: [
            { rule: 'Edge Network TLS Handshake', status: 'PASS', detail: 'Mutual TLS verified with server cert' },
            { rule: 'Clock Synchronization', status: 'PASS', detail: 'NTP offset < 2ms against atomic time' },
            { rule: 'Packet Sequence Monotonicity', status: 'PASS', detail: `Sequence strictly increasing (seq=${stepsGenerated})` },
            { rule: 'Buffer Overflow Protection', status: 'PASS', detail: 'Ring buffer capacity 99.9% available' },
          ],
        };

      case 'ingestion':
        return {
          tag: 'VAL-PIPE-01',
          name: 'Telemetry Ingestion & Multi-Stage Validation Engine',
          stage: 'Backend Real-Time Pipeline',
          category: 'Async Event Driven Microservice (FastAPI + Pydantic v2)',
          protocol: 'Internal Zero-Copy Event Dispatcher',
          location: 'AquaTrust Backend Core Service',
          status: isAnomaly ? 'warning' : isRunning ? 'nominal' : 'offline',
          statusMessage: isAnomaly
            ? `ANOMALY INFERENCE TRIGGERED: ${currentScenario.toUpperCase()}`
            : isRunning
            ? 'PIPELINE ACCEPTING & VALIDATING'
            : 'PIPELINE STANDBY',
          parameters: [
            { label: 'Total Readings Ingested', value: `${readingsIngested}`, standard: 'All Treatment Stages', ok: true },
            { label: 'Pre-AI Statistical Rejection Rate', value: isAnomaly ? '18.2%' : '0.0%', standard: 'Baseline: < 2.0%', ok: !isAnomaly },
            { label: 'Average Pipeline Processing Time', value: '11.8 ms', standard: 'SLA: < 35 ms', ok: true },
            { label: 'Deduplication Hash Collisions', value: '0 Duplicates', standard: 'Unique Key: (facility_id, timestamp, tag)', ok: true },
            { label: 'DLT Staging Queue', value: `${readingsIngested} Pending Hash Commit`, standard: 'Batch Anchor Size: 50', ok: true },
          ],
          validationChecks: [
            { rule: 'Step 1: Strict JSON Schema Validator', status: 'PASS', detail: 'Pydantic v2 high-speed type casting' },
            { rule: 'Step 2: Tenant & Facility Authorization', status: 'PASS', detail: 'Scope verified against user JWT claims' },
            {
              rule: 'Step 3: Pre-AI Physical Bounds Engine',
              status: isAnomaly ? 'FAIL' : 'PASS',
              detail: isAnomaly ? `Violation flagged: ${currentScenario}` : 'Passed 48 statutory physics rules',
            },
            {
              rule: 'Step 4: AI Anomaly Isolation',
              status: isAnomaly ? 'ALERT' : 'PASS',
              detail: isAnomaly ? 'Disturbance flagged in state delta stream' : 'No covariance or drift anomalies',
            },
          ],
        };

      case 'digital_twin':
        return {
          tag: 'DT-ENGINE-01',
          name: 'Virtual STP Monod Digital Twin Engine',
          stage: 'Real-Time Biochemical State Machine',
          category: 'Mathematical State-Space Process Simulator',
          protocol: 'Native WebSocket Stream (/facilities/twin/stream)',
          location: 'Authoritative Digital Twin Engine Manager',
          status: isRunning ? 'nominal' : 'offline',
          statusMessage: isRunning ? 'CONTINUOUS BIOCHEMICAL INTEGRATION ACTIVE' : 'TWIN ENGINE STOPPED',
          parameters: [
            { label: 'Authoritative State Version', value: `v${stepsGenerated + 42}`, standard: 'Monotonically Incrementing', ok: true },
            { label: 'Engine Lifecycle State', value: isRunning ? 'RUNNING' : 'STOPPED', standard: 'Target: RUNNING', ok: isRunning },
            { label: 'Monod Kinetics Engine', value: 'Substrate & Nitrification Active', standard: 'Euler Step dt = 1.0s', ok: true },
            { label: 'State Delta WebSocket Broadcast', value: isRunning ? '1 Message / sec' : 'Idle', standard: 'Cadence: 1Hz', ok: true },
            { label: 'State Freshness', value: isRunning ? 'FRESH (<1s age)' : 'STALE', standard: 'Stale boundary: >10s', ok: isRunning },
          ],
          validationChecks: [
            { rule: 'State Monotonicity Guard', status: 'PASS', detail: 'v{n+1} > v{n} guaranteed by atomic lock' },
            { rule: 'Mass Balance Conservation', status: 'PASS', detail: 'Zero chemical mass leakage across 5 basins' },
            { rule: 'Alarm Deduplication Lifecycle', status: 'PASS', detail: 'CPCB rule engine suppressing storm duplicates' },
            { rule: 'Resync Snapshot Availability', status: 'PASS', detail: 'Full snapshot ready for dropped clients' },
          ],
        };

      case 'audit_store':
        return {
          tag: 'DLT-AUDIT-01',
          name: 'Immutable Audit Trail & Cryptographic Verifier',
          stage: 'DLT Ledger & Proof Settlement',
          category: 'SHA-256 Merkle Audit Store (Hyperledger Bridge)',
          protocol: 'gRPC / Fabric Gateway SDK',
          location: 'AquaTrust Distributed Ledger Sandbox',
          status: 'nominal',
          statusMessage: 'SIMULATION SANDBOX - DLT ANCHORING SAFELY ISOLATED',
          parameters: [
            { label: 'Ledger Mode', value: 'SIMULATION_SANDBOX', standard: 'DLT write blocked to protect real ledger', ok: true },
            { label: 'Merkle Leaf Hash Digest', value: 'SHA-256 (RFC 6962)', standard: 'Cryptographic Integrity Guaranteed', ok: true },
            { label: 'Verified Synthetic Batches', value: `${Math.floor(stepsGenerated / 10)} Batches`, standard: '10 readings / batch', ok: true },
            { label: 'Audit Trail Signature', value: 'Ed25519 Ephemeral Key', standard: 'Signed by AquaTrust Security Enclave', ok: true },
          ],
          validationChecks: [
            { rule: 'Blockchain Contamination Guard', status: 'PASS', detail: 'Synthetic runs forbidden from Hyperledger production' },
            { rule: 'Cryptographic Hash Chaining', status: 'PASS', detail: 'H(n) = SHA256(H(n-1) || payload_n)' },
            { rule: 'Audit Trail Lineage Verification', status: 'PASS', detail: 'Zero tampering detected in memory buffer' },
            { rule: 'Regulatory Access Compliance', status: 'PASS', detail: 'CPCB / SPCB auditor read permissions granted' },
          ],
        };

      default:
        return null;
    }
  };

  const details = getNodeDetails();
  if (!details) return null;

  return (
    <div
      className="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-slate-950 border-l border-slate-800 shadow-2xl flex flex-col text-slate-100 animate-in slide-in-from-right duration-300"
      role="dialog"
      aria-modal="true"
      aria-labelledby="inspector-title"
    >
      {/* Header */}
      <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-sky-950 border border-sky-800 text-sky-400">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-sky-400 uppercase tracking-wider">
                {details.tag}
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                  details.status === 'alarm'
                    ? 'bg-rose-950 text-rose-300 border border-rose-800 animate-pulse'
                    : details.status === 'warning'
                    ? 'bg-amber-950 text-amber-300 border border-amber-800'
                    : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                }`}
              >
                {details.statusMessage}
              </span>
            </div>
            <h2 id="inspector-title" className="text-sm font-bold text-slate-100 mt-0.5">
              {details.name}
            </h2>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          title="Close Inspector (Esc)"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Node Metadata Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-2">
            <Cpu className="w-3.5 h-3.5 text-sky-400" />
            <span>Node Architectural Metadata</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-500 block">Treatment Stage:</span>
              <span className="font-semibold text-slate-200">{details.stage}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Node Category:</span>
              <span className="font-semibold text-slate-200">{details.category}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Protocol / Link:</span>
              <span className="font-mono text-sky-300">{details.protocol}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Physical Location:</span>
              <span className="text-slate-300">{details.location}</span>
            </div>
          </div>
        </div>

        {/* Live Parameters & Process Measurements */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>Real-Time Telemetry & Process States</span>
            </div>
            <span className="text-[10px] font-mono text-slate-500">Live 1Hz Acquisition</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800/80">
            {details.parameters.map((param, idx) => (
              <div key={idx} className="p-3 flex items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-medium text-slate-200">{param.label}</div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">{param.standard}</div>
                </div>
                <div className="text-right">
                  <div
                    className={`font-mono font-bold text-sm ${
                      !param.ok ? 'text-rose-400' : 'text-slate-100'
                    }`}
                  >
                    {param.value}
                  </div>
                  <span
                    className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-mono uppercase mt-0.5 ${
                      !param.ok
                        ? 'bg-rose-950/80 text-rose-300 border border-rose-800'
                        : 'bg-emerald-950/60 text-emerald-400'
                    }`}
                  >
                    {!param.ok ? 'OUT OF BOUNDS' : 'NORMAL'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Multi-Stage Validation Audit Pipeline */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span>Multi-Stage Pre-AI & CPCB Validation Audit</span>
            </div>
            <span className="text-[10px] font-mono text-indigo-400">Deterministic Rules</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2.5">
            {details.validationChecks.map((chk, idx) => {
              const isPass = chk.status === 'PASS';
              const isFail = chk.status === 'FAIL';
              return (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-950 border border-slate-800/60 text-xs"
                >
                  <div className="mt-0.5">
                    {isPass ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-400 animate-pulse" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200">{chk.rule}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                          isPass
                            ? 'bg-emerald-950 text-emerald-400'
                            : isFail
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : 'bg-amber-950 text-amber-300'
                        }`}
                      >
                        {chk.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">{chk.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Raw Serialized JSON Packet Payload */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <FileCode className="w-3.5 h-3.5 text-sky-400" />
              <span>Raw Telemetry Frame Preview (JSON)</span>
            </div>
            <span className="text-[10px] font-mono text-slate-500">ISO-8601 Timestamp</span>
          </div>

          <pre className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-[11px] font-mono text-emerald-400 overflow-x-auto leading-relaxed">
{JSON.stringify(
  {
    node_tag: details.tag,
    step_sequence: stepsGenerated,
    facility_target: activeFacilityName,
    status: details.status,
    active_scenario: currentScenario,
    timestamp: new Date().toISOString(),
    payload: details.parameters.reduce((acc, p) => ({ ...acc, [p.label]: p.value }), {}),
    digest_sha256: '0x9a4f78c1b2e3...verified',
  },
  null,
  2
)}
          </pre>
        </div>
      </div>

      {/* Footer Ribbon */}
      <div className="p-3.5 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
        <span>AquaTrust SCADA Telemetry Engine</span>
        <button
          onClick={onClose}
          className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
        >
          Close Drawer
        </button>
      </div>
    </div>
  );
};
