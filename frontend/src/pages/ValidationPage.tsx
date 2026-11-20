import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getValidationStatsApi } from '../api/validation';
import { listFacilitiesApi } from '../api/facilities';
import { useAuth } from '../context/AuthContext';
import { LoadingState, ErrorState } from '../components/common/States';
import { CheckCircle, AlertTriangle, XCircle, RefreshCw, Filter, ShieldCheck } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { useChartTheme } from '../hooks/useChartTheme';

export const ValidationPage: React.FC = () => {
  const { selectedFacilityId, setSelectedFacilityId } = useAuth();
  const chartTheme = useChartTheme();

  const { data: facilities } = useQuery({
    queryKey: ['facilities'],
    queryFn: listFacilitiesApi,
    staleTime: 60000,
  });

  const matchedFacility = facilities?.find(
    (f) => f.facility_id === selectedFacilityId || (selectedFacilityId && f.facility_name?.includes(selectedFacilityId))
  );
  const effectiveFacilityId = matchedFacility
    ? matchedFacility.facility_id
    : selectedFacilityId && /^[0-9a-fA-F-]{36}$/.test(selectedFacilityId)
    ? selectedFacilityId
    : undefined;

  const statsQuery = useQuery({
    queryKey: ['validation-stats', effectiveFacilityId],
    queryFn: () => getValidationStatsApi(effectiveFacilityId),
    refetchInterval: 20000,
  });

  const stats = statsQuery.data;

  const chartData = stats
    ? [
        { name: 'Valid', count: stats.valid_count, color: '#10b981' },
        { name: 'Suspect', count: stats.suspect_count, color: '#f59e0b' },
        { name: 'Invalid', count: stats.invalid_count, color: '#ef4444' },
        { name: 'Pending', count: stats.pending_count, color: '#64748b' },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-[#1F293D]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-mono flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            Deterministic Pre-AI Data Quality Validation
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => statsQuery.refetch()}
            disabled={statsQuery.isFetching}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-[#1E293B] border border-slate-300 dark:border-[#334155] dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-mono font-medium shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${statsQuery.isFetching ? 'animate-spin text-emerald-600 dark:text-emerald-400' : ''}`} />
            Refresh Stats
          </button>
        </div>
      </div>

      {/* Facility Filter Bar */}
      <div className="scada-filter-bar">
        <Filter className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
        <span className="text-slate-600 dark:text-slate-400 font-mono text-[11px]">Facility Filter:</span>
        <select
          value={selectedFacilityId || ''}
          onChange={(e) => setSelectedFacilityId(e.target.value || null)}
          className="scada-select"
        >
          <option value="">All Registered Facilities</option>
          {facilities?.map((f) => (
            <option key={f.facility_id} value={f.facility_id}>
              {f.facility_name} ({f.facility_id.slice(0, 8)}...)
            </option>
          ))}
        </select>
        {selectedFacilityId && (
          <button
            onClick={() => setSelectedFacilityId(null)}
            className="text-[11px] font-mono text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-300 ml-auto cursor-pointer"
          >
            Clear Filter
          </button>
        )}
      </div>

      {statsQuery.isLoading ? (
        <LoadingState message="Aggregating pre-AI validation metrics..." />
      ) : statsQuery.isError ? (
        <ErrorState error={statsQuery.error} onRetry={() => statsQuery.refetch()} />
      ) : stats ? (
        <>
          {/* Quality Distribution Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="scada-card p-5 relative overflow-hidden">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono block">
                Total Readings
              </span>
              <div className="text-3xl font-bold text-slate-900 dark:text-white mt-1.5 font-mono tabular-nums">
                {stats.total_readings}
              </div>
            </div>

            <div className="scada-card p-5 relative overflow-hidden border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/70 dark:bg-emerald-950/10">
              <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400">
                <span className="text-[11px] font-semibold uppercase tracking-wider font-mono">Valid Clean</span>
                <CheckCircle className="w-4 h-4" />
              </div>
              <div className="text-3xl font-bold text-emerald-700 dark:text-emerald-400 mt-1.5 font-mono tabular-nums">
                {stats.valid_count}
              </div>
            </div>

            <div className="scada-card p-5 relative overflow-hidden border-amber-200 dark:border-amber-900/50 bg-amber-50/70 dark:bg-amber-950/10">
              <div className="flex items-center justify-between text-amber-700 dark:text-amber-400">
                <span className="text-[11px] font-semibold uppercase tracking-wider font-mono">Suspect</span>
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="text-3xl font-bold text-amber-700 dark:text-amber-400 mt-1.5 font-mono tabular-nums">
                {stats.suspect_count}
              </div>
              <Link
                to={`/readings?quality_status=suspect${selectedFacilityId ? `&facility_id=${selectedFacilityId}` : ''}`}
                className="text-[11px] text-amber-700 dark:text-amber-400 hover:underline mt-1.5 inline-flex items-center gap-1 font-mono font-semibold"
              >
                Inspect Suspect Readings &rarr;
              </Link>
            </div>

            <div className="scada-card p-5 relative overflow-hidden border-rose-200 dark:border-rose-900/50 bg-rose-50/70 dark:bg-rose-950/10">
              <div className="flex items-center justify-between text-rose-700 dark:text-rose-400">
                <span className="text-[11px] font-semibold uppercase tracking-wider font-mono">Invalid</span>
                <XCircle className="w-4 h-4" />
              </div>
              <div className="text-3xl font-bold text-rose-700 dark:text-rose-400 mt-1.5 font-mono tabular-nums">
                {stats.invalid_count}
              </div>
              <Link
                to={`/readings?quality_status=invalid${selectedFacilityId ? `&facility_id=${selectedFacilityId}` : ''}`}
                className="text-[11px] text-rose-700 dark:text-rose-400 hover:underline mt-1.5 inline-flex items-center gap-1 font-mono font-semibold"
              >
                Inspect Invalid Readings &rarr;
              </Link>
            </div>

            <div className="scada-card p-5 relative overflow-hidden">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="text-[11px] font-semibold uppercase tracking-wider font-mono">Valid Rate</span>
                <span className="text-xs font-mono font-bold text-cyan-600 dark:text-cyan-400">%</span>
              </div>
              <div className="text-3xl font-bold text-cyan-700 dark:text-cyan-400 mt-1.5 font-mono tabular-nums">
                {stats.valid_rate_percent}%
              </div>
            </div>
          </div>

          {/* Validation Distribution Chart */}
          <div className="scada-card p-6">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wide font-mono mb-4 flex items-center justify-between">
              <span>Quality Status Distribution</span>
              <span className="text-[10px] text-slate-500 font-normal">Real-Time Aggregation</span>
            </h2>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                  <XAxis dataKey="name" stroke={chartTheme.textColor} fontSize={11} fontFamily="monospace" />
                  <YAxis stroke={chartTheme.textColor} fontSize={11} fontFamily="monospace" />
                  <Tooltip
                    contentStyle={{ backgroundColor: chartTheme.tooltipBg, borderColor: chartTheme.tooltipBorder, borderRadius: '8px', color: chartTheme.tooltipText, fontSize: '12px', fontFamily: 'monospace' }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};
export default ValidationPage;
