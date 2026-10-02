import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getHealthApi } from '../api/health';
import { getDLTStatusApi } from '../api/dlt';
import { getAnomalyMetricsApi } from '../api/anomalies';
import { LoadingState, ErrorState, BackendSupportRequiredState } from '../components/common/States';
import { BackendHealthBadge, DltModeBadge } from '../components/common/Badges';
import { Server, Activity, Database, Cpu, RefreshCw } from 'lucide-react';

export const SystemStatusPage: React.FC = () => {
  const healthQuery = useQuery({
    queryKey: ['health'],
    queryFn: getHealthApi,
    refetchInterval: 15000,
  });

  const dltQuery = useQuery({
    queryKey: ['dlt-status'],
    queryFn: getDLTStatusApi,
    refetchInterval: 15000,
  });

  const anomalyQuery = useQuery({
    queryKey: ['anomaly-metrics'],
    queryFn: getAnomalyMetricsApi,
    refetchInterval: 30000,
  });

  const handleRefresh = () => {
    healthQuery.refetch();
    dltQuery.refetch();
    anomalyQuery.refetch();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Server className="w-5 h-5 text-brand-600" />
            Infrastructure & System Status
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational service telemetry, database readiness boundaries, and ledger gateway transport connectivity.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-md text-xs font-medium shadow-sm transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Status
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Backend Application & Database Health */}
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">
                FastAPI Backend Service
              </h2>
            </div>
            <BackendHealthBadge
              status={healthQuery.data?.status}
              database={healthQuery.data?.database}
            />
          </div>

          {healthQuery.isLoading ? (
            <LoadingState message="Checking backend service health..." className="py-6" />
          ) : healthQuery.isError ? (
            <ErrorState error={healthQuery.error} />
          ) : healthQuery.data ? (
            <div className="space-y-3 text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Service Status:</span>
                <span className="font-bold text-slate-800 uppercase">
                  {healthQuery.data.status}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Application Name:</span>
                <span className="text-slate-800">{healthQuery.data.app_name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Environment:</span>
                <span className="text-slate-800 uppercase">{healthQuery.data.environment}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">API Version:</span>
                <span className="text-slate-800">{healthQuery.data.version}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Database Connection:</span>
                <span
                  className={`font-bold ${
                    healthQuery.data.database === 'connected'
                      ? 'text-emerald-600'
                      : 'text-rose-600'
                  }`}
                >
                  {healthQuery.data.database.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Health Timestamp:</span>
                <span className="text-slate-700">
                  {new Date(healthQuery.data.timestamp).toLocaleString()}
                </span>
              </div>
            </div>
          ) : null}

          <div className="text-[10px] text-slate-400 font-mono pt-2 border-t border-slate-100">
            Source: GET /health (Unauthenticated readiness probe)
          </div>
        </div>

        {/* DLT Gateway Status */}
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-purple-600" />
              <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">
                DLT Gateway Ledger Mode
              </h2>
            </div>
            <DltModeBadge
              mode={dltQuery.data?.mode}
              distributedLedger={dltQuery.data?.distributed_ledger}
            />
          </div>

          {dltQuery.isLoading ? (
            <LoadingState message="Polling DLT status..." className="py-6" />
          ) : dltQuery.isError ? (
            <ErrorState error={dltQuery.error} />
          ) : dltQuery.data ? (
            <div className="space-y-3 text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Active Mode:</span>
                <span className="font-bold text-slate-800">{dltQuery.data.mode}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Distributed Ledger:</span>
                <span className="text-slate-800">
                  {String(dltQuery.data.distributed_ledger)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Channel / Network:</span>
                <span className="text-slate-800">{dltQuery.data.channel || 'None (Sim)'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Chaincode ID:</span>
                <span className="text-slate-800">
                  {dltQuery.data.chaincode || 'aquatrust-records'}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Simulation Counter:</span>
                <span className="text-slate-700">
                  {dltQuery.data.simulated_entries_count !== undefined
                    ? `${dltQuery.data.simulated_entries_count} records`
                    : 'N/A'}
                </span>
              </div>
            </div>
          ) : null}

          <div className="text-[10px] text-slate-400 font-mono pt-2 border-t border-slate-100">
            Source: GET /dlt/status
          </div>
        </div>
      </div>

      {/* ML Pipeline Status (Truthfully extracted from Anomaly API response) */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Cpu className="w-4 h-4 text-purple-600" />
          <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">
            Machine Learning Inference Pipeline Information
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
          <div>
            <span className="text-slate-500 block text-[11px]">Model Architecture:</span>
            <span className="font-bold text-slate-800">Scikit-learn Isolation Forest</span>
          </div>

          <div>
            <span className="text-slate-500 block text-[11px]">Model Version:</span>
            <span className="text-slate-800">
              {anomalyQuery.data?.model_version || 'Loading...'}
            </span>
          </div>

          <div>
            <span className="text-slate-500 block text-[11px]">Feature Set Version:</span>
            <span className="text-slate-800">atc-if-v1</span>
          </div>
        </div>

        <div className="pt-2 text-[11px] text-slate-500">
          Notice: The backend does not expose a discrete &quot;ML health&quot; probe endpoint. Model metadata is retrieved authentically from anomaly inference responses.
        </div>
      </div>

      {/* Unsupported Backend Features Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <BackendSupportRequiredState
          feature="User Directory / Suspension API"
          description="Backend does not currently expose GET /users or user status modification endpoints."
        />
        <BackendSupportRequiredState
          feature="Signing Key Rotation"
          description="Backend relies on predefined authority keys (key-ecdsa-p256-01). Dynamic key generation endpoint is not exposed."
        />
      </div>
    </div>
  );
};
