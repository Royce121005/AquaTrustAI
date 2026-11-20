import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getCertificateApi } from '../api/certificates';
import { LoadingState, ErrorState } from '../components/common/States';
import {
  StatusBadge,
  ComplianceStatusBadge,
  QualityBadge,
  AnomalyStatusBadge,
} from '../components/common/Badges';
import {
  Award,
  ArrowLeft,
  Shield,
  Hash,
  Layers,
} from 'lucide-react';

export const CertificateDetailPage: React.FC = () => {
  const { certificateId } = useParams<{ certificateId: string }>();

  const certQuery = useQuery({
    queryKey: ['certificate', certificateId],
    queryFn: () => getCertificateApi(certificateId!),
    enabled: !!certificateId,
  });

  if (!certificateId) {
    return <ErrorState error={new Error('No certificate ID supplied')} />;
  }

  if (certQuery.isLoading) {
    return <LoadingState message="Fetching digital certificate record..." />;
  }

  if (certQuery.isError) {
    return <ErrorState error={certQuery.error} onRetry={() => certQuery.refetch()} />;
  }

  const cert = certQuery.data!;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono">
        <Link to="/certificates" className="hover:text-cyan-600 dark:hover:text-cyan-400 inline-flex items-center gap-1 font-medium transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Certificates
        </Link>
      </div>

      {/* Certificate Authenticity Card */}
      <div className="scada-card p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-[#1F293D]">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-cyan-50 dark:bg-cyan-950/70 border border-cyan-200 dark:border-cyan-800 text-cyan-600 dark:text-cyan-400 rounded-xl">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white font-mono">
                  Digital Compliance Certificate (v{cert.certificate_version})
                </h1>
                <StatusBadge status={cert.status} />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-1 select-all">
                Certificate ID: <span className="font-semibold text-cyan-700 dark:text-cyan-400">{cert.certificate_id}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Link
              to={`/verification?recordId=${cert.record_id}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors font-mono cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5" />
              Verify Underlying Record
            </Link>
            <Link
              to={`/public/verify/certificate/${cert.certificate_id}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-[#1E293B] dark:hover:bg-slate-700 border border-slate-300 dark:border-[#334155] text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition-colors font-mono cursor-pointer"
            >
              Public Certificate Verifier
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 text-xs font-mono">
          <div className="p-3 bg-slate-50 dark:bg-[#0B0F17]/60 border border-slate-200 dark:border-[#1F293D] rounded-lg">
            <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-semibold">Underlying Treatment Record</span>
            <Link to={`/treatment-records/${cert.record_id}`} className="text-cyan-700 dark:text-cyan-400 hover:underline select-all mt-0.5 block truncate">
              {cert.record_id.slice(0, 16)}...
            </Link>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-[#0B0F17]/60 border border-slate-200 dark:border-[#1F293D] rounded-lg">
            <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-semibold">Authority Issuer Identity</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 block truncate">{cert.issuer_identity}</span>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-[#0B0F17]/60 border border-slate-200 dark:border-[#1F293D] rounded-lg">
            <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-semibold">Issuance Timestamp</span>
            <span className="text-slate-700 dark:text-slate-300 mt-0.5 block truncate">
              {new Date(cert.issued_at).toLocaleString()}
            </span>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-[#0B0F17]/60 border border-slate-200 dark:border-[#1F293D] rounded-lg">
            <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-semibold">DLT Ledger Anchor ID</span>
            <span className="text-slate-700 dark:text-slate-300 select-all mt-0.5 block truncate">
              {cert.dlt_anchor_id || 'Pending Anchor Submission'}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-slate-200 dark:border-[#1F293D]">
          <div className="flex items-center gap-1.5 font-mono text-xs">
            <span className="text-slate-500 dark:text-slate-400">Compliance:</span>
            <ComplianceStatusBadge status={cert.compliance_status} />
          </div>
          <div className="flex items-center gap-1.5 font-mono text-xs">
            <span className="text-slate-500 dark:text-slate-400">Quality:</span>
            <QualityBadge status={cert.quality_status} />
          </div>
          <div className="flex items-center gap-1.5 font-mono text-xs">
            <span className="text-slate-500 dark:text-slate-400">Anomaly:</span>
            <AnomalyStatusBadge status={cert.anomaly_status} />
          </div>
        </div>
      </div>

      {/* Cryptographic Digests */}
      <div className="scada-card p-6">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wide pb-3.5 border-b border-slate-200 dark:border-[#1F293D] flex items-center gap-2 font-mono">
          <Hash className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          Cryptographic Integrity Anchors
        </h2>

        <div className="space-y-4 pt-4 text-xs font-mono">
          <div>
            <span className="text-slate-500 dark:text-slate-400 text-[11px] block uppercase font-semibold">
              Canonical SHA-256 Digest (atc-v1 Deterministic Encoding):
            </span>
            <div className="p-3 bg-slate-50 dark:bg-[#070B12] border border-slate-200 dark:border-[#1F293D] text-emerald-700 dark:text-emerald-400 rounded-lg select-all text-xs break-all mt-1.5 font-bold shadow-inner">
              {cert.canonical_hash}
            </div>
          </div>

          <div>
            <span className="text-slate-500 dark:text-slate-400 text-[11px] block uppercase font-semibold">ECDSA ES256 Digital Signature Reference:</span>
            <div className="p-3 bg-slate-50 dark:bg-[#070B12] border border-slate-200 dark:border-[#1F293D] rounded-lg text-cyan-800 dark:text-cyan-300 mt-1.5 select-all break-all">
              {cert.signature_id}
            </div>
          </div>
        </div>
      </div>

      {/* Compliance Summary Payload */}
      {cert.compliance_summary && (
        <div className="scada-card p-6">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wide pb-3.5 border-b border-slate-200 dark:border-[#1F293D] flex items-center gap-2 font-mono">
            <Layers className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            CPCB Compliance Summary Evidence
          </h2>
          <div className="mt-4 p-4 bg-slate-50 dark:bg-[#070B12] border border-slate-200 dark:border-[#1F293D] text-cyan-800 dark:text-cyan-300 rounded-lg text-xs font-mono overflow-auto max-h-96 shadow-inner">
            <pre>{JSON.stringify(cert.compliance_summary, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );
};
export default CertificateDetailPage;
