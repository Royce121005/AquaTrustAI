/**
 * AquaTrust AI — Sensor Health & Calibration Table
 * Displays sensor health index, calibration overdue countdowns, drift warning flags,
 * and enables operators to trigger routine or corrective calibrations.
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Wrench,
  ShieldAlert,
  RotateCw,
} from 'lucide-react';
import {
  getSensorHealthApi,
  calibrateSensorApi,
  SensorHealthItem,
  SensorCalibrationRequest,
} from '../../api/sensors';

interface SensorHealthTableProps {
  facilityId: string;
}

export const SensorHealthTable: React.FC<SensorHealthTableProps> = ({ facilityId }) => {
  const queryClient = useQueryClient();
  const [selectedSensor, setSelectedSensor] = useState<SensorHealthItem | null>(null);
  const [calNotes, setCalNotes] = useState<string>('');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['sensor-health', facilityId],
    queryFn: () => getSensorHealthApi(facilityId),
    enabled: !!facilityId,
    refetchInterval: 30000,
  });

  const calibrateMutation = useMutation({
    mutationFn: (req: SensorCalibrationRequest) => calibrateSensorApi(req),
    onSuccess: () => {
      setSelectedSensor(null);
      setCalNotes('');
      queryClient.invalidateQueries({ queryKey: ['sensor-health', facilityId] });
      queryClient.invalidateQueries({ queryKey: ['audit-timeline'] });
    },
  });

  const handleCalibrateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSensor) return;
    calibrateMutation.mutate({
      sensor_id: selectedSensor.sensor_id,
      calibration_type: selectedSensor.drift_flag ? 'drift_correction' : 'routine_standard',
      notes: calNotes || 'Calibrated via Sensor Maintenance Console',
    });
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 animate-pulse">
        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/4 mb-4" />
        <div className="h-40 bg-slate-100 dark:bg-slate-800/40 rounded-lg" />
      </div>
    );
  }

  if (isError || !data || data.sensors.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 text-center text-slate-500 dark:text-slate-400">
        <Activity className="h-8 w-8 text-slate-400 dark:text-slate-600 mx-auto mb-2" />
        <p className="text-sm">No sensors registered for this facility.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1F293D] rounded-xl p-5 shadow-sm dark:shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-200 dark:border-[#1F293D]">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-[#0EA5E9]/15 text-[#0EA5E9] border border-[#0EA5E9]/30">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Sensor Trust & Calibration Maintenance</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              Overall Health Index: <span className="font-bold text-[#0EA5E9]">{data.overall_health_index}%</span> |{' '}
              {data.healthy_sensors}/{data.total_sensors} Healthy
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {data.drift_flagged_sensors > 0 && (
            <span className="flex items-center gap-1 text-xs px-2.5 py-1 bg-[#F59E0B]/15 text-amber-500 dark:text-amber-400 border border-[#F59E0B]/30 rounded-full font-mono font-medium">
              <AlertTriangle className="h-3.5 w-3.5" />
              {data.drift_flagged_sensors} Drift Flagged
            </span>
          )}
          {data.overdue_calibration_sensors > 0 && (
            <span className="flex items-center gap-1 text-xs px-2.5 py-1 bg-[#EF4444]/15 text-rose-500 dark:text-rose-400 border border-[#EF4444]/30 rounded-full font-mono font-medium">
              <ShieldAlert className="h-3.5 w-3.5" />
              {data.overdue_calibration_sensors} Overdue Calibration
            </span>
          )}
          <button
            onClick={() => refetch()}
            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-[#161F30] border border-slate-200 dark:border-[#1F293D] transition"
            title="Refresh Sensors"
          >
            <RotateCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead>
            <tr className="border-b border-slate-200 dark:border-[#1F293D] text-slate-600 dark:text-slate-400 uppercase tracking-wider text-[11px] bg-slate-50 dark:bg-[#161F30]">
              <th className="py-2.5 px-3">Parameter</th>
              <th className="py-2.5 px-3">Stage</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3">Calibration Status</th>
              <th className="py-2.5 px-3">Drift Flag</th>
              <th className="py-2.5 px-3 text-right">Health Score</th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-[#1F293D]">
            {data.sensors.map((sensor) => {
              const isOverdue = sensor.calibration_status === 'overdue';
              const isDue = sensor.calibration_status === 'due';

              return (
                <tr key={sensor.sensor_id} className="hover:bg-slate-50 dark:hover:bg-[#161F30] transition">
                  <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white uppercase">
                    {sensor.parameter} <span className="text-[10px] text-slate-500 dark:text-slate-400">({sensor.unit})</span>
                  </td>
                  <td className="py-3 px-3 text-slate-600 dark:text-slate-400 capitalize">
                    {sensor.treatment_stage?.replace(/_/g, ' ') || 'Stage N/A'}
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#10B981]/15 text-emerald-700 dark:text-emerald-400 border border-[#10B981]/30">
                      {sensor.status}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${
                        isOverdue
                          ? 'bg-[#EF4444]/15 text-rose-700 dark:text-rose-400 border border-[#EF4444]/30'
                          : isDue
                          ? 'bg-[#F59E0B]/15 text-amber-700 dark:text-amber-400 border border-[#F59E0B]/30'
                          : 'bg-[#10B981]/15 text-emerald-700 dark:text-emerald-400 border border-[#10B981]/30'
                      }`}
                    >
                      <Clock className="h-3 w-3" />
                      {sensor.calibration_status} ({sensor.days_since_calibration ?? 0}d)
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    {sensor.drift_flag ? (
                      <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Drifting
                      </span>
                    ) : (
                      <span className="text-slate-500 dark:text-slate-400">Stable</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span
                      className={`font-bold ${
                        sensor.health_score >= 80
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : sensor.health_score >= 50
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {sensor.health_score.toFixed(0)}%
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => setSelectedSensor(sensor)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#0EA5E9] hover:text-white bg-[#0EA5E9]/10 hover:bg-[#0EA5E9] border border-[#0EA5E9]/30 rounded transition"
                    >
                      <Wrench className="h-3 w-3" />
                      Calibrate
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Calibration Modal */}
      {selectedSensor && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1F293D] rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h4 className="text-base font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
              <Wrench className="h-5 w-5 text-[#0EA5E9]" />
              Calibrate Sensor: {selectedSensor.parameter.toUpperCase()}
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
              Current Drift Flag: {selectedSensor.drift_flag ? 'TRUE (Drift Detected)' : 'FALSE (Stable)'}.
              Submitting calibration resets the 30-day countdown and clears active drift penalties.
            </p>

            <form onSubmit={handleCalibrateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Operator Notes / Calibration Standard
                </label>
                <textarea
                  value={calNotes}
                  onChange={(e) => setCalNotes(e.target.value)}
                  placeholder="e.g., Two-point pH buffer calibration (4.0 & 7.0) verified."
                  className="w-full bg-slate-50 dark:bg-[#0B0F17] border border-slate-300 dark:border-[#1F293D] rounded-lg p-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#0EA5E9]"
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setSelectedSensor(null)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-[#161F30] rounded-lg border border-slate-200 dark:border-[#1F293D]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={calibrateMutation.isPending}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-white bg-[#0EA5E9] hover:bg-[#0284C7] rounded-lg shadow-sm disabled:opacity-50"
                >
                  {calibrateMutation.isPending ? 'Calibrating...' : 'Confirm Calibration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
