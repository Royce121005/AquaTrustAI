import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { listAuditEventsApi } from '../api/audit';
import { useAuth } from '../context/AuthContext';
import { LoadingState, ErrorState, EmptyState } from '../components/common/States';
import { RoleBadge, StatusBadge } from '../components/common/Badges';
import { AuditTimelineView } from '../components/audit/AuditTimelineView';
import {
  FileSpreadsheet,
  Filter,
  RefreshCw,
  Clock,
  Shield,
  ChevronLeft,
  ChevronRight,
  Database,
  List,
} from 'lucide-react';

const PAGE_SIZE = 25;

export const AuditPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<'timeline' | 'table'>('timeline');

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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1F293D]">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#0EA5E9]/10 border border-[#0EA5E9]/30 flex items-center justify-center text-[#0EA5E9]">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Immutable Forensic Audit Trail
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[#0B0F17] p-1 rounded-lg border border-[#1F293D] text-xs">
            <button
              onClick={() => setViewMode('timeline')}
              className={`px-3 py-1 rounded-md font-semibold transition ${
                viewMode === 'timeline'
                  ? 'bg-[#0EA5E9] text-white shadow-[0_0_10px_rgba(14,165,233,0.3)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Timeline View
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 rounded-md font-semibold transition ${
                viewMode === 'table'
                  ? 'bg-[#0EA5E9] text-white shadow-[0_0_10px_rgba(14,165,233,0.3)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Event Table
            </button>
          </div>
          <button
            onClick={() => auditQuery.refetch()}
            disabled={auditQuery.isFetching}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#111827] border border-[#1F293D] hover:bg-[#161F30] text-slate-300 rounded-lg text-xs font-medium shadow-sm transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${auditQuery.isFetching ? 'animate-spin text-[#0EA5E9]' : ''}`} />
            Refresh Trail
          </button>
        </div>
      </div>

      {viewMode === 'timeline' ? (
        <AuditTimelineView facilityId={searchParams.get('facility_id') || undefined} />
      ) : (
        <>
          {/* Filter Bar */}
          <div className="bg-[#111827] border border-[#1F293D] rounded-xl p-3.5 shadow-xl flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5 text-slate-400 font-medium">
              <Filter className="w-3.5 h-3.5 text-[#0EA5E9]" />
              <span>Filters:</span>
            </div>

            <div className="flex items-center gap-1.5">
              <label className="text-slate-400 font-mono text-[11px]">Action:</label>
              <input
                type="text"
                value={actionFilter}
                onChange={(e) => updateParam('action', e.target.value)}
                placeholder="e.g. finalize_treatment_record"
                className="bg-[#0B0F17] border border-[#1F293D] rounded px-3 py-1 text-white font-mono placeholder-slate-500 focus:outline-none focus:border-[#0EA5E9]"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <label className="text-slate-400 font-mono text-[11px]">Resource Type:</label>
              <input
                type="text"
                value={resourceTypeFilter}
                onChange={(e) => updateParam('resource_type', e.target.value)}
                placeholder="e.g. treatment_record"
                className="bg-[#0B0F17] border border-[#1F293D] rounded px-3 py-1 text-white font-mono placeholder-slate-500 focus:outline-none focus:border-[#0EA5E9]"
              />
            </div>
          </div>

          {/* Audit Log Table */}
          <div className="bg-[#111827] border border-[#1F293D] rounded-xl shadow-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#1F293D] flex items-center justify-between bg-[#161F30]/60">
              <h2 className="text-xs font-mono uppercase tracking-wider text-slate-300">
                Authoritative Audit Ledger Logs
              </h2>
            </div>

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
                    <tr className="bg-[#161F30] border-b border-[#1F293D] text-slate-400 font-mono uppercase text-[11px]">
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
                  <tbody className="divide-y divide-[#1F293D] font-mono">
                    {auditQuery.data.logs.map((log) => (
                      <tr key={log.audit_log_id} className="hover:bg-[#161F30] transition-colors">
                        <td className="py-2.5 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-4 text-slate-300 select-all">
                          {log.actor_id ? `${log.actor_id.slice(0, 8)}...` : 'SYSTEM'}
                        </td>
                        <td className="py-2.5 px-4">
                          {log.actor_role ? <RoleBadge role={log.actor_role} /> : <span className="text-slate-500">N/A</span>}
                        </td>
                        <td className="py-2.5 px-4 font-bold text-white">{log.action}</td>
                        <td className="py-2.5 px-4 text-slate-400">{log.resource_type}</td>
                        <td className="py-2.5 px-4 text-[#0EA5E9] select-all">
                          {log.resource_id ? `${log.resource_id.slice(0, 8)}...` : 'N/A'}
                        </td>
                        <td className="py-2.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              log.outcome.toLowerCase() === 'success'
                                ? 'bg-[#10B981]/15 text-emerald-400 border border-[#10B981]/30'
                                : 'bg-[#EF4444]/15 text-rose-400 border border-[#EF4444]/30'
                            }`}
                          >
                            {log.outcome.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-[10px] text-slate-400 max-w-xs truncate font-mono">
                          {log.details ? JSON.stringify(log.details) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="p-3.5 bg-[#161F30]/40 border-t border-[#1F293D] flex items-center justify-between text-xs font-mono text-slate-400">
              <div>
                Total Logged Events: <span className="font-semibold text-white">{auditQuery.data?.total_count ?? 0}</span> |{' '}
                Offset: <span className="font-semibold text-white">{page * PAGE_SIZE}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrevPage}
                  disabled={page === 0 || auditQuery.isLoading}
                  className="px-2.5 py-1 bg-[#0B0F17] border border-[#1F293D] rounded hover:bg-[#161F30] text-slate-300 disabled:opacity-40 transition-colors inline-flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Previous
                </button>
                <span className="px-2 font-semibold text-white">Page {page + 1}</span>
                <button
                  onClick={handleNextPage}
                  disabled={
                    auditQuery.isLoading ||
                    !auditQuery.data ||
                    (page + 1) * PAGE_SIZE >= auditQuery.data.total_count
                  }
                  className="px-2.5 py-1 bg-[#0B0F17] border border-[#1F293D] rounded hover:bg-[#161F30] text-slate-300 disabled:opacity-40 transition-colors inline-flex items-center gap-1"
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
