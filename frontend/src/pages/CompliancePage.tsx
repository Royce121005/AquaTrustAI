import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getComplianceRulesApi, getComplianceSummaryApi, evaluateComplianceApi } from '../api/compliance';
import { listTreatmentRecordsApi } from '../api/treatmentRecords';
import { LoadingState, ErrorState, EmptyState } from '../components/common/States';
import { ComplianceStatusBadge, StatusBadge } from '../components/common/Badges';
import { Scale, RefreshCw, CheckCircle, XCircle, Search, Play, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';

export const CompliancePage: React.FC = () => {
  const [selectedRecordId, setSelectedRecordId] = useState<string>('');

  const rulesQuery = useQuery({
    queryKey: ['compliance-rules'],
    queryFn: getComplianceRulesApi,
  });

  const summaryQuery = useQuery({
    queryKey: ['compliance-summary'],
    queryFn: getComplianceSummaryApi,
    refetchInterval: 30000,
  });

  const recordsQuery = useQuery({
    queryKey: ['treatment-records', { limit: 20 }],
    queryFn: () => listTreatmentRecordsApi({ limit: 20 }),
  });

  const evalMutation = useMutation({
    mutationFn: (recId: string) => evaluateComplianceApi(recId),
  });

  const handleEvaluate = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRecordId) {
      evalMutation.mutate(selectedRecordId);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            CPCB Environmental Discharge Standards Compliance
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            CPCB 2021 Normative Discharge Thresholds & Treatment Window Verification.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              rulesQuery.refetch();
              summaryQuery.refetch();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-md text-xs font-medium shadow-sm transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh Rules & Summary
          </button>
        </div>
      </div>

      {/* Compliance Summary Cards */}
      {summaryQuery.data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
              Total Evaluated Records
            </span>
            <div className="text-2xl font-bold text-slate-900 mt-1 font-mono">
              {summaryQuery.data.total_evaluations}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Standard: {summaryQuery.data.cpcb_standard_version}
            </div>
          </div>

          <div className="bg-white border border-emerald-200 rounded-lg p-5 shadow-sm bg-emerald-50/20">
            <div className="flex items-center justify-between text-emerald-700">
              <span className="text-xs font-semibold uppercase tracking-wider">Compliant Windows</span>
              <CheckCircle className="w-4 h-4" />
            </div>
            <div className="text-2xl font-bold text-emerald-700 mt-1 font-mono">
              {summaryQuery.data.compliant_count}
            </div>
            <div className="text-[11px] text-emerald-600 mt-1">
              Fully satisfied all CPCB limits
            </div>
          </div>

          <div className="bg-white border border-rose-200 rounded-lg p-5 shadow-sm bg-rose-50/20">
            <div className="flex items-center justify-between text-rose-700">
              <span className="text-xs font-semibold uppercase tracking-wider">Non-Compliant</span>
              <XCircle className="w-4 h-4" />
            </div>
            <div className="text-2xl font-bold text-rose-700 mt-1 font-mono">
              {summaryQuery.data.non_compliant_count}
            </div>
            <div className="text-[11px] text-rose-600 mt-1">
              Threshold breach detected
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
              Compliance Rate
            </span>
            <div className="text-2xl font-bold text-slate-900 mt-1 font-mono">
              {summaryQuery.data.compliance_rate_percent}%
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Aggregate acceptance ratio
            </div>
          </div>
        </div>
      )}

      {/* Evaluate Specific Treatment Record Panel */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-3 flex items-center gap-2">
          <Scale className="w-4 h-4 text-brand-600" />
          Evaluate Treatment Record Compliance
        </h2>
        <form onSubmit={handleEvaluate} className="flex flex-col sm:flex-row items-center gap-3">
          <select
            value={selectedRecordId}
            onChange={(e) => setSelectedRecordId(e.target.value)}
            className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-800 focus:ring-1 focus:ring-brand-500 w-full"
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
            className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 shrink-0 w-full sm:w-auto justify-center"
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
          <div className="mt-6 pt-4 border-t border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-mono">Evaluation Result:</span>
                <ComplianceStatusBadge status={evalMutation.data.compliance_status} />
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                Evaluated: {new Date(evalMutation.data.evaluated_at).toLocaleString()}
              </span>
            </div>

            {Array.isArray(evalMutation.data.parameter_results) && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono uppercase text-[11px]">
                      <th className="py-2 px-3">Parameter</th>
                      <th className="py-2 px-3">Observed</th>
                      <th className="py-2 px-3">Rule Operator & Limit</th>
                      <th className="py-2 px-3">Units</th>
                      <th className="py-2 px-3">Samples</th>
                      <th className="py-2 px-3">Mean / Min / Max</th>
                      <th className="py-2 px-3">Verdict</th>
                      <th className="py-2 px-3">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {evalMutation.data.parameter_results.map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80">
                        <td className="py-2.5 px-3 font-bold text-slate-900">{p.parameter}</td>
                        <td className="py-2.5 px-3 font-semibold text-brand-700">
                          {p.observed_value !== null ? p.observed_value : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">
                          {p.operator} {p.threshold !== null ? p.threshold : `${p.threshold_min} - ${p.threshold_max}`}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">{p.threshold_unit}</td>
                        <td className="py-2.5 px-3 text-slate-600">{p.sample_count}</td>
                        <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                          {(p.mean_value !== null && p.mean_value !== undefined && !isNaN(Number(p.mean_value)) ? Number(p.mean_value).toFixed(1) : '—')} / {(p.min_value !== null && p.min_value !== undefined && !isNaN(Number(p.min_value)) ? Number(p.min_value).toFixed(1) : '—')} / {(p.max_value !== null && p.max_value !== undefined && !isNaN(Number(p.max_value)) ? Number(p.max_value).toFixed(1) : '—')}
                        </td>
                        <td className="py-2.5 px-3">
                          <ComplianceStatusBadge status={p.result || p.status} />
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 text-[11px]">{p.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Authoritative Rules Registry Table from GET /compliance/rules */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">
            Authoritative CPCB Rule Catalog
          </h2>
          <span className="text-xs text-slate-500 font-mono">
            Source: GET /compliance/rules
          </span>
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
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono uppercase text-[11px]">
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
              <tbody className="divide-y divide-slate-100 font-mono">
                {rulesQuery.data.map((r) => (
                  <tr key={r.rule_id} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-4 text-slate-600 select-all">{r.rule_id}</td>
                    <td className="py-2.5 px-4 font-bold text-slate-900">{r.parameter}</td>
                    <td className="py-2.5 px-4 text-slate-700">{r.operator}</td>
                    <td className="py-2.5 px-4 font-semibold text-brand-700">
                      {r.threshold !== null
                        ? r.threshold
                        : `${r.threshold_min} to ${r.threshold_max}`}
                    </td>
                    <td className="py-2.5 px-4 text-slate-500">{r.threshold_unit}</td>
                    <td className="py-2.5 px-4 text-slate-500">{r.stage_scope || 'final_effluent'}</td>
                    <td className="py-2.5 px-4 text-slate-600 font-sans">{r.source_reference}</td>
                    <td className="py-2.5 px-4 text-slate-500">{r.rule_version}</td>
                    <td className="py-2.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${r.active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'}`}>
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
