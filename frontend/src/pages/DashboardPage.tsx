import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { listFacilitiesApi } from '../api/facilities';
import { getAnomalyMetricsApi } from '../api/anomalies';
import { getComplianceSummaryApi } from '../api/compliance';
import { getValidationStatsApi } from '../api/validation';
import { listTreatmentRecordsApi } from '../api/treatmentRecords';
import { getDLTStatusApi } from '../api/dlt';
import { LoadingState, ErrorState, EmptyState } from '../components/common/States';
import {
  StatusBadge,
  DltModeBadge,
  ComplianceStatusBadge,
  QualityBadge,
} from '../components/common/Badges';
import {
  Building2,
  AlertTriangle,
  Scale,
  CheckCircle,
  FileText,
  Blocks,
  RefreshCw,
  ExternalLink,
  Shield,
  Activity,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  const { selectedFacilityId } = useAuth();

  const facilitiesQuery = useQuery({
    queryKey: ['facilities'],
    queryFn: listFacilitiesApi,
    refetchInterval: 60000,
  });

  const anomaliesQuery = useQuery({
    queryKey: ['anomaly-metrics'],
    queryFn: getAnomalyMetricsApi,
    refetchInterval: 30000,
  });

  const complianceQuery = useQuery({
    queryKey: ['compliance-summary'],
    queryFn: getComplianceSummaryApi,
    refetchInterval: 30000,
  });

  const validationQuery = useQuery({
    queryKey: ['validation-stats', selectedFacilityId],
    queryFn: () => getValidationStatsApi(selectedFacilityId || undefined),
    refetchInterval: 30000,
  });

  const recordsQuery = useQuery({
    queryKey: ['treatment-records', { limit: 5 }],
    queryFn: () => listTreatmentRecordsApi({ limit: 5 }),
    refetchInterval: 30000,
  });

  const dltQuery = useQuery({
    queryKey: ['dlt-status'],
    queryFn: getDLTStatusApi,
    refetchInterval: 20000,
  });

  const isRefreshing =
    facilitiesQuery.isFetching ||
    anomaliesQuery.isFetching ||
    complianceQuery.isFetching ||
    validationQuery.isFetching ||
    recordsQuery.isFetching ||
    dltQuery.isFetching;

  const handleRefreshAll = () => {
    facilitiesQuery.refetch();
    anomaliesQuery.refetch();
    complianceQuery.refetch();
    validationQuery.refetch();
    recordsQuery.refetch();
    dltQuery.refetch();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Operational Intelligence & Integrity Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time physical observation, deterministic data validation, AI anomaly inference, and cryptographic DLT anchoring.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefreshAll}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-md text-xs font-medium shadow-sm transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh All
          </button>
        </div>
      </div>

      {/* Primary KPI Grid (All sourced from authoritative APIs) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Facilities */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Registered Facilities</span>
            <Building2 className="w-4 h-4 text-brand-600" />
          </div>
          {facilitiesQuery.isLoading ? (
            <div className="h-8 bg-slate-100 rounded animate-pulse"></div>
          ) : facilitiesQuery.isError ? (
            <span className="text-xs text-rose-600">Failed to load</span>
          ) : (
            <div className="text-2xl font-bold text-slate-900">
              {facilitiesQuery.data?.length ?? 0}
            </div>
          )}
          <div className="mt-2 text-[10px] text-slate-400 font-mono">
            Source: GET /facilities
          </div>
        </div>

        {/* Validation Quality */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Validation Quality</span>
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          </div>
          {validationQuery.isLoading ? (
            <div className="h-8 bg-slate-100 rounded animate-pulse"></div>
          ) : validationQuery.isError ? (
            <span className="text-xs text-rose-600">Failed to load</span>
          ) : (
            <div>
              <div className="text-2xl font-bold text-slate-900">
                {validationQuery.data?.valid_rate_percent !== undefined
                  ? `${validationQuery.data.valid_rate_percent}%`
                  : 'N/A'}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {validationQuery.data?.valid_count ?? 0} valid / {validationQuery.data?.total_readings ?? 0} total readings
              </div>
            </div>
          )}
          <div className="mt-2 text-[10px] text-slate-400 font-mono">
            Source: GET /validation/stats
          </div>
        </div>

        {/* AI Anomalies */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">AI Anomalies Detected</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          {anomaliesQuery.isLoading ? (
            <div className="h-8 bg-slate-100 rounded animate-pulse"></div>
          ) : anomaliesQuery.isError ? (
            <span className="text-xs text-rose-600">Failed to load</span>
          ) : (
            <div>
              <div className="text-2xl font-bold text-slate-900">
                {anomaliesQuery.data?.anomalies_detected ?? 0}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Rate: {anomaliesQuery.data?.anomaly_rate_percent ?? 0}% ({anomaliesQuery.data?.total_inferences ?? 0} inferences)
              </div>
            </div>
          )}
          <div className="mt-2 text-[10px] text-slate-400 font-mono">
            Source: GET /anomalies/metrics (Isolation Forest)
          </div>
        </div>

        {/* Compliance Rate */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">CPCB Compliance Rate</span>
            <Scale className="w-4 h-4 text-purple-600" />
          </div>
          {complianceQuery.isLoading ? (
            <div className="h-8 bg-slate-100 rounded animate-pulse"></div>
          ) : complianceQuery.isError ? (
            <span className="text-xs text-rose-600">Failed to load</span>
          ) : (
            <div>
              <div className="text-2xl font-bold text-slate-900">
                {complianceQuery.data?.compliance_rate_percent !== undefined
                  ? `${complianceQuery.data.compliance_rate_percent}%`
                  : 'N/A'}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {complianceQuery.data?.compliant_count ?? 0} compliant / {complianceQuery.data?.total_evaluations ?? 0} evaluated
              </div>
            </div>
          )}
          <div className="mt-2 text-[10px] text-slate-400 font-mono">
            Source: GET /compliance/summary ({complianceQuery.data?.cpcb_standard_version || 'CPCB_2021'})
          </div>
        </div>
      </div>

      {/* DLT Infrastructure Ledger Status Card */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Blocks className="w-4 h-4 text-slate-700" />
            <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">
              Distributed Ledger Transport Boundary
            </h2>
          </div>
          <DltModeBadge
            mode={dltQuery.data?.mode}
            distributedLedger={dltQuery.data?.distributed_ledger}
          />
        </div>

        {dltQuery.isLoading ? (
          <LoadingState message="Querying DLT Gateway status..." className="py-6" />
        ) : dltQuery.isError ? (
          <ErrorState error={dltQuery.error} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 text-xs">
            <div>
              <span className="text-slate-500 block text-[11px]">Ledger Mode:</span>
              <span className="font-mono font-semibold text-slate-800">
                {dltQuery.data?.mode || 'UNKNOWN'}
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {dltQuery.data?.mode === 'FABRIC'
                  ? 'Hyperledger Fabric Production Channel'
                  : 'Local cryptographic simulation only. Not anchored to distributed peers.'}
              </p>
            </div>

            <div>
              <span className="text-slate-500 block text-[11px]">Peer / Channel Reference:</span>
              <span className="font-mono text-slate-700">
                {dltQuery.data?.channel || dltQuery.data?.peer_endpoint || 'None (Simulation)'}
              </span>
              <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                Chaincode: {dltQuery.data?.chaincode || 'aquatrust-records'}
              </div>
            </div>

            <div>
              <span className="text-slate-500 block text-[11px]">Simulation Sequence / Count:</span>
              <span className="font-mono text-slate-700">
                {dltQuery.data?.simulated_entries_count !== undefined
                  ? `${dltQuery.data.simulated_entries_count} simulated records`
                  : dltQuery.data?.simulation_sequence !== undefined
                  ? `Seq: ${dltQuery.data.simulation_sequence}`
                  : 'N/A (Fabric Active)'}
              </span>
              <div className="mt-1">
                <Link
                  to="/blockchain"
                  className="text-brand-600 hover:text-brand-800 font-semibold inline-flex items-center gap-1"
                >
                  View DLT Anchors & Merkle Batches &rarr;
                </Link>
              </div>
            </div>
          </div>
        )}
        <div className="mt-3 pt-2 border-t border-slate-100 text-[10px] text-slate-400 font-mono">
          Source: GET /dlt/status
        </div>
      </div>

      {/* Recent Finalized Treatment Records */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-700" />
            <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">
              Recent Treatment Records
            </h2>
          </div>
          <Link
            to="/treatment-records"
            className="text-xs text-brand-600 hover:text-brand-800 font-medium inline-flex items-center gap-1"
          >
            View All Records &rarr;
          </Link>
        </div>

        {recordsQuery.isLoading ? (
          <LoadingState message="Loading treatment records..." />
        ) : recordsQuery.isError ? (
          <div className="p-4">
            <ErrorState error={recordsQuery.error} />
          </div>
        ) : !recordsQuery.data || recordsQuery.data.length === 0 ? (
          <EmptyState
            title="No Treatment Records"
            message="No treatment time windows have been finalized yet. Plant operators can finalize windows once telemetry is valid."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono uppercase text-[11px]">
                  <th className="py-2.5 px-4">Record ID</th>
                  <th className="py-2.5 px-4">Facility ID</th>
                  <th className="py-2.5 px-4">Window</th>
                  <th className="py-2.5 px-4">State</th>
                  <th className="py-2.5 px-4">Quality</th>
                  <th className="py-2.5 px-4">Compliance</th>
                  <th className="py-2.5 px-4">Anchor</th>
                  <th className="py-2.5 px-4 text-right">Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {recordsQuery.data.map((r) => (
                  <tr key={r.record_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-semibold text-brand-700">
                      <Link to={`/treatment-records/${r.record_id}`} className="hover:underline">
                        {r.record_id.slice(0, 8)}... (v{r.record_version})
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{r.facility_id.slice(0, 8)}...</td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {new Date(r.period_start).toLocaleDateString()} -{' '}
                      {new Date(r.period_end).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={r.record_state} />
                    </td>
                    <td className="py-3 px-4">
                      <QualityBadge status={r.quality_status} />
                    </td>
                    <td className="py-3 px-4">
                      <ComplianceStatusBadge status={r.compliance_status} />
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={r.anchor_status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        to={`/verification?recordId=${r.record_id}`}
                        className="inline-flex items-center gap-1 text-slate-600 hover:text-brand-600 font-sans font-medium"
                      >
                        <Shield className="w-3.5 h-3.5" />
                        Verify
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-[10px] text-slate-400 font-mono">
          Source: GET /treatment-records
        </div>
      </div>

    </div>
  );
};
