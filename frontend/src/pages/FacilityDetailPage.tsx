import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getFacilityApi,
  getFacilitySensorsApi,
  getFacilityReadingsApi,
  createFacilitySensorApi,
  provisionFacilityDefaultSensorsApi,
} from '../api/facilities';
import { LoadingState, ErrorState, EmptyState } from '../components/common/States';
import {
  StatusBadge,
  QualityBadge,
  AnomalyStatusBadge,
} from '../components/common/Badges';
import {
  Building2,
  Cpu,
  Activity,
  ArrowLeft,
  Filter,
  RefreshCw,
  Plus,
  Zap,
  Check,
  X,
} from 'lucide-react';

export const FacilityDetailPage: React.FC = () => {
  const { facilityId } = useParams<{ facilityId: string }>();
  const queryClient = useQueryClient();

  // Filter state for readings
  const [paramFilter, setParamFilter] = useState<string>('');
  const [qualityFilter, setQualityFilter] = useState<string>('');

  // Add Sensor Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newParam, setNewParam] = useState('BOD');
  const [newUnit, setNewUnit] = useState('mg/L');
  const [newStage, setNewStage] = useState('final_effluent');
  const [newModel, setNewModel] = useState('AquaSensor-BOD-Online');

  const facilityQuery = useQuery({
    queryKey: ['facility', facilityId],
    queryFn: () => getFacilityApi(facilityId!),
    enabled: !!facilityId,
  });

  const sensorsQuery = useQuery({
    queryKey: ['facility-sensors', facilityId],
    queryFn: () => getFacilitySensorsApi(facilityId!),
    enabled: !!facilityId,
  });

  const provisionMutation = useMutation({
    mutationFn: () => provisionFacilityDefaultSensorsApi(facilityId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facility-sensors', facilityId] });
      queryClient.invalidateQueries({ queryKey: ['facility-readings', facilityId] });
      queryClient.invalidateQueries({ queryKey: ['sensors-health'] });
    },
  });

  const addSensorMutation = useMutation({
    mutationFn: () =>
      createFacilitySensorApi(facilityId!, {
        parameter: newParam,
        unit: newUnit,
        treatment_stage: newStage,
        metadata: { sensor_model: newModel, sampling_frequency: '15m' },
      }),
    onSuccess: () => {
      setIsAddModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['facility-sensors', facilityId] });
      queryClient.invalidateQueries({ queryKey: ['facility-readings', facilityId] });
      queryClient.invalidateQueries({ queryKey: ['sensors-health'] });
    },
  });

  const readingsQuery = useQuery({
    queryKey: ['facility-readings', facilityId, { parameter: paramFilter, quality_status: qualityFilter }],
    queryFn: () =>
      getFacilityReadingsApi(facilityId!, {
        parameter: paramFilter || undefined,
        quality_status: qualityFilter || undefined,
        limit: 50,
      }),
    enabled: !!facilityId,
  });

  if (!facilityId) {
    return <ErrorState error={new Error('No facility ID provided in route')} />;
  }

  if (facilityQuery.isLoading) {
    return <LoadingState message="Loading facility profile and telemetry metadata..." />;
  }

  if (facilityQuery.isError) {
    return <ErrorState error={facilityQuery.error} onRetry={() => facilityQuery.refetch()} />;
  }

  const fac = facilityQuery.data!;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <Link to="/facilities" className="hover:text-cyan-600 dark:hover:text-[#0EA5E9] inline-flex items-center gap-1.5 font-medium transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Facilities
        </Link>
      </div>

      {/* Facility Header Card */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1F293D] rounded-xl p-6 shadow-sm dark:shadow-xl transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-[#1F293D]">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-[#1F293D] text-[#0EA5E9] rounded-xl shadow-sm dark:shadow-[0_0_15px_rgba(14,165,233,0.15)]">
              <Building2 className="w-6 h-6 text-[#0EA5E9]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">{fac.facility_name}</h1>
                <StatusBadge status={fac.status} />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                Facility ID: <span className="select-all font-semibold text-cyan-700 dark:text-[#0EA5E9]">{fac.facility_id}</span> • Type: <span className="text-slate-700 dark:text-slate-300">{fac.facility_type}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to={`/facilities/${fac.facility_id}/twin`}
              className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-600/20 dark:hover:bg-indigo-600/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
            >
              <Cpu className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              Digital Twin
            </Link>
            <Link
              to={`/readings?facility_id=${fac.facility_id}`}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-[#0B0F17] dark:hover:bg-[#161F30] border border-slate-300 dark:border-[#1F293D] text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg transition-colors"
            >
              Full Telemetry Table
            </Link>
            <Link
              to={`/finalization?facility_id=${fac.facility_id}`}
              className="px-3.5 py-1.5 bg-[#0EA5E9] hover:bg-[#0284C7] text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm transition-all"
            >
              Finalize Window
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 text-xs font-mono">
          <div className="p-3 bg-slate-50 dark:bg-[#161F30]/60 rounded-lg border border-slate-200 dark:border-[#1F293D]">
            <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Design Capacity</span>
            <span className="font-medium text-slate-900 dark:text-white">
              {fac.capacity !== null ? `${fac.capacity} ${fac.capacity_unit || ''}` : 'Not configured'}
            </span>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-[#161F30]/60 rounded-lg border border-slate-200 dark:border-[#1F293D]">
            <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Geographic Location</span>
            <span className="font-medium text-slate-900 dark:text-white truncate block">
              {fac.location && Object.keys(fac.location).length > 0
                ? JSON.stringify(fac.location)
                : 'Unspecified'}
            </span>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-[#161F30]/60 rounded-lg border border-slate-200 dark:border-[#1F293D]">
            <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Created At</span>
            <span className="text-slate-700 dark:text-slate-300">
              {new Date(fac.created_at).toLocaleString()}
            </span>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-[#161F30]/60 rounded-lg border border-slate-200 dark:border-[#1F293D]">
            <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Last Updated</span>
            <span className="text-slate-700 dark:text-slate-300">
              {new Date(fac.updated_at).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Registered Facility Sensors */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1F293D] rounded-xl shadow-sm dark:shadow-xl overflow-hidden transition-colors">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-[#1F293D] flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-[#161F30]/60">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[#0EA5E9]" />
            <h2 className="text-xs font-mono uppercase tracking-wider text-slate-800 dark:text-slate-300 font-semibold">
              Installed Sensor Nodes
            </h2>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono ml-2">
              ({sensorsQuery.data?.length ?? 0} Sensors Registered)
            </span>
          </div>

          <div className="flex items-center gap-2">
            {(!sensorsQuery.data || sensorsQuery.data.length === 0) && (
              <button
                onClick={() => provisionMutation.mutate()}
                disabled={provisionMutation.isPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
              >
                <Zap className="w-3.5 h-3.5" />
                {provisionMutation.isPending ? 'Provisioning Suite...' : 'Provision Standard SCADA Sensors'}
              </button>
            )}
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0EA5E9] hover:bg-[#0284C7] text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Register Sensor
            </button>
          </div>
        </div>

        {sensorsQuery.isLoading ? (
          <LoadingState message="Querying registered sensor probes..." />
        ) : sensorsQuery.isError ? (
          <div className="p-4">
            <ErrorState error={sensorsQuery.error} />
          </div>
        ) : !sensorsQuery.data || sensorsQuery.data.length === 0 ? (
          <div className="p-8 text-center flex flex-col items-center justify-center space-y-3">
            <div className="p-3 rounded-full bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800 text-[#0EA5E9]">
              <Cpu className="w-8 h-8" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              No Hardware Sensors Registered
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md">
              No online telemetry probes are mapped under {fac.facility_name}. You can automatically provision the canonical 9-node CPCB SCADA sensor suite or register custom IoT probes.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => provisionMutation.mutate()}
                disabled={provisionMutation.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider shadow-md transition-all disabled:opacity-50"
              >
                <Zap className="w-4 h-4" />
                {provisionMutation.isPending ? 'Provisioning Sensors...' : 'Provision Standard SCADA Sensors'}
              </button>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-[#161F30] dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-semibold border border-slate-300 dark:border-slate-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Custom Sensor
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/80 dark:bg-[#161F30] border-b border-slate-200 dark:border-[#1F293D] text-slate-600 dark:text-slate-400 font-mono uppercase text-[11px]">
                  <th className="py-2.5 px-4">Sensor ID</th>
                  <th className="py-2.5 px-4">Parameter</th>
                  <th className="py-2.5 px-4">Measurement Unit</th>
                  <th className="py-2.5 px-4">Stage</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-[#1F293D] font-mono">
                {sensorsQuery.data.map((s) => (
                  <tr key={s.sensor_id} className="hover:bg-slate-50 dark:hover:bg-[#161F30] transition-colors">
                    <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-white select-all">{s.sensor_id}</td>
                    <td className="py-2.5 px-4 font-bold text-cyan-700 dark:text-[#0EA5E9]">{s.parameter}</td>
                    <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300">{s.unit}</td>
                    <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400">{s.treatment_stage || 'N/A'}</td>
                    <td className="py-2.5 px-4">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="py-2.5 px-4 text-[11px] text-slate-500 truncate max-w-xs font-mono">
                      {JSON.stringify(s.metadata)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Sensor Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1F293D] rounded-xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-[#1F293D] mb-4">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-[#0EA5E9]" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Register Telemetry Sensor</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                addSensorMutation.mutate();
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Parameter Symbol
                </label>
                <input
                  type="text"
                  value={newParam}
                  onChange={(e) => setNewParam(e.target.value.toUpperCase())}
                  required
                  placeholder="e.g. BOD, COD, TSS, PH, DO"
                  className="w-full bg-slate-50 dark:bg-[#0B0F17] border border-slate-300 dark:border-[#1F293D] rounded-lg p-2.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-[#0EA5E9]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Measurement Unit
                </label>
                <input
                  type="text"
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value)}
                  required
                  placeholder="e.g. mg/L, pH units, MLD"
                  className="w-full bg-slate-50 dark:bg-[#0B0F17] border border-slate-300 dark:border-[#1F293D] rounded-lg p-2.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-[#0EA5E9]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Treatment Stage
                </label>
                <select
                  value={newStage}
                  onChange={(e) => setNewStage(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#0B0F17] border border-slate-300 dark:border-[#1F293D] rounded-lg p-2.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-[#0EA5E9]"
                >
                  <option value="inlet">Inlet / Raw Influent</option>
                  <option value="primary_clarifier">Primary Clarifier</option>
                  <option value="secondary_aeration">Secondary Biological Aeration</option>
                  <option value="secondary_clarifier">Secondary Clarifier</option>
                  <option value="final_effluent">Final Effluent Discharge</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Sensor Model / Hardware Tag
                </label>
                <input
                  type="text"
                  value={newModel}
                  onChange={(e) => setNewModel(e.target.value)}
                  placeholder="e.g. AquaSensor-BOD-Online"
                  className="w-full bg-slate-50 dark:bg-[#0B0F17] border border-slate-300 dark:border-[#1F293D] rounded-lg p-2.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-[#0EA5E9]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-[#161F30] rounded-lg border border-slate-200 dark:border-[#1F293D]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addSensorMutation.isPending}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-white bg-[#0EA5E9] hover:bg-[#0284C7] rounded-lg shadow-sm disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  {addSensorMutation.isPending ? 'Registering...' : 'Register Sensor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Facility Recent Telemetry Readings with Live Filters */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1F293D] rounded-xl shadow-sm dark:shadow-xl overflow-hidden transition-colors">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-[#1F293D] flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50 dark:bg-[#161F30]/60">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#0EA5E9]" />
            <h2 className="text-xs font-mono uppercase tracking-wider text-slate-800 dark:text-slate-300 font-semibold">
              Recent Telemetry Observations
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <Filter className="w-3.5 h-3.5 text-[#0EA5E9]" />
              <span>Filters:</span>
            </div>
            <select
              value={paramFilter}
              onChange={(e) => setParamFilter(e.target.value)}
              className="bg-white dark:bg-[#0B0F17] border border-slate-300 dark:border-[#1F293D] rounded px-2.5 py-1 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-[#0EA5E9]"
            >
              <option value="">All Parameters</option>
              <option value="BOD">BOD</option>
              <option value="COD">COD</option>
              <option value="TSS">TSS</option>
              <option value="PH">PH</option>
              <option value="NH4_N">NH4_N</option>
              <option value="DO">DO</option>
              <option value="TEMPERATURE">TEMPERATURE</option>
            </select>

            <select
              value={qualityFilter}
              onChange={(e) => setQualityFilter(e.target.value)}
              className="bg-white dark:bg-[#0B0F17] border border-slate-300 dark:border-[#1F293D] rounded px-2.5 py-1 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-[#0EA5E9]"
            >
              <option value="">All Qualities</option>
              <option value="valid">Valid</option>
              <option value="suspect">Suspect</option>
              <option value="invalid">Invalid</option>
              <option value="pending">Pending</option>
            </select>

            <button
              onClick={() => readingsQuery.refetch()}
              className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-[#0B0F17] border border-slate-300 dark:border-[#1F293D] dark:hover:bg-[#161F30] text-slate-700 dark:text-slate-300 rounded transition-colors cursor-pointer"
              title="Refresh Telemetry"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${readingsQuery.isFetching ? 'animate-spin text-[#0EA5E9]' : ''}`} />
            </button>
          </div>
        </div>

        {readingsQuery.isLoading ? (
          <LoadingState message="Fetching facility telemetry records..." />
        ) : readingsQuery.isError ? (
          <div className="p-4">
            <ErrorState error={readingsQuery.error} />
          </div>
        ) : !readingsQuery.data || readingsQuery.data.length === 0 ? (
          <EmptyState
            title="No Telemetry Observed"
            message="No readings match the current filter criteria for this facility."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/80 dark:bg-[#161F30] border-b border-slate-200 dark:border-[#1F293D] text-slate-600 dark:text-slate-400 font-mono uppercase text-[11px]">
                  <th className="py-2.5 px-4">Reading ID</th>
                  <th className="py-2.5 px-4">Observed At</th>
                  <th className="py-2.5 px-4">Parameter</th>
                  <th className="py-2.5 px-4">Value</th>
                  <th className="py-2.5 px-4">Stage</th>
                  <th className="py-2.5 px-4">Quality Status</th>
                  <th className="py-2.5 px-4">AI Anomaly Status</th>
                  <th className="py-2.5 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-[#1F293D] font-mono">
                {readingsQuery.data.map((r) => (
                  <tr key={r.reading_id} className="hover:bg-slate-50 dark:hover:bg-[#161F30] transition-colors">
                    <td className="py-2.5 px-4 font-semibold text-cyan-700 dark:text-[#0EA5E9] select-all">
                      <Link to={`/readings/${r.reading_id}`} className="hover:underline">
                        {r.reading_id.slice(0, 8)}...
                      </Link>
                    </td>
                    <td className="py-2.5 px-4 text-slate-500 dark:text-slate-400 text-[11px] whitespace-nowrap">
                      {new Date(r.observed_at).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white">{r.parameter}</td>
                    <td className="py-2.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                      {r.value !== null ? `${r.value} ${r.unit}` : 'null'}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400">{r.treatment_stage || 'N/A'}</td>
                    <td className="py-2.5 px-4">
                      <QualityBadge status={r.quality_status} />
                    </td>
                    <td className="py-2.5 px-4">
                      <AnomalyStatusBadge status={r.anomaly_status} score={r.anomaly_score} />
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <Link
                        to={`/readings/${r.reading_id}`}
                        className="text-cyan-700 dark:text-[#0EA5E9] hover:underline font-sans font-medium"
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
    </div>
  );
};
