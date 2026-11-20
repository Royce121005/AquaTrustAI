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
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 text-center animate-pulse">
        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/3 mb-4 mx-auto" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-slate-100 dark:bg-slate-800/50 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !data?.has_prediction || !data.latest_prediction) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <Sparkles className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">AI Treatment Forecast (4–8h Forward)</h3>
          </div>
          <button
            onClick={() => refetch()}
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 font-medium"
          >
            Refresh
          </button>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          No live forecast currently computed. Forward predictions are gated until mandatory influent
          features pass validation.
        </p>
      </div>
    );
  }

  const pred = data.latest_prediction;
  const isCompliant = pred.is_cpcb_compliant;

  return (
    <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1F293D] rounded-xl p-5 shadow-sm dark:shadow-xl">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200 dark:border-[#1F293D]">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-indigo-500/10 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 dark:border-indigo-500/30">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">AI Predictive Effluent Forecast</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5 font-mono">
              <Clock className="h-3 w-3" />
              Horizon: {pred.horizon_hours}h ahead | Model: {pred.model_version}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold font-mono ${
              isCompliant
                ? 'bg-emerald-50 dark:bg-[#10B981]/15 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-[#10B981]/30'
                : 'bg-rose-50 dark:bg-[#EF4444]/15 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-[#EF4444]/30'
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
              className={`p-3.5 rounded-xl border transition ${
                isBreach
                  ? 'bg-rose-50/70 dark:bg-[#EF4444]/10 border-rose-200 dark:border-[#EF4444]/30'
                  : isBorderline
                  ? 'bg-amber-50/70 dark:bg-[#F59E0B]/10 border-amber-200 dark:border-[#F59E0B]/30'
                  : 'bg-slate-50 dark:bg-[#161F30]/60 border-slate-200 dark:border-[#1F293D]'
              }`}
            >
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1 font-mono">
                <span className="font-bold uppercase text-slate-900 dark:text-white">{p.parameter}</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">Max {p.cpcb_discharge_limit}</span>
              </div>
              <div className="flex items-baseline space-x-1.5 my-1 font-mono">
                <span className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {p.predicted_value.toFixed(1)}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">{p.unit}</span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between mt-2 pt-1.5 border-t border-slate-200 dark:border-[#1F293D] font-mono">
                <span>Removal</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {p.expected_removal_efficiency_pct.toFixed(0)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {pred.summary_explanation && (
        <div className="mt-3.5 text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-[#0B0F17] p-3 rounded-lg border border-slate-200 dark:border-[#1F293D] font-mono">
          <span className="font-bold text-indigo-600 dark:text-indigo-300">Prescriptive Insight: </span>
          {pred.summary_explanation}
        </div>
      )}
    </div>
  );
};
