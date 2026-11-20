import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { listFacilitiesApi } from '../api/facilities';
import { LoadingState, ErrorState, EmptyState } from '../components/common/States';
import { StatusBadge } from '../components/common/Badges';
import { Building2, Plus, ArrowRight, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const FacilitiesPage: React.FC = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const { data: facilities, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['facilities'],
    queryFn: listFacilitiesApi,
  });

  const filteredFacilities = useMemo(() => {
    if (!facilities) return [];
    if (!searchTerm.trim()) return facilities;
    const term = searchTerm.toLowerCase();
    return facilities.filter(
      (f) =>
        f.facility_name.toLowerCase().includes(term) ||
        f.facility_id.toLowerCase().includes(term) ||
        (f.facility_type && f.facility_type.toLowerCase().includes(term))
    );
  }, [facilities, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-[#1F293D]">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#0EA5E9]/10 border border-[#0EA5E9]/30 flex items-center justify-center text-[#0EA5E9]">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                Registered Treatment Facilities
                {facilities && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono font-normal">
                    {facilities.length} Total
                  </span>
                )}
              </h1>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search facilities or cities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-[#1F293D] bg-white dark:bg-[#0B0F17] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0EA5E9] w-64 font-sans"
            />
          </div>
          {user?.role === 'admin' && (
            <Link
              to="/admin/facilities/new"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#0EA5E9] hover:bg-[#0284C7] text-white rounded-lg text-xs font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(14,165,233,0.3)] transition-all cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Register Facility
            </Link>
          )}
        </div>
      </div>

      {isLoading ? (
        <LoadingState message="Fetching registered facilities..." />
      ) : isError ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : !facilities || facilities.length === 0 ? (
        <EmptyState
          title="No Facilities Registered"
          message="No wastewater treatment facilities are registered in the system."
        />
      ) : filteredFacilities.length === 0 ? (
        <EmptyState
          title="No Matching Facilities"
          message={`No treatment facilities matched "${searchTerm}".`}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFacilities.map((fac) => (
            <div
              key={fac.facility_id}
              className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1F293D] rounded-xl p-5 shadow-sm dark:shadow-xl hover:border-[#0EA5E9]/50 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-[#1F293D] text-[#0EA5E9] rounded-lg group-hover:border-[#0EA5E9]/40 transition-colors">
                      <Building2 className="w-5 h-5 text-[#0EA5E9]" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                        {fac.facility_name}
                      </h2>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                        {fac.facility_type}
                      </span>
                    </div>
                  </div>
                  <StatusBadge status={fac.status} />
                </div>

                <div className="space-y-2 text-xs border-t border-slate-200 dark:border-[#1F293D] pt-3 font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Facility ID:</span>
                    <span className="text-cyan-700 dark:text-[#0EA5E9] select-all font-semibold">
                      {fac.facility_id.slice(0, 13)}...
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Design Capacity:</span>
                    <span className="text-slate-900 dark:text-white font-medium">
                      {fac.capacity !== null ? `${fac.capacity} ${fac.capacity_unit || ''}` : 'Not specified'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Registered:</span>
                    <span className="text-slate-700 dark:text-slate-300">
                      {new Date(fac.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-200 dark:border-[#1F293D] flex items-center justify-between">
                <Link
                  to={`/facilities/${fac.facility_id}`}
                  className="text-xs font-semibold text-cyan-600 dark:text-[#0EA5E9] hover:text-cyan-700 dark:hover:text-cyan-300 inline-flex items-center gap-1 transition-colors"
                >
                  Inspect Facility &amp; Sensors
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <Link
                  to={`/readings?facility_id=${fac.facility_id}`}
                  className="text-[11px] text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white font-mono transition-colors"
                >
                  View Telemetry &rarr;
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
