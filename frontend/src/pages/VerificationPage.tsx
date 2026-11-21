import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { verifyRecordApi } from '../api/verification';
import { listTreatmentRecordsApi } from '../api/treatmentRecords';
import { VerificationPipeline } from '../components/verification/VerificationPipeline';
import { LoadingState, ErrorState, EmptyState } from '../components/common/States';
import { ShieldCheck, Play } from 'lucide-react';

export const VerificationPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlRecordId = searchParams.get('recordId') || '';

  const [inputRecordId, setInputRecordId] = useState<string>(urlRecordId);
  const [activeRecordId, setActiveRecordId] = useState<string>(urlRecordId);

  useEffect(() => {
    if (urlRecordId) {
      setInputRecordId(urlRecordId);
      setActiveRecordId(urlRecordId);
    }
  }, [urlRecordId]);

  const { data: treatmentRecords } = useQuery({
    queryKey: ['treatment-records', { limit: 20 }],
    queryFn: () => listTreatmentRecordsApi({ limit: 20 }),
  });

  const verifyMutation = useMutation({
    mutationFn: (recId: string) => verifyRecordApi(recId),
  });

  const handleVerify = (idToVerify: string) => {
    if (!idToVerify) return;
    setActiveRecordId(idToVerify);
    const next = new URLSearchParams(searchParams);
    next.set('recordId', idToVerify);
    setSearchParams(next);
    verifyMutation.mutate(idToVerify);
  };

  useEffect(() => {
    if (activeRecordId && !verifyMutation.data && !verifyMutation.isPending) {
      verifyMutation.mutate(activeRecordId);
    } else if (!activeRecordId && treatmentRecords && treatmentRecords.length > 0) {
      const defaultId = treatmentRecords[0].record_id;
      setInputRecordId(defaultId);
      setActiveRecordId(defaultId);
      verifyMutation.mutate(defaultId);
    }
  }, [activeRecordId, treatmentRecords]);

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-slate-200 dark:border-[#1F293D]">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-mono flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
          Independent Cryptographic Trust Verification
        </h1>
      </div>

      {/* Target Record Selector */}
      <div className="scada-card p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wide font-mono">
          Select Treatment Record to Audit
        </h2>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleVerify(inputRecordId.trim());
          }}
          className="flex flex-col sm:flex-row items-center gap-3"
        >
          <div className="flex-1 w-full">
            <input
              type="text"
              required
              value={inputRecordId}
              onChange={(e) => setInputRecordId(e.target.value)}
              placeholder="Paste Treatment Record UUID..."
              className="w-full scada-input py-2.5 text-xs font-mono"
            />
          </div>

          <button
            type="submit"
            disabled={!inputRecordId.trim() || verifyMutation.isPending}
            className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 shrink-0 w-full sm:w-auto justify-center font-mono cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" />
            {verifyMutation.isPending ? 'Verifying Proof...' : 'Execute 4-Stage Verification'}
          </button>
        </form>

        {/* Quick select dropdown if available */}
        {treatmentRecords && treatmentRecords.length > 0 && (
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-2 text-xs text-slate-600 dark:text-slate-400 font-mono">
            <span className="shrink-0 font-medium">Or pick from recent records:</span>
            <select
              value={activeRecordId}
              onChange={(e) => {
                if (e.target.value) {
                  setInputRecordId(e.target.value);
                  handleVerify(e.target.value);
                }
              }}
              className="scada-select max-w-xl truncate"
            >
              <option value="">Choose a finalized record...</option>
              {treatmentRecords.map((r) => (
                <option key={r.record_id} value={r.record_id}>
                  {r.record_id} (v{r.record_version} • {r.compliance_status} • {r.anchor_status})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Verification State */}
      {verifyMutation.isPending && (
        <LoadingState message="Re-computing canonical SHA-256 and verifying cryptographic signatures..." />
      )}

      {verifyMutation.isError && (
        <ErrorState
          title="Cryptographic Verification Failed to Execute"
          error={verifyMutation.error}
          onRetry={() => handleVerify(activeRecordId)}
        />
      )}

      {verifyMutation.data && (
        <VerificationPipeline verification={verifyMutation.data} />
      )}

      {!verifyMutation.isPending && !verifyMutation.data && !verifyMutation.isError && (
        <EmptyState
          title="Ready to Verify"
          message="Select a treatment record or enter its UUID above to execute independent verification."
          icon={<ShieldCheck className="w-8 h-8 text-cyan-600 dark:text-cyan-400" />}
        />
      )}
    </div>
  );
};
export default VerificationPage;
