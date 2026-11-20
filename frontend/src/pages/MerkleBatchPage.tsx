import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { anchorBatchApi, verifyBatchLeafApi } from '../api/dlt';
import { ErrorState } from '../components/common/States';
import { DltModeBadge } from '../components/common/Badges';
import { Layers, ArrowLeft, ShieldCheck, CheckCircle2, XCircle, Hash, Play, Key } from 'lucide-react';

export const MerkleBatchPage: React.FC = () => {
  // Batch Anchor form state
  const [batchId, setBatchId] = useState<string>(`batch-${Date.now()}`);
  const [facilityId, setFacilityId] = useState<string>('FAC-CPCB-001');
  const [hashesInput, setHashesInput] = useState<string>(
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855\nca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb'
  );
  const [recordIdsInput, setRecordIdsInput] = useState<string>('rec-001\nrec-002');
  const [keyId, setKeyId] = useState<string>('key-ecdsa-p256-01');

  // Batch Verify form state
  const [verifyBatchId, setVerifyBatchId] = useState<string>('');
  const [verifyLeafHash, setVerifyLeafHash] = useState<string>('');

  const anchorMutation = useMutation({
    mutationFn: () => {
      const hashes = hashesInput
        .split('\n')
        .map((h) => h.trim())
        .filter(Boolean);
      const recIds = recordIdsInput
        .split('\n')
        .map((r) => r.trim())
        .filter(Boolean);
      return anchorBatchApi({
        batch_id: batchId,
        facility_id: facilityId,
        record_hashes: hashes,
        record_ids: recIds.length > 0 ? recIds : undefined,
        key_id: keyId,
      });
    },
    onSuccess: (data) => {
      setVerifyBatchId(data.batch_id);
    },
  });

  const verifyMutation = useMutation({
    mutationFn: () =>
      verifyBatchLeafApi({
        batch_id: verifyBatchId,
        leaf_hash: verifyLeafHash,
      }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <Link to="/blockchain" className="hover:text-[#0EA5E9] inline-flex items-center gap-1.5 font-medium transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to DLT Ledger
        </Link>
      </div>

      <div className="pb-4 border-b border-slate-200 dark:border-[#1F293D] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#0EA5E9]/10 border border-[#0EA5E9]/30 flex items-center justify-center text-[#0EA5E9]">
              <Layers className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              RFC 6962 Merkle Tree Batch Commitment &amp; Audit Verification
            </h1>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel 1: Anchor Telemetry Batch */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1F293D] rounded-xl p-6 shadow-sm dark:shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-[#1F293D]">
            <h2 className="text-xs font-mono uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Hash className="w-3.5 h-3.5 text-[#0EA5E9]" />
              1. Anchor Batch of Telemetry Hashes
            </h2>
            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">ROOT COMMITMENT</span>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              anchorMutation.mutate();
            }}
            className="space-y-3.5 text-xs"
          >
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Batch Identifier</label>
              <input
                type="text"
                required
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-[#1F293D] rounded-lg px-3 py-2 font-mono text-slate-900 dark:text-white focus:outline-none focus:border-[#0EA5E9]"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Facility ID (UUID or code)</label>
              <input
                type="text"
                required
                value={facilityId}
                onChange={(e) => setFacilityId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-[#1F293D] rounded-lg px-3 py-2 font-mono text-slate-900 dark:text-white focus:outline-none focus:border-[#0EA5E9]"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                Record Hashes (One SHA-256 Hex per line)
              </label>
              <textarea
                rows={3}
                required
                value={hashesInput}
                onChange={(e) => setHashesInput(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-[#1F293D] rounded-lg p-2.5 font-mono text-slate-900 dark:text-white text-[11px] focus:outline-none focus:border-[#0EA5E9]"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                Corresponding Record IDs (Optional, One per line)
              </label>
              <textarea
                rows={2}
                value={recordIdsInput}
                onChange={(e) => setRecordIdsInput(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-[#1F293D] rounded-lg p-2.5 font-mono text-slate-900 dark:text-white text-[11px] focus:outline-none focus:border-[#0EA5E9]"
              />
            </div>

            <button
              type="submit"
              disabled={anchorMutation.isPending}
              className="w-full py-2.5 bg-[#0EA5E9] hover:bg-[#0284C7] text-white rounded-lg font-bold uppercase tracking-wider text-xs shadow-[0_0_15px_rgba(14,165,233,0.3)] transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
            >
              <Play className="w-3.5 h-3.5" />
              {anchorMutation.isPending ? 'Anchoring Batch...' : 'Compute Merkle Root & Anchor'}
            </button>
          </form>

          {anchorMutation.isError && <ErrorState error={anchorMutation.error} />}

          {anchorMutation.data && (
            <div className="mt-4 p-4 bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-[#1F293D] text-slate-700 dark:text-slate-200 rounded-xl space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Batch Anchored
                </span>
                <DltModeBadge
                  mode={anchorMutation.data.mode}
                  distributedLedger={anchorMutation.data.distributed_ledger}
                />
              </div>

              <div>
                <span className="text-slate-500 dark:text-slate-400 text-[11px] block">Merkle Root:</span>
                <div className="select-all break-all text-emerald-600 dark:text-emerald-400 font-bold bg-white dark:bg-[#111827] p-2 rounded border border-slate-200 dark:border-[#1F293D] mt-1">
                  {anchorMutation.data.merkle_root}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                <div>Leaves: <strong className="text-slate-900 dark:text-white">{anchorMutation.data.leaf_count}</strong></div>
                <div>Status: <strong className="text-slate-900 dark:text-white">{anchorMutation.data.status}</strong></div>
                <div>Channel: <strong className="text-slate-900 dark:text-white">{anchorMutation.data.channel_id}</strong></div>
                <div className="truncate">
                  Tx ID: <strong className="text-slate-900 dark:text-white">{anchorMutation.data.tx_id || anchorMutation.data.simulation_reference || 'Simulated'}</strong>
                </div>
              </div>

              <div>
                <span className="text-slate-500 dark:text-slate-400 text-[11px] block">Inclusion Proofs Object:</span>
                <pre className="overflow-auto max-h-32 text-[10px] text-slate-700 dark:text-slate-300 mt-1 bg-white dark:bg-[#111827] p-2 rounded border border-slate-200 dark:border-[#1F293D]">
                  {JSON.stringify(anchorMutation.data.proofs, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Panel 2: Verify Leaf Inclusion Proof */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1F293D] rounded-xl p-6 shadow-sm dark:shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-[#1F293D]">
            <h2 className="text-xs font-mono uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
              2. Verify Leaf Hash Inclusion in Merkle Batch
            </h2>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              verifyMutation.mutate();
            }}
            className="space-y-3.5 text-xs"
          >
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Batch ID</label>
              <input
                type="text"
                required
                value={verifyBatchId}
                onChange={(e) => setVerifyBatchId(e.target.value)}
                placeholder="e.g. batch-12345"
                className="w-full bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-[#1F293D] rounded-lg px-3 py-2 font-mono text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#10B981]"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                Candidate Leaf Hash (SHA-256)
              </label>
              <input
                type="text"
                required
                value={verifyLeafHash}
                onChange={(e) => setVerifyLeafHash(e.target.value)}
                placeholder="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                className="w-full bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-[#1F293D] rounded-lg px-3 py-2 font-mono text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#10B981]"
              />
            </div>

            <button
              type="submit"
              disabled={verifyMutation.isPending}
              className="w-full py-2.5 bg-[#10B981] hover:bg-[#059669] text-white rounded-lg font-bold uppercase tracking-wider text-xs shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              {verifyMutation.isPending ? 'Verifying Inclusion...' : 'Verify Merkle Inclusion Proof'}
            </button>
          </form>

          {verifyMutation.isError && <ErrorState error={verifyMutation.error} />}

          {verifyMutation.data && (
            <div
              className={`mt-4 p-4 rounded-xl font-mono text-xs border ${
                verifyMutation.data.verified
                  ? 'bg-emerald-50 dark:bg-[#10B981]/10 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-[#10B981]/40'
                  : 'bg-rose-50 dark:bg-[#EF4444]/10 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-[#EF4444]/40'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-sm mb-2">
                {verifyMutation.data.verified ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    INCLUSION PROOF VALID
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                    PROOF VERIFICATION FAILED
                  </>
                )}
              </div>

              <div className="space-y-1.5 text-[11px]">
                <div>Message: <span className="text-slate-900 dark:text-white">{verifyMutation.data.message}</span></div>
                <div>Batch: <span className="text-slate-900 dark:text-white">{verifyMutation.data.batch_id}</span></div>
                <div className="select-all break-all">
                  Merkle Root: <span className="text-emerald-600 dark:text-emerald-400">{verifyMutation.data.merkle_root || 'N/A'}</span>
                </div>
                <div>Ledger Mode: <span className="text-slate-900 dark:text-white">{verifyMutation.data.mode}</span></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
