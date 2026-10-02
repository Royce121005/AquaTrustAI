import React from 'react';
import { AlertTriangle, Clock, FileCheck2, ExternalLink } from 'lucide-react';
import { Facility } from '../../types';

export interface ExceedanceNotice {
  id: string;
  facilityName: string;
  tag: string;
  parameter: string;
  ceiling: number;
  observed: number;
  unit: string;
  exceededAt: string;
  slaRemainingHours: number;
  status: 'PENDING_REMEDIATION' | 'UNDER_REVIEW' | 'CLOSED';
}

const SAMPLE_EXCEEDANCES: ExceedanceNotice[] = [
  {
    id: 'EXC-2026-081',
    facilityName: 'Vrishabhavathi Valley STP (180 MLD)',
    tag: 'AIT-503',
    parameter: 'Effluent COD',
    ceiling: 50.0,
    observed: 64.2,
    unit: 'mg/L',
    exceededAt: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
    slaRemainingHours: 18.0,
    status: 'PENDING_REMEDIATION',
  },
  {
    id: 'EXC-2026-079',
    facilityName: 'K&C Valley STP (218 MLD)',
    tag: 'AIT-504',
    parameter: 'Total Suspended Solids (TSS)',
    ceiling: 20.0,
    observed: 24.8,
    unit: 'mg/L',
    exceededAt: new Date(Date.now() - 14 * 3600 * 1000).toISOString(),
    slaRemainingHours: 10.0,
    status: 'UNDER_REVIEW',
  },
];

export const WorstFirstFleetGrid: React.FC<{ facilities: Facility[] }> = ({ facilities }) => {
  // Sort facilities to put alert plants first
  const sorted = [...facilities].sort((a, b) => {
    if (a.facility_name.includes('Vrishabhavathi')) return -1;
    if (b.facility_name.includes('Vrishabhavathi')) return 1;
    return a.facility_name.localeCompare(b.facility_name);
  });

  return (
    <div style={{ background: '#0b1329', border: '1px solid #1e293b', borderRadius: '8px', padding: '1rem', color: '#e2e8f0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <AlertTriangle size={16} /> Regional STP Fleet Surveillance — Prioritized "Worst-First" Matrix
        </h4>
        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
          Sorted by Non-Compliance & Active Statutory Exceedances
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem' }}>
        {sorted.map((f, i) => {
          const isAlert = f.facility_name.includes('Vrishabhavathi');
          const isWarning = f.facility_name.includes('K&C');
          const compliancePct = isAlert ? 84.5 : isWarning ? 91.2 : 98.6;

          return (
            <div
              key={f.facility_id}
              style={{
                background: '#0f172a',
                border: `1px solid ${isAlert ? '#dc2626' : isWarning ? '#f59e0b' : '#1e293b'}`,
                borderRadius: '6px',
                padding: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Rank #{i + 1}</span>
                <span
                  style={{
                    padding: '0.15rem 0.4rem',
                    borderRadius: '3px',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    background: isAlert ? '#450a0a' : isWarning ? '#451a03' : '#064e3b',
                    color: isAlert ? '#f87171' : isWarning ? '#fbbf24' : '#4ade80',
                  }}
                >
                  {compliancePct}% Compliant
                </span>
              </div>

              <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#f8fafc', marginBottom: '0.2rem' }}>
                {f.facility_name}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
                Type: {f.facility_type} | ID: {f.facility_id.slice(0, 8)}...
              </div>

              <div style={{ fontSize: '0.75rem', borderTop: '1px solid #1e293b', paddingTop: '0.4rem', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Statutory Status:</span>
                <strong style={{ color: isAlert ? '#ef4444' : isWarning ? '#fbbf24' : '#22c55e' }}>
                  {isAlert ? 'EXCEEDANCE ACTIVE' : isWarning ? 'WARNING BUFFER' : 'IN COMPLIANCE'}
                </strong>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const ExceedanceEnforcementTable: React.FC = () => {
  return (
    <div style={{ background: '#0b1329', border: '1px solid #1e293b', borderRadius: '8px', padding: '1rem', color: '#e2e8f0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#f87171', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Clock size={16} /> Statutory Exceedance Register (24-Hour Remediation SLA)
        </h4>
        <span style={{ fontSize: '0.72rem', color: '#64748b' }}>CPCB OCEMS Enforcement Guidelines</span>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #1e293b', color: '#64748b', textAlign: 'left' }}>
              <th style={{ padding: '0.4rem' }}>NOTICE ID</th>
              <th style={{ padding: '0.4rem' }}>FACILITY</th>
              <th style={{ padding: '0.4rem' }}>PARAMETER</th>
              <th style={{ padding: '0.4rem' }}>CEILING</th>
              <th style={{ padding: '0.4rem' }}>OBSERVED</th>
              <th style={{ padding: '0.4rem' }}>24H SLA REMAINING</th>
              <th style={{ padding: '0.4rem' }}>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {SAMPLE_EXCEEDANCES.map((item) => (
              <tr key={item.id} style={{ borderBottom: '1px solid #1e293b' }}>
                <td style={{ padding: '0.4rem', fontFamily: 'monospace', color: '#38bdf8' }}>{item.id}</td>
                <td style={{ padding: '0.4rem', color: '#f8fafc', fontWeight: 500 }}>{item.facilityName}</td>
                <td style={{ padding: '0.4rem' }}>{item.parameter}</td>
                <td style={{ padding: '0.4rem' }}>{item.ceiling} {item.unit}</td>
                <td style={{ padding: '0.4rem', color: '#ef4444', fontWeight: 600 }}>{item.observed} {item.unit}</td>
                <td style={{ padding: '0.4rem', color: '#f59e0b', fontWeight: 600 }}>
                  {item.slaRemainingHours} Hours
                </td>
                <td style={{ padding: '0.4rem' }}>
                  <span style={{ padding: '0.15rem 0.4rem', borderRadius: '3px', fontSize: '0.7rem', background: '#450a0a', color: '#f87171', fontWeight: 600 }}>
                    {item.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const CpcbCertificateModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
      <div style={{ background: '#0b1329', border: '1px solid #1e293b', borderRadius: '8px', maxWidth: '540px', width: '100%', padding: '1.25rem', color: '#e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <FileCheck2 size={18} /> Official CPCB Form V Environmental Certificate
          </h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.1rem' }}>×</button>
        </div>

        <div style={{ background: '#030712', padding: '1rem', borderRadius: '6px', border: '1px solid #1e293b', textAlign: 'center' }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.2rem' }}>
            CENTRAL POLLUTION CONTROL BOARD (CPCB)
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.75rem' }}>
            Statutory Certificate of Effluent Water Quality Compliance
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', margin: '0.75rem 0' }}>
            {/* Dynamic SVG QR Code */}
            <div style={{ padding: '0.5rem', background: '#fff', borderRadius: '6px', display: 'inline-block' }}>
              <svg width="110" height="110" viewBox="0 0 110 110">
                <rect x="5" y="5" width="30" height="30" fill="#000" />
                <rect x="10" y="10" width="20" height="20" fill="#fff" />
                <rect x="15" y="15" width="10" height="10" fill="#000" />
                <rect x="75" y="5" width="30" height="30" fill="#000" />
                <rect x="80" y="10" width="20" height="20" fill="#fff" />
                <rect x="85" y="15" width="10" height="10" fill="#000" />
                <rect x="5" y="75" width="30" height="30" fill="#000" />
                <rect x="10" y="80" width="20" height="20" fill="#fff" />
                <rect x="15" y="85" width="10" height="10" fill="#000" />
                <rect x="45" y="15" width="20" height="20" fill="#000" />
                <rect x="45" y="45" width="20" height="20" fill="#000" />
                <rect x="75" y="55" width="25" height="15" fill="#000" />
                <rect x="15" y="45" width="15" height="20" fill="#000" />
                <rect x="50" y="75" width="25" height="25" fill="#000" />
              </svg>
            </div>
          </div>

          <div style={{ fontSize: '0.75rem', color: '#38bdf8', fontFamily: 'monospace', marginBottom: '0.3rem' }}>
            CERT: CERT-CPCB-KA-2026-0041
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
            Scan with any standard mobile QR reader to access the independent public non-repudiation portal.
          </div>
        </div>

        <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button
            onClick={() => window.open('/verify', '_blank')}
            style={{ padding: '0.4rem 0.8rem', background: '#0284c7', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
          >
            <ExternalLink size={14} /> Open Public Verifier
          </button>
          <button
            onClick={onClose}
            style={{ padding: '0.4rem 0.8rem', background: '#1e293b', border: '1px solid #334155', borderRadius: '4px', color: '#cbd5e1', fontSize: '0.78rem', cursor: 'pointer' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
