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
  GitCommit,
  Hash,
  Database,
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
      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono">
        <Link to="/treatment-records" className="hover:text-cyan-600 dark:hover:text-cyan-400 inline-flex items-center gap-1 font-medium transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Treatment Records
        </Link>
      </div>

      {/* Header Profile */}
      <div className="scada-card p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-[#1F293D]">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-cyan-50 dark:bg-cyan-950/70 border border-cyan-200 dark:border-cyan-800 text-cyan-600 dark:text-cyan-400 rounded-xl">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white font-mono">
                  Treatment Record (Version {rec.record_version})
                </h1>
                <StatusBadge status={rec.record_state} />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-1 select-all">
                Record ID: <span className="font-semibold text-cyan-700 dark:text-cyan-400">{rec.record_id}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Link
              to={`/verification?recordId=${rec.record_id}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors font-mono cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5" />
              Verify Authenticity
            </Link>

            <Link
              to={`/corrections/${rec.record_id}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-[#1E293B] dark:hover:bg-slate-700 border border-slate-300 dark:border-[#334155] text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition-colors font-mono cursor-pointer"
            >
              <GitCommit className="w-3.5 h-3.5" />
              Lineage &amp; Corrections
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 text-xs font-mono">
          <div className="p-3 bg-slate-50 dark:bg-[#0B0F17]/60 border border-slate-200 dark:border-[#1F293D] rounded-lg">
            <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-semibold">Facility ID</span>
            <Link to={`/facilities/${rec.facility_id}`} className="text-cyan-700 dark:text-cyan-400 hover:underline select-all mt-0.5 block truncate">
              {rec.facility_id}
            </Link>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-[#0B0F17]/60 border border-slate-200 dark:border-[#1F293D] rounded-lg">
            <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-semibold">Aggregation Window</span>
            <span className="text-slate-800 dark:text-slate-200 mt-0.5 block truncate">
              {new Date(rec.period_start).toLocaleDateString()} &rarr; {new Date(rec.period_end).toLocaleDateString()}
            </span>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-[#0B0F17]/60 border border-slate-200 dark:border-[#1F293D] rounded-lg">
            <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-semibold">Finalized Timestamp</span>
            <span className="text-slate-700 dark:text-slate-300 mt-0.5 block truncate">
              {rec.finalized_at ? new Date(rec.finalized_at).toLocaleString() : 'Not Finalized'}
            </span>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-[#0B0F17]/60 border border-slate-200 dark:border-[#1F293D] rounded-lg">
            <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-semibold">Superseded By / Supersedes</span>
            <span className="text-slate-700 dark:text-slate-300 mt-0.5 block truncate">
              {rec.supersedes_record_id ? (
                <Link to={`/treatment-records/${rec.supersedes_record_id}`} className="text-cyan-700 dark:text-cyan-400 hover:underline">
                  Supersedes {rec.supersedes_record_id.slice(0, 8)}...
                </Link>
              ) : (
                'Original Root (v1)'
              )}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-slate-200 dark:border-[#1F293D]">
          <div className="flex items-center gap-1.5 font-mono text-xs">
            <span className="text-slate-500 dark:text-slate-400">Quality:</span>
            <QualityBadge status={rec.quality_status} />
          </div>
          <div className="flex items-center gap-1.5 font-mono text-xs">
            <span className="text-slate-500 dark:text-slate-400">Anomaly:</span>
            <AnomalyStatusBadge status={rec.anomaly_status} />
          </div>
          <div className="flex items-center gap-1.5 font-mono text-xs">
            <span className="text-slate-500 dark:text-slate-400">Compliance:</span>
            <ComplianceStatusBadge status={rec.compliance_status} />
          </div>
          <div className="flex items-center gap-1.5 font-mono text-xs">
            <span className="text-slate-500 dark:text-slate-400">DLT Anchor:</span>
            <StatusBadge status={rec.anchor_status} />
          </div>
        </div>
      </div>

      {/* Cryptographic Artifacts & Canonical Digest */}
      <div className="scada-card p-6">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wide pb-3.5 border-b border-slate-200 dark:border-[#1F293D] flex items-center gap-2 font-mono">
          <Hash className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          Cryptographic Artifacts &amp; Anchoring Digest
        </h2>

        <div className="space-y-4 pt-4 text-xs font-mono">
          <div>
            <span className="text-slate-500 dark:text-slate-400 text-[11px] block uppercase font-semibold">
              Canonical SHA-256 Hash (atc-v1 Deterministic Serialization):
            </span>
            <div className="p-3 bg-slate-50 dark:bg-[#070B12] border border-slate-200 dark:border-[#1F293D] text-emerald-700 dark:text-emerald-400 rounded-lg select-all text-xs break-all mt-1.5 font-bold shadow-inner">
              {rec.canonical_hash || 'Record has not been hashed or finalized yet.'}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3.5 bg-slate-50 dark:bg-[#0B0F17]/60 border border-slate-200 dark:border-[#1F293D] rounded-lg">
              <span className="text-slate-500 dark:text-slate-400 text-[10px] block uppercase font-semibold">Digital Certificate Reference:</span>
              {rec.certificate_id ? (
                <Link
                  to={`/certificates/${rec.certificate_id}`}
                  className="text-cyan-700 dark:text-cyan-400 hover:underline font-semibold block mt-1 truncate"
                >
                  {rec.certificate_id} &rarr; View Certificate
                </Link>
              ) : (
                <span className="text-slate-400 dark:text-slate-500 mt-1 block">No Certificate Attached</span>
              )}
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-[#0B0F17]/60 border border-slate-200 dark:border-[#1F293D] rounded-lg">
              <span className="text-slate-500 dark:text-slate-400 text-[10px] block uppercase font-semibold">ECDSA ES256 Signature ID:</span>
              <span className="text-slate-800 dark:text-slate-200 block mt-1 select-all font-semibold">
                {rec.signature_id || 'Unsigned'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Evidence Snapshot */}
      {rec.evidence_snapshot && (
        <div className="scada-card p-6">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wide pb-3.5 border-b border-slate-200 dark:border-[#1F293D] flex items-center gap-2 font-mono">
            <Layers className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            Immutable Evidence Snapshot
          </h2>
          <div className="mt-4 p-4 bg-slate-50 dark:bg-[#070B12] border border-slate-200 dark:border-[#1F293D] text-cyan-800 dark:text-cyan-300 rounded-lg text-xs font-mono overflow-auto max-h-96 shadow-inner">
            <pre>{JSON.stringify(rec.evidence_snapshot, null, 2)}</pre>
          </div>
        </div>
      )}

      {/* Provenance Metadata */}
      {rec.provenance && (
        <div className="scada-card p-6">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wide pb-3.5 border-b border-slate-200 dark:border-[#1F293D] flex items-center gap-2 font-mono">
            <Database className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            Lineage &amp; Ingestion Provenance
          </h2>
          <div className="mt-4 p-4 bg-slate-50 dark:bg-[#070B12] border border-slate-200 dark:border-[#1F293D] text-slate-700 dark:text-slate-300 rounded-lg text-xs font-mono overflow-auto max-h-60 shadow-inner">
            <pre>{JSON.stringify(rec.provenance, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );
};
export default TreatmentRecordDetailPage;
