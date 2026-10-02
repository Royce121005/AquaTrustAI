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
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link to="/facilities" className="hover:text-brand-600 inline-flex items-center gap-1 font-medium">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Facilities
        </Link>
      </div>

      {/* Facility Header Card */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-brand-50 text-brand-700 rounded-lg">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">{fac.facility_name}</h1>
                <StatusBadge status={fac.status} />
              </div>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Facility ID: <span className="select-all font-semibold">{fac.facility_id}</span> • Type: {fac.facility_type}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to={`/readings?facility_id=${fac.facility_id}`}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-md transition-colors"
            >
              Full Telemetry Table
            </Link>
            <Link
              to={`/finalization?facility_id=${fac.facility_id}`}
              className="px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-md shadow-sm transition-colors"
            >
              Finalize Window
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px]">Design Capacity</span>
            <span className="font-mono font-medium text-slate-800">
              {fac.capacity !== null ? `${fac.capacity} ${fac.capacity_unit || ''}` : 'Not configured'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Geographic Location</span>
            <span className="font-mono font-medium text-slate-800">
              {fac.location && Object.keys(fac.location).length > 0
                ? JSON.stringify(fac.location)
                : 'Unspecified'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Created At</span>
            <span className="font-mono text-slate-800">
              {new Date(fac.created_at).toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Last Updated</span>
            <span className="font-mono text-slate-800">
              {new Date(fac.updated_at).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Registered Facility Sensors */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-slate-700" />
            <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">
              Installed Sensor Nodes
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-mono">
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
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono uppercase text-[11px]">
                  <th className="py-2.5 px-4">Sensor ID</th>
                  <th className="py-2.5 px-4">Parameter</th>
                  <th className="py-2.5 px-4">Measurement Unit</th>
                  <th className="py-2.5 px-4">Stage</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {sensorsQuery.data.map((s) => (
                  <tr key={s.sensor_id} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-4 font-semibold text-slate-800">{s.sensor_id}</td>
                    <td className="py-2.5 px-4 font-bold text-brand-700">{s.parameter}</td>
                    <td className="py-2.5 px-4 text-slate-600">{s.unit}</td>
                    <td className="py-2.5 px-4 text-slate-500">{s.treatment_stage || 'N/A'}</td>
                    <td className="py-2.5 px-4">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="py-2.5 px-4 text-[11px] text-slate-400 truncate max-w-xs">
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
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-slate-700" />
            <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">
              Recent Telemetry Observations
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Filter className="w-3.5 h-3.5" />
              <span>Filters:</span>
            </div>
            <select
              value={paramFilter}
              onChange={(e) => setParamFilter(e.target.value)}
              className="bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-700 font-mono focus:ring-1 focus:ring-brand-500"
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
              className="bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-700 font-mono focus:ring-1 focus:ring-brand-500"
            >
              <option value="">All Qualities</option>
              <option value="valid">Valid</option>
              <option value="suspect">Suspect</option>
              <option value="invalid">Invalid</option>
              <option value="pending">Pending</option>
            </select>

            <button
              onClick={() => readingsQuery.refetch()}
              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded transition-colors"
              title="Refresh Telemetry"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${readingsQuery.isFetching ? 'animate-spin' : ''}`} />
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
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono uppercase text-[11px]">
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
              <tbody className="divide-y divide-slate-100 font-mono">
                {readingsQuery.data.map((r) => (
                  <tr key={r.reading_id} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-4 font-semibold text-brand-700">
                      <Link to={`/readings/${r.reading_id}`} className="hover:underline">
                        {r.reading_id.slice(0, 8)}...
                      </Link>
                    </td>
                    <td className="py-2.5 px-4 text-slate-500 text-[11px]">
                      {new Date(r.observed_at).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 font-bold text-slate-900">{r.parameter}</td>
                    <td className="py-2.5 px-4 font-semibold text-slate-800">
                      {r.value !== null ? `${r.value} ${r.unit}` : 'null'}
                    </td>
                    <td className="py-2.5 px-4 text-slate-500">{r.treatment_stage || 'N/A'}</td>
                    <td className="py-2.5 px-4">
                      <QualityBadge status={r.quality_status} />
                    </td>
                    <td className="py-2.5 px-4">
                      <AnomalyStatusBadge status={r.anomaly_status} score={r.anomaly_score} />
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <Link
                        to={`/readings/${r.reading_id}`}
                        className="text-brand-600 hover:text-brand-800 font-sans font-medium"
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
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-[10px] text-slate-400 font-mono">
          Source: GET /facilities/{facilityId}/readings
        </div>
      </div>
    </div>
  );
};
