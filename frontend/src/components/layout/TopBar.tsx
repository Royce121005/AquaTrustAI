import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { getHealthApi } from '../../api/health';
import { getDLTStatusApi } from '../../api/dlt';
import { listFacilitiesApi } from '../../api/facilities';
import { RoleBadge, BackendHealthBadge, DltModeBadge } from '../common/Badges';
import { LogOut, Building2, Droplets, Sun, Moon } from 'lucide-react';

export const TopBar: React.FC = () => {
  const { user, logout, selectedFacilityId, setSelectedFacilityId } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // Periodic polling for backend health
  const { data: healthData, isError: healthError } = useQuery({
    queryKey: ['health'],
    queryFn: getHealthApi,
    refetchInterval: 30000,
  });

  // Periodic polling for DLT status
  const { data: dltData } = useQuery({
    queryKey: ['dlt-status'],
    queryFn: getDLTStatusApi,
    refetchInterval: 20000,
  });

  // Query facilities for selector if authenticated
  const { data: facilities } = useQuery({
    queryKey: ['facilities'],
    queryFn: listFacilitiesApi,
    staleTime: 60000,
  });

  // Automatically map non-UUID facility codes (e.g. "FAC-CPCB-001") to actual facility UUID
  React.useEffect(() => {
    if (facilities && facilities.length > 0 && selectedFacilityId) {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(selectedFacilityId);
      if (!isUUID) {
        const match = facilities.find(
          (f) =>
            f.facility_id === selectedFacilityId ||
            f.facility_name.toLowerCase().includes('delhi') ||
            f.facility_name.toLowerCase().includes('cpcb')
        );
        if (match) {
          setSelectedFacilityId(match.facility_id);
        }
      }
    }
  }, [facilities, selectedFacilityId, setSelectedFacilityId]);

  return (
    <header className="h-14 bg-white/90 dark:bg-[#0B0F17]/95 backdrop-blur-md border-b border-slate-200 dark:border-[#1F293D] text-slate-800 dark:text-slate-100 flex items-center justify-between px-4 sm:px-6 shrink-0 z-30 select-none">
      <div className="flex items-center gap-4 sm:gap-6">
        {/* Brand Group */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20 font-bold shrink-0">
            <Droplets className="w-4 h-4 text-white fill-current" />
          </div>
          <span className="font-bold text-base tracking-tight text-slate-900 dark:text-white font-mono">
            AquaTrust<span className="text-cyan-600 dark:text-cyan-400">AI</span>
          </span>
        </div>

        {/* Facility Context Selector */}
        <div className="hidden lg:flex items-center gap-2 pl-4 border-l border-slate-200 dark:border-[#1F293D] text-xs">
          <Building2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
          {facilities && facilities.length > 0 ? (
            <select
              value={selectedFacilityId || ''}
              onChange={(e) => setSelectedFacilityId(e.target.value || null)}
              className="bg-slate-50 dark:bg-[#111827] border border-slate-300 dark:border-[#1F293D] text-slate-800 dark:text-slate-200 text-xs rounded-md px-2.5 py-1 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 font-mono cursor-pointer transition-colors"
            >
              <option value="">All Facilities (Unfiltered)</option>
              {facilities.map((f) => (
                <option key={f.facility_id} value={f.facility_id}>
                  {f.facility_name} ({f.facility_id.slice(0, 8)}...)
                </option>
              ))}
            </select>
          ) : (
            <span className="text-slate-600 dark:text-slate-300 font-mono text-xs">
              {user?.facility_id || 'Default Scope'}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        {/* Infrastructure Indicators */}
        <div className="hidden sm:flex items-center gap-2">
          <BackendHealthBadge
            status={healthError ? 'degraded' : healthData?.status}
            database={healthData?.database}
          />
          <DltModeBadge
            mode={dltData?.mode}
            distributedLedger={dltData?.distributed_ledger}
          />
        </div>

        {/* Sun/Moon Theme Toggle */}
        <button
          onClick={toggleTheme}
          type="button"
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-[#1F293D] bg-slate-100 hover:bg-slate-200 dark:bg-[#111827] dark:hover:bg-slate-800 text-slate-600 dark:text-amber-400 transition-colors"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-600" />
          )}
        </button>

        {/* User Identity and Role */}
        {user && (
          <div className="flex items-center gap-3 pl-3 border-l border-slate-200 dark:border-[#1F293D]">
            <div className="text-right hidden md:block">
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-snug font-mono">
                {user.display_name || user.username}
              </div>
              <div className="flex justify-end mt-0.5">
                <RoleBadge role={user.role} />
              </div>
            </div>

            <button
              onClick={() => logout()}
              title="Logout"
              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/80 rounded-lg border border-transparent hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
