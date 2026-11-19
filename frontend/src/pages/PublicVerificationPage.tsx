import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { verifyRecordPublicApi, verifyCertificatePublicApi } from '../api/verification';
import { VerificationVerdictBadge } from '../components/common/Badges';
import {
  XCircle,
  Droplets,
  Search,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';

export const PublicVerificationPage: React.FC<{ mode?: 'record' | 'certificate' }> = ({
  mode = 'record',
}) => {
  const params = useParams<{ recordId?: string; certificateId?: string }>();
  const navigate = useNavigate();
  const rawTargetId = mode === 'certificate' ? params.certificateId : params.recordId;

  // Filter out route placeholders like 'public' or null UUIDs
  const isPlaceholder = !rawTargetId || rawTargetId === 'public' || rawTargetId === '00000000-0000-0000-0000-000000000000';
  const targetId = isPlaceholder ? '' : rawTargetId;

  const [searchId, setSearchId] = useState(targetId);

  const isCertLookup = mode === 'certificate';

  const verificationQuery = useQuery({
    queryKey: ['public-verification', mode, targetId],
    queryFn: () => {
      if (!targetId) return null;
      return isCertLookup
        ? verifyCertificatePublicApi(targetId)
        : verifyRecordPublicApi(targetId);
    },
    enabled: !!targetId,
    retry: false,
  });

  const verification = verificationQuery.data;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchId.trim();
    if (trimmed) {
      if (isCertLookup) {
        navigate(`/public/verify/certificate/${trimmed}`);
      } else {
        navigate(`/verify/${trimmed}`);
      }
    }
  };

  const loadSampleRecord = () => {
    const sampleUuid = 'b010d754-7355-4b1a-a6ef-99604bf4aab7';
    setSearchId(sampleUuid);
    navigate(`/verify/${sampleUuid}`);
  };

  return (
    <div className="min-h-screen bg-[#070B12] text-slate-100 flex flex-col justify-between selection:bg-[#0EA5E9] selection:text-white relative overflow-hidden bg-[url('/assets/facility_backdrop.jpg')] bg-cover bg-center bg-no-repeat">
      {/* Background Dark Scrim */}
      <div className="absolute inset-0 bg-[#070B12]/85 backdrop-blur-[2px] pointer-events-none -z-10" />

      <main className="flex-1 max-w-3xl mx-auto w-full space-y-6 py-10 px-4 sm:px-6 relative z-10">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white transition-colors bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800"
          >
            <ArrowLeft className="w-4 h-4 text-slate-400" />
            <span>Back to Sign In</span>
          </Link>
          <div className="text-xs text-slate-400 font-mono">
            Public Cryptographic Verification
          </div>
        </div>

        {/* Portal Branding Card */}
        <div className="bg-[#0B0F17]/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl text-center">
          <div className="w-12 h-12 rounded-xl bg-[#0EA5E9]/15 border border-[#0EA5E9]/30 flex items-center justify-center text-[#0EA5E9] mx-auto mb-4 shadow-sm">
            <Droplets className="w-6 h-6 text-[#0EA5E9]" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Trust &amp; Provenance Verification
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-lg mx-auto">
            Independently verify wastewater treatment records, CPCB compliance, and cryptographic blockchain proofs without logging in.
          </p>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="mt-6 flex flex-col sm:flex-row gap-2.5 max-w-2xl mx-auto">
            <input
              type="text"
              required
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              placeholder={isCertLookup ? 'Enter Certificate UUID...' : 'Enter Treatment Record UUID...'}
              className="flex-1 bg-[#111827] border border-slate-800 rounded-lg px-4 py-2.5 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-[#0EA5E9] focus:ring-1 focus:ring-[#0EA5E9]/50 transition-colors"
            />
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#0EA5E9] hover:bg-[#0284C7] text-white rounded-lg text-xs font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer shrink-0"
            >
              <Search className="w-4 h-4" />
              <span>Verify</span>
            </button>
          </form>

          {/* Mode Switch & Sample Record Helper */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-4 border-t border-slate-800/80 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span>Mode:</span>
              <span className="font-semibold text-slate-200">
                {isCertLookup ? 'Digital Certificate' : 'Treatment Record'}
              </span>
              <span className="text-slate-600">&bull;</span>
              <Link
                to={isCertLookup ? '/verify' : '/public/verify/certificate'}
                className="text-[#0EA5E9] hover:underline"
              >
                Switch to {isCertLookup ? 'Record UUID' : 'Certificate UUID'} &rarr;
              </Link>
            </div>

            {!targetId && (
              <button
                type="button"
                onClick={loadSampleRecord}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-mono cursor-pointer flex items-center gap-1"
              >
                <span>Try Sample Record</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Empty State / Initial Instructions (When no ID is queried yet) */}
        {!targetId && !verificationQuery.isLoading && (
          <div className="bg-[#0B0F17]/85 border border-slate-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-md">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center text-cyan-400 shrink-0">
                <ShieldCheck className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">How Verification Works</h2>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Every treatment record Finalized on AquaTrust AI is hashed with SHA-256, cryptographically signed by authority keys, and anchored to an immutable distributed ledger. Enter any record UUID from a water quality certificate or compliance report to verify its authenticity.
                </p>
                <div className="mt-3 flex items-center gap-4 text-xs font-mono text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Hash Integrity</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>ECDSA Signature</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Ledger Anchor</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {verificationQuery.isLoading && (
          <div className="bg-[#0B0F17]/90 border border-slate-800 rounded-2xl p-10 text-center shadow-xl backdrop-blur-md">
            <div className="w-8 h-8 border-2 border-[#0EA5E9] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-xs font-mono text-slate-400 uppercase tracking-wider">
              Evaluating Independent Four-Stage Cryptographic Proofs...
            </p>
          </div>
        )}

        {/* Error State (Only when an actual targetId was searched and not found) */}
        {verificationQuery.isError && (
          <div className="bg-red-950/40 border border-red-800/50 rounded-2xl p-6 text-red-200 shadow-xl backdrop-blur-md">
            <div className="flex items-start gap-3">
              <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold">Verification Request Failed</h3>
                <p className="text-xs text-red-300/80 mt-1">
                  The requested record or certificate UUID was not found, or could not be cryptographically validated.
                </p>
                <p className="text-[11px] font-mono text-red-400/60 mt-2 select-all">
                  Queried ID: {targetId}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Verification Result Card */}
        {verification && (
          <div className="bg-[#0B0F17]/95 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden divide-y divide-slate-800 backdrop-blur-xl">
            {/* Verdict Header */}
            <div className="p-6">
              <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-2">
                Verification Verdict
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
                <div className="mt-3 p-3 bg-amber-950/30 border border-amber-800/50 text-amber-200 rounded-lg text-xs font-mono">
                  Notice: This record was amended by an authorized append-only correction and is superseded by{' '}
                  <span className="select-all font-bold text-amber-300">
                    {verification.superseding_record_id}
                  </span>
                </div>
              )}
            </div>

            {/* 4 Stages Evidence */}
            <div className="p-6 space-y-3">
              <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Cryptographic Stage Checks
              </h2>

              <div className="space-y-2 text-xs font-mono">
                {/* Stage 1 */}
                <div className="p-3 bg-[#111827] border border-slate-800 rounded-lg flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-200">1. Data Hash Integrity</div>
                    <div className="text-[11px] text-slate-400">SHA-256 canonical digest matches telemetry exactly</div>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold ${verification.stages?.stage_1_hash_integrity?.status === 'passed' ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-800/50' : 'bg-red-950/50 text-red-400 border border-red-800/50'}`}>
                    {verification.stages?.stage_1_hash_integrity?.status?.toUpperCase() || 'UNKNOWN'}
                  </span>
                </div>

                {/* Stage 2 */}
                <div className="p-3 bg-[#111827] border border-slate-800 rounded-lg flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-200">2. Authority Signature (ECDSA)</div>
                    <div className="text-[11px] text-slate-400">NIST P-256 public key cryptographic signature valid</div>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold ${verification.stages?.stage_2_signature_authenticity?.status === 'passed' ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-800/50' : 'bg-red-950/50 text-red-400 border border-red-800/50'}`}>
                    {verification.stages?.stage_2_signature_authenticity?.status?.toUpperCase() || 'UNKNOWN'}
                  </span>
                </div>

                {/* Stage 3 */}
                <div className="p-3 bg-[#111827] border border-slate-800 rounded-lg flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-200">3. Certificate Consistency</div>
                    <div className="text-[11px] text-slate-400">Compliance certificate matches underlying record</div>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold ${verification.stages?.stage_3_certificate_consistency?.status === 'passed' ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-800/50' : 'bg-red-950/50 text-red-400 border border-red-800/50'}`}>
                    {verification.stages?.stage_3_certificate_consistency?.status?.toUpperCase() || 'UNKNOWN'}
                  </span>
                </div>

                {/* Stage 4 */}
                <div className="p-3 bg-[#111827] border border-slate-800 rounded-lg flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-200">4. Distributed Ledger (DLT) Anchor</div>
                    <div className="text-[11px] text-slate-400">Immutable blockchain anchor verification</div>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold ${verification.stages?.stage_4_dlt_ledger_anchor?.status === 'passed' ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-800/50' : 'bg-red-950/50 text-red-400 border border-red-800/50'}`}>
                    {verification.stages?.stage_4_dlt_ledger_anchor?.status?.toUpperCase() || 'UNKNOWN'}
                  </span>
                </div>
              </div>
            </div>

            {/* Cryptographic Hashes & DLT Reference */}
            <div className="p-6 space-y-3 text-xs font-mono">
              <div>
                <span className="text-slate-400 text-[11px] block">Verified SHA-256 Digest:</span>
                <div className="p-2.5 bg-[#111827] text-emerald-400 border border-slate-800 rounded select-all break-all mt-1">
                  {verification.canonical_hash}
                </div>
              </div>

              <div>
                <span className="text-slate-400 text-[11px] block">DLT Transaction Reference:</span>
                <div className="p-2.5 bg-[#111827] text-slate-300 border border-slate-800 rounded select-all break-all mt-1">
                  {verification.dlt_tx_id || 'Anchored (Local DLT Simulation)'}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Clean Footer Bar */}
      <footer className="w-full border-t border-slate-800/80 bg-[#070B12]/90 backdrop-blur-md px-6 lg:px-12 py-3.5 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2 z-20">
        <div>AquaTrust AI &bull; Public Regulatory Verification Portal</div>
        <div>&copy; 2026 AquaTrust AI. All rights reserved.</div>
      </footer>
    </div>
  );
};
