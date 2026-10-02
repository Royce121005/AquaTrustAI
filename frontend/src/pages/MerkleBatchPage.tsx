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
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link to="/blockchain" className="hover:text-brand-600 inline-flex items-center gap-1 font-medium">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to DLT Ledger
        </Link>
      </div>

      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <Layers className="w-5 h-5 text-brand-600" />
          RFC 6962 Merkle Tree Batch Commitment & Audit Verification
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          High-throughput telemetry batch anchoring. Generates Merkle roots with inclusion audit path proofs.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel 1: Anchor Telemetry Batch */}
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide flex items-center gap-2">
            <Hash className="w-4 h-4 text-brand-600" />
            1. Anchor Batch of Telemetry Hashes
          </h2>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              anchorMutation.mutate();
            }}
            className="space-y-3 text-xs"
          >
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Batch Identifier</label>
              <input
                type="text"
                required
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 font-mono text-slate-800"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Facility ID (UUID or code)</label>
              <input
                type="text"
                required
                value={facilityId}
                onChange={(e) => setFacilityId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 font-mono text-slate-800"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">
                Record Hashes (One SHA-256 Hex per line)
              </label>
              <textarea
                rows={3}
                required
                value={hashesInput}
                onChange={(e) => setHashesInput(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded p-2 font-mono text-slate-800 text-[11px]"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">
                Corresponding Record IDs (Optional, One per line)
              </label>
              <textarea
                rows={2}
                value={recordIdsInput}
                onChange={(e) => setRecordIdsInput(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded p-2 font-mono text-slate-800 text-[11px]"
              />
            </div>

            <button
              type="submit"
              disabled={anchorMutation.isPending}
              className="w-full py-2 bg-brand-600 hover:bg-brand-500 text-white rounded font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 mt-2"
            >
              <Play className="w-3.5 h-3.5" />
              {anchorMutation.isPending ? 'Anchoring Batch...' : 'Compute Merkle Root & Anchor'}
            </button>
          </form>

          {anchorMutation.isError && <ErrorState error={anchorMutation.error} />}

          {anchorMutation.data && (
            <div className="mt-4 p-4 bg-slate-900 text-slate-200 rounded-lg space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between text-emerald-400 font-bold">
                <span>Batch Anchored</span>
                <DltModeBadge
                  mode={anchorMutation.data.mode}
                  distributedLedger={anchorMutation.data.distributed_ledger}
                />
              </div>

              <div>
                <span className="text-slate-400 text-[11px] block">Merkle Root:</span>
                <div className="select-all break-all text-emerald-300 font-bold">
                  {anchorMutation.data.merkle_root}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>Leaves: {anchorMutation.data.leaf_count}</div>
                <div>Status: {anchorMutation.data.status}</div>
                <div>Channel: {anchorMutation.data.channel_id}</div>
                <div>
                  Tx ID: {anchorMutation.data.tx_id || anchorMutation.data.simulation_reference || 'Simulated'}
                </div>
              </div>

              <div>
                <span className="text-slate-400 text-[11px] block">Inclusion Proofs Object:</span>
                <pre className="overflow-auto max-h-32 text-[10px] text-slate-300 mt-1">
                  {JSON.stringify(anchorMutation.data.proofs, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Panel 2: Verify Leaf Inclusion Proof */}
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            2. Verify Leaf Hash Inclusion in Merkle Batch
          </h2>

          <p className="text-xs text-slate-500">
            Verifies cryptographic membership proof against the batch commitment without requiring retrieval of the entire dataset.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              verifyMutation.mutate();
            }}
            className="space-y-3 text-xs"
          >
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Batch ID</label>
              <input
                type="text"
                required
                value={verifyBatchId}
                onChange={(e) => setVerifyBatchId(e.target.value)}
                placeholder="e.g. batch-12345"
                className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 font-mono text-slate-800"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">
                Candidate Leaf Hash (SHA-256)
              </label>
              <input
                type="text"
                required
                value={verifyLeafHash}
                onChange={(e) => setVerifyLeafHash(e.target.value)}
                placeholder="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 font-mono text-slate-800"
              />
            </div>

            <button
              type="submit"
              disabled={verifyMutation.isPending}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 mt-2"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              {verifyMutation.isPending ? 'Verifying Inclusion...' : 'Verify Merkle Inclusion Proof'}
            </button>
          </form>

          {verifyMutation.isError && <ErrorState error={verifyMutation.error} />}

          {verifyMutation.data && (
            <div
              className={`mt-4 p-4 rounded-lg font-mono text-xs border ${
                verifyMutation.data.verified
                  ? 'bg-emerald-950 text-emerald-200 border-emerald-800'
                  : 'bg-rose-950 text-rose-200 border-rose-800'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-sm mb-2">
                {verifyMutation.data.verified ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    INCLUSION PROOF VALID
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-rose-400" />
                    PROOF VERIFICATION FAILED
                  </>
                )}
              </div>

              <div className="space-y-1 text-[11px]">
                <div>Message: {verifyMutation.data.message}</div>
                <div>Batch: {verifyMutation.data.batch_id}</div>
                <div className="select-all break-all">
                  Merkle Root: {verifyMutation.data.merkle_root || 'N/A'}
                </div>
                <div>Ledger Mode: {verifyMutation.data.mode}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
