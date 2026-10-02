import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { verifyRecordPublicApi, verifyCertificatePublicApi } from '../api/verification';
import { VerificationVerdictBadge } from '../components/common/Badges';
import {
  XCircle,
  Droplets,
  Search,
} from 'lucide-react';

export const PublicVerificationPage: React.FC<{ mode?: 'record' | 'certificate' }> = ({
  mode = 'record',
}) => {
  const params = useParams<{ recordId?: string; certificateId?: string }>();
  const targetId = mode === 'certificate' ? params.certificateId : params.recordId;

  const [searchId, setSearchId] = useState(targetId || '');

  const isCertLookup = mode === 'certificate';

  const verificationQuery = useQuery({
    queryKey: ['public-verification', mode, targetId],
    queryFn: () => {
      if (!targetId || targetId === '00000000-0000-0000-0000-000000000000') {
        return null;
      }
      return isCertLookup
        ? verifyCertificatePublicApi(targetId)
        : verifyRecordPublicApi(targetId);
    },
    enabled: !!targetId && targetId !== '00000000-0000-0000-0000-000000000000',
    retry: false,
  });

  const verification = verificationQuery.data;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Public Header */}
        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-xl bg-brand-600 flex items-center justify-center text-white mb-3 shadow-md">
            <Droplets className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">AquaTrust AI</h1>
          <p className="text-sm text-slate-400 mt-1">
            Public Regulatory Compliance & Cryptographic Proof Verification Portal
          </p>
          <div className="mt-2 text-xs font-mono text-slate-500">
            CPCB 2021 Water Discharge Standards • NIST P-256 Signatures • Merkle Ledger Audit
          </div>
        </div>

        {/* Search Bar for Public Verifiers */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (searchId.trim()) {
                window.location.href = isCertLookup
                  ? `/public/verify/certificate/${searchId.trim()}`
                  : `/verify/${searchId.trim()}`;
              }
            }}
            className="flex flex-col sm:flex-row gap-2"
          >
            <input
              type="text"
              required
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              placeholder={isCertLookup ? 'Enter Certificate UUID...' : 'Enter Treatment Record UUID...'}
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3.5 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center justify-center gap-1.5 shrink-0"
            >
              <Search className="w-3.5 h-3.5" />
              Verify Authenticity
            </button>
          </form>

          <div className="flex justify-between items-center mt-3 text-[11px] text-slate-500 font-mono">
            <span>
              Lookup Mode:{' '}
              <strong className="text-slate-400">
                {isCertLookup ? 'Digital Certificate' : 'Treatment Record'}
              </strong>
            </span>
            <Link
              to={isCertLookup ? '/verify/00000000-0000-0000-0000-000000000000' : '/public/verify/certificate/00000000-0000-0000-0000-000000000000'}
              className="text-brand-400 hover:underline"
            >
              Switch to {isCertLookup ? 'Record UUID verification' : 'Certificate UUID verification'} &rarr;
            </Link>
          </div>
        </div>

        {/* Verification Execution Status */}
        {verificationQuery.isLoading && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
            <div className="w-7 h-7 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-xs font-mono text-slate-400 uppercase tracking-wider">
              Evaluating Independent Four-Stage Cryptographic Proofs...
            </p>
          </div>
        )}

        {verificationQuery.isError && (
          <div className="bg-rose-950/80 border border-rose-800 rounded-xl p-6 text-rose-200">
            <div className="flex items-start gap-3">
              <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold">Verification Request Failed</h3>
                <p className="text-xs text-rose-300 mt-1">
                  The requested record or certificate was not found, or could not be cryptographically validated.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Public Simplified Trust Result Card */}
        {verification && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden divide-y divide-slate-800">
            {/* Verdict Header */}
            <div className="p-6">
              <div className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">
                Public Verification Result
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <VerificationVerdictBadge verdict={verification.overall_verdict} />
                  <span className="text-xs font-mono text-slate-400">
                    {new Date(verification.verification_timestamp).toLocaleString()}
                  </span>
                </div>
              </div>

              {verification.is_superseded && (
                <div className="mt-3 p-3 bg-amber-950/80 border border-amber-800 text-amber-200 rounded-lg text-xs font-mono">
                  Notice: This record was amended by authorized append-only correction and is SUPERSEDED by{' '}
                  <span className="select-all font-bold text-amber-300">
                    {verification.superseding_record_id}
                  </span>
                </div>
              )}
            </div>

            {/* Public 4 Stages Simplification */}
            <div className="p-6 space-y-4">
              <h2 className="text-xs font-mono uppercase tracking-wider text-slate-400">
                Independent Stage Evidence
              </h2>

              <div className="space-y-3 text-xs font-mono">
                {/* Stage 1 */}
                <div className="p-3 bg-slate-800/80 border border-slate-700/80 rounded-lg flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-200">1. Data Hash Integrity (atc-v1)</div>
                    <div className="text-[11px] text-slate-400">SHA-256 canonical digest matches telemetry exactly</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${verification.stages?.stage_1_hash_integrity?.status === 'passed' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'}`}>
                    {verification.stages?.stage_1_hash_integrity?.status?.toUpperCase() || 'UNKNOWN'}
                  </span>
                </div>

                {/* Stage 2 */}
                <div className="p-3 bg-slate-800/80 border border-slate-700/80 rounded-lg flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-200">2. Authority ECDSA Signature (ES256)</div>
                    <div className="text-[11px] text-slate-400">NIST P-256 public key cryptographic signature valid</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${verification.stages?.stage_2_signature_authenticity?.status === 'passed' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'}`}>
                    {verification.stages?.stage_2_signature_authenticity?.status?.toUpperCase() || 'UNKNOWN'}
                  </span>
                </div>

                {/* Stage 3 */}
                <div className="p-3 bg-slate-800/80 border border-slate-700/80 rounded-lg flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-200">3. Digital Certificate Cross-Consistency</div>
                    <div className="text-[11px] text-slate-400">Compliance certificate matches underlying record</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${verification.stages?.stage_3_certificate_consistency?.status === 'passed' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'}`}>
                    {verification.stages?.stage_3_certificate_consistency?.status?.toUpperCase() || 'UNKNOWN'}
                  </span>
                </div>

                {/* Stage 4 */}
                <div className="p-3 bg-slate-800/80 border border-slate-700/80 rounded-lg flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-200">4. Distributed Ledger (DLT) Anchor</div>
                    <div className="text-[11px] text-slate-400">
                      Ledger anchor state verification
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${verification.stages?.stage_4_dlt_ledger_anchor?.status === 'passed' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'}`}>
                    {verification.stages?.stage_4_dlt_ledger_anchor?.status?.toUpperCase() || 'UNKNOWN'}
                  </span>
                </div>
              </div>
            </div>

            {/* Cryptographic Hashes & DLT Reference */}
            <div className="p-6 space-y-3 text-xs font-mono">
              <div>
                <span className="text-slate-400 text-[11px] block">Verified SHA-256 Digest:</span>
                <div className="p-2 bg-slate-950 text-emerald-400 rounded select-all break-all mt-1">
                  {verification.canonical_hash}
                </div>
              </div>

              <div>
                <span className="text-slate-400 text-[11px] block">DLT Transaction Reference:</span>
                <div className="p-2 bg-slate-950 text-slate-300 rounded select-all break-all mt-1">
                  {verification.dlt_tx_id ? (
                    verification.dlt_tx_id
                  ) : (
                    <span className="text-amber-400">
                      Simulation mode — this record is not anchored to a live distributed ledger.
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-slate-500 font-mono">
          <p>AquaTrust AI Automated Regulatory Verification Pipeline</p>
          <div className="mt-2">
            <Link to="/login" className="text-brand-400 hover:text-brand-300">
              Operator / Auditor Secure Portal Login &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
