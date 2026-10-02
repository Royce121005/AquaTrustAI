import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getCorrectionChainApi,
  proposeCorrectionApi,
  authorizeCorrectionApi,
} from '../api/corrections';
import { useAuth } from '../context/AuthContext';
import { LoadingState, ErrorState, EmptyState } from '../components/common/States';
import { StatusBadge } from '../components/common/Badges';
import {
  GitCommit,
  ArrowLeft,
  ArrowDown,
  ShieldAlert,
  CheckCircle2,
  Play,
  FileText,
  Clock,
  Layers,
  Key,
} from 'lucide-react';

export const CorrectionChainPage: React.FC = () => {
  const { recordId } = useParams<{ recordId: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const isAuthorizerRole =
    user?.role === 'auditor' ||
    user?.role === 'regulatory_stakeholder' ||
    user?.role === 'admin';

  // Proposal modal/form state
  const [justificationCode, setJustificationCode] = useState<string>('SENSOR_RECALIBRATION');
  const [reason, setReason] = useState<string>('');
  const [correctedParamsJson, setCorrectedParamsJson] = useState<string>('{\n  "BOD": 22.5\n}');
  const [evidenceUrl, setEvidenceUrl] = useState<string>('');

  // Authorization form state
  const [activeCorrectionId, setActiveCorrectionId] = useState<string>('');
  const [authComments, setAuthComments] = useState<string>('');

  const chainQuery = useQuery({
    queryKey: ['correction-chain', recordId],
    queryFn: () => getCorrectionChainApi(recordId!),
    enabled: !!recordId,
  });

  const proposeMutation = useMutation({
    mutationFn: () => {
      let parsedParams = {};
      try {
        parsedParams = JSON.parse(correctedParamsJson);
      } catch {
        throw new Error('Invalid JSON format in corrected parameters');
      }
      return proposeCorrectionApi({
        original_record_id: recordId!,
        reason,
        justification_code: justificationCode,
        corrected_parameters: parsedParams,
        supporting_evidence_url: evidenceUrl || undefined,
      });
    },
    onSuccess: (data) => {
      setActiveCorrectionId(data.correction_id);
      queryClient.invalidateQueries({ queryKey: ['correction-chain', recordId] });
      queryClient.invalidateQueries({ queryKey: ['treatment-records'] });
    },
  });

  const authorizeMutation = useMutation({
    mutationFn: (corrId: string) =>
      authorizeCorrectionApi(corrId, {
        comments: authComments || undefined,
        key_id: 'key-ecdsa-p256-01',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['correction-chain', recordId] });
      queryClient.invalidateQueries({ queryKey: ['treatment-records'] });
    },
  });

  if (!recordId) {
    return <ErrorState error={new Error('No record ID supplied')} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link to="/treatment-records" className="hover:text-brand-600 inline-flex items-center gap-1 font-medium">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Treatment Records
        </Link>
      </div>

      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <GitCommit className="w-5 h-5 text-brand-600" />
          Append-Only Correction Lineage & Audit History
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Treatment records cannot be deleted or mutated in-place. Amendments preserve original versions while creating superseding version nodes.
        </p>
      </div>

      {/* Lineage Timeline Section */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-6">
          Immutable Version Lineage Graph
        </h2>

        {chainQuery.isLoading ? (
          <LoadingState message="Fetching immutable provenance chain..." />
        ) : chainQuery.isError ? (
          <ErrorState error={chainQuery.error} onRetry={() => chainQuery.refetch()} />
        ) : !chainQuery.data || (chainQuery.data.chain || chainQuery.data.lineage || []).length === 0 ? (
          <EmptyState
            title="No Lineage Found"
            message={`No chain records returned for treatment record ID ${recordId}.`}
          />
        ) : (
          <div className="relative pl-6 space-y-8 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {(chainQuery.data.chain || chainQuery.data.lineage || []).map((node, index) => {
              const isCurrent = node.record_state !== 'superseded';
              const isTargetRecord = node.record_id === recordId;

              return (
                <div key={node.record_id} className="relative group">
                  {/* Timeline bullet */}
                  <div
                    className={`absolute -left-[27px] top-1.5 w-4 h-4 rounded-full border-2 bg-white flex items-center justify-center ${
                      isCurrent
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-slate-400 bg-slate-100'
                    }`}
                  >
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${
                        isCurrent ? 'bg-emerald-600' : 'bg-slate-500'
                      }`}
                    />
                  </div>

                  {/* Node Card */}
                  <div
                    className={`p-5 rounded-lg border shadow-sm transition-all ${
                      isTargetRecord
                        ? 'border-brand-300 ring-2 ring-brand-100 bg-white'
                        : 'border-slate-200 bg-slate-50/70'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-slate-900">
                          Version {node.record_version}
                        </span>
                        <StatusBadge status={node.record_state} />
                        {isCurrent && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-100 text-emerald-800 font-semibold">
                            ACTIVE CURRENT
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-mono text-slate-400">
                        Created: {new Date(node.created_at).toLocaleString()}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 text-xs font-mono">
                      <div>
                        <span className="text-slate-400 text-[11px] block">Record Identifier:</span>
                        <Link
                          to={`/treatment-records/${node.record_id}`}
                          className="font-semibold text-brand-600 hover:underline select-all"
                        >
                          {node.record_id}
                        </Link>
                      </div>

                      <div>
                        <span className="text-slate-400 text-[11px] block">Supersedes:</span>
                        <span className="text-slate-700">
                          {node.supersedes_record_id || 'Root Node (Initial)'}
                        </span>
                      </div>

                      <div className="md:col-span-2">
                        <span className="text-slate-400 text-[11px] block">Canonical SHA-256 Digest:</span>
                        <div className="p-2 bg-slate-900 text-emerald-400 rounded text-[11px] break-all select-all mt-1">
                          {node.canonical_hash || 'Un-finalized Draft'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Propose Correction Section */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide flex items-center gap-2">
          <GitCommit className="w-4 h-4 text-brand-600" />
          Propose Append-Only Correction for this Record
        </h2>
        <p className="text-xs text-slate-500">
          Allowed roles: operator, auditor, regulator, admin. Proposing an amendment does not alter the original record until authorized.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            proposeMutation.mutate();
          }}
          className="space-y-3 text-xs"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Justification Code
              </label>
              <select
                value={justificationCode}
                onChange={(e) => setJustificationCode(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs font-mono text-slate-800"
              >
                <option value="SENSOR_RECALIBRATION">SENSOR_RECALIBRATION</option>
                <option value="LAB_CONFIRMATORY_OVERRIDE">LAB_CONFIRMATORY_OVERRIDE</option>
                <option value="DATA_TRANSMISSION_ERROR">DATA_TRANSMISSION_ERROR</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Supporting Evidence URL (Optional)
              </label>
              <input
                type="text"
                value={evidenceUrl}
                onChange={(e) => setEvidenceUrl(e.target.value)}
                placeholder="https://lab-records.internal/audit/1234.pdf"
                className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Detailed Regulatory Reason
            </label>
            <textarea
              required
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain the physical calibration defect or confirmatory laboratory findings..."
              className="w-full bg-white border border-slate-300 rounded p-2 text-xs text-slate-800"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Corrected Parameters (JSON Object)
            </label>
            <textarea
              required
              rows={3}
              value={correctedParamsJson}
              onChange={(e) => setCorrectedParamsJson(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded p-2 font-mono text-slate-800 text-[11px]"
            />
          </div>

          <button
            type="submit"
            disabled={proposeMutation.isPending || !reason.trim()}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded text-xs font-semibold shadow-sm transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5" />
            {proposeMutation.isPending ? 'Submitting Proposal...' : 'Submit Correction Proposal'}
          </button>
        </form>

        {proposeMutation.isError && <ErrorState error={proposeMutation.error} />}

        {proposeMutation.data && (
          <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-lg text-xs font-mono text-emerald-950 space-y-2">
            <div className="font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Correction Proposal Submitted Successfully
            </div>
            <div>Correction ID: {proposeMutation.data.correction_id}</div>
            <div>Status: {proposeMutation.data.status}</div>
            <div>Proposer: {proposeMutation.data.proposer_id}</div>
            <div className="text-slate-600">
              Pending authorization by compliance auditor or regulator.
            </div>
          </div>
        )}
      </div>

      {/* Authorize Correction Section (Auditor, Regulator, Admin Only) */}
      {isAuthorizerRole && (
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide flex items-center gap-2">
            <Key className="w-4 h-4 text-purple-600" />
            Authorize Correction & Issue Superseding Version
          </h2>
          <p className="text-xs text-slate-500">
            Authorization creates a new versioned treatment record, marks the original superseded, computes a new atc-v1 canonical digest, signs with authority key, and anchors to DLT.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (activeCorrectionId.trim()) {
                authorizeMutation.mutate(activeCorrectionId.trim());
              }
            }}
            className="space-y-3 text-xs"
          >
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Correction UUID to Authorize
              </label>
              <input
                type="text"
                required
                value={activeCorrectionId}
                onChange={(e) => setActiveCorrectionId(e.target.value)}
                placeholder="Enter correction_id..."
                className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 font-mono text-slate-800"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Authorization Auditor Comments (Optional)
              </label>
              <input
                type="text"
                value={authComments}
                onChange={(e) => setAuthComments(e.target.value)}
                placeholder="Confirmatory laboratory evidence verified."
                className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-slate-800"
              />
            </div>

            <button
              type="submit"
              disabled={authorizeMutation.isPending || !activeCorrectionId.trim()}
              className="px-4 py-2 bg-purple-700 hover:bg-purple-600 text-white rounded text-xs font-semibold shadow-sm transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {authorizeMutation.isPending ? 'Authorizing & Signing...' : 'Authorize Correction & Mint v(N+1)'}
            </button>
          </form>

          {authorizeMutation.isError && <ErrorState error={authorizeMutation.error} />}

          {authorizeMutation.data && (
            <div className="p-4 bg-purple-50 border border-purple-300 rounded-lg text-xs font-mono text-purple-950 space-y-2">
              <div className="font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-purple-600" />
                Correction Authorized: New Version Minted
              </div>
              <div>Original Record: {authorizeMutation.data.original_record_id}</div>
              <div>Superseding Record: {authorizeMutation.data.superseding_record_id}</div>
              <div>Authorized By: {authorizeMutation.data.authorized_by}</div>
              <div className="pt-1">
                <Link
                  to={`/treatment-records/${authorizeMutation.data.superseding_record_id}`}
                  className="font-sans font-semibold text-brand-600 hover:underline"
                >
                  Inspect Superseding Treatment Record &rarr;
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
