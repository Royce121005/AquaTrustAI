import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { listCertificatesApi } from '../api/certificates';
import { listFacilitiesApi } from '../api/facilities';
import { LoadingState, ErrorState, EmptyState } from '../components/common/States';
import { StatusBadge, ComplianceStatusBadge } from '../components/common/Badges';
import { Award, Filter, RefreshCw, Shield, ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 25;

export const CertificatesPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const facilityId = searchParams.get('facility_id') || '';
  const statusFilter = searchParams.get('status') || '';
  const page = parseInt(searchParams.get('page') || '0', 10);

  const { data: facilities } = useQuery({
    queryKey: ['facilities'],
    queryFn: listFacilitiesApi,
    staleTime: 60000,
  });

  const certsQuery = useQuery({
    queryKey: [
      'certificates',
      { facility_id: facilityId, status: statusFilter, skip: page * PAGE_SIZE, limit: PAGE_SIZE },
    ],
    queryFn: () =>
      listCertificatesApi({
        facility_id: facilityId || undefined,
        status: statusFilter || undefined,
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1F293D]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-mono flex items-center gap-2.5">
            <Award className="w-5 h-5 text-cyan-400" />
            Digital Compliance Certificates
          </h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => certsQuery.refetch()}
            disabled={certsQuery.isFetching}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1E293B] border border-[#334155] hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-mono font-medium shadow-sm transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${certsQuery.isFetching ? 'animate-spin text-cyan-400' : ''}`} />
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
          <label className="text-slate-400 font-mono text-[11px]">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => updateParam('status', e.target.value)}
            className="scada-select"
          >
            <option value="">All Statuses</option>
            <option value="active">active</option>
            <option value="superseded">superseded</option>
            <option value="revoked">revoked</option>
          </select>
        </div>

        {(facilityId || statusFilter) && (
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

      {/* Certificates Table */}
      <div className="scada-table-container">
        {certsQuery.isLoading ? (
          <LoadingState message="Loading digital certificates..." />
        ) : certsQuery.isError ? (
          <div className="p-6">
            <ErrorState error={certsQuery.error} onRetry={() => certsQuery.refetch()} />
          </div>
        ) : !certsQuery.data || certsQuery.data.length === 0 ? (
          <EmptyState
            title="No Certificates Found"
            message="No digital certificates have been issued yet. Certificates are issued upon successful treatment window finalization."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="scada-table-header">
                  <th className="py-2.5 px-4">Certificate ID</th>
                  <th className="py-2.5 px-4">Record ID</th>
                  <th className="py-2.5 px-4">Issuer Identity</th>
                  <th className="py-2.5 px-4">Issued At</th>
                  <th className="py-2.5 px-4">Compliance</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">DLT Anchor</th>
                  <th className="py-2.5 px-4 text-right">Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1F293D]/60 font-mono">
                {certsQuery.data.map((c) => (
                  <tr key={c.certificate_id} className="scada-table-row">
                    <td className="py-2.5 px-4 font-semibold text-cyan-400">
                      <Link to={`/certificates/${c.certificate_id}`} className="hover:underline">
                        {c.certificate_id.slice(0, 8)}... (v{c.certificate_version})
                      </Link>
                    </td>
                    <td className="py-2.5 px-4 text-slate-400 select-all">
                      <Link to={`/treatment-records/${c.record_id}`} className="hover:underline text-cyan-400/80">
                        {c.record_id.slice(0, 8)}...
                      </Link>
                    </td>
                    <td className="py-2.5 px-4 text-slate-200">{c.issuer_identity}</td>
                    <td className="py-2.5 px-4 text-slate-400 text-[11px]">
                      {new Date(c.issued_at).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4">
                      <ComplianceStatusBadge status={c.compliance_status} />
                    </td>
                    <td className="py-2.5 px-4">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="py-2.5 px-4 text-slate-400">
                      {c.dlt_anchor_id ? `${c.dlt_anchor_id.slice(0, 8)}...` : 'Pending Anchor'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-sans">
                      <div className="flex items-center justify-end gap-2.5 font-mono text-xs">
                        <Link
                          to={`/certificates/${c.certificate_id}`}
                          className="text-cyan-400 hover:text-cyan-300 font-medium"
                        >
                          Certificate
                        </Link>
                        <Link
                          to={`/public/verify/certificate/${c.certificate_id}`}
                          className="text-slate-400 hover:text-cyan-400 font-medium inline-flex items-center gap-1"
                        >
                          <Shield className="w-3.5 h-3.5" />
                          Public Verify
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="p-3 bg-[#161F30] border-t border-[#1F293D] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono text-slate-400">
          <div>
            Offset: <span className="font-semibold text-slate-200">{page * PAGE_SIZE}</span> |
            Limit: <span className="font-semibold text-slate-200">{PAGE_SIZE}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevPage}
              disabled={page === 0 || certsQuery.isLoading}
              className="px-2.5 py-1 bg-[#1E293B] border border-[#334155] rounded hover:bg-slate-700 disabled:opacity-40 transition-colors inline-flex items-center gap-1 text-slate-200"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Previous
            </button>
            <span className="px-2 font-semibold text-slate-200">Page {page + 1}</span>
            <button
              onClick={handleNextPage}
              disabled={certsQuery.isLoading || !certsQuery.data || certsQuery.data.length < PAGE_SIZE}
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
export default CertificatesPage;
