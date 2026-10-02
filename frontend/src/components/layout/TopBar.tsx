import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { getHealthApi } from '../../api/health';
import { getDLTStatusApi } from '../../api/dlt';
import { listFacilitiesApi } from '../../api/facilities';
import { RoleBadge, BackendHealthBadge, DltModeBadge } from '../common/Badges';
import { LogOut, Building2, Droplets, RefreshCw } from 'lucide-react';

export const TopBar: React.FC = () => {
  const { user, logout, selectedFacilityId, setSelectedFacilityId } = useAuth();

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

  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 text-slate-100 flex items-center justify-between px-6 shrink-0 z-30">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-brand-600 flex items-center justify-center text-white shadow-sm font-bold">
            <Droplets className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-tight text-white">IWM-BTS</span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 bg-slate-800 text-brand-300 rounded border border-slate-700">
                v0.1.0
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium leading-none">
              Intelligent Wastewater Monitoring &amp; Blockchain Traceability System
            </p>
          </div>
        </div>

        {/* Facility Context Selector / Display */}
        <div className="hidden lg:flex items-center gap-2 pl-4 border-l border-slate-800 text-xs">
          <Building2 className="w-4 h-4 text-slate-400" />
          <span className="text-slate-400 font-mono text-[11px]">Facility Scope:</span>
          {facilities && facilities.length > 0 ? (
            <select
              value={selectedFacilityId || ''}
              onChange={(e) => setSelectedFacilityId(e.target.value || null)}
              className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-brand-500 font-mono"
            >
              <option value="">All Facilities (Unfiltered)</option>
              {facilities.map((f) => (
                <option key={f.facility_id} value={f.facility_id}>
                  {f.facility_name} ({f.facility_id.slice(0, 8)}...)
                </option>
              ))}
            </select>
          ) : (
            <span className="text-slate-300 font-mono text-xs">
              {user?.facility_id || 'Default Scope'}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
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

        {/* User Identity and Role */}
        {user && (
          <div className="flex items-center gap-3 pl-3 border-l border-slate-800">
            <div className="text-right hidden md:block">
              <div className="text-xs font-semibold text-slate-200 leading-snug">
                {user.display_name || user.username}
              </div>
              <div className="flex justify-end mt-0.5">
                <RoleBadge role={user.role} />
              </div>
            </div>

            <button
              onClick={() => logout()}
              title="Logout session and revoke token"
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
