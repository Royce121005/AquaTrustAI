import React, { useState, useEffect } from 'react';
import { WorstFirstFleetGrid, ExceedanceEnforcementTable, CpcbCertificateModal } from '../components/regulator/RegulatorComponents';
import { get } from '../services/api';
import { Facility } from '../types';
import { Award, FileCheck2 } from 'lucide-react';

export const RegulatorConsole: React.FC = () => {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [showCert, setShowCert] = useState(false);

  useEffect(() => {
    get<Facility[]>('/facilities')
      .then((data) => setFacilities(data || []))
      .catch(() => {});
  }, []);

  const fleetStats = [
    { title: 'Regional Facilities Monitored', val: facilities.length || '13 STPs', sub: 'Karnataka & Upper Cauvery Basin', color: '#10b981' },
    { title: 'Fleet Avg Compliance Rate', val: '96.4%', sub: 'CPCB Schedule VI Effluent Limits', color: '#38bdf8' },
    { title: 'Active Exceedance Notices', val: '2 Urgent', sub: '24-hour statutory remediation SLA', color: '#ef4444' },
    { title: 'DLT Multi-Org Proofs', val: '100% Sealed', sub: 'RegulatorMSP & AuditMSP Consensus', color: '#a855f7' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Fleet Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        {fleetStats.map((s) => (
          <div key={s.title} style={{ background: '#0b1329', border: '1px solid #1e293b', borderRadius: '8px', padding: '1rem' }}>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.3rem' }}>{s.title}</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: s.color, marginBottom: '0.2rem' }}>{s.val}</div>
            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Worst-First Fleet Surveillance */}
      <WorstFirstFleetGrid facilities={facilities} />

      {/* Statutory Exceedance Register */}
      <ExceedanceEnforcementTable />

      {/* Form V Returns & Public Verification Banner */}
      <div style={{ background: '#0b1329', border: '1px solid #1e293b', borderRadius: '8px', padding: '1rem', color: '#e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Award size={16} /> Annual Form V Environmental Statement & Non-Repudiation Return
          </h4>
          <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
            Download statutory certificates with embedded dynamic SVG QR codes for instant mobile inspection by State Pollution Board field officers.
          </p>
        </div>
        <button
          onClick={() => setShowCert(true)}
          style={{ padding: '0.4rem 0.9rem', background: '#059669', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
        >
          <FileCheck2 size={14} /> View Form V Certificate & QR
        </button>
      </div>

      {showCert && <CpcbCertificateModal onClose={() => setShowCert(false)} />}
    </div>
  );
};
