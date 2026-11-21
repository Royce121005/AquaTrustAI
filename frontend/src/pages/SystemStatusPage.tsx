import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getHealthApi } from '../api/health';
import { getDLTStatusApi } from '../api/dlt';
import { getAnomalyMetricsApi } from '../api/anomalies';
import { LoadingState, ErrorState } from '../components/common/States';
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
    queryFn: () => getAnomalyMetricsApi(),
    refetchInterval: 30000,
  });

  const handleRefresh = () => {
    healthQuery.refetch();
    dltQuery.refetch();
    anomalyQuery.refetch();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-[#1F293D]">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#0EA5E9]/10 border border-[#0EA5E9]/30 flex items-center justify-center text-[#0EA5E9]">
              <Server className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              Infrastructure &amp; System Status
            </h1>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-[#111827] border border-slate-300 dark:border-[#1F293D] dark:hover:bg-[#161F30] text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold shadow-sm transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#0EA5E9]" />
          Refresh Status
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Backend Application & Database Health */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1F293D] rounded-xl p-6 shadow-sm dark:shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-[#1F293D]">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#10B981]" />
              <h2 className="text-xs font-mono uppercase tracking-wider text-slate-700 dark:text-slate-300">
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
              <div className="flex justify-between py-1.5 border-b border-slate-200 dark:border-[#1F293D]">
                <span className="text-slate-500 dark:text-slate-400">Service Status:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                  {healthQuery.data.status}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-200 dark:border-[#1F293D]">
                <span className="text-slate-500 dark:text-slate-400">Application Name:</span>
                <span className="text-slate-900 dark:text-white">{healthQuery.data.app_name}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-200 dark:border-[#1F293D]">
                <span className="text-slate-500 dark:text-slate-400">Environment:</span>
                <span className="text-slate-900 dark:text-white uppercase">{healthQuery.data.environment}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-200 dark:border-[#1F293D]">
                <span className="text-slate-500 dark:text-slate-400">API Version:</span>
                <span className="text-sky-600 dark:text-[#0EA5E9]">{healthQuery.data.version}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-200 dark:border-[#1F293D]">
                <span className="text-slate-500 dark:text-slate-400">Database Connection:</span>
                <span
                  className={`font-bold ${
                    healthQuery.data.database === 'connected'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {healthQuery.data.database.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500 dark:text-slate-400">Health Timestamp:</span>
                <span className="text-slate-700 dark:text-slate-300">
                  {new Date(healthQuery.data.timestamp).toLocaleString()}
                </span>
              </div>
            </div>
          ) : null}
        </div>

        {/* DLT Gateway Status */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1F293D] rounded-xl p-6 shadow-sm dark:shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-[#1F293D]">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-purple-400" />
              <h2 className="text-xs font-mono uppercase tracking-wider text-slate-700 dark:text-slate-300">
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
              <div className="flex justify-between py-1.5 border-b border-slate-200 dark:border-[#1F293D]">
                <span className="text-slate-500 dark:text-slate-400">Active Mode:</span>
                <span className="font-bold text-slate-900 dark:text-white">{dltQuery.data.mode}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-200 dark:border-[#1F293D]">
                <span className="text-slate-500 dark:text-slate-400">Distributed Ledger:</span>
                <span className="text-slate-900 dark:text-white">
                  {String(dltQuery.data.distributed_ledger)}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-200 dark:border-[#1F293D]">
                <span className="text-slate-500 dark:text-slate-400">Channel / Network:</span>
                <span className="text-slate-900 dark:text-white">{dltQuery.data.channel || 'None (Sim)'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-200 dark:border-[#1F293D]">
                <span className="text-slate-500 dark:text-slate-400">Chaincode ID:</span>
                <span className="text-sky-600 dark:text-[#0EA5E9]">
                  {dltQuery.data.chaincode || 'aquatrust-records'}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500 dark:text-slate-400">Simulation Counter:</span>
                <span className="text-slate-700 dark:text-slate-300">
                  {dltQuery.data.simulated_entries_count !== undefined
                    ? `${dltQuery.data.simulated_entries_count} records`
                    : 'N/A'}
                </span>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* ML Pipeline Status (Truthfully extracted from Anomaly API response) */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1F293D] rounded-xl p-6 shadow-sm dark:shadow-xl space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-[#1F293D]">
          <Cpu className="w-4 h-4 text-purple-400" />
          <h2 className="text-xs font-mono uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Machine Learning Inference Pipeline Information
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
          <div className="p-3 bg-slate-50 dark:bg-[#161F30]/60 rounded-lg border border-slate-200 dark:border-[#1F293D]">
            <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Model Architecture:</span>
            <span className="font-bold text-slate-900 dark:text-white">Scikit-learn Isolation Forest</span>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-[#161F30]/60 rounded-lg border border-slate-200 dark:border-[#1F293D]">
            <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Model Version:</span>
            <span className="text-sky-600 dark:text-[#0EA5E9] font-medium">
              {anomalyQuery.data?.model_version || 'Loading...'}
            </span>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-[#161F30]/60 rounded-lg border border-slate-200 dark:border-[#1F293D]">
            <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Feature Set Version:</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">atc-if-v1</span>
          </div>
        </div>
      </div>
    </div>
  );
};
