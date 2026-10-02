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

  if (readingQuery.isError) {
    return <ErrorState error={readingQuery.error} onRetry={() => readingQuery.refetch()} />;
  }

  const reading = readingQuery.data!;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link to="/readings" className="hover:text-brand-600 inline-flex items-center gap-1 font-medium">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Telemetry Table
        </Link>
      </div>

      <div className="pb-4 border-b border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Telemetry Evidence Multi-Layer Inspection
            </h1>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Reading ID: <span className="select-all font-semibold text-slate-800">{reading.reading_id}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <QualityBadge status={reading.quality_status} />
            <AnomalyStatusBadge status={reading.anomaly_status} score={reading.anomaly_score} />
          </div>
        </div>
      </div>

      {/* Layer 1: Physical Observation Boundary */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-brand-600" />
            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
              Layer 1: Physical Observation
            </h2>
          </div>
          <span className="text-[11px] font-mono text-slate-400">Source: Raw SCADA Telemetry</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-4 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px]">Parameter</span>
            <span className="font-mono text-sm font-bold text-slate-900">{reading.parameter}</span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px]">Observed Value & Unit</span>
            <span className="font-mono text-sm font-bold text-brand-700">
              {reading.value !== null ? `${reading.value} ${reading.unit}` : 'null'}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px]">Treatment Stage</span>
            <span className="font-mono text-slate-800 font-medium">
              {reading.treatment_stage || 'Not specified'}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px]">Observation Timestamp</span>
            <span className="font-mono text-slate-800">
              {new Date(reading.observed_at).toLocaleString()}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px]">Facility ID</span>
            <Link
              to={`/facilities/${reading.facility_id}`}
              className="font-mono text-brand-600 hover:underline select-all"
            >
              {reading.facility_id}
            </Link>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px]">Sensor Node ID</span>
            <span className="font-mono text-slate-700">
              {reading.sensor_id || 'Virtual / Unmapped'}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px]">Telemetry Source</span>
            <span className="font-mono text-slate-700">{reading.source}</span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px]">Ingested At</span>
            <span className="font-mono text-slate-600">
              {new Date(reading.created_at).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Layer 2: Deterministic Pre-AI Validation */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
              Layer 2: Deterministic Validation
            </h2>
          </div>
          {isOperatorOrAdmin && (
            <button
              onClick={() => runValidationMutation.mutate()}
              disabled={runValidationMutation.isPending}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium transition-colors disabled:opacity-50"
            >
              <Play className="w-3 h-3" />
              Re-run Validation
            </button>
          )}
        </div>

        {validationQuery.isLoading ? (
          <LoadingState message="Evaluating deterministic rules..." className="py-6" />
        ) : validationQuery.isError ? (
          <ErrorState error={validationQuery.error} />
        ) : validationQuery.data ? (
          <div className="space-y-4 pt-4 text-xs">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <span className="text-slate-400 block text-[11px]">Quality Status</span>
                <QualityBadge status={validationQuery.data.quality_status} />
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Validation Engine Version</span>
                <span className="font-mono text-slate-800">
                  {validationQuery.data.validation_version}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Validated At</span>
                <span className="font-mono text-slate-800">
                  {new Date(validationQuery.data.validated_at).toLocaleString()}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Validation Result ID</span>
                <span className="font-mono text-slate-700 select-all">
                  {validationQuery.data.validation_result_id}
                </span>
              </div>
            </div>

            <div>
              <span className="text-slate-500 font-medium block text-xs mb-1.5">
                Deterministic Validation Rule Flags:
              </span>
              {validationQuery.data.validation_flags && validationQuery.data.validation_flags.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {validationQuery.data.validation_flags.map((flag, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded text-[11px] font-mono bg-rose-50 border border-rose-200 text-rose-800"
                    >
                      {flag}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-slate-500 font-mono text-[11px]">
                  No anomaly/quality flags triggered (clean deterministic passage).
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="text-xs text-slate-500 py-3 font-mono">No validation report recorded.</div>
        )}
      </div>

      {/* Layer 3: AI Anomaly Inference (Isolation Forest) */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-purple-600" />
            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
              Layer 3: AI Anomaly Inference (Isolation Forest)
            </h2>
          </div>
          {isOperatorOrAdmin && (
            <button
              onClick={() => runAnomalyMutation.mutate()}
              disabled={runAnomalyMutation.isPending}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded text-xs font-medium transition-colors disabled:opacity-50"
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
          <div className="space-y-4 pt-4 text-xs">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <span className="text-slate-400 block text-[11px]">Anomaly Status</span>
                <AnomalyStatusBadge
                  status={anomalyQuery.data.anomaly_status}
                  score={anomalyQuery.data.anomaly_score}
                />
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Raw Decision Score</span>
                <span className="font-mono text-slate-800 font-semibold">
                  {anomalyQuery.data.anomaly_score !== null && anomalyQuery.data.anomaly_score !== undefined
                    ? Number(anomalyQuery.data.anomaly_score).toFixed(6)
                    : 'N/A'}
                </span>
                <span className="block text-[10px] text-slate-400 mt-0.5">
                  Threshold: &lt; 0.0 denotes anomaly
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Model Version</span>
                <span className="font-mono text-slate-800">{anomalyQuery.data.model_version}</span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Feature Set Version</span>
                <span className="font-mono text-slate-800">
                  {anomalyQuery.data.feature_set_version}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Inference Timestamp</span>
                <span className="font-mono text-slate-800">
                  {new Date(anomalyQuery.data.inference_at).toLocaleString()}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Binary Flag</span>
                <span className="font-mono text-slate-800">
                  {anomalyQuery.data.is_anomalous ? 'true (Anomalous)' : 'false (Normal)'}
                </span>
              </div>
            </div>

            <div>
              <span className="text-slate-500 font-medium block text-xs mb-1.5">
                Features Extracted by Inference Pipeline:
              </span>
              {anomalyQuery.data.features && Object.keys(anomalyQuery.data.features).length > 0 ? (
                <div className="bg-slate-50 border border-slate-200 rounded p-3 text-[11px] font-mono text-slate-700 overflow-auto max-h-48">
                  <pre>{JSON.stringify(anomalyQuery.data.features, null, 2)}</pre>
                </div>
              ) : (
                <span className="text-slate-400 font-mono text-[11px]">
                  No feature vector attached to this inference result.
                </span>
              )}
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-500 font-mono">
              Notice: The backend utilizes Scikit-learn Isolation Forest. Scores represent raw decision function values rather than heuristic percentages or probability estimates.
            </div>
          </div>
        ) : (
          <div className="text-xs text-slate-500 py-3 font-mono">No AI inference record found.</div>
        )}
      </div>
    </div>
  );
};
