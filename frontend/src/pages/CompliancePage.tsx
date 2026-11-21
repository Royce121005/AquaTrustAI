import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getComplianceRulesApi, getComplianceSummaryApi, evaluateComplianceApi } from '../api/compliance';
import { listTreatmentRecordsApi } from '../api/treatmentRecords';
import { listFacilitiesApi } from '../api/facilities';
import { useAuth } from '../context/AuthContext';
import { LoadingState, ErrorState, EmptyState } from '../components/common/States';
import { ComplianceStatusBadge } from '../components/common/Badges';
import { Scale, RefreshCw, CheckCircle, XCircle, Play, Building2 } from 'lucide-react';

export const CompliancePage: React.FC = () => {
  const [selectedRecordId, setSelectedRecordId] = useState<string>('');
  const { selectedFacilityId } = useAuth();

  const { data: facilities } = useQuery({
    queryKey: ['facilities'],
    queryFn: listFacilitiesApi,
    staleTime: 60000,
  });

  const matchedFacility = facilities?.find(
    (f) => f.facility_id === selectedFacilityId || (selectedFacilityId && f.facility_name?.includes(selectedFacilityId))
  );
  const effectiveFacilityId = matchedFacility
    ? matchedFacility.facility_id
    : selectedFacilityId && /^[0-9a-fA-F-]{36}$/.test(selectedFacilityId)
    ? selectedFacilityId
    : undefined;

  const rulesQuery = useQuery({
    queryKey: ['compliance-rules'],
    queryFn: getComplianceRulesApi,
  });

  const summaryQuery = useQuery({
    queryKey: ['compliance-summary', effectiveFacilityId],
    queryFn: () => getComplianceSummaryApi(effectiveFacilityId),
    refetchInterval: 30000,
  });

  const recordsQuery = useQuery({
    queryKey: ['treatment-records', { facility_id: effectiveFacilityId, limit: 50 }],
    queryFn: () => listTreatmentRecordsApi({ facility_id: effectiveFacilityId, limit: 50 }),
  });

  useEffect(() => {
    if (recordsQuery.data && recordsQuery.data.length > 0) {
      setSelectedRecordId(recordsQuery.data[0].record_id);
    } else {
      setSelectedRecordId('');
    }
  }, [recordsQuery.data]);

  const evalMutation = useMutation({
    mutationFn: (recId: string) => evaluateComplianceApi(recId),
    onSuccess: () => {
      summaryQuery.refetch();
    },
  });

  const handleEvaluate = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRecordId) {
      evalMutation.mutate(selectedRecordId);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-[#1F293D]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-mono flex items-center gap-2.5">
            <Scale className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            CPCB Environmental Discharge Standards Compliance
          </h1>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">Active Scope:</span>
            {matchedFacility ? (
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 flex items-center gap-1.5 font-medium">
                <Building2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                {matchedFacility.facility_name} ({matchedFacility.capacity ? `${matchedFacility.capacity} ${matchedFacility.capacity_unit}` : matchedFacility.facility_type})
              </span>
            ) : (
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                All Facilities (Fleetwide)
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              rulesQuery.refetch();
              summaryQuery.refetch();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-[#1E293B] border border-slate-300 dark:border-[#334155] dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-mono font-medium shadow-sm transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            Refresh Rules &amp; Summary
          </button>
        </div>
      </div>

      {/* Compliance Summary Cards */}
      {summaryQuery.data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="scada-card p-5 relative overflow-hidden">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono block">
              Total Evaluated Records
            </span>
            <div className="text-3xl font-bold text-slate-900 dark:text-white mt-1.5 font-mono tabular-nums">
              {summaryQuery.data.total_evaluations}
            </div>
            <div className="text-[11px] text-slate-500 font-mono mt-1">
              Standard: {summaryQuery.data.cpcb_standard_version}
            </div>
          </div>

          <div className="scada-card p-5 relative overflow-hidden border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/70 dark:bg-emerald-950/10">
            <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400">
              <span className="text-[11px] font-semibold uppercase tracking-wider font-mono">Compliant Windows</span>
              <CheckCircle className="w-4 h-4" />
            </div>
            <div className="text-3xl font-bold text-emerald-700 dark:text-emerald-400 mt-1.5 font-mono tabular-nums">
              {summaryQuery.data.compliant_count}
            </div>
          </div>

          <div className="scada-card p-5 relative overflow-hidden border-rose-200 dark:border-rose-900/50 bg-rose-50/70 dark:bg-rose-950/10">
            <div className="flex items-center justify-between text-rose-700 dark:text-rose-400">
              <span className="text-[11px] font-semibold uppercase tracking-wider font-mono">Non-Compliant</span>
              <XCircle className="w-4 h-4" />
            </div>
            <div className="text-3xl font-bold text-rose-700 dark:text-rose-400 mt-1.5 font-mono tabular-nums">
              {summaryQuery.data.non_compliant_count}
            </div>
          </div>

          <div className="scada-card p-5 relative overflow-hidden">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono block">
              Compliance Rate
            </span>
            <div className="text-3xl font-bold text-cyan-700 dark:text-cyan-400 mt-1.5 font-mono tabular-nums">
              {summaryQuery.data.compliance_rate_percent}%
            </div>
          </div>
        </div>
      )}

      {/* Evaluate Specific Treatment Record Panel */}
      <div className="scada-card p-6">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wide mb-3 flex items-center gap-2 font-mono">
          <Scale className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          Evaluate Treatment Record Compliance
        </h2>
        <form onSubmit={handleEvaluate} className="flex flex-col sm:flex-row items-center gap-3">
          <select
            value={selectedRecordId}
            onChange={(e) => setSelectedRecordId(e.target.value)}
            className="flex-1 scada-select w-full"
          >
            <option value="">Select a finalized or aggregated treatment record UUID...</option>
            {recordsQuery.data?.map((r) => (
              <option key={r.record_id} value={r.record_id}>
                {r.record_id} ({r.record_state} • {r.compliance_status})
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={!selectedRecordId || evalMutation.isPending}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 shrink-0 w-full sm:w-auto justify-center font-mono cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" />
            {evalMutation.isPending ? 'Evaluating...' : 'Evaluate Against Rules'}
          </button>
        </form>

        {evalMutation.isError && (
          <div className="mt-4">
            <ErrorState error={evalMutation.error} />
          </div>
        )}

        {/* Evaluation Output Table */}
        {evalMutation.isSuccess && (
          <div className="mt-6 pt-4 border-t border-slate-200 dark:border-[#1F293D] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">Evaluation Result:</span>
                <ComplianceStatusBadge status={evalMutation.data.compliance_status} />
              </div>
              <span className="text-[11px] text-slate-500 font-mono">
                Evaluated: {new Date(evalMutation.data.evaluated_at).toLocaleString()}
              </span>
            </div>

            {Array.isArray(evalMutation.data.parameter_results) && (
              <div className="scada-table-container">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="scada-table-header">
                      <th className="py-2.5 px-3">Parameter</th>
                      <th className="py-2.5 px-3">Observed</th>
                      <th className="py-2.5 px-3">Rule Operator &amp; Limit</th>
                      <th className="py-2.5 px-3">Units</th>
                      <th className="py-2.5 px-3">Samples</th>
                      <th className="py-2.5 px-3">Mean / Min / Max</th>
                      <th className="py-2.5 px-3">Verdict</th>
                      <th className="py-2.5 px-3">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-[#1F293D]/60 font-mono">
                    {evalMutation.data.parameter_results.map((p, idx) => (
                      <tr key={idx} className="scada-table-row">
                        <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">{p.parameter}</td>
                        <td className="py-2.5 px-3 font-semibold text-cyan-700 dark:text-cyan-400 tabular-nums">
                          {p.observed_value !== null ? p.observed_value : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                          {p.operator} {p.threshold !== null ? p.threshold : `${p.threshold_min} - ${p.threshold_max}`}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">{p.threshold_unit}</td>
                        <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 tabular-nums">{p.sample_count}</td>
                        <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 text-[11px] tabular-nums">
                          {(p.mean_value !== null && p.mean_value !== undefined && !isNaN(Number(p.mean_value)) ? Number(p.mean_value).toFixed(1) : '—')} / {(p.min_value !== null && p.min_value !== undefined && !isNaN(Number(p.min_value)) ? Number(p.min_value).toFixed(1) : '—')} / {(p.max_value !== null && p.max_value !== undefined && !isNaN(Number(p.max_value)) ? Number(p.max_value).toFixed(1) : '—')}
                        </td>
                        <td className="py-2.5 px-3">
                          <ComplianceStatusBadge status={p.result || p.status} />
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 text-[11px]">{p.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Authoritative Rules Registry Table */}
      <div className="scada-table-container">
        <div className="p-4 border-b border-slate-200 dark:border-[#1F293D] flex items-center justify-between bg-slate-50 dark:bg-[#161F30]">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wide font-mono">
            Authoritative CPCB Rule Catalog
          </h2>
        </div>

        {rulesQuery.isLoading ? (
          <LoadingState message="Loading CPCB compliance rules..." />
        ) : rulesQuery.isError ? (
          <div className="p-4">
            <ErrorState error={rulesQuery.error} />
          </div>
        ) : !rulesQuery.data || rulesQuery.data.length === 0 ? (
          <EmptyState
            title="No Active Rules Found"
            message="No compliance discharge standard rules are currently active in the database."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="scada-table-header">
                  <th className="py-2.5 px-4">Rule ID</th>
                  <th className="py-2.5 px-4">Parameter</th>
                  <th className="py-2.5 px-4">Operator</th>
                  <th className="py-2.5 px-4">Threshold / Range</th>
                  <th className="py-2.5 px-4">Unit</th>
                  <th className="py-2.5 px-4">Stage Scope</th>
                  <th className="py-2.5 px-4">Source Standard</th>
                  <th className="py-2.5 px-4">Version</th>
                  <th className="py-2.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-[#1F293D]/60 font-mono">
                {rulesQuery.data.map((r) => (
                  <tr key={r.rule_id} className="scada-table-row">
                    <td className="py-2.5 px-4 text-slate-500 dark:text-slate-400 select-all">{r.rule_id}</td>
                    <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white">{r.parameter}</td>
                    <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300">{r.operator}</td>
                    <td className="py-2.5 px-4 font-semibold text-cyan-700 dark:text-cyan-400">
                      {r.threshold !== null
                        ? r.threshold
                        : `${r.threshold_min} to ${r.threshold_max}`}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400">{r.threshold_unit}</td>
                    <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400">{r.stage_scope || 'final_effluent'}</td>
                    <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300 font-sans">{r.source_reference}</td>
                    <td className="py-2.5 px-4 text-slate-500 dark:text-slate-400">{r.rule_version}</td>
                    <td className="py-2.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${r.active ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800' : 'bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-500'}`}>
                        {r.active ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
export default CompliancePage;
