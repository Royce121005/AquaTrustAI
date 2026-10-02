import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getValidationStatsApi } from '../api/validation';
import { listFacilitiesApi } from '../api/facilities';
import { useAuth } from '../context/AuthContext';
import { LoadingState, ErrorState } from '../components/common/States';
import { CheckCircle, AlertTriangle, XCircle, Clock, RefreshCw, Filter, ArrowRight } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';

export const ValidationPage: React.FC = () => {
  const { selectedFacilityId, setSelectedFacilityId } = useAuth();

  const { data: facilities } = useQuery({
    queryKey: ['facilities'],
    queryFn: listFacilitiesApi,
    staleTime: 60000,
  });

  const statsQuery = useQuery({
    queryKey: ['validation-stats', selectedFacilityId],
    queryFn: () => getValidationStatsApi(selectedFacilityId || undefined),
    refetchInterval: 20000,
  });

  const stats = statsQuery.data;

  const chartData = stats
    ? [
        { name: 'Valid', count: stats.valid_count, color: '#10b981' },
        { name: 'Suspect', count: stats.suspect_count, color: '#f59e0b' },
        { name: 'Invalid', count: stats.invalid_count, color: '#ef4444' },
        { name: 'Pending', count: stats.pending_count, color: '#94a3b8' },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Deterministic Pre-AI Data Quality Validation
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Physical limits, freeze detection, rate-of-change, and instrumentation validity checks.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => statsQuery.refetch()}
            disabled={statsQuery.isFetching}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-md text-xs font-medium shadow-sm transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${statsQuery.isFetching ? 'animate-spin' : ''}`} />
            Refresh Stats
          </button>
        </div>
      </div>

      {/* Facility Filter */}
      <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm flex items-center gap-3 text-xs">
        <Filter className="w-3.5 h-3.5 text-slate-500" />
        <span className="text-slate-500 font-mono text-[11px]">Facility Filter:</span>
        <select
          value={selectedFacilityId || ''}
          onChange={(e) => setSelectedFacilityId(e.target.value || null)}
          className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-slate-800 font-mono focus:ring-1 focus:ring-brand-500"
        >
          <option value="">All Registered Facilities</option>
          {facilities?.map((f) => (
            <option key={f.facility_id} value={f.facility_id}>
              {f.facility_name} ({f.facility_id.slice(0, 8)}...)
            </option>
          ))}
        </select>
      </div>

      {statsQuery.isLoading ? (
        <LoadingState message="Aggregating pre-AI validation metrics..." />
      ) : statsQuery.isError ? (
        <ErrorState error={statsQuery.error} onRetry={() => statsQuery.refetch()} />
      ) : stats ? (
        <>
          {/* Quality Distribution Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
                Total Readings
              </span>
              <div className="text-2xl font-bold text-slate-900 mt-1 font-mono">
                {stats.total_readings}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Aggregated observations</div>
            </div>

            <div className="bg-white border border-emerald-200 rounded-lg p-4 shadow-sm bg-emerald-50/20">
              <div className="flex items-center justify-between text-emerald-700">
                <span className="text-xs font-semibold uppercase tracking-wider">Valid Clean</span>
                <CheckCircle className="w-4 h-4" />
              </div>
              <div className="text-2xl font-bold text-emerald-700 mt-1 font-mono">
                {stats.valid_count}
              </div>
              <div className="text-[11px] text-emerald-600 mt-1">
                Passes all deterministic checks
              </div>
            </div>

            <div className="bg-white border border-amber-200 rounded-lg p-4 shadow-sm bg-amber-50/20">
              <div className="flex items-center justify-between text-amber-700">
                <span className="text-xs font-semibold uppercase tracking-wider">Suspect</span>
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="text-2xl font-bold text-amber-700 mt-1 font-mono">
                {stats.suspect_count}
              </div>
              <Link
                to={`/readings?quality_status=suspect${selectedFacilityId ? `&facility_id=${selectedFacilityId}` : ''}`}
                className="text-[11px] text-amber-800 hover:underline mt-1 inline-flex items-center gap-1 font-semibold"
              >
                Inspect Suspect Readings &rarr;
              </Link>
            </div>

            <div className="bg-white border border-rose-200 rounded-lg p-4 shadow-sm bg-rose-50/20">
              <div className="flex items-center justify-between text-rose-700">
                <span className="text-xs font-semibold uppercase tracking-wider">Invalid</span>
                <XCircle className="w-4 h-4" />
              </div>
              <div className="text-2xl font-bold text-rose-700 mt-1 font-mono">
                {stats.invalid_count}
              </div>
              <Link
                to={`/readings?quality_status=invalid${selectedFacilityId ? `&facility_id=${selectedFacilityId}` : ''}`}
                className="text-[11px] text-rose-800 hover:underline mt-1 inline-flex items-center gap-1 font-semibold"
              >
                Inspect Invalid Readings &rarr;
              </Link>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between text-slate-600">
                <span className="text-xs font-semibold uppercase tracking-wider">Valid Rate</span>
                <span className="text-xs font-mono font-bold text-brand-600">%</span>
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-1 font-mono">
                {stats.valid_rate_percent}%
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Quality acceptance quotient</div>
            </div>
          </div>

          {/* Validation Distribution Chart */}
          <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-4">
              Quality Status Distribution
            </h2>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '6px', color: '#fff' }}
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

          {/* Normative Validation Architecture Rules */}
          <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm text-xs space-y-3">
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
              Deterministic Rule Invariants (Pre-AI Stage)
            </h3>
            <p className="text-slate-600">
              The backend validation layer enforces physical and instrumentation boundaries before feeding observations to the Isolation Forest anomaly detector:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600">
              <li><strong>Physical Bounds Check:</strong> Parameter values cannot be strictly negative (except biological pH which must remain in 0.0 - 14.0 range).</li>
              <li><strong>Zero-Clamping / Stuck Sensor:</strong> Repeated flatline sensor readings trigger the <code>SUSPECT_SENSOR_FREEZE</code> flag.</li>
              <li><strong>Rate-of-Change Max Spike:</strong> Unphysical jumps between consecutive readings in adjacent timestamps trigger <code>SUSPECT_RATE_OF_CHANGE</code>.</li>
              <li><strong>Chronological Monotonicity:</strong> Observations must possess RFC 3339 UTC timestamps matching operational sequence.</li>
            </ul>
            <div className="pt-2 text-[10px] text-slate-400 font-mono">
              Source: GET /validation/stats
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};
