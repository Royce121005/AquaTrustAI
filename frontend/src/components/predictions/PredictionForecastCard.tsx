/**
 * AquaTrust AI — Prediction Quality Forecast Card
 * Displays 4–8 hour ahead forecast values for BOD, COD, TSS, and pH
 * alongside CPCB Schedule VI discharge limits and risk badges.
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, AlertTriangle, CheckCircle2, ShieldAlert, Clock, Sparkles } from 'lucide-react';
import { getLatestPredictionApi } from '../../api/predictions';

interface PredictionForecastCardProps {
  facilityId: string;
}

export const PredictionForecastCard: React.FC<PredictionForecastCardProps> = ({ facilityId }) => {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['latest-prediction', facilityId],
    queryFn: () => getLatestPredictionApi(facilityId),
    enabled: !!facilityId,
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-center animate-pulse">
        <div className="h-4 bg-slate-800 rounded w-1/3 mb-4 mx-auto" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-slate-800/50 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !data?.has_prediction || !data.latest_prediction) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <Sparkles className="h-5 w-5 text-indigo-400" />
            <h3 className="text-sm font-semibold text-white">AI Treatment Forecast (4–8h Forward)</h3>
          </div>
          <button
            onClick={() => refetch()}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
          >
            Refresh
          </button>
        </div>
        <p className="text-xs text-slate-400">
          No live forecast currently computed. Forward predictions are gated until mandatory influent
          features pass validation.
        </p>
      </div>
    );
  }

  const pred = data.latest_prediction;
  const isCompliant = pred.is_cpcb_compliant;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">AI Predictive Effluent Forecast</h3>
            <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
              <Clock className="h-3 w-3" />
              Horizon: {pred.horizon_hours}h ahead | Model: {pred.model_version}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
              isCompliant
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }`}
          >
            {isCompliant ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                CPCB Compliant Forecast
              </>
            ) : (
              <>
                <ShieldAlert className="h-3.5 w-3.5" />
                Breach Risk Forecast
              </>
            )}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(pred.predicted_parameters).map(([paramKey, p]) => {
          const isBreach = p.risk_level === 'BREACH_RISK';
          const isBorderline = p.risk_level === 'BORDERLINE';

          return (
            <div
              key={paramKey}
              className={`p-3.5 rounded-lg border transition ${
                isBreach
                  ? 'bg-rose-950/20 border-rose-900/50'
                  : isBorderline
                  ? 'bg-amber-950/20 border-amber-900/50'
                  : 'bg-slate-800/40 border-slate-700/60'
              }`}
            >
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span className="font-semibold uppercase text-slate-300">{p.parameter}</span>
                <span className="text-[10px] text-slate-500">Max {p.cpcb_discharge_limit}</span>
              </div>
              <div className="flex items-baseline space-x-1.5 my-1">
                <span className="text-xl font-bold text-white tracking-tight">
                  {p.predicted_value.toFixed(1)}
                </span>
                <span className="text-xs text-slate-400">{p.unit}</span>
              </div>
              <div className="text-[11px] text-slate-400 flex items-center justify-between mt-2 pt-1.5 border-t border-slate-800/80">
                <span>Removal</span>
                <span className="font-medium text-emerald-400">
                  {p.expected_removal_efficiency_pct.toFixed(0)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {pred.summary_explanation && (
        <div className="mt-3.5 text-xs text-slate-300 bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/50">
          <span className="font-medium text-indigo-300">Prescriptive Insight: </span>
          {pred.summary_explanation}
        </div>
      )}
    </div>
  );
};
