import React, { useState } from 'react';
import { Bell, Check, Clock, Wrench } from 'lucide-react';
import { useScadaStore } from '../../services/scadaStore';

export const AlarmAnnunciatorBar: React.FC = () => {
  const { alarms, acknowledgeAlarm, shelveAlarm } = useScadaStore();
  const unackAlarms = alarms.filter((a) => a.state === 'UNACK_ALARM');

  if (unackAlarms.length === 0) {
    return (
      <div style={{ background: '#052e16', border: '1px solid #166534', borderRadius: '6px', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.8rem', color: '#86efac' }}>
        <Check size={16} color="#4ade80" />
        <span>ISA-18.2 ALARM ANNUNCIATOR: All plant process loops nominal. No unacknowledged alarms.</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {unackAlarms.map((alarm) => (
        <div
          key={alarm.id}
          style={{
            background: '#450a0a',
            border: '2px solid #ef4444',
            borderRadius: '6px',
            padding: '0.5rem 0.8rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            animation: 'pulse 1.5s infinite',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Bell size={18} color="#f87171" />
            <div>
              <strong style={{ color: '#fca5a5', fontSize: '0.82rem' }}>
                [{alarm.level}] {alarm.tag} — {alarm.parameter} Excursion: {alarm.value} (Limit: {alarm.threshold})
              </strong>
              <div style={{ fontSize: '0.72rem', color: '#f87171' }}>
                Trip Time: {new Date(alarm.timeIn).toLocaleTimeString()} IST
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button
              onClick={() => acknowledgeAlarm(alarm.id)}
              style={{ background: '#b91c1c', border: 'none', borderRadius: '4px', padding: '0.3rem 0.6rem', color: '#fff', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
            >
              <Check size={13} /> Acknowledge
            </button>
            <button
              onClick={() => shelveAlarm(alarm.id, 60)}
              style={{ background: '#334155', border: 'none', borderRadius: '4px', padding: '0.3rem 0.6rem', color: '#cbd5e1', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
            >
              <Clock size={13} /> Shelve (1h)
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export const CalibrationWizard: React.FC = () => {
  const { sensorHoldList, toggleSensorHold } = useScadaStore();
  const [selectedSensor, setSelectedSensor] = useState('AIT-501 (Effluent pH)');
  const [bufferBatch, setBufferBatch] = useState('NIST-BUF-701-2026');
  const [slopePct, setSlopePct] = useState('98.4');
  const [calibrated, setCalibrated] = useState(false);

  const isHold = sensorHoldList.includes(selectedSensor);

  const handleComplete = () => {
    setCalibrated(true);
    setTimeout(() => setCalibrated(false), 4000);
  };

  return (
    <div style={{ background: '#0b1329', border: '1px solid #1e293b', borderRadius: '8px', padding: '1rem', color: '#e2e8f0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Wrench size={16} /> 2-Point NIST Buffer Calibration Wizard
        </h4>
        <button
          onClick={() => toggleSensorHold(selectedSensor)}
          style={{
            padding: '0.3rem 0.6rem',
            background: isHold ? '#dc2626' : '#1e293b',
            border: `1px solid ${isHold ? '#ef4444' : '#334155'}`,
            borderRadius: '4px',
            color: '#fff',
            fontSize: '0.75rem',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          {isHold ? 'SENSOR IN HOLD MODE' : 'Engage HOLD Mode'}
        </button>
      </div>

      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.75rem' }}>
        Engaging HOLD mode freezes outfall compliance averaging to prevent wild readings from polluting CPCB compliance stats during NIST buffer dips.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', fontSize: '0.8rem' }}>
        <div>
          <label style={{ display: 'block', color: '#64748b', fontSize: '0.72rem', marginBottom: '0.2rem' }}>Sensor Tag</label>
          <select
            value={selectedSensor}
            onChange={(e) => setSelectedSensor(e.target.value)}
            style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: '4px', padding: '0.35rem', color: '#fff', fontSize: '0.78rem' }}
          >
            <option>AIT-501 (Effluent pH)</option>
            <option>AIT-201 (Basin DO Optical)</option>
            <option>AIT-503 (Effluent COD Probe)</option>
            <option>AIT-504 (Effluent TSS Sensor)</option>
          </select>
        </div>
        <div>
          <label style={{ display: 'block', color: '#64748b', fontSize: '0.72rem', marginBottom: '0.2rem' }}>NIST Traceable Batch ID</label>
          <input
            value={bufferBatch}
            onChange={(e) => setBufferBatch(e.target.value)}
            style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: '4px', padding: '0.35rem', color: '#fff', fontSize: '0.78rem' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', color: '#64748b', fontSize: '0.72rem', marginBottom: '0.2rem' }}>Regression Slope (%)</label>
          <input
            value={slopePct}
            onChange={(e) => setSlopePct(e.target.value)}
            style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: '4px', padding: '0.35rem', color: '#fff', fontSize: '0.78rem' }}
          />
        </div>
      </div>

      <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
        <button
          onClick={handleComplete}
          style={{ padding: '0.4rem 0.8rem', background: '#0284c7', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
        >
          Commit Calibration Certificate
        </button>
      </div>

      {calibrated && (
        <div style={{ marginTop: '0.5rem', padding: '0.4rem 0.6rem', background: '#064e3b', border: '1px solid #059669', borderRadius: '4px', color: '#4ade80', fontSize: '0.75rem' }}>
          Calibration committed for {selectedSensor}. Slope: {slopePct}%. Remember to disengage HOLD mode.
        </div>
      )}
    </div>
  );
};
