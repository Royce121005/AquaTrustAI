import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import {
  getDLTStatusApi,
  listDLTAnchorsApi,
  reconcileAnchorApi,
} from '../api/dlt';
import { listFacilitiesApi } from '../api/facilities';
import { useAuth } from '../context/AuthContext';
import { LoadingState, ErrorState, EmptyState } from '../components/common/States';
import { DltModeBadge, StatusBadge, ComplianceStatusBadge } from '../components/common/Badges';
import {
  Blocks,
  RefreshCw,
  Cpu,
  Layers,
  ArrowRight,
  Shield,
  Filter,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const PAGE_SIZE = 25;

export const BlockchainPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const facilityId = searchParams.get('facility_id') || '';
  const anchorStatus = searchParams.get('anchor_status') || '';
  const page = parseInt(searchParams.get('page') || '0', 10);

  const isReconcileAuthorized =
    user?.role === 'auditor' ||
    user?.role === 'regulatory_stakeholder' ||
    user?.role === 'admin';

  const { data: facilities } = useQuery({
    queryKey: ['facilities'],
    queryFn: listFacilitiesApi,
    staleTime: 60000,
  });

  const dltStatusQuery = useQuery({
    queryKey: ['dlt-status'],
    queryFn: getDLTStatusApi,
    refetchInterval: 15000,
  });

  const anchorsQuery = useQuery({
    queryKey: [
      'dlt-anchors',
      { facility_id: facilityId, anchor_status: anchorStatus, skip: page * PAGE_SIZE, limit: PAGE_SIZE },
    ],
    queryFn: () =>
      listDLTAnchorsApi({
        facility_id: facilityId || undefined,
        anchor_status: anchorStatus || undefined,
        skip: page * PAGE_SIZE,
        limit: PAGE_SIZE,
      }),
  });

  const reconcileMutation = useMutation({
    mutationFn: (recId: string) => reconcileAnchorApi(recId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dlt-anchors'] });
      queryClient.invalidateQueries({ queryKey: ['dlt-status'] });
    },
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

  const dltStatus = dltStatusQuery.data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1F293D]">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#0EA5E9]/10 border border-[#0EA5E9]/30 flex items-center justify-center text-[#0EA5E9]">
              <Blocks className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Distributed Ledger (DLT) &amp; Anchor Verification
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/blockchain/merkle"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0EA5E9]/15 hover:bg-[#0EA5E9]/25 text-[#0EA5E9] border border-[#0EA5E9]/30 rounded-lg text-xs font-semibold shadow-sm transition-colors"
          >
            <Layers className="w-3.5 h-3.5" />
            RFC 6962 Merkle Batch Tool
          </Link>
          <button
            onClick={() => {
              dltStatusQuery.refetch();
              anchorsQuery.refetch();
            }}
            disabled={dltStatusQuery.isFetching || anchorsQuery.isFetching}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#111827] border border-[#1F293D] hover:bg-[#161F30] text-slate-300 rounded-lg text-xs font-medium shadow-sm transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${anchorsQuery.isFetching ? 'animate-spin text-[#0EA5E9]' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Prominent DLT Mode & Infrastructure Status Banner */}
      <div className="bg-[#111827] border border-[#1F293D] rounded-xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1F293D]">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#0B0F17] border border-[#1F293D] text-[#0EA5E9] rounded-xl shadow-[0_0_15px_rgba(14,165,233,0.15)]">
              <Cpu className="w-6 h-6 text-[#0EA5E9]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">
                  DLT Gateway Transport Mode
                </h2>
                <DltModeBadge
                  mode={dltStatus?.mode}
                  distributedLedger={dltStatus?.distributed_ledger}
                />
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Channel: <span className="text-slate-300">{dltStatus?.channel || 'aquatrust-channel'}</span> • Chaincode:{' '}
                <span className="text-slate-300">{dltStatus?.chaincode || 'aquatrust-records'}</span>
              </p>
            </div>
          </div>

          <div className="text-right text-xs font-mono">
            <span className="text-slate-400 block text-[11px]">Connection State:</span>
            <span
              className={`font-semibold ${
                dltStatus?.is_connected ? 'text-emerald-400' : 'text-slate-400'
              }`}
            >
              {dltStatus?.status?.toUpperCase() || 'INITIALIZING'} (Connected: {String(dltStatus?.is_connected)})
            </span>
          </div>
        </div>
      </div>

      {/* Reconcile mutation notification */}
      {reconcileMutation.isSuccess && (
        <div className="p-4 bg-[#10B981]/10 border border-[#10B981]/40 rounded-xl text-xs font-mono text-emerald-200">
          <div className="font-bold flex items-center gap-1.5 mb-1 text-emerald-400">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Anchor Reconciliation Executed by Backend Gateway
          </div>
          <div>Record: {reconcileMutation.data.record_id}</div>
          <div>Ledger Mode: {reconcileMutation.data.ledger_mode}</div>
          <div>Status: {reconcileMutation.data.current_status}</div>
          {reconcileMutation.data.transaction_id && (
            <div>Tx ID: {reconcileMutation.data.transaction_id}</div>
          )}
        </div>
      )}

      {reconcileMutation.isError && (
        <ErrorState error={reconcileMutation.error} title="Reconciliation Failed" />
      )}

      {/* Anchors Filter Bar */}
      <div className="bg-[#111827] border border-[#1F293D] rounded-xl p-3.5 shadow-xl flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5 text-slate-400 font-medium">
          <Filter className="w-3.5 h-3.5 text-[#0EA5E9]" />
          <span>Filters:</span>
        </div>

        <div className="flex items-center gap-1.5">
          <label className="text-slate-400 font-mono text-[11px]">Facility:</label>
          <select
            value={facilityId}
            onChange={(e) => updateParam('facility_id', e.target.value)}
            className="bg-[#0B0F17] border border-[#1F293D] rounded px-2.5 py-1 text-white font-mono focus:outline-none focus:border-[#0EA5E9]"
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
          <label className="text-slate-400 font-mono text-[11px]">Anchor Status:</label>
          <select
            value={anchorStatus}
            onChange={(e) => updateParam('anchor_status', e.target.value)}
            className="bg-[#0B0F17] border border-[#1F293D] rounded px-2.5 py-1 text-white font-mono focus:outline-none focus:border-[#0EA5E9]"
          >
            <option value="">All Anchor States</option>
            <option value="pending">pending</option>
            <option value="submitted">submitted</option>
            <option value="confirmed">confirmed</option>
            <option value="failed">failed</option>
            <option value="rejected">rejected</option>
          </select>
        </div>
      </div>

      {/* DLT Anchors Table */}
      <div className="bg-[#111827] border border-[#1F293D] rounded-xl shadow-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1F293D] flex items-center justify-between bg-[#161F30]/60">
          <h2 className="text-xs font-mono uppercase tracking-wider text-slate-300">
            DLT Record Anchors
          </h2>
        </div>

        {anchorsQuery.isLoading ? (
          <LoadingState message="Loading DLT anchors..." />
        ) : anchorsQuery.isError ? (
          <div className="p-6">
            <ErrorState error={anchorsQuery.error} onRetry={() => anchorsQuery.refetch()} />
          </div>
        ) : !anchorsQuery.data || anchorsQuery.data.length === 0 ? (
          <EmptyState
            title="No DLT Anchors Found"
            message="No treatment records have been submitted for ledger anchoring yet."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#161F30] border-b border-[#1F293D] text-slate-400 font-mono uppercase text-[11px]">
                  <th className="py-2.5 px-4">Anchor ID</th>
                  <th className="py-2.5 px-4">Record ID</th>
                  <th className="py-2.5 px-4">Canonical Hash</th>
                  <th className="py-2.5 px-4">Anchor Status</th>
                  <th className="py-2.5 px-4">Tx ID / Ref</th>
                  <th className="py-2.5 px-4">Block #</th>
                  <th className="py-2.5 px-4">Anchored At</th>
                  <th className="py-2.5 px-4 text-right">Reconcile / Verify</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1F293D] font-mono">
                {anchorsQuery.data.map((a) => (
                  <tr key={a.anchor_id} className="hover:bg-[#161F30] transition-colors">
                    <td className="py-2.5 px-4 font-semibold text-slate-300 select-all">
                      {a.anchor_id.slice(0, 8)}...
                    </td>
                    <td className="py-2.5 px-4 text-[#0EA5E9] select-all">
                      <Link to={`/treatment-records/${a.record_id}`} className="hover:underline">
                        {a.record_id.slice(0, 8)}...
                      </Link>
                    </td>
                    <td className="py-2.5 px-4 text-slate-400 select-all max-w-[120px] truncate">
                      {a.canonical_hash}
                    </td>
                    <td className="py-2.5 px-4">
                      <StatusBadge status={a.anchor_status} />
                    </td>
                    <td className="py-2.5 px-4 text-slate-400 select-all max-w-[130px] truncate">
                      {a.transaction_id ? (
                        <Link
                          to={`/blockchain/transactions/${a.transaction_id}`}
                          className="text-[#0EA5E9] hover:underline"
                        >
                          {a.transaction_id.slice(0, 10)}...
                        </Link>
                      ) : (
                        <span className="text-slate-600">null</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-slate-300">
                      {a.block_number !== null ? `#${a.block_number}` : '—'}
                    </td>
                    <td className="py-2.5 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                      {a.anchored_at ? new Date(a.anchored_at).toLocaleString() : 'Pending Confirmation'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-sans whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        {isReconcileAuthorized && (
                          <button
                            onClick={() => reconcileMutation.mutate(a.record_id)}
                            disabled={reconcileMutation.isPending}
                            className="px-2.5 py-1 bg-[#0B0F17] hover:bg-[#161F30] border border-[#1F293D] text-slate-300 rounded text-[11px] font-semibold transition-colors disabled:opacity-50"
                            title="Reconcile with DLT Gateway"
                          >
                            Reconcile
                          </button>
                        )}
                        <Link
                          to={`/verification?recordId=${a.record_id}`}
                          className="inline-flex items-center gap-1 text-[#0EA5E9] hover:text-cyan-300 font-medium"
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
        <div className="p-3.5 bg-[#161F30]/40 border-t border-[#1F293D] flex items-center justify-between text-xs font-mono text-slate-400">
          <div>
            Offset: <span className="font-semibold text-white">{page * PAGE_SIZE}</span> |{' '}
            Limit: <span className="font-semibold text-white">{PAGE_SIZE}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (page > 0) updateParam('page', String(page - 1));
              }}
              disabled={page === 0 || anchorsQuery.isLoading}
              className="px-2.5 py-1 bg-[#0B0F17] border border-[#1F293D] rounded hover:bg-[#161F30] text-slate-300 disabled:opacity-40 transition-colors inline-flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Previous
            </button>
            <span className="px-2 font-semibold text-white">Page {page + 1}</span>
            <button
              onClick={() => {
                updateParam('page', String(page + 1));
              }}
              disabled={anchorsQuery.isLoading || !anchorsQuery.data || anchorsQuery.data.length < PAGE_SIZE}
              className="px-2.5 py-1 bg-[#0B0F17] border border-[#1F293D] rounded hover:bg-[#161F30] text-slate-300 disabled:opacity-40 transition-colors inline-flex items-center gap-1"
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
