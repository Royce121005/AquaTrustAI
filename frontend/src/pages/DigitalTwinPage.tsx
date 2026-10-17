import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Cpu,
  Activity,
  Layers,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Play,
  RotateCcw,
  ShieldAlert,
  Droplets,
  Calendar,
  Sliders,
  Check,
  RefreshCw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

import { listFacilitiesApi } from '../api/facilities';
import {
  getFacilityTwinStateApi,
  getFacilityPredictionsApi,
  getFacilityRecommendationsApi,
  getFacilitySustainabilityApi,
  runScenarioApi,
} from '../api/digitalTwin';
import { LoadingState, ErrorState } from '../components/common/States';
import { useAuth } from '../context/AuthContext';
import { ScenarioCreateRequest, ScenarioResponse } from '../types/digitalTwin';

const getParamDisplay = (param: unknown, decimals: number = 1): string => {
  if (param === null || param === undefined) return '—';
  if (typeof param === 'number') return isNaN(param) ? '—' : param.toFixed(decimals);
  if (typeof param === 'object' && param !== null && 'value' in param) {
    const val = (param as { value?: unknown }).value;
    if (typeof val === 'number') return isNaN(val) ? '—' : val.toFixed(decimals);
  }
  return '—';
};

const getParamUnit = (param: unknown, defaultUnit: string = 'mg/L'): string => {
  if (typeof param === 'object' && param !== null && 'unit' in param) {
    const u = (param as { unit?: unknown }).unit;
    if (typeof u === 'string' && u.trim().length > 0) return u;
  }
  return defaultUnit;
};

export const DigitalTwinPage: React.FC = () => {
  const { facilityId: routeFacilityId } = useParams<{ facilityId?: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Load facilities for dropdown
  const facilitiesQuery = useQuery({
    queryKey: ['facilities'],
    queryFn: listFacilitiesApi,
  });

  const facilities = facilitiesQuery.data || [];
  const defaultFacilityId = routeFacilityId || (facilities.length > 0 ? facilities[0].facility_id : '');
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>(defaultFacilityId);

  // Sync state if facilities finish loading
  React.useEffect(() => {
    if (!selectedFacilityId && facilities.length > 0) {
      setSelectedFacilityId(facilities[0].facility_id);
    }
  }, [facilities, selectedFacilityId]);

  // Tab navigation
  const [activeTab, setActiveTab] = useState<'overview' | 'scenarios' | 'predictions' | 'sustainability'>('overview');

  // Scenario configuration state
  const [scenarioType, setScenarioType] = useState<ScenarioCreateRequest['scenario_type']>('influent_quality_change');
  const [scenarioName, setScenarioName] = useState<string>('Organic Inflow Shock (+40%)');
  const [bodChange, setBodChange] = useState<number>(40);
  const [doDrop, setDoDrop] = useState<number>(75);
  const [durationMinutes, setDurationMinutes] = useState<number>(120);
  const [scenarioResult, setScenarioResult] = useState<ScenarioResponse | null>(null);

  // Acknowledged recommendations state (local UI)
  const [acknowledgedRecs, setAcknowledgedRecs] = useState<Record<string, boolean>>({});

  // Digital Twin queries
  const stateQuery = useQuery({
    queryKey: ['twin-state', selectedFacilityId],
    queryFn: () => getFacilityTwinStateApi(selectedFacilityId),
    enabled: !!selectedFacilityId,
    refetchInterval: 30000,
  });

  const predictionsQuery = useQuery({
    queryKey: ['twin-predictions', selectedFacilityId],
    queryFn: () => getFacilityPredictionsApi(selectedFacilityId),
    enabled: !!selectedFacilityId && (activeTab === 'overview' || activeTab === 'predictions'),
  });

  const recommendationsQuery = useQuery({
    queryKey: ['twin-recommendations', selectedFacilityId],
    queryFn: () => getFacilityRecommendationsApi(selectedFacilityId),
    enabled: !!selectedFacilityId && activeTab === 'overview',
  });

  const sustainabilityQuery = useQuery({
    queryKey: ['twin-sustainability', selectedFacilityId],
    queryFn: () => getFacilitySustainabilityApi(selectedFacilityId),
    enabled: !!selectedFacilityId && (activeTab === 'overview' || activeTab === 'sustainability'),
  });

  // What-If Scenario mutation
  const runScenarioMutation = useMutation({
    mutationFn: (payload: ScenarioCreateRequest) => runScenarioApi(selectedFacilityId, payload),
    onSuccess: (data) => {
      setScenarioResult(data);
      queryClient.invalidateQueries({ queryKey: ['twin-scenarios', selectedFacilityId] });
    },
  });

  const handleFacilityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value;
    setSelectedFacilityId(newId);
    setScenarioResult(null);
    if (routeFacilityId) {
      navigate(`/facilities/${newId}/twin`);
    }
  };

  const handleExecuteScenario = () => {
    const params: Record<string, unknown> = {};
    if (scenarioType === 'influent_quality_change') {
      params.bod_change_percent = bodChange;
    } else if (scenarioType === 'aeration_failure') {
      params.do_reduction_percent = doDrop;
    }

    runScenarioMutation.mutate({
      scenario_type: scenarioType,
      scenario_name: scenarioName,
      duration_minutes: durationMinutes,
      time_step_seconds: 900,
      parameters: params,
      seed: 42,
    });
  };

  if (facilitiesQuery.isLoading) {
    return <LoadingState message="Loading facilities..." />;
  }

  const selectedFacility = facilities.find((f) => f.facility_id === selectedFacilityId);
  const twinState = stateQuery.data;

  // Transform scenario results for Recharts
  const chartData = scenarioResult
    ? scenarioResult.results
        .filter((r) => r.parameter === 'bod' && r.treatment_stage === 'final_effluent')
        .map((r) => ({
          time: new Date(r.simulation_timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          baseline: r.baseline_value,
          scenario: r.scenario_value,
          cpcb_limit: 30.0,
        }))
    : [];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Facility Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="h-7 w-7 text-indigo-600" />
            <h1 className="text-2xl font-bold text-gray-900">Virtual STP Digital Twin</h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Real-time stateful digital twin, biological process kinetics, what-if scenario studio, and water recycling accounting.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label htmlFor="facility-select" className="text-sm font-medium text-gray-700 whitespace-nowrap">
            Selected Facility:
          </label>
          <select
            id="facility-select"
            value={selectedFacilityId}
            onChange={handleFacilityChange}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {facilities.map((fac) => (
              <option key={fac.facility_id} value={fac.facility_id}>
                {fac.facility_name} ({fac.capacity} {fac.capacity_unit})
              </option>
            ))}
          </select>
          <button
            onClick={() => stateQuery.refetch()}
            disabled={stateQuery.isFetching}
            className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-gray-100 rounded-md transition"
            title="Refresh Virtual State"
          >
            <RefreshCw className={`h-5 w-5 ${stateQuery.isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Facility Status Ribbon */}
      {twinState && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div>
              <span className="text-xs uppercase tracking-wider text-gray-400 font-semibold block">State Version</span>
              <span className="text-lg font-bold text-indigo-600">v{twinState.state_version}</span>
            </div>
            <div>
              <span className="text-xs uppercase tracking-wider text-gray-400 font-semibold block">Technology</span>
              <span className="text-sm font-medium text-gray-900 capitalize">
                {selectedFacility?.facility_type?.replace('_', ' ') || 'Activated Sludge'}
              </span>
            </div>
            <div>
              <span className="text-xs uppercase tracking-wider text-gray-400 font-semibold block">Observed Clock</span>
              <span className="text-sm font-medium text-gray-700">
                {new Date(twinState.observed_at).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Freshness Badge */}
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                twinState.state_freshness === 'fresh'
                  ? 'bg-emerald-100 text-emerald-800'
                  : twinState.state_freshness === 'stale'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-rose-100 text-rose-800'
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  twinState.state_freshness === 'fresh'
                    ? 'bg-emerald-500 animate-pulse'
                    : twinState.state_freshness === 'stale'
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
                }`}
              />
              {twinState.state_freshness === 'fresh'
                ? 'Live Synchronized'
                : twinState.state_freshness === 'stale'
                ? 'Telemetry Stale'
                : 'Telemetry Expired'}
            </span>

            {/* Data Quality Badge */}
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                twinState.data_quality === 'valid'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : twinState.data_quality === 'suspect'
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}
            >
              {twinState.data_quality === 'valid' ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
              )}
              Quality: {twinState.data_quality.toUpperCase()}
            </span>

            {/* Model Hash Tooltip */}
            {twinState.process_model?.configuration_hash && (
              <span className="text-xs text-gray-400 font-mono hidden lg:inline" title={twinState.process_model.configuration_hash}>
                Hash: {twinState.process_model.configuration_hash.substring(0, 10)}...
              </span>
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: 'Plant Stages & Flow', icon: Layers },
            { id: 'scenarios', label: 'What-If Scenario Studio', icon: Sliders },
            { id: 'predictions', label: 'Forward Predictive Horizon', icon: TrendingUp },
            { id: 'sustainability', label: 'Water Recycling & Reuse', icon: Droplets },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition ${
                  isSelected
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* TAB 1: Plant Stages & Flow Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Data Origin Taxonomy Legend */}
          <div className="bg-gray-50 border border-gray-200 rounded-md p-3 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-600">
            <span className="font-semibold text-gray-700">Data Origin Taxonomy:</span>
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                [OBSERVED] Telemetry
              </span>
              <span className="inline-flex items-center gap-1 font-medium text-blue-700">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                [SIMULATED] Process Kinetics
              </span>
              <span className="inline-flex items-center gap-1 font-medium text-purple-700">
                <span className="h-2.5 w-2.5 rounded-full bg-purple-500" />
                [PREDICTED] Forward Forecast
              </span>
              <span className="inline-flex items-center gap-1 font-medium text-amber-700">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                [WHAT-IF] Isolated Scenario
              </span>
            </div>
          </div>

          {/* 5-Stage Process Flow Diagram */}
          {stateQuery.isLoading ? (
            <LoadingState message="Calculating virtual treatment stages..." />
          ) : stateQuery.isError ? (
            <ErrorState error={stateQuery.error as Error} />
          ) : twinState?.stage_states ? (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {[
                { id: 'inlet', title: '1. Raw Influent', desc: 'Raw wastewater inlet' },
                { id: 'primary_clarifier', title: '2. Primary Clarifier', desc: 'Gravitational solids settling' },
                { id: 'biological_aeration', title: '3. Biological Aeration', desc: 'Activated sludge oxidation' },
                { id: 'secondary_clarifier', title: '4. Secondary Clarifier', desc: 'Biomass clarification' },
                { id: 'final_effluent', title: '5. Final Effluent', desc: 'Treated discharge point' },
              ].map((stageMeta, idx) => {
                const stageData = twinState.stage_states[stageMeta.id];
                const isFinal = stageMeta.id === 'final_effluent';
                const isAeration = stageMeta.id === 'biological_aeration';

                return (
                  <div
                    key={stageMeta.id}
                    className={`rounded-lg border p-4 bg-white shadow-sm flex flex-col justify-between transition hover:shadow-md ${
                      isFinal
                        ? 'border-indigo-300 ring-1 ring-indigo-200 bg-indigo-50/20'
                        : 'border-gray-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                        <span className="text-xs font-bold text-gray-800">{stageMeta.title}</span>
                        {idx < 4 && <ArrowRight className="h-3.5 w-3.5 text-gray-400 hidden md:inline" />}
                      </div>
                      <p className="text-[11px] text-gray-400 mt-1">{stageMeta.desc}</p>

                      {stageData?.parameters ? (
                        <div className="mt-4 space-y-2 text-xs">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-500">BOD:</span>
                            <span className="font-semibold text-gray-900">
                              {getParamDisplay(stageData.parameters.bod, 1)} <span className="text-[10px] text-gray-400">{getParamUnit(stageData.parameters.bod, 'mg/L')}</span>
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-500">COD:</span>
                            <span className="font-semibold text-gray-900">
                              {getParamDisplay(stageData.parameters.cod, 1)} <span className="text-[10px] text-gray-400">{getParamUnit(stageData.parameters.cod, 'mg/L')}</span>
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-500">TSS:</span>
                            <span className="font-semibold text-gray-900">
                              {getParamDisplay(stageData.parameters.tss, 1)} <span className="text-[10px] text-gray-400">{getParamUnit(stageData.parameters.tss, 'mg/L')}</span>
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-500">pH:</span>
                            <span className="font-semibold text-gray-900">{getParamDisplay(stageData.parameters.ph, 2)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-500">NH4-N:</span>
                            <span className="font-semibold text-gray-900">
                              {getParamDisplay(stageData.parameters.nh4_n, 1)} <span className="text-[10px] text-gray-400">{getParamUnit(stageData.parameters.nh4_n, 'mg/L')}</span>
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4 text-xs text-gray-400 italic">No stage telemetry</div>
                      )}
                    </div>

                    {isAeration && (stageData.operating_variables || twinState.operating_variables) && (
                      <div className="mt-3 pt-2 border-t border-gray-100 text-[10px] text-gray-500 space-y-0.5">
                        <div>HRT: {String((stageData.operating_variables as any)?.hrt_hours ?? (twinState.operating_variables as any)?.hrt_hours ?? '8.0')}h</div>
                        <div>DO Setpoint: {String((stageData.operating_variables as any)?.do_mg_l ?? (twinState.operating_variables as any)?.do_mg_l ?? '2.0')} mg/L</div>
                        <div>Temp: {String((stageData.operating_variables as any)?.temperature_c ?? (twinState.operating_variables as any)?.temperature_c ?? '20')}°C</div>
                      </div>
                    )}

                    {isFinal && twinState.process_model?.overall_removal_efficiencies?.bod_removal_percent != null && (
                      <div className="mt-3 pt-2 border-t border-indigo-100 text-[11px] font-medium text-indigo-700">
                        Overall BOD Removal:{' '}
                        {twinState.process_model.overall_removal_efficiencies.bod_removal_percent.toFixed(1)}%
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : null}

          {/* Operational Advisory Recommendations */}
          <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-indigo-600" />
                <h3 className="text-base font-bold text-gray-900">Active Operational Recommendations</h3>
              </div>
              <span className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded font-medium">
                Advisory Only — Requires Human Approval
              </span>
            </div>

            {recommendationsQuery.isLoading ? (
              <p className="text-sm text-gray-500">Checking plant operating constraints...</p>
            ) : recommendationsQuery.data && recommendationsQuery.data.length > 0 ? (
              <div className="space-y-3">
                {recommendationsQuery.data.map((rec) => {
                  const isAcknowledged = acknowledgedRecs[rec.recommendation_id];
                  return (
                    <div
                      key={rec.recommendation_id}
                      className={`border rounded-md p-4 transition ${
                        isAcknowledged ? 'bg-gray-50 border-gray-200 opacity-60' : 'bg-white border-indigo-100 shadow-sm'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                                rec.priority === 'urgent'
                                  ? 'bg-rose-100 text-rose-800'
                                  : rec.priority === 'high'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-indigo-100 text-indigo-800'
                              }`}
                            >
                              {rec.priority}
                            </span>
                            <h4 className="text-sm font-semibold text-gray-900">{rec.suggested_action}</h4>
                          </div>
                          <p className="text-xs text-gray-600">{rec.expected_outcome}</p>
                          <div className="text-[11px] text-gray-400 mt-2">
                            <span className="font-medium text-gray-500">Evidence: </span>
                            {rec.evidence.join('; ')}
                          </div>
                        </div>

                        <div>
                          {isAcknowledged ? (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-semibold">
                              <Check className="h-4 w-4" /> Confirmed
                            </span>
                          ) : (
                            <button
                              onClick={() =>
                                setAcknowledgedRecs((prev) => ({ ...prev, [rec.recommendation_id]: true }))
                              }
                              className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded shadow-sm transition"
                            >
                              Acknowledge
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">
                All operating variables and biological stages are currently within optimal kinetic envelopes.
              </p>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: What-If Scenario Simulation Studio */}
      {activeTab === 'scenarios' && (
        <div className="space-y-6">
          <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-md">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <h4 className="text-sm font-bold text-amber-800">Isolated What-If Simulation Sandbox</h4>
            </div>
            <p className="text-xs text-amber-700 mt-1">
              Scenarios run in total isolation on copies of virtual state. They explore hypothetical plant behavior and
              <strong> do not</strong> overwrite observed measurements, modify accepted state, or generate regulatory
              compliance certificates.
            </p>
          </div>

          {/* Scenario Configuration Controls */}
          <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-gray-900">Define Scenario Parameters</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Scenario Type</label>
                <select
                  value={scenarioType}
                  onChange={(e) => {
                    const t = e.target.value as ScenarioCreateRequest['scenario_type'];
                    setScenarioType(t);
                    if (t === 'influent_quality_change') setScenarioName('Organic Inflow Shock (+40%)');
                    else if (t === 'aeration_failure') setScenarioName('Aeration Blower Outage (DO -75%)');
                    else if (t === 'hydraulic_surge') setScenarioName('Stormwater Hydraulic Surge (Flow 2x)');
                    else setScenarioName('Chemical Coagulant Overdosing');
                  }}
                  className="w-full text-sm rounded-md border border-gray-300 p-2 focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="influent_quality_change">Influent Quality Shock (Organic Overload)</option>
                  <option value="aeration_failure">Aeration Failure (Blower Outage)</option>
                  <option value="hydraulic_surge">Hydraulic Surge (Storm Infiltration)</option>
                  <option value="chemical_overdosing">Chemical Overdosing</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Scenario Name</label>
                <input
                  type="text"
                  value={scenarioName}
                  onChange={(e) => setScenarioName(e.target.value)}
                  className="w-full text-sm rounded-md border border-gray-300 p-2 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Duration (Minutes)</label>
                <select
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="w-full text-sm rounded-md border border-gray-300 p-2 focus:ring-1 focus:ring-indigo-500"
                >
                  <option value={60}>60 Minutes (4 steps)</option>
                  <option value={120}>120 Minutes (8 steps)</option>
                  <option value={240}>240 Minutes (16 steps)</option>
                </select>
              </div>
            </div>

            {/* Dynamic Slider based on type */}
            {scenarioType === 'influent_quality_change' && (
              <div>
                <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
                  <span>Influent BOD Shock Percentage</span>
                  <span className="text-indigo-600">+{bodChange}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="150"
                  step="5"
                  value={bodChange}
                  onChange={(e) => setBodChange(Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>
            )}

            {scenarioType === 'aeration_failure' && (
              <div>
                <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
                  <span>Dissolved Oxygen Reduction Percentage</span>
                  <span className="text-rose-600">-{doDrop}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="95"
                  step="5"
                  value={doDrop}
                  onChange={(e) => setDoDrop(Number(e.target.value))}
                  className="w-full accent-rose-600 cursor-pointer"
                />
              </div>
            )}

            <button
              onClick={handleExecuteScenario}
              disabled={runScenarioMutation.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-md shadow-sm transition disabled:opacity-50"
            >
              <Play className="h-4 w-4" />
              {runScenarioMutation.isPending ? 'Simulating Kinetics...' : 'Execute What-If Scenario'}
            </button>
          </div>

          {/* Scenario Results Comparative Visualization */}
          {scenarioResult && (
            <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Effluent BOD Trajectory Comparison</h3>
                  <p className="text-xs text-gray-500">
                    Baseline accepted state vs. Simulated what-if perturbation across forward timeline.
                  </p>
                </div>
                {scenarioResult.comparison_summary && (
                  <span
                    className={`px-3 py-1 text-xs font-bold rounded-full ${
                      scenarioResult.comparison_summary.compliance_risk_detected
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {scenarioResult.comparison_summary.compliance_risk_detected
                      ? 'Compliance Risk Detected (Effluent > 30 mg/L)'
                      : 'Compliant with Discharge Norms'}
                  </span>
                )}
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="time" stroke="#888888" fontSize={12} />
                    <YAxis
                      stroke="#888888"
                      fontSize={12}
                      label={{ value: 'BOD (mg/L)', angle: -90, position: 'insideLeft', offset: 10 }}
                    />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="baseline"
                      name="[OBSERVED] Baseline"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="scenario"
                      name="[WHAT-IF] Simulated"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="cpcb_limit"
                      name="CPCB Standard (30 mg/L)"
                      stroke="#ef4444"
                      strokeWidth={1.5}
                      strokeDasharray="2 2"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Forward Predictive Horizon */}
      {activeTab === 'predictions' && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900">Steady-State Effluent Projection</h3>
                <p className="text-xs text-gray-500">
                  Evidence-gated effluent estimates calculated via first-principles CSTR kinetics with empirical holdout uncertainty bounds (±1.96 RMSE).
                </p>
              </div>
              <span className="text-xs bg-purple-100 text-purple-800 px-2.5 py-1 rounded font-semibold">
                [KINETIC PROJECTION]
              </span>
            </div>

            {predictionsQuery.isLoading ? (
              <LoadingState message="Computing forward estimates..." />
            ) : predictionsQuery.data?.status === 'insufficient_data' ? (
              <div className="bg-amber-50 border border-amber-200 rounded p-4 text-xs text-amber-800 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <span>
                  Forward prediction gated: mandatory influent features are incomplete or pending validation.
                </span>
              </div>
            ) : predictionsQuery.data?.predicted_values ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {Object.entries(predictionsQuery.data.predicted_values).map(([param, pVal]) => {
                  const bounds = predictionsQuery.data.uncertainty_bounds?.[param];
                  const valDisplay = typeof pVal === 'number' ? pVal : (pVal as any)?.value ?? '—';
                  const unitDisplay = typeof pVal === 'object' && (pVal as any)?.unit ? (pVal as any).unit : 'mg/L';
                  return (
                    <div key={param} className="border border-purple-100 bg-purple-50/20 rounded-lg p-4 shadow-sm">
                      <span className="text-xs uppercase font-bold text-purple-700">{param.toUpperCase()}</span>
                      <div className="text-2xl font-extrabold text-gray-900 mt-1">
                        {valDisplay} <span className="text-xs font-normal text-gray-500">{unitDisplay}</span>
                      </div>
                      {bounds && bounds.lower_bound != null && bounds.upper_bound != null && (
                        <div className="text-[11px] text-gray-500 mt-2">
                          95% Confidence: [{bounds.lower_bound} – {bounds.upper_bound}]
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* TAB 4: Water Recycling & Sustainability */}
      {activeTab === 'sustainability' && (
        <div className="space-y-6">
          {sustainabilityQuery.isLoading ? (
            <LoadingState message="Calculating water reuse metrics..." />
          ) : sustainabilityQuery.data ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm space-y-2">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Daily Reclaimed Water</span>
                <div className="text-3xl font-extrabold text-indigo-600">
                  {sustainabilityQuery.data.reuse_volume_m3_day != null ? sustainabilityQuery.data.reuse_volume_m3_day.toLocaleString() : '—'}{' '}
                  <span className="text-sm font-normal text-gray-500">m³/day</span>
                </div>
                <p className="text-xs text-gray-500">Based on 75% reuse allocation from operational STP throughput.</p>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm space-y-2">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Annual Freshwater Saved</span>
                <div className="text-3xl font-extrabold text-emerald-600">
                  {sustainabilityQuery.data.annual_freshwater_saved_m3 != null ? sustainabilityQuery.data.annual_freshwater_saved_m3.toLocaleString() : '—'}{' '}
                  <span className="text-sm font-normal text-gray-500">m³/year</span>
                </div>
                <p className="text-xs text-gray-500">Displaces municipal freshwater extraction for non-potable needs.</p>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm space-y-2">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Safe Reuse Gate</span>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 text-xl font-extrabold px-3 py-1 rounded-md ${
                      sustainabilityQuery.data.safe_reuse_gate === 'PASSED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    <CheckCircle2 className="h-5 w-5" />
                    {sustainabilityQuery.data.safe_reuse_gate ?? 'HELD'}
                  </span>
                </div>
                <p className="text-xs text-gray-500">CPCB non-potable reuse standard verification.</p>
              </div>

              <div className="md:col-span-3 bg-white border border-gray-200 rounded-lg p-5 shadow-sm space-y-3">
                <h4 className="text-sm font-bold text-gray-900">Approved Non-Potable Water Reuse Applications</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {sustainabilityQuery.data.reuse_applications?.map((app, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-gray-700 bg-gray-50 p-2.5 rounded">
                      <Droplets className="h-4 w-4 text-indigo-500 flex-shrink-0" />
                      <span>{app}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
