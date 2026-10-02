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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Digital Compliance Certificates
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Cryptographically signed treatment certificates backed by SHA-256 canonical digests and DLT ledger anchors.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => certsQuery.refetch()}
            disabled={certsQuery.isFetching}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-md text-xs font-medium shadow-sm transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${certsQuery.isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5 text-slate-500 font-medium">
          <Filter className="w-3.5 h-3.5" />
          <span>Filters:</span>
        </div>

        <div className="flex items-center gap-1.5">
          <label className="text-slate-500 font-mono text-[11px]">Facility:</label>
          <select
            value={facilityId}
            onChange={(e) => updateParam('facility_id', e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-slate-800 font-mono focus:ring-1 focus:ring-brand-500"
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
          <label className="text-slate-500 font-mono text-[11px]">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => updateParam('status', e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-slate-800 font-mono focus:ring-1 focus:ring-brand-500"
          >
            <option value="">All Statuses</option>
            <option value="active">active</option>
            <option value="superseded">superseded</option>
            <option value="revoked">revoked</option>
          </select>
        </div>
      </div>

      {/* Certificates Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
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
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono uppercase text-[11px]">
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
              <tbody className="divide-y divide-slate-100 font-mono">
                {certsQuery.data.map((c) => (
                  <tr key={c.certificate_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-4 font-semibold text-brand-700">
                      <Link to={`/certificates/${c.certificate_id}`} className="hover:underline">
                        {c.certificate_id.slice(0, 8)}... (v{c.certificate_version})
                      </Link>
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 select-all">
                      <Link to={`/treatment-records/${c.record_id}`} className="hover:underline">
                        {c.record_id.slice(0, 8)}...
                      </Link>
                    </td>
                    <td className="py-2.5 px-4 text-slate-800">{c.issuer_identity}</td>
                    <td className="py-2.5 px-4 text-slate-500 text-[11px]">
                      {new Date(c.issued_at).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4">
                      <ComplianceStatusBadge status={c.compliance_status} />
                    </td>
                    <td className="py-2.5 px-4">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="py-2.5 px-4 text-slate-600">
                      {c.dlt_anchor_id ? `${c.dlt_anchor_id.slice(0, 8)}...` : 'Pending Anchor'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-sans">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/certificates/${c.certificate_id}`}
                          className="text-brand-600 hover:text-brand-800 font-medium"
                        >
                          Certificate
                        </Link>
                        <Link
                          to={`/public/verify/certificate/${c.certificate_id}`}
                          className="text-slate-600 hover:text-brand-600 font-medium inline-flex items-center gap-1"
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

        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs font-mono text-slate-500">
          <div>
            Offset: <span className="font-semibold text-slate-700">{page * PAGE_SIZE}</span> |
            Limit: <span className="font-semibold text-slate-700">{PAGE_SIZE}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevPage}
              disabled={page === 0 || certsQuery.isLoading}
              className="px-2.5 py-1 bg-white border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-40 transition-colors inline-flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Previous
            </button>
            <span className="px-2 font-semibold text-slate-700">Page {page + 1}</span>
            <button
              onClick={handleNextPage}
              disabled={certsQuery.isLoading || !certsQuery.data || certsQuery.data.length < PAGE_SIZE}
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
