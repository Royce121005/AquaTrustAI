import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import {
  LayoutDashboard,
  Building2,
  Activity,
  CheckCircle,
  AlertTriangle,
  Scale,
  FileText,
  Stamp,
  Award,
  ShieldCheck,
  GitCommit,
  Blocks,
  FileSpreadsheet,
  Server,
  UserPlus,
  PlayCircle,
} from 'lucide-react';

interface NavItem {
  name: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
}

const ALL_NAV_ITEMS: NavItem[] = [
  {
    name: 'Dashboard',
    to: '/dashboard',
    icon: LayoutDashboard,
    roles: ['operator', 'auditor', 'regulatory_stakeholder', 'admin'],
  },
  {
    name: 'Facilities',
    to: '/facilities',
    icon: Building2,
    roles: ['operator', 'auditor', 'regulatory_stakeholder', 'admin'],
  },
  {
    name: 'Telemetry',
    to: '/readings',
    icon: Activity,
    roles: ['operator', 'auditor', 'admin'],
  },
  {
    name: 'Validation',
    to: '/validation',
    icon: CheckCircle,
    roles: ['operator', 'admin'],
  },
  {
    name: 'AI Anomalies',
    to: '/anomalies',
    icon: AlertTriangle,
    roles: ['operator', 'auditor', 'admin'],
  },
  {
    name: 'Compliance',
    to: '/compliance',
    icon: Scale,
    roles: ['operator', 'auditor', 'regulatory_stakeholder', 'admin'],
  },
  {
    name: 'Treatment Records',
    to: '/treatment-records',
    icon: FileText,
    roles: ['operator', 'auditor', 'regulatory_stakeholder', 'admin'],
  },
  {
    name: 'Finalization',
    to: '/finalization',
    icon: Stamp,
    roles: ['operator', 'admin'],
  },
  {
    name: 'Certificates',
    to: '/certificates',
    icon: Award,
    roles: ['auditor', 'regulatory_stakeholder', 'admin'],
  },
  {
    name: 'Verification',
    to: '/verification',
    icon: ShieldCheck,
    roles: ['operator', 'auditor', 'regulatory_stakeholder', 'admin'],
  },
  {
    name: 'Corrections',
    to: '/corrections',
    icon: GitCommit,
    roles: ['operator', 'auditor', 'regulatory_stakeholder', 'admin'],
  },
  {
    name: 'Blockchain & DLT',
    to: '/blockchain',
    icon: Blocks,
    roles: ['auditor', 'regulatory_stakeholder', 'admin'],
  },
  {
    name: 'Audit Trail',
    to: '/audit',
    icon: FileSpreadsheet,
    roles: ['auditor', 'regulatory_stakeholder', 'admin'],
  },
  {
    name: 'Simulator Control',
    to: '/simulator',
    icon: PlayCircle,
    roles: ['operator', 'admin'],
  },
  {
    name: 'System Status',
    to: '/system-status',
    icon: Server,
    roles: ['admin'],
  },
  {
    name: 'Register User',
    to: '/admin/users/new',
    icon: UserPlus,
    roles: ['admin'],
  },
];

export const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const currentRole = user?.role || 'operator';

  // Filter items by role. Admin has access to all admin and role endpoints.
  const authorizedItems = ALL_NAV_ITEMS.filter((item) => {
    if (currentRole === 'admin') return true;
    return item.roles.includes(currentRole);
  });

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 select-none">
      <div className="px-4 py-3 text-[11px] font-mono uppercase tracking-wider text-slate-500 border-b border-slate-800/80">
        Navigation Scope: {currentRole}
      </div>

      <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
        {authorizedItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-sm font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0 text-slate-400 group-hover:text-white" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Operational Footer Notice */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/40 text-[10px] text-slate-500 font-mono">
        <p className="font-semibold text-slate-400">CPCB 2021 Normative Boundary</p>
        <p className="mt-0.5">SHA-256 / ES256 Signed Finality</p>
      </div>
    </aside>
  );
};
