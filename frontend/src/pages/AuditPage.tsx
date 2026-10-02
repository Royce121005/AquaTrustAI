import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { listAuditEventsApi } from '../api/audit';
import { useAuth } from '../context/AuthContext';
import { LoadingState, ErrorState, EmptyState } from '../components/common/States';
import { RoleBadge, StatusBadge } from '../components/common/Badges';
import {
  FileSpreadsheet,
  Filter,
  RefreshCw,
  Clock,
  Shield,
  ChevronLeft,
  ChevronRight,
  Database,
} from 'lucide-react';

const PAGE_SIZE = 25;

export const AuditPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  const actionFilter = searchParams.get('action') || '';
  const resourceTypeFilter = searchParams.get('resource_type') || '';
  const page = parseInt(searchParams.get('page') || '0', 10);

  const auditQuery = useQuery({
    queryKey: [
      'audit-events',
      {
        action: actionFilter,
        resource_type: resourceTypeFilter,
        skip: page * PAGE_SIZE,
        limit: PAGE_SIZE,
      },
    ],
    queryFn: () =>
      listAuditEventsApi({
        action: actionFilter || undefined,
        resource_type: resourceTypeFilter || undefined,
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
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-brand-600" />
            Immutable Forensic Audit Trail
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Cryptographically sealed system audit events, operator actions, and consensus finalization state mutations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => auditQuery.refetch()}
            disabled={auditQuery.isFetching}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-md text-xs font-medium shadow-sm transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${auditQuery.isFetching ? 'animate-spin' : ''}`} />
            Refresh Trail
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
          <label className="text-slate-500 font-mono text-[11px]">Action:</label>
          <input
            type="text"
            value={actionFilter}
            onChange={(e) => updateParam('action', e.target.value)}
            placeholder="e.g. finalize_treatment_record"
            className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-slate-800 font-mono focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <label className="text-slate-500 font-mono text-[11px]">Resource Type:</label>
          <input
            type="text"
            value={resourceTypeFilter}
            onChange={(e) => updateParam('resource_type', e.target.value)}
            placeholder="e.g. treatment_record"
            className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-slate-800 font-mono focus:ring-1 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        {auditQuery.isLoading ? (
          <LoadingState message="Fetching immutable audit log..." />
        ) : auditQuery.isError ? (
          <div className="p-6">
            <ErrorState error={auditQuery.error} onRetry={() => auditQuery.refetch()} />
          </div>
        ) : !auditQuery.data || auditQuery.data.logs.length === 0 ? (
          <EmptyState
            title="No Audit Logs Found"
            message="No audit events matched your filter criteria."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono uppercase text-[11px]">
                  <th className="py-2.5 px-4">Timestamp</th>
                  <th className="py-2.5 px-4">Actor ID</th>
                  <th className="py-2.5 px-4">Role</th>
                  <th className="py-2.5 px-4">Action</th>
                  <th className="py-2.5 px-4">Resource Type</th>
                  <th className="py-2.5 px-4">Resource ID</th>
                  <th className="py-2.5 px-4">Outcome</th>
                  <th className="py-2.5 px-4">Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {auditQuery.data.logs.map((log) => (
                  <tr key={log.audit_log_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 text-slate-800 select-all">
                      {log.actor_id ? `${log.actor_id.slice(0, 8)}...` : 'SYSTEM'}
                    </td>
                    <td className="py-2.5 px-4">
                      {log.actor_role ? <RoleBadge role={log.actor_role} /> : <span className="text-slate-400">N/A</span>}
                    </td>
                    <td className="py-2.5 px-4 font-bold text-slate-900">{log.action}</td>
                    <td className="py-2.5 px-4 text-slate-600">{log.resource_type}</td>
                    <td className="py-2.5 px-4 text-brand-700 select-all">
                      {log.resource_id ? `${log.resource_id.slice(0, 8)}...` : 'N/A'}
                    </td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.outcome.toLowerCase() === 'success'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {log.outcome.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-[10px] text-slate-500 max-w-xs truncate">
                      {log.details ? JSON.stringify(log.details) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs font-mono text-slate-500">
          <div>
            Total Logged Events: <span className="font-semibold text-slate-800">{auditQuery.data?.total_count ?? 0}</span> |
            Offset: <span className="font-semibold text-slate-700">{page * PAGE_SIZE}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevPage}
              disabled={page === 0 || auditQuery.isLoading}
              className="px-2.5 py-1 bg-white border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-40 transition-colors inline-flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Previous
            </button>
            <span className="px-2 font-semibold text-slate-700">Page {page + 1}</span>
            <button
              onClick={handleNextPage}
              disabled={
                auditQuery.isLoading ||
                !auditQuery.data ||
                (page + 1) * PAGE_SIZE >= auditQuery.data.total_count
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
