import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getReadingApi } from '../api/readings';
import { getValidationReportApi, runValidationApi } from '../api/validation';
import { getAnomalyReportApi, inferAnomalyApi } from '../api/anomalies';
import { useAuth } from '../context/AuthContext';
import { LoadingState, ErrorState } from '../components/common/States';
import { QualityBadge, AnomalyStatusBadge } from '../components/common/Badges';
import {
  ArrowLeft,
  Activity,
  CheckCircle,
  AlertTriangle,
  Play,
  Clock,
  Layers,
  Database,
  Shield,
  Cpu,
} from 'lucide-react';

export const ReadingDetailPage: React.FC = () => {
  const { readingId } = useParams<{ readingId: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const isOperatorOrAdmin = user?.role === 'operator' || user?.role === 'admin';

  // Layer 1: Observation
  const readingQuery = useQuery({
    queryKey: ['reading', readingId],
    queryFn: () => getReadingApi(readingId!),
    enabled: !!readingId,
  });

  // Layer 2: Deterministic Pre-AI Validation
  const validationQuery = useQuery({
    queryKey: ['validation', readingId],
    queryFn: () => getValidationReportApi(readingId!),
    enabled: !!readingId,
  });

  // Layer 3: AI Anomaly Inference (Isolation Forest)
  const anomalyQuery = useQuery({
    queryKey: ['anomaly', readingId],
    queryFn: () => getAnomalyReportApi(readingId!),
    enabled: !!readingId,
  });

  // Re-run validation mutation
  const runValidationMutation = useMutation({
    mutationFn: () => runValidationApi(readingId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['validation', readingId] });
      queryClient.invalidateQueries({ queryKey: ['reading', readingId] });
    },
  });

  // Re-run anomaly inference mutation
  const runAnomalyMutation = useMutation({
    mutationFn: () => inferAnomalyApi({ reading_id: readingId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anomaly', readingId] });
      queryClient.invalidateQueries({ queryKey: ['reading', readingId] });
      queryClient.invalidateQueries({ queryKey: ['anomaly-metrics'] });
    },
  });

  if (!readingId) {
    return <ErrorState error={new Error('No reading ID provided in URL path')} />;
  }

  if (readingQuery.isLoading) {
    return <LoadingState message="Fetching observation telemetry and evidence records..." />;
  }

  if (readingQuery.isError || !readingQuery.data) {
    return (
      <ErrorState
        error={readingQuery.error || new Error('Reading not found')}
        onRetry={() => readingQuery.refetch()}
      />
    );
  }

  const reading = readingQuery.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
        <Link to="/readings" className="hover:text-cyan-400 inline-flex items-center gap-1 font-medium transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Telemetry Table
        </Link>
      </div>

      <div className="pb-4 border-b border-[#1F293D]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-semibold bg-cyan-950/60 border border-cyan-800/80 px-2 py-0.5 rounded">
                Telemetry Deep Audit
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-mono">
              Telemetry Evidence Multi-Layer Inspection
            </h1>
            <p className="text-xs text-slate-400 font-mono mt-1 select-all">
              Reading ID: <span className="font-semibold text-cyan-400">{reading.reading_id}</span>
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <QualityBadge status={reading.quality_status} />
            <AnomalyStatusBadge status={reading.anomaly_status} score={reading.anomaly_score} />
          </div>
        </div>
      </div>

      {/* Layer 1: Physical Observation Boundary */}
      <div className="scada-card p-6">
        <div className="flex items-center justify-between pb-3.5 border-b border-[#1F293D]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-cyan-950/60 border border-cyan-800 text-cyan-400">
              <Activity className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-semibold text-white uppercase tracking-wide font-mono">
              Layer 1: Physical Observation
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-4 text-xs font-mono">
          <div className="p-3 bg-[#0B0F17]/60 border border-[#1F293D] rounded-lg">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Parameter</span>
            <span className="text-base font-bold text-white mt-0.5 block">{reading.parameter}</span>
          </div>

          <div className="p-3 bg-[#0B0F17]/60 border border-[#1F293D] rounded-lg">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Observed Value &amp; Unit</span>
            <span className="text-base font-bold text-cyan-400 mt-0.5 block tabular-nums">
              {reading.value !== null ? `${reading.value} ${reading.unit}` : 'null'}
            </span>
          </div>

          <div className="p-3 bg-[#0B0F17]/60 border border-[#1F293D] rounded-lg">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Treatment Stage</span>
            <span className="text-sm font-semibold text-slate-200 mt-0.5 block">
              {reading.treatment_stage || 'Not specified'}
            </span>
          </div>

          <div className="p-3 bg-[#0B0F17]/60 border border-[#1F293D] rounded-lg">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Observation Timestamp</span>
            <span className="text-xs text-slate-300 mt-0.5 block">
              {new Date(reading.observed_at).toLocaleString()}
            </span>
          </div>

          <div className="p-3 bg-[#0B0F17]/60 border border-[#1F293D] rounded-lg">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Facility ID</span>
            <Link
              to={`/facilities/${reading.facility_id}`}
              className="text-xs text-cyan-400 hover:underline select-all mt-0.5 block truncate"
            >
              {reading.facility_id}
            </Link>
          </div>

          <div className="p-3 bg-[#0B0F17]/60 border border-[#1F293D] rounded-lg">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Sensor Node ID</span>
            <span className="text-xs text-slate-300 mt-0.5 block truncate">
              {reading.sensor_id || 'Virtual / Unmapped'}
            </span>
          </div>

          <div className="p-3 bg-[#0B0F17]/60 border border-[#1F293D] rounded-lg">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Telemetry Source</span>
            <span className="text-xs text-slate-300 mt-0.5 block">{reading.source}</span>
          </div>

          <div className="p-3 bg-[#0B0F17]/60 border border-[#1F293D] rounded-lg">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Ingested At</span>
            <span className="text-xs text-slate-400 mt-0.5 block">
              {new Date(reading.created_at).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Layer 2: Deterministic Pre-AI Validation */}
      <div className="scada-card p-6">
        <div className="flex items-center justify-between pb-3.5 border-b border-[#1F293D]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-emerald-950/60 border border-emerald-800 text-emerald-400">
              <CheckCircle className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-semibold text-white uppercase tracking-wide font-mono">
              Layer 2: Deterministic Validation
            </h2>
          </div>
          {isOperatorOrAdmin && (
            <button
              onClick={() => runValidationMutation.mutate()}
              disabled={runValidationMutation.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1E293B] hover:bg-slate-700 border border-[#334155] text-slate-200 rounded-lg text-xs font-mono font-medium transition-colors disabled:opacity-50"
            >
              <Play className="w-3 h-3 text-cyan-400" />
              Re-run Validation
            </button>
          )}
        </div>

        {validationQuery.isLoading ? (
          <LoadingState message="Evaluating deterministic rules..." className="py-6" />
        ) : validationQuery.isError ? (
          <ErrorState error={validationQuery.error} />
        ) : validationQuery.data ? (
          <div className="space-y-4 pt-4 text-xs font-mono">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-[#0B0F17]/60 border border-[#1F293D] rounded-lg">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold mb-1">Quality Status</span>
                <QualityBadge status={validationQuery.data.quality_status} />
              </div>

              <div className="p-3 bg-[#0B0F17]/60 border border-[#1F293D] rounded-lg">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold mb-1">Engine Version</span>
                <span className="text-slate-200 font-semibold">{validationQuery.data.validation_version}</span>
              </div>

              <div className="p-3 bg-[#0B0F17]/60 border border-[#1F293D] rounded-lg">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold mb-1">Validated At</span>
                <span className="text-slate-300">{new Date(validationQuery.data.validated_at).toLocaleString()}</span>
              </div>

              <div className="p-3 bg-[#0B0F17]/60 border border-[#1F293D] rounded-lg">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold mb-1">Validation Result ID</span>
                <span className="text-cyan-400 select-all truncate block">{validationQuery.data.validation_result_id}</span>
              </div>
            </div>

            <div className="p-3.5 bg-[#0B0F17]/60 border border-[#1F293D] rounded-lg">
              <span className="text-slate-400 font-semibold block text-[11px] mb-2 uppercase">
                Deterministic Validation Rule Flags:
              </span>
              {validationQuery.data.validation_flags && validationQuery.data.validation_flags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {validationQuery.data.validation_flags.map((flag, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded text-xs font-mono bg-rose-950/70 border border-rose-700 text-rose-300 font-semibold"
                    >
                      {flag}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-emerald-400 font-mono text-xs flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5" />
                  No anomaly/quality flags triggered (clean deterministic passage).
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="text-xs text-slate-400 py-3 font-mono">No validation report recorded.</div>
        )}
      </div>

      {/* Layer 3: AI Anomaly Inference (Isolation Forest) */}
      <div className="scada-card p-6">
        <div className="flex items-center justify-between pb-3.5 border-b border-[#1F293D]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-purple-950/60 border border-purple-800 text-purple-400">
              <Cpu className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-semibold text-white uppercase tracking-wide font-mono">
              Layer 3: AI Anomaly Inference (Isolation Forest)
            </h2>
          </div>
          {isOperatorOrAdmin && (
            <button
              onClick={() => runAnomalyMutation.mutate()}
              disabled={runAnomalyMutation.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-950/80 hover:bg-purple-900 border border-purple-700 text-purple-200 rounded-lg text-xs font-mono font-medium transition-colors disabled:opacity-50"
            >
              <Play className="w-3 h-3" />
              Re-run Inference
            </button>
          )}
        </div>

        {anomalyQuery.isLoading ? (
          <LoadingState message="Executing Isolation Forest inference..." className="py-6" />
        ) : anomalyQuery.isError ? (
          <ErrorState error={anomalyQuery.error} />
        ) : anomalyQuery.data ? (
          <div className="space-y-4 pt-4 text-xs font-mono">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-[#0B0F17]/60 border border-[#1F293D] rounded-lg">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold mb-1">Anomaly Status</span>
                <AnomalyStatusBadge
                  status={anomalyQuery.data.anomaly_status}
                  score={anomalyQuery.data.anomaly_score}
                />
              </div>

              <div className="p-3 bg-[#0B0F17]/60 border border-[#1F293D] rounded-lg">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Raw Decision Score</span>
                <span className="text-base font-bold text-white mt-0.5 block tabular-nums">
                  {anomalyQuery.data.anomaly_score !== null && anomalyQuery.data.anomaly_score !== undefined
                    ? Number(anomalyQuery.data.anomaly_score).toFixed(6)
                    : 'N/A'}
                </span>
                <span className="block text-[10px] text-slate-400 mt-0.5">
                  Threshold: &lt; 0.0 denotes anomaly
                </span>
              </div>

              <div className="p-3 bg-[#0B0F17]/60 border border-[#1F293D] rounded-lg">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Model Version</span>
                <span className="text-slate-200 font-semibold mt-0.5 block">{anomalyQuery.data.model_version}</span>
              </div>

              <div className="p-3 bg-[#0B0F17]/60 border border-[#1F293D] rounded-lg">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Feature Set Version</span>
                <span className="text-slate-200 font-semibold mt-0.5 block">
                  {anomalyQuery.data.feature_set_version}
                </span>
              </div>

              <div className="p-3 bg-[#0B0F17]/60 border border-[#1F293D] rounded-lg">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Inference Timestamp</span>
                <span className="text-slate-300 mt-0.5 block">
                  {anomalyQuery.data.inference_at
                    ? new Date(anomalyQuery.data.inference_at).toLocaleString()
                    : 'N/A'}
                </span>
              </div>

              <div className="p-3 bg-[#0B0F17]/60 border border-[#1F293D] rounded-lg">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Binary Flag</span>
                <span className="text-slate-200 font-semibold mt-0.5 block">
                  {anomalyQuery.data.is_anomalous ? 'true (Anomalous)' : 'false (Normal)'}
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-[#0B0F17]/60 border border-[#1F293D] rounded-lg">
              <span className="text-slate-400 font-semibold block text-[11px] mb-2 uppercase">
                Features Extracted by Inference Pipeline:
              </span>
              {anomalyQuery.data.features &&
              typeof anomalyQuery.data.features === 'object' &&
              Object.keys(anomalyQuery.data.features).length > 0 ? (
                <div className="bg-[#070B12] border border-[#1F293D] rounded-lg p-3 text-[11px] font-mono text-cyan-300 overflow-auto max-h-48">
                  <pre>{JSON.stringify(anomalyQuery.data.features, null, 2)}</pre>
                </div>
              ) : (
                <span className="text-slate-400 font-mono text-xs">
                  No feature vector attached to this inference result.
                </span>
              )}
            </div>

            <div className="p-3 bg-[#0B0F17]/80 border border-[#1F293D] rounded-lg text-[10px] text-slate-400 font-mono">
              Notice: The backend utilizes Scikit-learn Isolation Forest. Scores represent raw decision function values rather than heuristic percentages or probability estimates.
            </div>
          </div>
        ) : (
          <div className="text-xs text-slate-400 py-3 font-mono">No AI inference record found.</div>
        )}
      </div>
    </div>
  );
};
export default ReadingDetailPage;
