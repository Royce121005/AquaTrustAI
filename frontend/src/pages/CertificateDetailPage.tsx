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
  Key,
  Layers,
  CheckCircle2,
  Cpu,
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
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link to="/certificates" className="hover:text-brand-600 inline-flex items-center gap-1 font-medium">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Certificates
        </Link>
      </div>

      {/* Certificate Authenticity Card */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-brand-50 text-brand-700 rounded-lg">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">
                  Digital Compliance Certificate (v{cert.certificate_version})
                </h1>
                <StatusBadge status={cert.status} />
              </div>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Certificate ID: <span className="select-all font-semibold text-slate-800">{cert.certificate_id}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to={`/verification?recordId=${cert.record_id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-md text-xs font-semibold shadow-sm transition-colors"
            >
              <Shield className="w-4 h-4" />
              Verify Underlying Record
            </Link>
            <Link
              to={`/public/verify/certificate/${cert.certificate_id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-semibold transition-colors"
            >
              Public Certificate Verifier
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px]">Underlying Treatment Record</span>
            <Link to={`/treatment-records/${cert.record_id}`} className="font-mono text-brand-600 hover:underline select-all">
              {cert.record_id.slice(0, 16)}...
            </Link>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px]">Authority Issuer Identity</span>
            <span className="font-mono font-medium text-slate-800">{cert.issuer_identity}</span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px]">Issuance Timestamp</span>
            <span className="font-mono text-slate-800">
              {new Date(cert.issued_at).toLocaleString()}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px]">DLT Ledger Anchor ID</span>
            <span className="font-mono text-slate-700 select-all">
              {cert.dlt_anchor_id || 'Pending Anchor Submission'}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500">Compliance:</span>
            <ComplianceStatusBadge status={cert.compliance_status} />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500">Quality:</span>
            <QualityBadge status={cert.quality_status} />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500">Anomaly:</span>
            <AnomalyStatusBadge status={cert.anomaly_status} />
          </div>
        </div>
      </div>

      {/* Cryptographic Digests */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide pb-3 border-b border-slate-100 flex items-center gap-2">
          <Hash className="w-4 h-4 text-brand-600" />
          Cryptographic Integrity Anchors
        </h2>

        <div className="space-y-4 pt-4 text-xs font-mono">
          <div>
            <span className="text-slate-500 text-[11px] block">
              Canonical SHA-256 Digest (atc-v1 Deterministic Encoding):
            </span>
            <div className="p-2.5 bg-slate-900 text-emerald-400 rounded-md select-all text-xs break-all mt-1">
              {cert.canonical_hash}
            </div>
          </div>

          <div>
            <span className="text-slate-500 text-[11px] block">ECDSA ES256 Digital Signature Reference:</span>
            <div className="p-2 bg-slate-50 border border-slate-200 rounded text-slate-700 mt-1 select-all">
              {cert.signature_id}
            </div>
          </div>
        </div>
      </div>

      {/* Compliance Summary Payload */}
      {cert.compliance_summary && (
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide pb-3 border-b border-slate-100 flex items-center gap-2">
            <Layers className="w-4 h-4 text-brand-600" />
            CPCB Compliance Summary Evidence
          </h2>
          <div className="mt-4 p-4 bg-slate-900 text-slate-200 rounded-lg text-xs font-mono overflow-auto max-h-96">
            <pre>{JSON.stringify(cert.compliance_summary, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );
};
