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
  Cpu,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export interface SidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

interface NavItem {
  name: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
  category: 'monitoring' | 'quality' | 'records' | 'infrastructure' | 'admin';
}

const ALL_NAV_ITEMS: NavItem[] = [
  // 1. MONITORING & PROCESS
  {
    name: 'Dashboard',
    to: '/dashboard',
    icon: LayoutDashboard,
    roles: ['operator', 'auditor', 'regulatory_stakeholder', 'admin'],
    category: 'monitoring',
  },
  {
    name: 'Facilities',
    to: '/facilities',
    icon: Building2,
    roles: ['operator', 'auditor', 'regulatory_stakeholder', 'admin'],
    category: 'monitoring',
  },
  {
    name: 'Digital Twin',
    to: '/digital-twin',
    icon: Cpu,
    roles: ['operator', 'auditor', 'regulatory_stakeholder', 'admin'],
    category: 'monitoring',
  },
  {
    name: 'Telemetry',
    to: '/readings',
    icon: Activity,
    roles: ['operator', 'auditor', 'admin'],
    category: 'monitoring',
  },

  // 2. QUALITY & AI ENGINE
  {
    name: 'Validation',
    to: '/validation',
    icon: CheckCircle,
    roles: ['operator', 'admin'],
    category: 'quality',
  },
  {
    name: 'AI Anomalies',
    to: '/anomalies',
    icon: AlertTriangle,
    roles: ['operator', 'auditor', 'admin'],
    category: 'quality',
  },
  {
    name: 'Compliance',
    to: '/compliance',
    icon: Scale,
    roles: ['operator', 'auditor', 'regulatory_stakeholder', 'admin'],
    category: 'quality',
  },

  // 3. RECORDS & TRUST
  {
    name: 'Treatment Records',
    to: '/treatment-records',
    icon: FileText,
    roles: ['operator', 'auditor', 'regulatory_stakeholder', 'admin'],
    category: 'records',
  },
  {
    name: 'Finalization',
    to: '/finalization',
    icon: Stamp,
    roles: ['operator', 'admin'],
    category: 'records',
  },
  {
    name: 'Certificates',
    to: '/certificates',
    icon: Award,
    roles: ['auditor', 'regulatory_stakeholder', 'admin'],
    category: 'records',
  },
  {
    name: 'Verification',
    to: '/verification',
    icon: ShieldCheck,
    roles: ['operator', 'auditor', 'regulatory_stakeholder', 'admin'],
    category: 'records',
  },
  {
    name: 'Corrections',
    to: '/corrections',
    icon: GitCommit,
    roles: ['operator', 'auditor', 'regulatory_stakeholder', 'admin'],
    category: 'records',
  },

  // 4. INFRASTRUCTURE & DLT
  {
    name: 'Blockchain & DLT',
    to: '/blockchain',
    icon: Blocks,
    roles: ['auditor', 'regulatory_stakeholder', 'admin'],
    category: 'infrastructure',
  },
  {
    name: 'Audit Trail',
    to: '/audit',
    icon: FileSpreadsheet,
    roles: ['auditor', 'regulatory_stakeholder', 'admin'],
    category: 'infrastructure',
  },
  {
    name: 'Simulator Control',
    to: '/simulator',
    icon: PlayCircle,
    roles: ['operator', 'admin'],
    category: 'infrastructure',
  },
  {
    name: 'System Status',
    to: '/system-status',
    icon: Server,
    roles: ['admin'],
    category: 'infrastructure',
  },

  // 5. ADMINISTRATION
  {
    name: 'Register User',
    to: '/admin/users/new',
    icon: UserPlus,
    roles: ['admin'],
    category: 'admin',
  },
];

const CATEGORY_LABELS: Record<string, string> = {
  monitoring: 'Process & SCADA',
  quality: 'Quality & AI Engine',
  records: 'Trust & Provenance',
  infrastructure: 'Ledger & Telemetry',
  admin: 'Administration',
};

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const { user } = useAuth();
  const currentRole = user?.role || 'operator';

  // Filter items by role. Admin has access to all admin and role endpoints.
  const authorizedItems = ALL_NAV_ITEMS.filter((item) => {
    if (currentRole === 'admin') return true;
    return item.roles.includes(currentRole);
  });

  // Group items by category
  const categories = ['monitoring', 'quality', 'records', 'infrastructure', 'admin'] as const;

  return (
    <aside
      className={`${
        isCollapsed ? 'w-16' : 'w-60'
      } bg-[#0B0F17] border-r border-[#1F293D] flex flex-col shrink-0 select-none transition-all duration-200 z-20`}
    >
      <div className="h-10 px-3 border-b border-[#1F293D]/80 flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-slate-400">
        {!isCollapsed && (
          <span className="truncate flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
            Scope: <span className="text-slate-200">{currentRole}</span>
          </span>
        )}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            title={isCollapsed ? 'Expand Navigation' : 'Collapse Navigation'}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors mx-auto"
          >
            {isCollapsed ? (
              <ChevronRight className="w-3.5 h-3.5" />
            ) : (
              <ChevronLeft className="w-3.5 h-3.5" />
            )}
          </button>
        )}
      </div>

      <nav className="flex-1 px-2 py-3 space-y-4 overflow-y-auto">
        {categories.map((catKey) => {
          const itemsInCat = authorizedItems.filter((i) => i.category === catKey);
          if (itemsInCat.length === 0) return null;

          return (
            <div key={catKey} className="space-y-1">
              {!isCollapsed && (
                <div className="px-2.5 pt-1.5 pb-1 text-[9px] font-mono uppercase tracking-widest text-slate-400 font-semibold">
                  {CATEGORY_LABELS[catKey]}
                </div>
              )}
              {itemsInCat.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    title={isCollapsed ? item.name : undefined}
                    className={({ isActive }) =>
                      `flex items-center ${
                        isCollapsed ? 'justify-center px-2 py-2' : 'gap-2.5 px-2.5 py-1.5'
                      } rounded-lg text-xs font-medium transition-all group ${
                        isActive
                          ? 'bg-cyan-500/15 text-cyan-300 font-semibold border-l-2 border-cyan-400 shadow-sm shadow-cyan-950/30'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 shrink-0 transition-colors group-hover:text-cyan-300" />
                    {!isCollapsed && <span className="truncate">{item.name}</span>}
                  </NavLink>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Operational Footer Notice */}
      {!isCollapsed && (
        <div className="p-3 border-t border-[#1F293D] bg-[#070B12]/80 text-[10px] text-slate-400 font-mono">
          <p className="font-semibold text-slate-300 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            CPCB 2021 Normative Boundary
          </p>
          <p className="mt-0.5 text-slate-400">SHA-256 / ES256 Signed Finality</p>
        </div>
      )}
    </aside>
  );
};
