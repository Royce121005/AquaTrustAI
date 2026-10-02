import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, Link } from 'react-router-dom';
import { listReadingsApi } from '../api/readings';
import { listFacilitiesApi } from '../api/facilities';
import { LoadingState, ErrorState, EmptyState } from '../components/common/States';
import { QualityBadge, AnomalyStatusBadge } from '../components/common/Badges';
import { Activity, Filter, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 50;

export const TelemetryPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const facilityId = searchParams.get('facility_id') || '';
  const parameter = searchParams.get('parameter') || '';
  const qualityStatus = searchParams.get('quality_status') || '';
  const page = parseInt(searchParams.get('page') || '0', 10);

  const { data: facilities } = useQuery({
    queryKey: ['facilities'],
    queryFn: listFacilitiesApi,
    staleTime: 60000,
  });

  const readingsQuery = useQuery({
    queryKey: ['readings', { facility_id: facilityId, parameter, quality_status: qualityStatus, skip: page * PAGE_SIZE, limit: PAGE_SIZE }],
    queryFn: () =>
      listReadingsApi({
        facility_id: facilityId || undefined,
        parameter: parameter || undefined,
        quality_status: qualityStatus || undefined,
        skip: page * PAGE_SIZE,
        limit: PAGE_SIZE,
      }),
  });

  const updateParam = (key: string, val: string) => {
    const next = new URLSearchParams(searchParams);
    if (val) {
      next.set(key, val);
    } else {
      next.delete(key);
    }
    next.set('page', '0'); // Reset page when filtering
    setSearchParams(next);
  };

  const handleNextPage = () => {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(page + 1));
    setSearchParams(next);
  };

  const handlePrevPage = () => {
    if (page > 0) {
      const next = new URLSearchParams(searchParams);
      next.set('page', String(page - 1));
      setSearchParams(next);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            SCADA Telemetry Observations
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Deterministic sensor telemetry ingestion stream. Direct observation boundary before finalization.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => readingsQuery.refetch()}
            disabled={readingsQuery.isFetching}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-md text-xs font-medium shadow-sm transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${readingsQuery.isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Dense Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5 text-slate-500 font-medium">
          <Filter className="w-3.5 h-3.5" />
          <span>Filters:</span>
        </div>

        {/* Facility Filter */}
        <div className="flex items-center gap-1.5">
          <label className="text-slate-500 font-mono text-[11px]">Facility:</label>
          <select
            value={facilityId}
            onChange={(e) => updateParam('facility_id', e.target.value)}
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

        {/* Parameter Filter */}
        <div className="flex items-center gap-1.5">
          <label className="text-slate-500 font-mono text-[11px]">Parameter:</label>
          <select
            value={parameter}
            onChange={(e) => updateParam('parameter', e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-slate-800 font-mono focus:ring-1 focus:ring-brand-500"
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
        </div>

        {/* Quality Status Filter */}
        <div className="flex items-center gap-1.5">
          <label className="text-slate-500 font-mono text-[11px]">Quality:</label>
          <select
            value={qualityStatus}
            onChange={(e) => updateParam('quality_status', e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-slate-800 font-mono focus:ring-1 focus:ring-brand-500"
          >
            <option value="">All Quality States</option>
            <option value="valid">valid</option>
            <option value="suspect">suspect</option>
            <option value="invalid">invalid</option>
            <option value="pending">pending</option>
          </select>
        </div>
      </div>

      {/* Telemetry Operational Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        {readingsQuery.isLoading ? (
          <LoadingState message="Loading telemetry observations..." />
        ) : readingsQuery.isError ? (
          <div className="p-6">
            <ErrorState error={readingsQuery.error} onRetry={() => readingsQuery.refetch()} />
          </div>
        ) : !readingsQuery.data || readingsQuery.data.length === 0 ? (
          <EmptyState
            title="No Telemetry Observed"
            message="No observations matched your search and filter criteria."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono uppercase text-[11px]">
                  <th className="py-2.5 px-4">Timestamp</th>
                  <th className="py-2.5 px-4">Reading ID</th>
                  <th className="py-2.5 px-4">Parameter</th>
                  <th className="py-2.5 px-4">Value</th>
                  <th className="py-2.5 px-4">Unit</th>
                  <th className="py-2.5 px-4">Stage</th>
                  <th className="py-2.5 px-4">Source</th>
                  <th className="py-2.5 px-4">Quality</th>
                  <th className="py-2.5 px-4">AI Anomaly</th>
                  <th className="py-2.5 px-4">Score</th>
                  <th className="py-2.5 px-4 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {readingsQuery.data.map((r) => (
                  <tr key={r.reading_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap text-[11px]">
                      {new Date(r.observed_at).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-brand-700 whitespace-nowrap">
                      <Link to={`/readings/${r.reading_id}`} className="hover:underline">
                        {r.reading_id.slice(0, 8)}...
                      </Link>
                    </td>
                    <td className="py-2.5 px-4 font-bold text-slate-900">{r.parameter}</td>
                    <td className="py-2.5 px-4 font-semibold text-slate-800">
                      {r.value !== null ? r.value : 'null'}
                    </td>
                    <td className="py-2.5 px-4 text-slate-500">{r.unit}</td>
                    <td className="py-2.5 px-4 text-slate-500">{r.treatment_stage || 'N/A'}</td>
                    <td className="py-2.5 px-4 text-slate-400 text-[11px]">{r.source}</td>
                    <td className="py-2.5 px-4">
                      <QualityBadge status={r.quality_status} />
                    </td>
                    <td className="py-2.5 px-4">
                      <AnomalyStatusBadge status={r.anomaly_status} />
                    </td>
                    <td className="py-2.5 px-4 text-slate-600">
                      {r.anomaly_score !== null && r.anomaly_score !== undefined
                        ? Number(r.anomaly_score).toFixed(4)
                        : '—'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-sans">
                      <Link
                        to={`/readings/${r.reading_id}`}
                        className="text-brand-600 hover:text-brand-800 font-medium"
                      >
                        Evidence &rarr;
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Operational Pagination Footer (truthful without fake totals) */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs font-mono text-slate-500">
          <div>
            Batch Offset: <span className="font-semibold text-slate-700">{page * PAGE_SIZE}</span> |
            Batch Limit: <span className="font-semibold text-slate-700">{PAGE_SIZE}</span>
            <span className="ml-2 text-[10px] text-slate-400">
              (Backend pagination cursor: skip={page * PAGE_SIZE})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevPage}
              disabled={page === 0 || readingsQuery.isLoading}
              className="px-2.5 py-1 bg-white border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-40 transition-colors inline-flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Previous
            </button>
            <span className="px-2 font-semibold text-slate-700">Page {page + 1}</span>
            <button
              onClick={handleNextPage}
              disabled={
                readingsQuery.isLoading ||
                !readingsQuery.data ||
                readingsQuery.data.length < PAGE_SIZE
              }
              className="px-2.5 py-1 bg-white border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-40 transition-colors inline-flex items-center gap-1"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
