import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { finalizeTreatmentRecordApi } from '../api/treatmentRecords';
import { listFacilitiesApi } from '../api/facilities';
import { useAuth } from '../context/AuthContext';
import { ErrorState } from '../components/common/States';
import { Stamp, CheckCircle2 } from 'lucide-react';

export const FinalizationPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { user, selectedFacilityId } = useAuth();

  const defaultFacility = searchParams.get('facility_id') || selectedFacilityId || user?.facility_id || '';

  // State inputs for finalization payload
  const [facilityId, setFacilityId] = useState<string>(defaultFacility);
  const [periodStart, setPeriodStart] = useState<string>('2026-11-20T12:00:00Z');
  const [periodEnd, setPeriodEnd] = useState<string>('2026-11-20T18:00:00Z');
  const [keyId, setKeyId] = useState<string>('key-ecdsa-p256-01');

  const [finalizedRecord, setFinalizedRecord] = useState<any>(null);

  const { data: facilities } = useQuery({
    queryKey: ['facilities'],
    queryFn: listFacilitiesApi,
    staleTime: 60000,
  });

  // Automatically sync facilityId to actual UUID when facilities load
  React.useEffect(() => {
    if (facilities && facilities.length > 0) {
      const isUUID = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i.test(facilityId);
      if (!isUUID) {
        setFacilityId(facilities[0].facility_id);
      }
    }
  }, [facilities, facilityId]);

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
      <div className="p-8 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl text-amber-800 dark:text-amber-200">
        <h2 className="text-sm font-semibold uppercase tracking-wide font-mono">Unauthorized Role</h2>
        <p className="text-xs mt-1 text-amber-700 dark:text-amber-300/90 leading-relaxed font-mono">
          Only operators and administrators hold backend authority to aggregate and finalize treatment records.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-200 dark:border-[#1F293D]">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-mono flex items-center gap-2.5">
          <Stamp className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
          Aggregate &amp; Finalize Treatment Window
        </h1>
      </div>

      {/* Finalization Request Form */}
      <div className="scada-card p-6">
        <form onSubmit={handleSubmit} className="space-y-4 font-mono text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Facility Identifier (UUID or code)
            </label>
            {facilities && facilities.length > 0 ? (
              <select
                value={facilityId}
                onChange={(e) => setFacilityId(e.target.value)}
                className="w-full scada-select"
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
                className="w-full scada-input"
              />
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Period Start (RFC 3339 UTC)
              </label>
              <input
                type="text"
                required
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                placeholder="2026-10-01T00:00:00Z"
                className="w-full scada-input"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Period End (RFC 3339 UTC)
              </label>
              <input
                type="text"
                required
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                placeholder="2026-10-01T23:59:59Z"
                className="w-full scada-input"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Signing Key Identifier (ECDSA P-256)
            </label>
            <input
              type="text"
              required
              value={keyId}
              onChange={(e) => setKeyId(e.target.value)}
              className="w-full scada-input"
            />
            <span className="text-[10px] text-slate-500 font-mono mt-1 block">
              Default authority key: key-ecdsa-p256-01 (NIST P-256 / SHA-256)
            </span>
          </div>

          <div className="pt-3">
            <button
              type="submit"
              disabled={finalizeMutation.isPending}
              className="w-full py-3 px-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 font-mono cursor-pointer"
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
          <div className="p-3 bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-[#1F293D] rounded-xl text-xs text-slate-600 dark:text-slate-400 font-mono">
            Finalization state preserved. The frontend does not locally alter record state when rejected.
          </div>
        </div>
      )}

      {/* Finalization Success Result */}
      {finalizedRecord && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl p-6 shadow-sm dark:shadow-scada-card space-y-4">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-sm font-mono">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            Finalization Successfully Executed by Backend
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono pt-2">
            <div className="p-3 bg-white dark:bg-[#0B0F17]/60 border border-emerald-200 dark:border-[#1F293D] rounded-lg">
              <span className="text-slate-500 dark:text-slate-400 text-[10px] uppercase block">Record ID</span>
              <span className="font-semibold text-cyan-700 dark:text-cyan-400 select-all block mt-0.5 truncate">
                {finalizedRecord.record_id}
              </span>
            </div>
            <div className="p-3 bg-white dark:bg-[#0B0F17]/60 border border-emerald-200 dark:border-[#1F293D] rounded-lg">
              <span className="text-slate-500 dark:text-slate-400 text-[10px] uppercase block">Version</span>
              <span className="font-semibold text-slate-900 dark:text-white block mt-0.5">
                v{finalizedRecord.record_version}
              </span>
            </div>
            <div className="p-3 bg-white dark:bg-[#0B0F17]/60 border border-emerald-200 dark:border-[#1F293D] rounded-lg">
              <span className="text-slate-500 dark:text-slate-400 text-[10px] uppercase block">Compliance Verdict</span>
              <span className="font-semibold text-emerald-700 dark:text-emerald-400 block mt-0.5">
                {finalizedRecord.compliance_status}
              </span>
            </div>
            <div className="p-3 bg-white dark:bg-[#0B0F17]/60 border border-emerald-200 dark:border-[#1F293D] rounded-lg">
              <span className="text-slate-500 dark:text-slate-400 text-[10px] uppercase block">DLT Anchor Status</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 block mt-0.5">
                {finalizedRecord.anchor_status}
              </span>
            </div>
          </div>

          <div className="text-xs font-mono">
            <span className="text-slate-600 dark:text-slate-400 text-[10px] uppercase block font-semibold">Canonical Hash (SHA-256):</span>
            <div className="p-3 bg-slate-50 dark:bg-[#070B12] border border-emerald-300 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300 rounded-lg mt-1 break-all select-all font-bold">
              {finalizedRecord.canonical_hash}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Link
              to={`/treatment-records/${finalizedRecord.record_id}`}
              className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors font-mono cursor-pointer"
            >
              Inspect Record Detail &rarr;
            </Link>
            <Link
              to={`/verification?recordId=${finalizedRecord.record_id}`}
              className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors font-mono cursor-pointer"
            >
              Verify 4-Stage Proof &rarr;
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
export default FinalizationPage;
