import React from 'react';
import { Verification, VerificationStage } from '../../types';
import { VerificationVerdictBadge } from '../common/Badges';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MinusCircle,
  Hash,
  Key,
  Award,
  Blocks,
  Clock,
  Layers,
} from 'lucide-react';

interface VerificationPipelineProps {
  verification: Verification;
}

export const VerificationPipeline: React.FC<VerificationPipelineProps> = ({ verification }) => {
  const isVerified = verification.overall_verdict === 'VERIFIED';

  // The 4 standardized stages from backend VerifierService
  const stageKeys = [
    'stage_1_hash_integrity',
    'stage_2_signature_authenticity',
    'stage_3_certificate_consistency',
    'stage_4_dlt_ledger_anchor',
  ];

  const stageIcons: Record<string, React.ReactNode> = {
    stage_1_hash_integrity: <Hash className="w-5 h-5" />,
    stage_2_signature_authenticity: <Key className="w-5 h-5" />,
    stage_3_certificate_consistency: <Award className="w-5 h-5" />,
    stage_4_dlt_ledger_anchor: <Blocks className="w-5 h-5" />,
  };

  const stageLabels: Record<string, string> = {
    stage_1_hash_integrity: 'Stage 1: Canonical Hash Integrity',
    stage_2_signature_authenticity: 'Stage 2: Signature Authenticity',
    stage_3_certificate_consistency: 'Stage 3: Certificate Cross-Consistency',
    stage_4_dlt_ledger_anchor: 'Stage 4: DLT Ledger Anchor Verification',
  };

  return (
    <div className="space-y-6">
      {/* Overall Verdict Banner */}
      <div
        className={`p-6 rounded-lg border shadow-sm ${
          isVerified
            ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
            : 'bg-rose-50/80 border-rose-300 text-rose-950'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
              Independent Cryptographic Audit Verdict
            </div>
            <div className="mt-2 flex items-center gap-3">
              <VerificationVerdictBadge verdict={verification.overall_verdict} />
              <span className="text-xs font-mono text-slate-500">
                Verified at: {new Date(verification.verification_timestamp).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="text-xs font-mono">
            <div>
              Record: <span className="font-semibold select-all">{verification.record_id}</span> (v{verification.record_version})
            </div>
            {verification.certificate_id && (
              <div>
                Cert: <span className="font-semibold select-all">{verification.certificate_id}</span>
              </div>
            )}
            {verification.is_superseded && (
              <div className="text-amber-800 font-bold mt-1">
                Notice: Record is SUPERSEDED by{' '}
                <span className="select-all font-mono">
                  {verification.superseding_record_id || 'new version'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Cryptographic Digests */}
        <div className="mt-4 pt-4 border-t border-slate-200/60 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div>
            <span className="text-slate-500 text-[11px] block">Verified Canonical SHA-256 Digest:</span>
            <div className="p-2 bg-slate-900 text-emerald-400 rounded text-[11px] break-all select-all mt-1">
              {verification.canonical_hash}
            </div>
          </div>

          <div>
            <span className="text-slate-500 text-[11px] block">DLT Transaction / Simulation Reference:</span>
            <div className="p-2 bg-slate-900 text-slate-200 rounded text-[11px] break-all select-all mt-1">
              {verification.dlt_tx_id || 'Null / Pending DLT Confirmation'}
            </div>
          </div>
        </div>

        {/* Tamper Details if flagged */}
        {verification.tamper_details && Object.keys(verification.tamper_details).length > 0 && (
          <div className="mt-4 p-3 bg-rose-100 border border-rose-300 rounded text-xs text-rose-900 font-mono">
            <span className="font-bold block uppercase tracking-wider text-[11px] text-rose-800">
              Discrepancy / Tamper Evidence Report:
            </span>
            <pre className="mt-1 overflow-auto max-h-32">
              {JSON.stringify(verification.tamper_details, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Vertical Pipeline: 4 Independent Stages */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">
          Four-Stage Verification Pipeline Breakdown
        </h3>

        <div className="space-y-3">
          {stageKeys.map((key, index) => {
            const stage: VerificationStage | undefined =
              verification.stages?.[key] ||
              (key === 'stage_4_dlt_ledger_anchor'
                ? verification.stages?.['stage_4_dlt_anchor']
                : undefined);
            const status = stage?.status || 'skipped';
            const label = stage?.stage_name || stageLabels[key];
            const icon = stageIcons[key];

            const isPass = status === 'passed';
            const isFail = status === 'failed';

            let statusBg = 'bg-slate-50 border-slate-200 text-slate-600';
            let badgeBg = 'bg-slate-200 text-slate-700';

            if (isPass) {
              statusBg = 'bg-white border-emerald-200';
              badgeBg = 'bg-emerald-100 text-emerald-800 border border-emerald-300';
            } else if (isFail) {
              statusBg = 'bg-rose-50/60 border-rose-200';
              badgeBg = 'bg-rose-100 text-rose-800 border border-rose-300';
            }

            return (
              <div
                key={key}
                className={`p-4 rounded-lg border shadow-sm transition-all ${statusBg}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-md ${
                        isPass
                          ? 'bg-emerald-100 text-emerald-700'
                          : isFail
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {icon}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900">{label}</h4>
                      <p className="text-[11px] text-slate-400 font-mono">Stage {index + 1} of 4</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {stage?.latency_ms !== undefined && stage.latency_ms !== null && (
                      <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {stage.latency_ms} ms
                      </span>
                    )}

                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-mono font-bold uppercase ${badgeBg}`}
                    >
                      {isPass ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          PASSED
                        </>
                      ) : isFail ? (
                        <>
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          FAILED
                        </>
                      ) : (
                        <>
                          <MinusCircle className="w-3.5 h-3.5 text-slate-400" />
                          {status}
                        </>
                      )}
                    </span>
                  </div>
                </div>

                {/* Stage Details Inspection */}
                {stage?.details && Object.keys(stage.details).length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-100 text-xs font-mono">
                    <span className="text-slate-400 text-[10px] uppercase font-semibold block mb-1">
                      Stage Execution Evidence:
                    </span>
                    <div className="bg-slate-900 text-slate-200 rounded p-3 overflow-auto max-h-40 text-[11px]">
                      <pre>{JSON.stringify(stage.details, null, 2)}</pre>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
