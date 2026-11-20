import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { listTreatmentRecordsApi } from '../api/treatmentRecords';
import { listFacilitiesApi } from '../api/facilities';
import { useAuth } from '../context/AuthContext';
import { LoadingState, ErrorState, EmptyState } from '../components/common/States';
import {
  StatusBadge,
  QualityBadge,
  AnomalyStatusBadge,
  ComplianceStatusBadge,
} from '../components/common/Badges';
import { FileText, Filter, RefreshCw, Stamp, Shield, ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 25;

export const TreatmentRecordsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  const facilityId = searchParams.get('facility_id') || '';
  const recordState = searchParams.get('record_state') || '';
  const complianceStatus = searchParams.get('compliance_status') || '';
  const page = parseInt(searchParams.get('page') || '0', 10);

  const { data: facilities } = useQuery({
    queryKey: ['facilities'],
    queryFn: listFacilitiesApi,
    staleTime: 60000,
  });

  const recordsQuery = useQuery({
    queryKey: [
      'treatment-records',
      {
        facility_id: facilityId,
        record_state: recordState,
        compliance_status: complianceStatus,
        skip: page * PAGE_SIZE,
        limit: PAGE_SIZE,
      },
    ],
    queryFn: () =>
      listTreatmentRecordsApi({
        facility_id: facilityId || undefined,
        record_state: recordState || undefined,
        compliance_status: complianceStatus || undefined,
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
    next.set('page', '0');
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

  const isOperatorOrAdmin = user?.role === 'operator' || user?.role === 'admin';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1F293D]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-mono flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-cyan-400" />
            Immutable Treatment Records
          </h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isOperatorOrAdmin && (
            <Link
              to="/finalization"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors font-mono"
            >
              <Stamp className="w-3.5 h-3.5" />
              Finalize Time Window
            </Link>
          )}
          <button
            onClick={() => recordsQuery.refetch()}
            disabled={recordsQuery.isFetching}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1E293B] border border-[#334155] hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-mono font-medium shadow-sm transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${recordsQuery.isFetching ? 'animate-spin text-cyan-400' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="scada-filter-bar">
        <div className="flex items-center gap-1.5 text-slate-400 font-medium font-mono text-[11px]">
          <Filter className="w-3.5 h-3.5 text-cyan-400" />
          <span>Filters:</span>
        </div>

        <div className="flex items-center gap-1.5">
          <label className="text-slate-400 font-mono text-[11px]">Facility:</label>
          <select
            value={facilityId}
            onChange={(e) => updateParam('facility_id', e.target.value)}
            className="scada-select"
          >
            <option value="">All Facilities</option>
            {facilities?.map((f) => (
              <option key={f.facility_id} value={f.facility_id}>
                {f.facility_name} ({f.facility_id.slice(0, 8)}...)
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <label className="text-slate-400 font-mono text-[11px]">State:</label>
          <select
            value={recordState}
            onChange={(e) => updateParam('record_state', e.target.value)}
            className="scada-select"
          >
            <option value="">All States</option>
            <option value="finalized">finalized</option>
            <option value="superseded">superseded</option>
            <option value="draft">draft</option>
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <label className="text-slate-400 font-mono text-[11px]">Compliance:</label>
          <select
            value={complianceStatus}
            onChange={(e) => updateParam('compliance_status', e.target.value)}
            className="scada-select"
          >
            <option value="">All Compliance Outcomes</option>
            <option value="compliant">compliant</option>
            <option value="non_compliant">non_compliant</option>
            <option value="pending">pending</option>
          </select>
        </div>

        {(facilityId || recordState || complianceStatus) && (
          <button
            onClick={() => {
              const next = new URLSearchParams();
              setSearchParams(next);
            }}
            className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 ml-auto"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Treatment Records Table */}
      <div className="scada-table-container">
        {recordsQuery.isLoading ? (
          <LoadingState message="Loading treatment records..." />
        ) : recordsQuery.isError ? (
          <div className="p-6">
            <ErrorState error={recordsQuery.error} onRetry={() => recordsQuery.refetch()} />
          </div>
        ) : !recordsQuery.data || recordsQuery.data.length === 0 ? (
          <EmptyState
            title="No Treatment Records"
            message="No treatment records match the criteria."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="scada-table-header">
                  <th className="py-2.5 px-4">Record ID &amp; Version</th>
                  <th className="py-2.5 px-4">Facility ID</th>
                  <th className="py-2.5 px-4">Window Range</th>
                  <th className="py-2.5 px-4">State</th>
                  <th className="py-2.5 px-4">Quality</th>
                  <th className="py-2.5 px-4">Anomaly</th>
                  <th className="py-2.5 px-4">Compliance</th>
                  <th className="py-2.5 px-4">DLT Anchor</th>
                  <th className="py-2.5 px-4">Canonical Hash</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1F293D]/60 font-mono">
                {recordsQuery.data.map((r) => (
                  <tr key={r.record_id} className="scada-table-row">
                    <td className="py-2.5 px-4 font-semibold text-cyan-400">
                      <Link to={`/treatment-records/${r.record_id}`} className="hover:underline">
                        {r.record_id.slice(0, 8)}... (v{r.record_version})
                      </Link>
                    </td>
                    <td className="py-2.5 px-4 text-slate-400">{r.facility_id.slice(0, 8)}...</td>
                    <td className="py-2.5 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                      {new Date(r.period_start).toLocaleDateString()} -{' '}
                      {new Date(r.period_end).toLocaleDateString()}
                    </td>
                    <td className="py-2.5 px-4">
                      <StatusBadge status={r.record_state} />
                    </td>
                    <td className="py-2.5 px-4">
                      <QualityBadge status={r.quality_status} />
                    </td>
                    <td className="py-2.5 px-4">
                      <AnomalyStatusBadge status={r.anomaly_status} />
                    </td>
                    <td className="py-2.5 px-4">
                      <ComplianceStatusBadge status={r.compliance_status} />
                    </td>
                    <td className="py-2.5 px-4">
                      <StatusBadge status={r.anchor_status} />
                    </td>
                    <td className="py-2.5 px-4 text-slate-400 text-[11px] select-all max-w-[120px] truncate">
                      {r.canonical_hash || 'Pending Finalization'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-sans whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2.5 font-mono text-xs">
                        <Link
                          to={`/treatment-records/${r.record_id}`}
                          className="text-cyan-400 hover:text-cyan-300 font-medium"
                        >
                          Detail
                        </Link>
                        <Link
                          to={`/verification?recordId=${r.record_id}`}
                          className="inline-flex items-center gap-1 text-slate-400 hover:text-cyan-400 font-medium"
                          title="Run 4-Stage Cryptographic Verification"
                        >
                          <Shield className="w-3.5 h-3.5" />
                          Verify
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="p-3 bg-[#161F30] border-t border-[#1F293D] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono text-slate-400">
          <div>
            Offset: <span className="font-semibold text-slate-200">{page * PAGE_SIZE}</span> |
            Limit: <span className="font-semibold text-slate-200">{PAGE_SIZE}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevPage}
              disabled={page === 0 || recordsQuery.isLoading}
              className="px-2.5 py-1 bg-[#1E293B] border border-[#334155] rounded hover:bg-slate-700 disabled:opacity-40 transition-colors inline-flex items-center gap-1 text-slate-200"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Previous
            </button>
            <span className="px-2 font-semibold text-slate-200">Page {page + 1}</span>
            <button
              onClick={handleNextPage}
              disabled={
                recordsQuery.isLoading ||
                !recordsQuery.data ||
                recordsQuery.data.length < PAGE_SIZE
              }
              className="px-2.5 py-1 bg-[#1E293B] border border-[#334155] rounded hover:bg-slate-700 disabled:opacity-40 transition-colors inline-flex items-center gap-1 text-slate-200"
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
export default TreatmentRecordsPage;
