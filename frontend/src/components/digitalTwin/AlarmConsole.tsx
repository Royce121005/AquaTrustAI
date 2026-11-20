import React, { useState } from 'react';
import {
  AlertTriangle,
  AlertOctagon,
  Info,
  CheckCircle2,
  BellRing,
  Clock,
  Filter,
  Check,
} from 'lucide-react';
import { TwinAlarmEvent } from '../../types/digitalTwin';

interface AlarmConsoleProps {
  alarms: TwinAlarmEvent[];
  onAcknowledge: (alarmId: string) => void;
  isLoading?: boolean;
}

export const AlarmConsole: React.FC<AlarmConsoleProps> = ({
  alarms,
  onAcknowledge,
  isLoading = false,
}) => {
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'critical' | 'warning' | 'unacked'>('all');

  const filteredAlarms = alarms.filter((a) => {
    if (a.status === 'resolved') return false;
    if (filterSeverity === 'critical') return a.severity === 'critical';
    if (filterSeverity === 'warning') return a.severity === 'warning';
    if (filterSeverity === 'unacked') return !a.acknowledged;
    return true;
  });

  const criticalCount = alarms.filter((a) => a.severity === 'critical' && a.status !== 'resolved').length;
  const warningCount = alarms.filter((a) => a.severity === 'warning' && a.status !== 'resolved').length;
  const unackedCount = alarms.filter((a) => !a.acknowledged && a.status !== 'resolved').length;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm dark:shadow-xl">
      {/* Console Header */}
      <div className="p-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-rose-100 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/60 text-rose-600 dark:text-rose-400">
            <BellRing className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              SCADA Alarm & Compliance Event Console
              {unackedCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white font-mono text-[10px] font-bold">
                  {unackedCount} UNACKED
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Deterministic CPCB boundary checks & process kinetic anomaly triggers
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-mono">
          <button
            onClick={() => setFilterSeverity('all')}
            className={`px-2.5 py-1 rounded transition-colors ${
              filterSeverity === 'all'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            ALL ({alarms.filter((a) => a.status !== 'resolved').length})
          </button>
          <button
            onClick={() => setFilterSeverity('unacked')}
            className={`px-2.5 py-1 rounded transition-colors ${
              filterSeverity === 'unacked'
                ? 'bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300 font-bold border border-rose-200 dark:border-rose-700/60'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            UNACKED ({unackedCount})
          </button>
          <button
            onClick={() => setFilterSeverity('critical')}
            className={`px-2.5 py-1 rounded transition-colors ${
              filterSeverity === 'critical'
                ? 'bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300 font-bold border border-rose-200 dark:border-rose-700/60'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            CRITICAL ({criticalCount})
          </button>
          <button
            onClick={() => setFilterSeverity('warning')}
            className={`px-2.5 py-1 rounded transition-colors ${
              filterSeverity === 'warning'
                ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 font-bold border border-amber-200 dark:border-amber-700/60'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            WARNING ({warningCount})
          </button>
        </div>
      </div>

      {/* Alarm Table */}
      {filteredAlarms.length === 0 ? (
        <div className="p-8 text-center flex flex-col items-center justify-center space-y-2">
          <div className="p-3 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-200">No Active Alarms in Selected View</h4>
          <p className="text-xs text-slate-600 dark:text-slate-500 max-w-sm">
            All treatment stages, sensor boundaries, and biochemical parameters are operating within established CPCB regulatory corridors.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="bg-slate-100/80 dark:bg-slate-950/80 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <th className="py-2.5 px-4 font-semibold">Severity</th>
                <th className="py-2.5 px-4 font-semibold">Treatment Stage</th>
                <th className="py-2.5 px-4 font-semibold">Parameter / Observed</th>
                <th className="py-2.5 px-4 font-semibold">Diagnostic Event Details</th>
                <th className="py-2.5 px-4 font-semibold">Timestamp</th>
                <th className="py-2.5 px-4 font-semibold text-right">Acknowledgement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
              {filteredAlarms.map((alarm) => {
                const isCritical = alarm.severity === 'critical';
                const isWarning = alarm.severity === 'warning';

                return (
                  <tr
                    key={alarm.alarm_id}
                    className={`transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40 ${
                      !alarm.acknowledged ? 'bg-rose-50/30 dark:bg-slate-900/70' : 'opacity-75'
                    }`}
                  >
                    {/* Severity Badge */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                          isCritical
                            ? 'bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                            : isWarning
                            ? 'bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                            : 'bg-sky-50 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800'
                        }`}
                      >
                        {isCritical ? (
                          <AlertOctagon className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                        ) : isWarning ? (
                          <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                        ) : (
                          <Info className="w-3 h-3 text-sky-600 dark:text-sky-400" />
                        )}
                        {alarm.severity}
                      </span>
                    </td>

                    {/* Stage Name */}
                    <td className="py-3 px-4 font-sans font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                      {alarm.stage_name}
                    </td>

                    {/* Parameter vs Threshold */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="uppercase font-bold text-slate-900 dark:text-slate-300">
                        {alarm.parameter}
                      </span>
                      {alarm.observed_value !== null && (
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                          {alarm.observed_value.toFixed(1)} {alarm.unit}{' '}
                          {alarm.threshold_value !== null && (
                            <span className="text-slate-500">(limit: {alarm.threshold_value})</span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Message */}
                    <td className="py-3 px-4 font-sans text-xs text-slate-700 dark:text-slate-300 max-w-md">
                      {alarm.message}
                    </td>

                    {/* Timestamp */}
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400 font-mono text-[11px] whitespace-nowrap">
                      {new Date(alarm.last_updated_at).toLocaleTimeString([], { hour12: false })}
                    </td>

                    {/* Operator Acknowledge Action */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {alarm.acknowledged ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-mono">
                          <Check className="w-3.5 h-3.5" /> Acknowledged
                        </span>
                      ) : (
                        <button
                          onClick={() => onAcknowledge(alarm.alarm_id)}
                          className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 active:scale-95 text-slate-800 dark:text-slate-200 text-xs font-semibold border border-slate-300 dark:border-slate-600 transition-all shadow-sm"
                        >
                          Acknowledge
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
