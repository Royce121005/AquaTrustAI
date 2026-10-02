import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getAnomalyMetricsApi } from '../api/anomalies';
import { LoadingState, ErrorState, EmptyState } from '../components/common/States';
import { AnomalyStatusBadge } from '../components/common/Badges';
import { AlertTriangle, Cpu, RefreshCw, Layers, ArrowRight } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from 'recharts';

export const AnomaliesPage: React.FC = () => {
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
          time: new Date(evt.inference_at).toLocaleTimeString(),
          score: evt.anomaly_score !== null ? Number(evt.anomaly_score) : 0,
          readingId: evt.reading_id,
        }))
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            AI Anomaly Detection Engine (Isolation Forest)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time multi-dimensional outlier isolation on wastewater physicochemical parameters.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => metricsQuery.refetch()}
            disabled={metricsQuery.isFetching}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-md text-xs font-medium shadow-sm transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${metricsQuery.isFetching ? 'animate-spin' : ''}`} />
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
            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
                Total Inferences
              </span>
              <div className="text-2xl font-bold text-slate-900 mt-1 font-mono">
                {metrics.total_inferences}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Model: {metrics.model_version}
              </div>
            </div>

            <div className="bg-white border border-rose-200 rounded-lg p-5 shadow-sm bg-rose-50/20">
              <div className="flex items-center justify-between text-rose-700">
                <span className="text-xs font-semibold uppercase tracking-wider">Anomalies Detected</span>
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="text-2xl font-bold text-rose-700 mt-1 font-mono">
                {metrics.anomalies_detected}
              </div>
              <div className="text-[11px] text-rose-600 mt-1">
                Decision function &lt; 0.0
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
                Anomaly Rate
              </span>
              <div className="text-2xl font-bold text-slate-900 mt-1 font-mono">
                {metrics.anomaly_rate_percent}%
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Proportion of outlier observations
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
                Model Architecture
              </span>
              <div className="text-sm font-bold text-purple-700 mt-2 font-mono">
                Isolation Forest
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Version: {metrics.model_version}
              </div>
            </div>
          </div>

          {/* Model Specification & Boundary Notice */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm text-xs text-slate-600 flex items-start gap-3">
            <Cpu className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-900 uppercase tracking-wide block">
                Isolation Forest Decision Function Specification
              </span>
              <p className="mt-1 leading-relaxed">
                The algorithm partitions data points using random orthogonal cuts. The returned value is the raw decision score.
                An anomaly is mathematically defined when <code>raw_score &lt; 0.0</code>.
                Scores are not probability estimates, confidence percentages, or heuristic risk scores.
              </p>
            </div>
          </div>

          {/* Actual Score Distribution Chart (only when events exist) */}
          {chartData.length > 1 && (
            <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-4">
                Recent Anomaly Decision Scores (Threshold: 0.0)
              </h2>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} domain={['auto', 'auto']} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '6px', color: '#fff' }}
                      formatter={(val: any) => [Number(val).toFixed(5), 'Isolation Score']}
                    />
                    <ReferenceLine y={0.0} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Threshold 0.0', fill: '#ef4444', fontSize: 10, position: 'top' }} />
                    <Line type="monotone" dataKey="score" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Recent Anomaly Events Table */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">
                Recent Anomaly Events
              </h2>
              <span className="text-xs text-slate-500 font-mono">
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
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono uppercase text-[11px]">
                      <th className="py-2.5 px-4">Result ID</th>
                      <th className="py-2.5 px-4">Reading ID</th>
                      <th className="py-2.5 px-4">Decision Score</th>
                      <th className="py-2.5 px-4">Classification</th>
                      <th className="py-2.5 px-4">Inference Time</th>
                      <th className="py-2.5 px-4 text-right">Inspect Reading</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {metrics.recent_events.map((evt) => (
                      <tr key={evt.anomaly_result_id} className="hover:bg-slate-50/80">
                        <td className="py-2.5 px-4 text-slate-600 select-all">
                          {evt.anomaly_result_id.slice(0, 8)}...
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-brand-700 select-all">
                          <Link to={`/readings/${evt.reading_id}`} className="hover:underline">
                            {evt.reading_id.slice(0, 8)}...
                          </Link>
                        </td>
                        <td className="py-2.5 px-4 font-bold text-rose-700">
                          {evt.anomaly_score !== null ? Number(evt.anomaly_score).toFixed(5) : 'N/A'}
                        </td>
                        <td className="py-2.5 px-4">
                          <AnomalyStatusBadge status="anomalous" />
                        </td>
                        <td className="py-2.5 px-4 text-slate-500">
                          {new Date(evt.inference_at).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-4 text-right font-sans">
                          <Link
                            to={`/readings/${evt.reading_id}`}
                            className="text-brand-600 hover:text-brand-800 font-medium inline-flex items-center gap-1"
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
            <div className="p-3 bg-slate-50 border-t border-slate-200 text-[10px] text-slate-400 font-mono">
              Source: GET /anomalies/metrics
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};
