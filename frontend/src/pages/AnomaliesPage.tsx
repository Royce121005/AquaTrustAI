import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getAnomalyMetricsApi } from '../api/anomalies';
import { LoadingState, ErrorState, EmptyState } from '../components/common/States';
import { AnomalyStatusBadge } from '../components/common/Badges';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from 'recharts';
import { useChartTheme } from '../hooks/useChartTheme';

export const AnomaliesPage: React.FC = () => {
  const chartTheme = useChartTheme();
  const metricsQuery = useQuery({
    queryKey: ['anomaly-metrics'],
    queryFn: getAnomalyMetricsApi,
    refetchInterval: 20000,
  });

  const metrics = metricsQuery.data;

  // Prepare chart data using actual timestamps and actual anomaly scores
  const chartData = metrics?.recent_events
    ? [...metrics.recent_events]
        .reverse()
        .map((evt, idx) => ({
          index: idx + 1,
          time: new Date(evt.inference_at).toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit' }),
          score: evt.anomaly_score !== null ? Number(evt.anomaly_score) : 0,
          readingId: evt.reading_id,
        }))
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-[#1F293D]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-mono flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-500 dark:text-rose-400" />
            AI Anomaly Detection Engine (Isolation Forest)
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => metricsQuery.refetch()}
            disabled={metricsQuery.isFetching}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-[#1E293B] border border-slate-300 dark:border-[#334155] dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-mono font-medium shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${metricsQuery.isFetching ? 'animate-spin text-purple-600 dark:text-purple-400' : ''}`} />
            Refresh Metrics
          </button>
        </div>
      </div>

      {metricsQuery.isLoading ? (
        <LoadingState message="Fetching anomaly detection metrics..." />
      ) : metricsQuery.isError ? (
        <ErrorState error={metricsQuery.error} onRetry={() => metricsQuery.refetch()} />
      ) : metrics ? (
        <>
          {/* Isolation Forest Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="scada-card p-5 relative overflow-hidden">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono block">
                Total Inferences
              </span>
              <div className="text-3xl font-bold text-slate-900 dark:text-white mt-1.5 font-mono tabular-nums">
                {metrics.total_inferences}
              </div>
              <div className="text-[11px] text-slate-500 font-mono mt-1">
                Model: {metrics.model_version}
              </div>
            </div>

            <div className="scada-card p-5 relative overflow-hidden border-rose-200 dark:border-rose-900/50 bg-rose-50/70 dark:bg-rose-950/10">
              <div className="flex items-center justify-between text-rose-700 dark:text-rose-400">
                <span className="text-[11px] font-semibold uppercase tracking-wider font-mono">Anomalies Detected</span>
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="text-3xl font-bold text-rose-700 dark:text-rose-400 mt-1.5 font-mono tabular-nums">
                {metrics.anomalies_detected}
              </div>
            </div>

            <div className="scada-card p-5 relative overflow-hidden">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono block">
                Anomaly Rate
              </span>
              <div className="text-3xl font-bold text-cyan-700 dark:text-cyan-400 mt-1.5 font-mono tabular-nums">
                {metrics.anomaly_rate_percent}%
              </div>
            </div>

            <div className="scada-card p-5 relative overflow-hidden border-purple-200 dark:border-purple-900/50 bg-purple-50/70 dark:bg-purple-950/10">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-purple-700 dark:text-purple-300 font-mono block">
                Model Architecture
              </span>
              <div className="text-base font-bold text-purple-800 dark:text-purple-400 mt-2 font-mono">
                Isolation Forest
              </div>
              <div className="text-[11px] text-purple-700/80 dark:text-purple-400/80 font-mono mt-1">
                Version: {metrics.model_version}
              </div>
            </div>
          </div>

          {/* Actual Score Distribution Chart */}
          {chartData.length > 1 && (
            <div className="scada-card p-6">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wide font-mono mb-4 flex items-center justify-between">
                <span>Recent Anomaly Decision Scores (Threshold: 0.0)</span>
                <span className="text-[10px] text-slate-500 font-normal">Real-Time Inferences</span>
              </h2>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridStroke} />
                    <XAxis dataKey="time" stroke={chartTheme.textColor} fontSize={11} fontFamily="monospace" />
                    <YAxis stroke={chartTheme.textColor} fontSize={11} fontFamily="monospace" domain={['auto', 'auto']} />
                    <Tooltip
                      contentStyle={{ backgroundColor: chartTheme.tooltipBg, borderColor: chartTheme.tooltipBorder, borderRadius: '8px', color: chartTheme.tooltipText, fontSize: '12px', fontFamily: 'monospace' }}
                      formatter={(val: any) => [Number(val).toFixed(5), 'Isolation Score']}
                    />
                    <ReferenceLine y={0.0} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Threshold 0.0', fill: '#ef4444', fontSize: 10, position: 'top' }} />
                    <Line type="monotone" dataKey="score" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3, fill: '#8b5cf6' }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Recent Anomaly Events Table */}
          <div className="scada-table-container">
            <div className="p-4 border-b border-slate-200 dark:border-[#1F293D] flex items-center justify-between bg-slate-50 dark:bg-[#161F30]">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wide font-mono">
                Recent Anomaly Events
              </h2>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                {metrics.recent_events.length} Events Logged
              </span>
            </div>

            {metrics.recent_events.length === 0 ? (
              <EmptyState
                title="No Anomalies Logged"
                message="No recent observations have triggered an Isolation Forest anomaly flag."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="scada-table-header">
                      <th className="py-2.5 px-4">Result ID</th>
                      <th className="py-2.5 px-4">Reading ID</th>
                      <th className="py-2.5 px-4">Decision Score</th>
                      <th className="py-2.5 px-4">Classification</th>
                      <th className="py-2.5 px-4">Inference Time</th>
                      <th className="py-2.5 px-4 text-right">Inspect Reading</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-[#1F293D]/60 font-mono">
                    {metrics.recent_events.map((evt) => (
                      <tr key={evt.anomaly_result_id} className="scada-table-row">
                        <td className="py-2.5 px-4 text-slate-500 dark:text-slate-400 select-all">
                          {evt.anomaly_result_id.slice(0, 8)}...
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-cyan-700 dark:text-cyan-400 select-all">
                          <Link to={`/readings/${evt.reading_id}`} className="hover:underline">
                            {evt.reading_id.slice(0, 8)}...
                          </Link>
                        </td>
                        <td className="py-2.5 px-4 font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                          {evt.anomaly_score !== null ? Number(evt.anomaly_score).toFixed(5) : 'N/A'}
                        </td>
                        <td className="py-2.5 px-4">
                          <AnomalyStatusBadge status="anomalous" />
                        </td>
                        <td className="py-2.5 px-4 text-slate-500 dark:text-slate-400">
                          {new Date(evt.inference_at).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-4 text-right font-sans">
                          <Link
                            to={`/readings/${evt.reading_id}`}
                            className="text-cyan-700 hover:text-cyan-800 dark:text-cyan-400 dark:hover:text-cyan-300 font-mono text-xs font-medium inline-flex items-center gap-1"
                          >
                            Inspect &rarr;
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
};
export default AnomaliesPage;
