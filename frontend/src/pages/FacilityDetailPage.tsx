import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  getFacilityApi,
  getFacilitySensorsApi,
  getFacilityReadingsApi,
} from '../api/facilities';
import { LoadingState, ErrorState, EmptyState } from '../components/common/States';
import {
  StatusBadge,
  QualityBadge,
  AnomalyStatusBadge,
} from '../components/common/Badges';
import {
  Building2,
  Cpu,
  Activity,
  ArrowLeft,
  Filter,
  RefreshCw,
  Clock,
  Layers,
} from 'lucide-react';

export const FacilityDetailPage: React.FC = () => {
  const { facilityId } = useParams<{ facilityId: string }>();

  // Filter state for readings
  const [paramFilter, setParamFilter] = useState<string>('');
  const [qualityFilter, setQualityFilter] = useState<string>('');

  const facilityQuery = useQuery({
    queryKey: ['facility', facilityId],
    queryFn: () => getFacilityApi(facilityId!),
    enabled: !!facilityId,
  });

  const sensorsQuery = useQuery({
    queryKey: ['facility-sensors', facilityId],
    queryFn: () => getFacilitySensorsApi(facilityId!),
    enabled: !!facilityId,
  });

  const readingsQuery = useQuery({
    queryKey: ['facility-readings', facilityId, { parameter: paramFilter, quality_status: qualityFilter }],
    queryFn: () =>
      getFacilityReadingsApi(facilityId!, {
        parameter: paramFilter || undefined,
        quality_status: qualityFilter || undefined,
        limit: 50,
      }),
    enabled: !!facilityId,
  });

  if (!facilityId) {
    return <ErrorState error={new Error('No facility ID provided in route')} />;
  }

  if (facilityQuery.isLoading) {
    return <LoadingState message="Loading facility profile and telemetry metadata..." />;
  }

  if (facilityQuery.isError) {
    return <ErrorState error={facilityQuery.error} onRetry={() => facilityQuery.refetch()} />;
  }

  const fac = facilityQuery.data!;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Link to="/facilities" className="hover:text-[#0EA5E9] inline-flex items-center gap-1.5 font-medium transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Facilities
        </Link>
      </div>

      {/* Facility Header Card */}
      <div className="bg-[#111827] border border-[#1F293D] rounded-xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#1F293D]">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#0B0F17] border border-[#1F293D] text-[#0EA5E9] rounded-xl shadow-[0_0_15px_rgba(14,165,233,0.15)]">
              <Building2 className="w-6 h-6 text-[#0EA5E9]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white">{fac.facility_name}</h1>
                <StatusBadge status={fac.status} />
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Facility ID: <span className="select-all font-semibold text-[#0EA5E9]">{fac.facility_id}</span> • Type: <span className="text-slate-300">{fac.facility_type}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to={`/facilities/${fac.facility_id}/twin`}
              className="px-3.5 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
            >
              <Cpu className="h-3.5 w-3.5 text-indigo-400" />
              Digital Twin
            </Link>
            <Link
              to={`/readings?facility_id=${fac.facility_id}`}
              className="px-3.5 py-1.5 bg-[#0B0F17] hover:bg-[#161F30] border border-[#1F293D] text-slate-300 text-xs font-semibold rounded-lg transition-colors"
            >
              Full Telemetry Table
            </Link>
            <Link
              to={`/finalization?facility_id=${fac.facility_id}`}
              className="px-3.5 py-1.5 bg-[#0EA5E9] hover:bg-[#0284C7] text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-[0_0_15px_rgba(14,165,233,0.3)] transition-all"
            >
              Finalize Window
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 text-xs font-mono">
          <div className="p-3 bg-[#161F30]/60 rounded-lg border border-[#1F293D]">
            <span className="text-slate-400 block text-[11px]">Design Capacity</span>
            <span className="font-medium text-white">
              {fac.capacity !== null ? `${fac.capacity} ${fac.capacity_unit || ''}` : 'Not configured'}
            </span>
          </div>
          <div className="p-3 bg-[#161F30]/60 rounded-lg border border-[#1F293D]">
            <span className="text-slate-400 block text-[11px]">Geographic Location</span>
            <span className="font-medium text-white truncate block">
              {fac.location && Object.keys(fac.location).length > 0
                ? JSON.stringify(fac.location)
                : 'Unspecified'}
            </span>
          </div>
          <div className="p-3 bg-[#161F30]/60 rounded-lg border border-[#1F293D]">
            <span className="text-slate-400 block text-[11px]">Created At</span>
            <span className="text-slate-300">
              {new Date(fac.created_at).toLocaleString()}
            </span>
          </div>
          <div className="p-3 bg-[#161F30]/60 rounded-lg border border-[#1F293D]">
            <span className="text-slate-400 block text-[11px]">Last Updated</span>
            <span className="text-slate-300">
              {new Date(fac.updated_at).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Registered Facility Sensors */}
      <div className="bg-[#111827] border border-[#1F293D] rounded-xl shadow-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1F293D] flex items-center justify-between bg-[#161F30]/60">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[#0EA5E9]" />
            <h2 className="text-xs font-mono uppercase tracking-wider text-slate-300">
              Installed Sensor Nodes
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {sensorsQuery.data?.length ?? 0} Sensors Registered
          </span>
        </div>

        {sensorsQuery.isLoading ? (
          <LoadingState message="Querying registered sensor probes..." />
        ) : sensorsQuery.isError ? (
          <div className="p-4">
            <ErrorState error={sensorsQuery.error} />
          </div>
        ) : !sensorsQuery.data || sensorsQuery.data.length === 0 ? (
          <EmptyState
            title="No Sensors Registered"
            message="No hardware sensors are mapped under this facility."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#161F30] border-b border-[#1F293D] text-slate-400 font-mono uppercase text-[11px]">
                  <th className="py-2.5 px-4">Sensor ID</th>
                  <th className="py-2.5 px-4">Parameter</th>
                  <th className="py-2.5 px-4">Measurement Unit</th>
                  <th className="py-2.5 px-4">Stage</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1F293D] font-mono">
                {sensorsQuery.data.map((s) => (
                  <tr key={s.sensor_id} className="hover:bg-[#161F30] transition-colors">
                    <td className="py-2.5 px-4 font-semibold text-white select-all">{s.sensor_id}</td>
                    <td className="py-2.5 px-4 font-bold text-[#0EA5E9]">{s.parameter}</td>
                    <td className="py-2.5 px-4 text-slate-300">{s.unit}</td>
                    <td className="py-2.5 px-4 text-slate-400">{s.treatment_stage || 'N/A'}</td>
                    <td className="py-2.5 px-4">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="py-2.5 px-4 text-[11px] text-slate-500 truncate max-w-xs font-mono">
                      {JSON.stringify(s.metadata)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Facility Recent Telemetry Readings with Live Filters */}
      <div className="bg-[#111827] border border-[#1F293D] rounded-xl shadow-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1F293D] flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#161F30]/60">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#0EA5E9]" />
            <h2 className="text-xs font-mono uppercase tracking-wider text-slate-300">
              Recent Telemetry Observations
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Filter className="w-3.5 h-3.5 text-[#0EA5E9]" />
              <span>Filters:</span>
            </div>
            <select
              value={paramFilter}
              onChange={(e) => setParamFilter(e.target.value)}
              className="bg-[#0B0F17] border border-[#1F293D] rounded px-2.5 py-1 text-xs text-white font-mono focus:outline-none focus:border-[#0EA5E9]"
            >
              <option value="">All Parameters</option>
              <option value="BOD">BOD</option>
              <option value="COD">COD</option>
              <option value="TSS">TSS</option>
              <option value="PH">PH</option>
              <option value="NH4_N">NH4_N</option>
              <option value="DO">DO</option>
              <option value="TEMPERATURE">TEMPERATURE</option>
            </select>

            <select
              value={qualityFilter}
              onChange={(e) => setQualityFilter(e.target.value)}
              className="bg-[#0B0F17] border border-[#1F293D] rounded px-2.5 py-1 text-xs text-white font-mono focus:outline-none focus:border-[#0EA5E9]"
            >
              <option value="">All Qualities</option>
              <option value="valid">Valid</option>
              <option value="suspect">Suspect</option>
              <option value="invalid">Invalid</option>
              <option value="pending">Pending</option>
            </select>

            <button
              onClick={() => readingsQuery.refetch()}
              className="p-1.5 bg-[#0B0F17] border border-[#1F293D] hover:bg-[#161F30] text-slate-300 rounded transition-colors"
              title="Refresh Telemetry"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${readingsQuery.isFetching ? 'animate-spin text-[#0EA5E9]' : ''}`} />
            </button>
          </div>
        </div>

        {readingsQuery.isLoading ? (
          <LoadingState message="Fetching facility telemetry records..." />
        ) : readingsQuery.isError ? (
          <div className="p-4">
            <ErrorState error={readingsQuery.error} />
          </div>
        ) : !readingsQuery.data || readingsQuery.data.length === 0 ? (
          <EmptyState
            title="No Telemetry Observed"
            message="No readings match the current filter criteria for this facility."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#161F30] border-b border-[#1F293D] text-slate-400 font-mono uppercase text-[11px]">
                  <th className="py-2.5 px-4">Reading ID</th>
                  <th className="py-2.5 px-4">Observed At</th>
                  <th className="py-2.5 px-4">Parameter</th>
                  <th className="py-2.5 px-4">Value</th>
                  <th className="py-2.5 px-4">Stage</th>
                  <th className="py-2.5 px-4">Quality Status</th>
                  <th className="py-2.5 px-4">AI Anomaly Status</th>
                  <th className="py-2.5 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1F293D] font-mono">
                {readingsQuery.data.map((r) => (
                  <tr key={r.reading_id} className="hover:bg-[#161F30] transition-colors">
                    <td className="py-2.5 px-4 font-semibold text-[#0EA5E9] select-all">
                      <Link to={`/readings/${r.reading_id}`} className="hover:underline">
                        {r.reading_id.slice(0, 8)}...
                      </Link>
                    </td>
                    <td className="py-2.5 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                      {new Date(r.observed_at).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 font-bold text-white">{r.parameter}</td>
                    <td className="py-2.5 px-4 font-semibold text-slate-200">
                      {r.value !== null ? `${r.value} ${r.unit}` : 'null'}
                    </td>
                    <td className="py-2.5 px-4 text-slate-400">{r.treatment_stage || 'N/A'}</td>
                    <td className="py-2.5 px-4">
                      <QualityBadge status={r.quality_status} />
                    </td>
                    <td className="py-2.5 px-4">
                      <AnomalyStatusBadge status={r.anomaly_status} score={r.anomaly_score} />
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <Link
                        to={`/readings/${r.reading_id}`}
                        className="text-[#0EA5E9] hover:text-cyan-300 font-sans font-medium"
                      >
                        Inspect &rarr;
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
