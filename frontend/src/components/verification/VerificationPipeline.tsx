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
        className={`p-6 rounded-xl border shadow-sm dark:shadow-scada-card ${
          isVerified
            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100'
            : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-100'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-slate-600 dark:text-slate-400 font-semibold">
              Independent Cryptographic Audit Verdict
            </div>
            <div className="mt-2.5 flex items-center gap-3 flex-wrap">
              <VerificationVerdictBadge verdict={verification.overall_verdict} />
              <span className="text-xs font-mono text-slate-600 dark:text-slate-400">
                Verified at: {new Date(verification.verification_timestamp).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="text-xs font-mono">
            <div className="text-slate-700 dark:text-slate-300">
              Record: <span className="font-semibold text-cyan-700 dark:text-cyan-400 select-all">{verification.record_id}</span> (v{verification.record_version})
            </div>
            {verification.certificate_id && (
              <div className="text-slate-600 dark:text-slate-400 mt-0.5">
                Cert: <span className="font-semibold text-cyan-700 dark:text-cyan-300 select-all">{verification.certificate_id}</span>
              </div>
            )}
            {verification.is_superseded && (
              <div className="text-amber-800 dark:text-amber-400 font-bold mt-1 bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 px-2.5 py-0.5 rounded">
                Notice: Record is SUPERSEDED by{' '}
                <span className="select-all font-mono">
                  {verification.superseding_record_id || 'new version'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Cryptographic Digests */}
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-[#1F293D] grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div>
            <span className="text-slate-600 dark:text-slate-400 text-[10px] uppercase font-semibold block">Verified Canonical SHA-256 Digest:</span>
            <div className="p-2.5 bg-slate-100 dark:bg-[#070B12] border border-slate-300 dark:border-[#1F293D] text-emerald-700 dark:text-emerald-400 rounded-lg text-xs break-all select-all mt-1 font-bold">
              {verification.canonical_hash}
            </div>
          </div>

          <div>
            <span className="text-slate-600 dark:text-slate-400 text-[10px] uppercase font-semibold block">DLT Transaction / Simulation Reference:</span>
            <div className="p-2.5 bg-slate-100 dark:bg-[#070B12] border border-slate-300 dark:border-[#1F293D] text-slate-800 dark:text-slate-300 rounded-lg text-xs break-all select-all mt-1">
              {verification.dlt_tx_id || 'Null / Pending DLT Confirmation'}
            </div>
          </div>
        </div>

        {/* Tamper Details if flagged */}
        {verification.tamper_details && Object.keys(verification.tamper_details).length > 0 && (
          <div className="mt-4 p-4 bg-rose-50 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-700 rounded-xl text-xs text-rose-900 dark:text-rose-200 font-mono shadow-inner">
            <span className="font-bold block uppercase tracking-wider text-[11px] text-rose-800 dark:text-rose-300">
              Discrepancy / Tamper Evidence Report:
            </span>
            <pre className="mt-1.5 overflow-auto max-h-36 text-rose-900/90 dark:text-rose-200/90 whitespace-pre-wrap">
              {JSON.stringify(verification.tamper_details, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Vertical Pipeline: 4 Independent Stages */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wide font-mono">
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

            let statusBorder = 'border-slate-200 dark:border-[#1F293D] bg-white dark:bg-[#111827] text-slate-700 dark:text-slate-300';
            let badgeStyle = 'bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400';

            if (isPass) {
              statusBorder = 'border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/60 dark:bg-emerald-950/20';
              badgeStyle = 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700';
            } else if (isFail) {
              statusBorder = 'border-rose-300 dark:border-rose-800/80 bg-rose-50/60 dark:bg-rose-950/30';
              badgeStyle = 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-700';
            }

            return (
              <div
                key={key}
                className={`p-4 rounded-xl border shadow-sm dark:shadow-scada-card transition-all ${statusBorder}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2.5 rounded-lg border ${
                        isPass
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
                          : isFail
                          ? 'bg-rose-100 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-400'
                          : 'bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {icon}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white font-mono">{label}</h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">Stage {index + 1} of 4</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {stage?.latency_ms !== undefined && stage.latency_ms !== null && (
                      <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                        {stage.latency_ms} ms
                      </span>
                    )}

                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono font-bold uppercase border shadow-sm ${badgeStyle}`}
                    >
                      {isPass ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          PASSED
                        </>
                      ) : isFail ? (
                        <>
                          <XCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                          FAILED
                        </>
                      ) : (
                        <>
                          <MinusCircle className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                          {status}
                        </>
                      )}
                    </span>
                  </div>
                </div>

                {/* Stage Details Inspection */}
                {stage?.details && Object.keys(stage.details).length > 0 && (
                  <div className="mt-3.5 pt-3 border-t border-slate-200 dark:border-[#1F293D] text-xs font-mono">
                    <span className="text-slate-600 dark:text-slate-400 text-[10px] uppercase font-semibold block mb-1.5">
                      Stage Execution Evidence:
                    </span>
                    <div className="bg-slate-100 dark:bg-[#070B12] border border-slate-300 dark:border-[#1F293D] text-cyan-800 dark:text-cyan-300 rounded-lg p-3 overflow-auto max-h-44 text-[11px] shadow-inner">
                      <pre className="whitespace-pre-wrap">{JSON.stringify(stage.details, null, 2)}</pre>
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
