import React, { useState, useEffect } from 'react';
import { Clock, ShieldCheck, Maximize2, Minimize2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const HeaderClock: React.FC = () => {
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(
        now.toLocaleString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour12: false,
          year: 'numeric',
          month: 'short',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }) + ' IST'
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', fontFamily: 'monospace', color: '#94a3b8' }}>
      <Clock size={14} color="#38bdf8" />
      <span>{time}</span>
    </div>
  );
};

export const NocKioskToggle: React.FC = () => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggle = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return (
    <button
      onClick={toggle}
      title="Toggle NOC Wall Kiosk Mode"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: '0.35rem 0.65rem',
        background: '#1e293b',
        border: '1px solid #334155',
        borderRadius: '4px',
        color: '#cbd5e1',
        fontSize: '0.78rem',
        cursor: 'pointer',
      }}
    >
      {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
      <span>{isFullscreen ? 'Exit Kiosk' : 'NOC Kiosk'}</span>
    </button>
  );
};

export const RolePermissionsBanner: React.FC = () => {
  const { user } = useAuth();
  if (!user) return null;

  const role = user.role?.toLowerCase();
  let scope = 'Single Facility: Hebbal STP (60 MLD)';
  let bg = '#0f172a';
  let border = '#0284c7';
  let badgeText = 'PLANT OPERATOR (ISA-18.2 OT SCOPE)';

  if (role === 'admin') {
    scope = 'Platform-wide (All Nodes, Keys, Gateway & DB)';
    border = '#e11d48';
    badgeText = 'SYSTEM ADMINISTRATOR (INFRA & SECURITY)';
  } else if (role === 'auditor') {
    scope = 'Multi-Facility Audit (Forensic & 21 CFR Part 11)';
    border = '#9333ea';
    badgeText = 'COMPLIANCE AUDITOR (DUAL CONTROL)';
  } else if (role === 'regulator' || role === 'regulatory_stakeholder') {
    scope = 'National / Regional Fleet (CPCB Statutory Oversight)';
    border = '#10b981';
    badgeText = 'CPCB REGULATOR (NON-REPUDIATION)';
  }

  return (
    <div
      style={{
        padding: '0.45rem 1rem',
        background: bg,
        borderLeft: `4px solid ${border}`,
        borderBottom: '1px solid #1e293b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.75rem',
        color: '#cbd5e1',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <ShieldCheck size={14} color={border} />
        <span style={{ fontWeight: 600, color: '#f8fafc' }}>{badgeText}</span>
        <span style={{ color: '#64748b' }}>•</span>
        <span>Operational Scope: <strong style={{ color: '#94a3b8' }}>{scope}</strong></span>
      </div>
      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
        Identity: <span style={{ color: '#38bdf8' }}>{user.username}</span> ({user.user_id?.slice(0, 8)}...)
      </div>
    </div>
  );
};
