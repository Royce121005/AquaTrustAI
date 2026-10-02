import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Activity,
  Bell,
  LineChart,
  FileCheck,
  ShieldCheck,
  Building,
  KeyRound,
  FileSpreadsheet,
  LogOut,
  Link2,
  Sparkles,
  Sliders,
  History,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { HeaderClock, NocKioskToggle, RolePermissionsBanner } from '../components/common/IndustrialWidgets';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  roles: string[]; // which roles can see this
}

const NAV_ITEMS: NavItem[] = [
  // Operator Navigation
  { to: '/dashboard', label: 'Supervisory Dashboard', icon: <LayoutDashboard size={16} />, roles: ['operator', 'admin'] },
  { to: '/process', label: 'SCADA Process Mimic', icon: <Activity size={16} />, roles: ['operator', 'admin'] },
  { to: '/alarms', label: 'ISA-18.2 Alarm Console', icon: <Bell size={16} />, roles: ['operator', 'admin'] },
  { to: '/monitoring', label: 'Telemetry Explorer', icon: <LineChart size={16} />, roles: ['operator', 'admin'] },
  { to: '/insights', label: 'AI Anomaly Insights', icon: <Sparkles size={16} />, roles: ['operator', 'admin'] },
  { to: '/compliance', label: 'Window Finalization', icon: <FileCheck size={16} />, roles: ['operator', 'admin'] },

  // Auditor Navigation
  { to: '/auditor', label: 'Auditor Workspace', icon: <ShieldCheck size={16} />, roles: ['auditor', 'admin'] },
  { to: '/blockchain', label: 'Blockchain DLT Anchors', icon: <Link2 size={16} />, roles: ['auditor', 'regulator', 'regulatory_stakeholder', 'admin'] },
  { to: '/blockchain/verify', label: '4-Stage Verifier', icon: <FileSpreadsheet size={16} />, roles: ['auditor', 'regulator', 'regulatory_stakeholder', 'admin'] },
  { to: '/audit', label: 'Audit Trail Journal', icon: <History size={16} />, roles: ['auditor', 'admin'] },

  // Regulator Navigation
  { to: '/regulator', label: 'CPCB Regulator Console', icon: <Building size={16} />, roles: ['regulator', 'regulatory_stakeholder', 'admin'] },
  { to: '/compliance/reports', label: 'Form V Returns', icon: <FileCheck size={16} />, roles: ['regulator', 'regulatory_stakeholder', 'auditor', 'admin'] },

  // Admin Navigation
  { to: '/admin', label: 'System Administration', icon: <KeyRound size={16} />, roles: ['admin'] },

  // Common Settings
  { to: '/settings', label: 'Console Settings', icon: <Sliders size={16} />, roles: ['operator', 'auditor', 'regulator', 'regulatory_stakeholder', 'admin'] },
];

export const MainLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const userRole = user?.role?.toLowerCase() || '';

  const visibleNav = NAV_ITEMS.filter((item) => {
    if (userRole === 'admin') return true;
    return item.roles.some(
      (r) =>
        r === userRole ||
        (r === 'regulator' && userRole === 'regulatory_stakeholder') ||
        (r === 'regulatory_stakeholder' && userRole === 'regulator')
    );
  });

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#030712', color: '#f8fafc', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Top Header */}
      <header style={{ height: '54px', background: '#0b1329', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'linear-gradient(135deg, #0284c7, #2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px' }}>
            AT
          </div>
          <span style={{ fontWeight: 700, fontSize: '1rem', letterSpacing: '0.02em', color: '#f8fafc' }}>
            AquaTrust<span style={{ color: '#38bdf8' }}>AI</span>
          </span>
          <span style={{ fontSize: '0.72rem', background: '#1e293b', padding: '0.15rem 0.45rem', borderRadius: '4px', color: '#94a3b8' }}>
            v2.4-Production
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <HeaderClock />
          <NocKioskToggle />
          <button
            onClick={handleLogout}
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: '#1e293b', border: '1px solid #334155', borderRadius: '4px', padding: '0.35rem 0.65rem', color: '#cbd5e1', fontSize: '0.78rem', cursor: 'pointer' }}
          >
            <LogOut size={13} />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Role Scoping Banner */}
      <RolePermissionsBanner />

      {/* Main Workspace with Dynamic Sidebar */}
      <div style={{ display: 'flex', flex: 1 }}>
        <aside style={{ width: '240px', background: '#070d1e', borderRight: '1px solid #1e293b', padding: '1rem 0.5rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, padding: '0 0.75rem 0.4rem', letterSpacing: '0.05em' }}>
            Authorized Consoles
          </div>
          {visibleNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                padding: '0.55rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.82rem',
                textDecoration: 'none',
                fontWeight: isActive ? 600 : 400,
                color: isActive ? '#38bdf8' : '#94a3b8',
                background: isActive ? '#0f172a' : 'transparent',
                borderLeft: isActive ? '3px solid #38bdf8' : '3px solid transparent',
              })}
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </aside>

        {/* Dynamic Page Outlet */}
        <main style={{ flex: 1, padding: '1.25rem', overflowY: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};
