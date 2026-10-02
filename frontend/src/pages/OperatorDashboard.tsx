import React, { useState } from 'react';
import { ProcessMimic } from '../components/operator/ProcessMimic';
import { AlarmAnnunciatorBar, CalibrationWizard } from '../components/operator/AlarmAndCalibration';
import { ProposeCorrectionModal } from '../components/operator/ProposeCorrectionModal';
import { FileCheck, Sparkles, Send } from 'lucide-react';
import { post } from '../services/api';

export const OperatorDashboard: React.FC = () => {
  const [showProposeModal, setShowProposeModal] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [finalizedMsg, setFinalizedMsg] = useState<string | null>(null);

  const kpis = [
    { title: 'Treated Effluent (24h)', val: '58.4 MLD', sub: 'Hebbal Basin Cap: 60 MLD', color: '#38bdf8' },
    { title: 'CPCB Compliance Rate', val: '98.8%', sub: 'Last 30-day statutory average', color: '#4ade80' },
    { title: 'Process Loop Alarms', val: '1 Active', sub: 'AIT-503 (Effluent COD)', color: '#f87171' },
    { title: 'Telemetry Freshness', val: '1.2s Latency', sub: 'Modbus TCP / MQTT Stream', color: '#a855f7' },
  ];

  const handleFinalizeWindow = async () => {
    setFinalizing(true);
    setFinalizedMsg(null);
    try {
      const now = new Date();
      const past24h = new Date(now.getTime() - 24 * 3600 * 1000);
      const res = await post<any>('/treatment-records/finalize', {
        facility_id: '08974bde-35f1-4f51-b0d2-d8625a17e71b',
        period_start: past24h.toISOString(),
        period_end: now.toISOString(),
        key_id: 'key-ecdsa-p256-01',
      });
      setFinalizedMsg(`Window Finalized. Record ID: ${res.record_id?.slice(0, 8)}... Canonical Hash computed & signed.`);
    } catch (err: unknown) {
      setFinalizedMsg(err instanceof Error ? err.message : 'Finalization failed.');
    } finally {
      setFinalizing(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Alarm Annunciator Bar */}
      <AlarmAnnunciatorBar />

      {/* KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        {kpis.map((k) => (
          <div key={k.title} style={{ background: '#0b1329', border: '1px solid #1e293b', borderRadius: '8px', padding: '1rem' }}>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.3rem' }}>{k.title}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: k.color, marginBottom: '0.2rem' }}>{k.val}</div>
            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Operator Recommendations Card */}
      <div style={{ background: '#0b1329', border: '1px solid #0284c7', borderRadius: '8px', padding: '1rem', color: '#e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Sparkles size={16} /> Prescriptive SCADA Recommendation Engine
          </h4>
          <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
            Blower unit <code style={{ color: '#38bdf8' }}>BLW-201</code> output at 68%. Maintain DO setpoint between 2.0 - 2.2 mg/L to optimize nitrification kinetics.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setShowProposeModal(true)}
            style={{ padding: '0.4rem 0.8rem', background: '#1e293b', border: '1px solid #334155', borderRadius: '4px', color: '#cbd5e1', fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
          >
            <Send size={13} /> Propose Lab Correction
          </button>
          <button
            onClick={handleFinalizeWindow}
            disabled={finalizing}
            style={{ padding: '0.4rem 0.8rem', background: '#0284c7', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
          >
            <FileCheck size={14} /> {finalizing ? 'Finalizing...' : 'Finalize 24h Window'}
          </button>
        </div>
      </div>

      {finalizedMsg && (
        <div style={{ padding: '0.5rem 0.8rem', background: '#064e3b', border: '1px solid #059669', borderRadius: '6px', color: '#86efac', fontSize: '0.78rem' }}>
          {finalizedMsg}
        </div>
      )}

      {/* Interactive Process Mimic */}
      <ProcessMimic interactive={true} />

      {/* Calibration Wizard */}
      <CalibrationWizard />

      {showProposeModal && (
        <ProposeCorrectionModal
          recordId="7ffcb0a7-5ef6-44e7-a0eb-6eac84f5718e"
          onProposed={() => {}}
          onClose={() => setShowProposeModal(false)}
        />
      )}
    </div>
  );
};
