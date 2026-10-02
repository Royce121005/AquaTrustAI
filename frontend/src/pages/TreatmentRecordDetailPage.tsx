import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getTreatmentRecordApi } from '../api/treatmentRecords';
import { getCertificateByRecordApi } from '../api/certificates';
import { LoadingState, ErrorState } from '../components/common/States';
import {
  StatusBadge,
  QualityBadge,
  AnomalyStatusBadge,
  ComplianceStatusBadge,
} from '../components/common/Badges';
import {
  FileText,
  ArrowLeft,
  Shield,
  Award,
  GitCommit,
  Hash,
  Key,
  Database,
  Calendar,
  Layers,
} from 'lucide-react';

export const TreatmentRecordDetailPage: React.FC = () => {
  const { recordId } = useParams<{ recordId: string }>();

  const recordQuery = useQuery({
    queryKey: ['treatment-record', recordId],
    queryFn: () => getTreatmentRecordApi(recordId!),
    enabled: !!recordId,
  });

  const certQuery = useQuery({
    queryKey: ['certificate-by-record', recordId],
    queryFn: () => getCertificateByRecordApi(recordId!).catch(() => null),
    enabled: !!recordId,
  });

  if (!recordId) {
    return <ErrorState error={new Error('No record ID supplied')} />;
  }

  if (recordQuery.isLoading) {
    return <LoadingState message="Fetching immutable treatment record..." />;
  }

  if (recordQuery.isError) {
    return <ErrorState error={recordQuery.error} onRetry={() => recordQuery.refetch()} />;
  }

  const rec = recordQuery.data!;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link to="/treatment-records" className="hover:text-brand-600 inline-flex items-center gap-1 font-medium">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Treatment Records
        </Link>
      </div>

      {/* Header Profile */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-brand-50 text-brand-700 rounded-lg">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">
                  Treatment Record (Version {rec.record_version})
                </h1>
                <StatusBadge status={rec.record_state} />
              </div>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Record ID: <span className="select-all font-semibold text-slate-800">{rec.record_id}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to={`/verification?recordId=${rec.record_id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-md text-xs font-semibold shadow-sm transition-colors"
            >
              <Shield className="w-4 h-4" />
              Verify Authenticity
            </Link>

            <Link
              to={`/corrections/${rec.record_id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-semibold transition-colors"
            >
              <GitCommit className="w-4 h-4" />
              Lineage & Corrections
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px]">Facility ID</span>
            <Link to={`/facilities/${rec.facility_id}`} className="font-mono text-brand-600 hover:underline select-all">
              {rec.facility_id}
            </Link>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px]">Aggregation Window</span>
            <span className="font-mono text-slate-800">
              {new Date(rec.period_start).toLocaleString()} &rarr; {new Date(rec.period_end).toLocaleString()}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px]">Finalized Timestamp</span>
            <span className="font-mono text-slate-800">
              {rec.finalized_at ? new Date(rec.finalized_at).toLocaleString() : 'Not Finalized'}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px]">Superseded By / Supersedes</span>
            <span className="font-mono text-slate-700">
              {rec.supersedes_record_id ? (
                <Link to={`/treatment-records/${rec.supersedes_record_id}`} className="text-brand-600 hover:underline">
                  Supersedes {rec.supersedes_record_id.slice(0, 8)}...
                </Link>
              ) : (
                'Original Root (v1)'
              )}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500">Quality:</span>
            <QualityBadge status={rec.quality_status} />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500">Anomaly:</span>
            <AnomalyStatusBadge status={rec.anomaly_status} />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500">Compliance:</span>
            <ComplianceStatusBadge status={rec.compliance_status} />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500">DLT Anchor:</span>
            <StatusBadge status={rec.anchor_status} />
          </div>
        </div>
      </div>

      {/* Cryptographic Artifacts & Canonical Digest */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide pb-3 border-b border-slate-100 flex items-center gap-2">
          <Hash className="w-4 h-4 text-brand-600" />
          Cryptographic Artifacts & Anchoring Digest
        </h2>

        <div className="space-y-4 pt-4 text-xs font-mono">
          <div>
            <span className="text-slate-500 text-[11px] block">
              Canonical SHA-256 Hash (atc-v1 Deterministic Serialization):
            </span>
            <div className="p-2.5 bg-slate-900 text-emerald-400 rounded-md select-all text-xs break-all mt-1">
              {rec.canonical_hash || 'Record has not been hashed or finalized yet.'}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="text-slate-500 text-[11px] block">Digital Certificate Reference:</span>
              {rec.certificate_id ? (
                <Link
                  to={`/certificates/${rec.certificate_id}`}
                  className="text-brand-600 hover:underline font-semibold block mt-1"
                >
                  {rec.certificate_id} &rarr; View Certificate
                </Link>
              ) : (
                <span className="text-slate-400 mt-1 block">No Certificate Attached</span>
              )}
            </div>

            <div>
              <span className="text-slate-500 text-[11px] block">ECDSA ES256 Signature ID:</span>
              <span className="text-slate-800 block mt-1 select-all">
                {rec.signature_id || 'Unsigned'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Evidence Snapshot (when present in backend response) */}
      {rec.evidence_snapshot && (
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide pb-3 border-b border-slate-100 flex items-center gap-2">
            <Layers className="w-4 h-4 text-brand-600" />
            Immutable Evidence Snapshot
          </h2>
          <div className="mt-4 p-4 bg-slate-900 text-slate-200 rounded-lg text-xs font-mono overflow-auto max-h-96">
            <pre>{JSON.stringify(rec.evidence_snapshot, null, 2)}</pre>
          </div>
        </div>
      )}

      {/* Provenance Metadata */}
      {rec.provenance && (
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide pb-3 border-b border-slate-100 flex items-center gap-2">
            <Database className="w-4 h-4 text-brand-600" />
            Lineage & Ingestion Provenance
          </h2>
          <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono overflow-auto max-h-60 text-slate-700">
            <pre>{JSON.stringify(rec.provenance, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );
};
