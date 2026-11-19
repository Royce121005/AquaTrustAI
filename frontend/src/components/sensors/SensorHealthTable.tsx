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
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 animate-pulse">
        <div className="h-4 bg-slate-800 rounded w-1/4 mb-4" />
        <div className="h-40 bg-slate-800/40 rounded-lg" />
      </div>
    );
  }

  if (isError || !data || data.sensors.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-center text-slate-400">
        <Activity className="h-8 w-8 text-slate-600 mx-auto mb-2" />
        <p className="text-sm">No sensors registered for this facility.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Sensor Trust & Calibration Maintenance</h3>
            <p className="text-xs text-slate-400">
              Overall Health Index: <span className="font-bold text-sky-400">{data.overall_health_index}%</span> |{' '}
              {data.healthy_sensors}/{data.total_sensors} Healthy
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {data.drift_flagged_sensors > 0 && (
            <span className="flex items-center gap-1 text-xs px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full font-medium">
              <AlertTriangle className="h-3.5 w-3.5" />
              {data.drift_flagged_sensors} Drift Flagged
            </span>
          )}
          {data.overdue_calibration_sensors > 0 && (
            <span className="flex items-center gap-1 text-xs px-2.5 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-full font-medium">
              <ShieldAlert className="h-3.5 w-3.5" />
              {data.overdue_calibration_sensors} Overdue Calibration
            </span>
          )}
          <button
            onClick={() => refetch()}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            title="Refresh Sensors"
          >
            <RotateCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[11px]">
              <th className="py-2.5 px-3">Parameter</th>
              <th className="py-2.5 px-3">Stage</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3">Calibration Status</th>
              <th className="py-2.5 px-3">Drift Flag</th>
              <th className="py-2.5 px-3 text-right">Health Score</th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {data.sensors.map((sensor) => {
              const isOverdue = sensor.calibration_status === 'overdue';
              const isDue = sensor.calibration_status === 'due';

              return (
                <tr key={sensor.sensor_id} className="hover:bg-slate-800/30 transition">
                  <td className="py-3 px-3 font-semibold text-slate-200 uppercase">
                    {sensor.parameter} <span className="text-[10px] text-slate-500">({sensor.unit})</span>
                  </td>
                  <td className="py-3 px-3 text-slate-400 capitalize">
                    {sensor.treatment_stage?.replace(/_/g, ' ') || 'Stage N/A'}
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {sensor.status}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${
                        isOverdue
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : isDue
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}
                    >
                      <Clock className="h-3 w-3" />
                      {sensor.calibration_status} ({sensor.days_since_calibration ?? 0}d)
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    {sensor.drift_flag ? (
                      <span className="inline-flex items-center gap-1 text-amber-400 font-semibold">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Drifting
                      </span>
                    ) : (
                      <span className="text-slate-500">Stable</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span
                      className={`font-bold ${
                        sensor.health_score >= 80
                          ? 'text-emerald-400'
                          : sensor.health_score >= 50
                          ? 'text-amber-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {sensor.health_score.toFixed(0)}%
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => setSelectedSensor(sensor)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-sky-400 hover:text-white bg-sky-500/10 hover:bg-sky-600 border border-sky-500/20 rounded transition"
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
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h4 className="text-base font-semibold text-white mb-2 flex items-center gap-2">
              <Wrench className="h-5 w-5 text-sky-400" />
              Calibrate Sensor: {selectedSensor.parameter.toUpperCase()}
            </h4>
            <p className="text-xs text-slate-400 mb-4">
              Current Drift Flag: {selectedSensor.drift_flag ? 'TRUE (Drift Detected)' : 'FALSE (Stable)'}.
              Submitting calibration resets the 30-day countdown and clears active drift penalties.
            </p>

            <form onSubmit={handleCalibrateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Operator Notes / Calibration Standard
                </label>
                <textarea
                  value={calNotes}
                  onChange={(e) => setCalNotes(e.target.value)}
                  placeholder="e.g., Two-point pH buffer calibration (4.0 & 7.0) verified."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-sky-500"
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setSelectedSensor(null)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-400 hover:text-white bg-slate-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={calibrateMutation.isPending}
                  className="px-4 py-2 text-xs font-medium text-white bg-sky-600 hover:bg-sky-500 rounded-lg shadow-sm disabled:opacity-50"
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
