import React, { useState } from 'react';
import { Activity, Play, Square, Settings, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { useScadaStore, EquipmentState } from '../../services/scadaStore';

export const ProcessMimic: React.FC<{ interactive?: boolean }> = ({ interactive = true }) => {
  const { equipment, pid, toggleEquipment, updatePidSetpoint } = useScadaStore();
  const [selectedEq, setSelectedEq] = useState<EquipmentState | null>(null);
  const [pin, setPin] = useState('');
  const [justification, setJustification] = useState('Process routine rotation');
  const [feedback, setFeedback] = useState<{ msg: string; err?: boolean } | null>(null);
  const [newSp, setNewSp] = useState<number>(pid.setpoint);

  const isBlowerRunning = equipment.some((e) => e.type === 'blower' && e.status === 'running');
  const isPumpRunning = equipment.some((e) => e.type === 'pump' && e.status === 'running');

  const handleToggle = () => {
    if (!selectedEq) return;
    const res = toggleEquipment(selectedEq.id, pin, justification);
    if (!res.ok) {
      setFeedback({ msg: res.error || 'Failed', err: true });
    } else {
      setFeedback({ msg: `Command executed for ${selectedEq.id}. State transitioned.`, err: false });
      setSelectedEq(null);
      setPin('');
    }
  };

  const handleSpChange = () => {
    const res = updatePidSetpoint(newSp, pin);
    if (!res.ok) {
      setFeedback({ msg: res.error || 'Failed', err: true });
    } else {
      setFeedback({ msg: `DO Setpoint updated to ${newSp} mg/L. Loop output adjusted.`, err: false });
      setPin('');
    }
  };

  return (
    <div style={{ background: '#0b1329', border: '1px solid #1e293b', borderRadius: '8px', padding: '1rem', color: '#e2e8f0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Activity size={18} color="#38bdf8" />
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Hebbal STP — Interactive SCADA Process Mimic</h3>
        </div>
        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
          Status: <span style={{ color: isBlowerRunning && isPumpRunning ? '#22c55e' : '#f59e0b' }}>
            {isBlowerRunning && isPumpRunning ? 'OPTIMAL TREATMENT' : 'DEGRADED FLOW'}
          </span>
        </div>
      </div>

      {/* SVG SCADA Animated Graphic */}
      <div style={{ background: '#030712', borderRadius: '6px', border: '1px solid #1e293b', padding: '0.5rem', overflow: 'hidden' }}>
        <svg viewBox="0 0 900 240" style={{ width: '100%', height: 'auto', display: 'block' }}>
          <defs>
            <linearGradient id="waterGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0284c7" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#0369a1" stopOpacity="0.4" />
            </linearGradient>
            <linearGradient id="basinGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0891b2" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#155e75" stopOpacity="0.4" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Pipes with fluid flow */}
          <path d="M 40 120 L 160 120 L 160 80 L 260 80" stroke="#334155" strokeWidth="8" fill="none" />
          <path d="M 380 120 L 480 120" stroke="#334155" strokeWidth="8" fill="none" />
          <path d="M 620 120 L 740 120 L 740 150 L 840 150" stroke="#334155" strokeWidth="8" fill="none" />

          {/* Flow Animation dashes */}
          {isPumpRunning && (
            <path
              d="M 40 120 L 160 120 L 160 80 L 260 80 M 380 120 L 480 120 M 620 120 L 740 120 L 740 150 L 840 150"
              stroke="#38bdf8"
              strokeWidth="4"
              strokeDasharray="10 14"
              fill="none"
            >
              <animate attributeName="stroke-dashoffset" values="0; -48" dur="1.8s" repeatCount="indefinite" />
            </path>
          )}

          {/* Unit 1: Grit Chamber / Intake */}
          <rect x="30" y="80" width="130" height="90" rx="4" fill="#0f172a" stroke="#334155" strokeWidth="2" />
          <text x="95" y="105" fill="#94a3b8" fontSize="11" textAnchor="middle" fontWeight="bold">INLET / GRIT</text>
          <text x="95" y="125" fill="#38bdf8" fontSize="10" textAnchor="middle">Q: 58.4 MLD</text>
          <rect x="40" y="135" width="110" height="25" fill="url(#waterGrad)" rx="2" />

          {/* Pump P-101 */}
          <circle
            cx="210"
            cy="80"
            r="22"
            fill={equipment.find((e) => e.id === 'P-101')?.status === 'running' ? '#15803d' : '#475569'}
            stroke="#22c55e"
            strokeWidth="2"
            cursor={interactive ? 'pointer' : 'default'}
            onClick={() => interactive && setSelectedEq(equipment.find((e) => e.id === 'P-101') || null)}
          />
          <text x="210" y="84" fill="#ffffff" fontSize="9" textAnchor="middle" fontWeight="bold">P-101</text>

          {/* Unit 2: Aeration Bioreactor */}
          <rect x="260" y="50" width="160" height="135" rx="6" fill="#0f172a" stroke="#0284c7" strokeWidth="2" />
          <text x="340" y="75" fill="#38bdf8" fontSize="12" textAnchor="middle" fontWeight="bold">AERATION BASIN</text>
          <rect x="270" y="90" width="140" height="85" fill="url(#basinGrad)" rx="3" />

          {/* Air bubbles if blower running */}
          {isBlowerRunning && (
            <g fill="#e0f2fe" opacity="0.6">
              <circle cx="295" cy="150" r="3"><animate attributeName="cy" values="160;95" dur="1.2s" repeatCount="indefinite" /></circle>
              <circle cx="335" cy="165" r="4"><animate attributeName="cy" values="165;95" dur="1.5s" repeatCount="indefinite" /></circle>
              <circle cx="380" cy="155" r="3.5"><animate attributeName="cy" values="160;95" dur="1.1s" repeatCount="indefinite" /></circle>
            </g>
          )}
          <text x="340" y="130" fill="#f8fafc" fontSize="12" textAnchor="middle" fontWeight="bold">DO: {pid.processValue} mg/L</text>
          <text x="340" y="148" fill="#bae6fd" fontSize="9" textAnchor="middle">SP: {pid.setpoint} | MV: {pid.outputPct}%</text>

          {/* Blower BLW-201 */}
          <rect
            x="315"
            y="195"
            width="50"
            height="32"
            rx="4"
            fill={equipment.find((e) => e.id === 'BLW-201')?.status === 'running' ? '#15803d' : '#475569'}
            stroke="#22c55e"
            strokeWidth="1.5"
            cursor={interactive ? 'pointer' : 'default'}
            onClick={() => interactive && setSelectedEq(equipment.find((e) => e.id === 'BLW-201') || null)}
          />
          <text x="340" y="215" fill="#ffffff" fontSize="9" textAnchor="middle" fontWeight="bold">BLW-201</text>
          <line x1="340" y1="195" x2="340" y2="175" stroke="#38bdf8" strokeWidth="2" strokeDasharray="3 3" />

          {/* Unit 3: Secondary Clarifier */}
          <rect x="480" y="65" width="140" height="120" rx="6" fill="#0f172a" stroke="#334155" strokeWidth="2" />
          <text x="550" y="90" fill="#94a3b8" fontSize="11" textAnchor="middle" fontWeight="bold">CLARIFIER</text>
          <rect x="490" y="110" width="120" height="65" fill="url(#waterGrad)" rx="3" />
          <text x="550" y="140" fill="#38bdf8" fontSize="10" textAnchor="middle">MLSS: 3,420 mg/L</text>

          {/* Sludge Return Line */}
          <path d="M 550 185 L 550 215 L 230 215 L 230 140" stroke="#713f12" strokeWidth="4" strokeDasharray="6 6" fill="none" />
          <circle
            cx="230"
            cy="180"
            r="16"
            fill={equipment.find((e) => e.id === 'P-104')?.status === 'running' ? '#15803d' : '#475569'}
            stroke="#ca8a04"
            strokeWidth="1.5"
            cursor={interactive ? 'pointer' : 'default'}
            onClick={() => interactive && setSelectedEq(equipment.find((e) => e.id === 'P-104') || null)}
          />
          <text x="230" y="184" fill="#ffffff" fontSize="7" textAnchor="middle">P-104</text>

          {/* Unit 4: Chlorine Contact & Outfall */}
          <rect x="740" y="80" width="130" height="95" rx="4" fill="#0f172a" stroke="#059669" strokeWidth="2" />
          <text x="805" y="105" fill="#10b981" fontSize="11" textAnchor="middle" fontWeight="bold">FINAL OUTFALL</text>
          <rect x="750" y="125" width="110" height="40" fill="url(#waterGrad)" rx="2" />
          <text x="805" y="145" fill="#f8fafc" fontSize="10" textAnchor="middle" fontWeight="bold">CPCB OCEMS</text>
          <text x="805" y="158" fill="#34d399" fontSize="8" textAnchor="middle">pH: 7.32 | BOD: 8.4</text>
        </svg>
      </div>

      {feedback && (
        <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', borderRadius: '4px', background: feedback.err ? '#450a0a' : '#064e3b', border: `1px solid ${feedback.err ? '#dc2626' : '#059669'}`, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {feedback.err ? <ShieldAlert size={14} color="#f87171" /> : <CheckCircle2 size={14} color="#4ade80" />}
          <span>{feedback.msg}</span>
        </div>
      )}

      {/* Equipment Faceplate & PID Control Panels */}
      {interactive && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
          {/* Equipment Faceplate */}
          <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '6px', padding: '0.75rem' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Settings size={14} /> Equipment Faceplate Command (ISA-18.2)
            </h4>
            {selectedEq ? (
              <div>
                <div style={{ fontSize: '0.82rem', marginBottom: '0.4rem' }}>
                  Selected: <strong style={{ color: '#38bdf8' }}>{selectedEq.name} ({selectedEq.id})</strong>
                  <span style={{ marginLeft: '0.5rem', padding: '0.15rem 0.4rem', borderRadius: '3px', background: selectedEq.status === 'running' ? '#166534' : '#334155', color: '#fff', fontSize: '0.7rem' }}>
                    {selectedEq.status.toUpperCase()}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <input
                    type="password"
                    maxLength={4}
                    placeholder="Enter 4-Digit Operator PIN (1234)"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '4px', padding: '0.35rem 0.5rem', color: '#fff', fontSize: '0.8rem' }}
                  />
                  <input
                    type="text"
                    placeholder="Operating Justification (Required for 21 CFR Part 11)"
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '4px', padding: '0.35rem 0.5rem', color: '#fff', fontSize: '0.8rem' }}
                  />
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.3rem' }}>
                    <button
                      onClick={handleToggle}
                      style={{ flex: 1, padding: '0.4rem', background: selectedEq.status === 'running' ? '#dc2626' : '#16a34a', border: 'none', borderRadius: '4px', color: '#fff', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}
                    >
                      {selectedEq.status === 'running' ? <Square size={14} /> : <Play size={14} />}
                      {selectedEq.status === 'running' ? 'Command Stop' : 'Command Start'}
                    </button>
                    <button
                      onClick={() => setSelectedEq(null)}
                      style={{ padding: '0.4rem 0.8rem', background: '#334155', border: 'none', borderRadius: '4px', color: '#cbd5e1', fontSize: '0.8rem', cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '0.78rem', color: '#64748b', fontStyle: 'italic', padding: '0.5rem 0' }}>
                Click any pump (P-101, P-104) or blower (BLW-201) in the graphic to command start/stop with PIN verification.
              </div>
            )}
          </div>

          {/* DO PID Loop Faceplate */}
          <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '6px', padding: '0.75rem' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Activity size={14} /> DO Loop Advisory PID Faceplate (FIC-201)
            </h4>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.3rem' }}>
              <span>Live PV: <strong style={{ color: '#38bdf8' }}>{pid.processValue} mg/L</strong></span>
              <span>Target SP: <strong style={{ color: '#4ade80' }}>{newSp.toFixed(2)} mg/L</strong></span>
              <span>Output MV: <strong>{pid.outputPct}%</strong></span>
            </div>
            <input
              type="range"
              min={pid.minSp}
              max={pid.maxSp}
              step={0.05}
              value={newSp}
              onChange={(e) => setNewSp(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: '#0284c7', marginBottom: '0.5rem' }}
            />
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <input
                type="password"
                maxLength={4}
                placeholder="PIN (1234)"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                style={{ width: '120px', background: '#1e293b', border: '1px solid #334155', borderRadius: '4px', padding: '0.35rem 0.5rem', color: '#fff', fontSize: '0.8rem' }}
              />
              <button
                onClick={handleSpChange}
                style={{ flex: 1, padding: '0.35rem 0.5rem', background: '#0284c7', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
              >
                Apply Safe DO Setpoint
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
