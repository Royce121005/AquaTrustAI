import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { finalizeTreatmentRecordApi } from '../api/treatmentRecords';
import { listFacilitiesApi } from '../api/facilities';
import { useAuth } from '../context/AuthContext';
import { ApiClientError } from '../api/client';
import { ErrorState } from '../components/common/States';
import { Stamp, Shield, AlertTriangle, ArrowRight, CheckCircle2, Clock, Calendar } from 'lucide-react';

export const FinalizationPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const defaultFacility = searchParams.get('facility_id') || user?.facility_id || 'FAC-CPCB-001';

  // State inputs for finalization payload
  const [facilityId, setFacilityId] = useState<string>(defaultFacility);
  const [periodStart, setPeriodStart] = useState<string>('2026-10-01T00:00:00Z');
  const [periodEnd, setPeriodEnd] = useState<string>('2026-10-01T23:59:59Z');
  const [keyId, setKeyId] = useState<string>('key-ecdsa-p256-01');

  const [finalizedRecord, setFinalizedRecord] = useState<any>(null);

  const { data: facilities } = useQuery({
    queryKey: ['facilities'],
    queryFn: listFacilitiesApi,
    staleTime: 60000,
  });

  const finalizeMutation = useMutation({
    mutationFn: () =>
      finalizeTreatmentRecordApi({
        facility_id: facilityId,
        period_start: periodStart,
        period_end: periodEnd,
        key_id: keyId,
      }),
    onSuccess: (data) => {
      setFinalizedRecord(data);
      queryClient.invalidateQueries({ queryKey: ['treatment-records'] });
      queryClient.invalidateQueries({ queryKey: ['dlt-status'] });
      queryClient.invalidateQueries({ queryKey: ['compliance-summary'] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFinalizedRecord(null);
    finalizeMutation.mutate();
  };

  const isOperatorOrAdmin = user?.role === 'operator' || user?.role === 'admin';

  if (!isOperatorOrAdmin) {
    return (
      <div className="p-8 bg-amber-50 border border-amber-200 rounded-lg text-amber-900">
        <h2 className="text-sm font-semibold uppercase tracking-wide">Unauthorized Role</h2>
        <p className="text-xs mt-1">
          Only operators and administrators hold backend authority to aggregate and finalize treatment records.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <Stamp className="w-5 h-5 text-brand-600" />
          Aggregate & Finalize Treatment Window
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Backend authority boundary: aggregates telemetry window, computes atc-v1 canonical SHA-256 hash, issues ES256 digital signature, and triggers DLT anchor.
        </p>
      </div>

      {/* Backend Policy Requirements Notice */}
      <div className="bg-slate-900 text-slate-200 border border-slate-800 rounded-lg p-5 text-xs space-y-2">
        <div className="flex items-center gap-2 text-brand-400 font-semibold uppercase tracking-wide">
          <Shield className="w-4 h-4" />
          Backend Deterministic Finalization Invariants
        </div>
        <p className="text-slate-400">
          The backend enforces strict state transitions. Finalization is processed exclusively on the server and will be rejected with HTTP 422 if:
        </p>
        <ul className="list-disc pl-5 space-y-1 text-slate-300 font-mono text-[11px]">
          <li>Quality status != valid (telemetry must pass deterministic validation)</li>
          <li>Anomaly status == insufficient_data (AI inference engine must have sufficient window steps)</li>
          <li>Compliance status not evaluable</li>
          <li>Time window contains zero ingested observations</li>
        </ul>
      </div>

      {/* Finalization Request Form */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Facility Identifier (UUID or code)
            </label>
            {facilities && facilities.length > 0 ? (
              <select
                value={facilityId}
                onChange={(e) => setFacilityId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-800 focus:ring-1 focus:ring-brand-500"
              >
                {facilities.map((f) => (
                  <option key={f.facility_id} value={f.facility_id}>
                    {f.facility_name} ({f.facility_id})
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                required
                value={facilityId}
                onChange={(e) => setFacilityId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-800 focus:ring-1 focus:ring-brand-500"
              />
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Period Start (RFC 3339 UTC)
              </label>
              <input
                type="text"
                required
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                placeholder="2026-10-01T00:00:00Z"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-800 focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Period End (RFC 3339 UTC)
              </label>
              <input
                type="text"
                required
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                placeholder="2026-10-01T23:59:59Z"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-800 focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Signing Key Identifier (ECDSA P-256)
            </label>
            <input
              type="text"
              required
              value={keyId}
              onChange={(e) => setKeyId(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-800 focus:ring-1 focus:ring-brand-500"
            />
            <span className="text-[11px] text-slate-400 font-mono mt-0.5 block">
              Default authority key: key-ecdsa-p256-01 (NIST P-256 / SHA-256)
            </span>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={finalizeMutation.isPending}
              className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {finalizeMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Submitting to Finalization Service...
                </>
              ) : (
                <>
                  <Stamp className="w-4 h-4" />
                  Request Treatment Window Finalization
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Finalization Error Display */}
      {finalizeMutation.isError && (
        <div className="space-y-2">
          <ErrorState
            title="Finalization Rejected by Backend Engine"
            error={finalizeMutation.error}
          />
          <div className="p-3 bg-slate-100 border border-slate-300 rounded text-xs text-slate-600 font-mono">
            Finalization state preserved. The frontend does not locally alter record state when rejected.
          </div>
        </div>
      )}

      {/* Finalization Success Result */}
      {finalizedRecord && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            Finalization Successfully Executed by Backend
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono pt-2">
            <div>
              <span className="text-emerald-800 text-[11px] block">Record ID</span>
              <span className="font-semibold text-slate-900 select-all">
                {finalizedRecord.record_id}
              </span>
            </div>
            <div>
              <span className="text-emerald-800 text-[11px] block">Version</span>
              <span className="font-semibold text-slate-900">
                v{finalizedRecord.record_version}
              </span>
            </div>
            <div>
              <span className="text-emerald-800 text-[11px] block">Compliance Verdict</span>
              <span className="font-semibold text-slate-900">
                {finalizedRecord.compliance_status}
              </span>
            </div>
            <div>
              <span className="text-emerald-800 text-[11px] block">DLT Anchor Status</span>
              <span className="font-semibold text-slate-900">
                {finalizedRecord.anchor_status}
              </span>
            </div>
          </div>

          <div className="text-xs font-mono">
            <span className="text-emerald-800 text-[11px] block">Canonical Hash (SHA-256):</span>
            <div className="p-2 bg-slate-900 text-emerald-300 rounded mt-1 break-all select-all">
              {finalizedRecord.canonical_hash}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Link
              to={`/treatment-records/${finalizedRecord.record_id}`}
              className="px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded text-xs font-semibold shadow-sm transition-colors"
            >
              Inspect Record Detail &rarr;
            </Link>
            <Link
              to={`/verification?recordId=${finalizedRecord.record_id}`}
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-xs font-semibold shadow-sm transition-colors"
            >
              Verify 4-Stage Proof &rarr;
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
