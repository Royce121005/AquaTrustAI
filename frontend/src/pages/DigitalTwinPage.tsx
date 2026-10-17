import React, { useState, useEffect } from 'react';
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
  Pause,
  Square,
  RotateCcw,
  ShieldAlert,
  Droplets,
  Calendar,
  Sliders,
  Check,
  RefreshCw,
  Radio,
  Wifi,
  WifiOff,
  Bell,
  Gauge,
  Sparkles,
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
  startTwinEngineApi,
  stopTwinEngineApi,
  pauseTwinEngineApi,
  resumeTwinEngineApi,
  getTwinEngineStatusApi,
} from '../api/digitalTwin';
import { useTwinStream } from '../hooks/useTwinStream';
import { SynopticProcessFlow } from '../components/digitalTwin/SynopticProcessFlow';
import { StageInspectionDrawer } from '../components/digitalTwin/StageInspectionDrawer';
import { LiveTelemetryTrends } from '../components/digitalTwin/LiveTelemetryTrends';
import { AlarmConsole } from '../components/digitalTwin/AlarmConsole';
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
  useEffect(() => {
    if (!selectedFacilityId && facilities.length > 0) {
      setSelectedFacilityId(facilities[0].facility_id);
    }
  }, [facilities, selectedFacilityId]);

  // Tab navigation
  const [activeTab, setActiveTab] = useState<'overview' | 'scenarios' | 'predictions' | 'sustainability'>('overview');

  // Selected stage for inspection drawer
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);

  // Scenario configuration state
  const [scenarioType, setScenarioType] = useState<ScenarioCreateRequest['scenario_type']>('influent_quality_change');
  const [scenarioName, setScenarioName] = useState<string>('Organic Inflow Shock (+40%)');
  const [bodChange, setBodChange] = useState<number>(40);
  const [doDrop, setDoDrop] = useState<number>(75);
  const [durationMinutes, setDurationMinutes] = useState<number>(120);
  const [scenarioResult, setScenarioResult] = useState<ScenarioResponse | null>(null);

  // Acknowledged recommendations state (local UI)
  const [acknowledgedRecs, setAcknowledgedRecs] = useState<Record<string, boolean>>({});

  // Real-time WebSocket Twin Stream
  const {
    connectionState,
    twinState: streamTwinState,
    activeAlarms,
    engineStatus: streamEngineStatus,
    stateVersion: streamStateVersion,
    lastMessageAt,
    acknowledgeAlarm,
    resync,
    reconnect,
  } = useTwinStream(selectedFacilityId, {
    enabled: !!selectedFacilityId,
  });

  // REST Fallback Digital Twin queries
  const stateQuery = useQuery({
    queryKey: ['twin-state', selectedFacilityId],
    queryFn: () => getFacilityTwinStateApi(selectedFacilityId),
    enabled: !!selectedFacilityId && !streamTwinState,
    refetchInterval: 30000,
  });

  const engineStatusQuery = useQuery({
    queryKey: ['twin-engine-status', selectedFacilityId],
    queryFn: () => getTwinEngineStatusApi(selectedFacilityId),
    enabled: !!selectedFacilityId && !streamEngineStatus,
    refetchInterval: 10000,
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

  // Engine Lifecycle Mutations
  const startEngineMutation = useMutation({
    mutationFn: () => startTwinEngineApi(selectedFacilityId, { interval_seconds: 1.0, operating_mode: 'simulation' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['twin-engine-status', selectedFacilityId] });
      resync();
    },
  });

  const stopEngineMutation = useMutation({
    mutationFn: () => stopTwinEngineApi(selectedFacilityId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['twin-engine-status', selectedFacilityId] });
      resync();
    },
  });

  const pauseEngineMutation = useMutation({
    mutationFn: () => pauseTwinEngineApi(selectedFacilityId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['twin-engine-status', selectedFacilityId] });
      resync();
    },
  });

  const resumeEngineMutation = useMutation({
    mutationFn: () => resumeTwinEngineApi(selectedFacilityId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['twin-engine-status', selectedFacilityId] });
      resync();
    },
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
    setSelectedStageId(null);
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
  const activeTwinState = streamTwinState || stateQuery.data;
  const activeEngineStatus = streamEngineStatus || engineStatusQuery.data;

  const currentLifecycle = activeEngineStatus?.lifecycle_state || 'stopped';
  const currentMode = activeEngineStatus?.operating_mode || activeTwinState?.source_mode || 'simulation';
  const effectiveVersion = streamStateVersion || activeTwinState?.state_version || 1;

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
      {/* ========================================================= */}
      {/* GLOBAL SCADA OPERATIONS HEADER & CONTROLS                 */}
      {/* ========================================================= */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Branding & Facility Select */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-lg bg-sky-950/80 border border-sky-800 text-sky-400">
              <Cpu className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-100">Virtual STP Digital Twin</h1>
                {/* Real-Time Mode Badge */}
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold uppercase bg-indigo-950 text-indigo-400 border border-indigo-800">
                  [{currentMode.toUpperCase()}]
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-Time Animated Industrial SCADA Control Room & CPCB Compliance Gating
              </p>
            </div>
          </div>

          {/* Facility Dropdown */}
          <div className="flex items-center gap-2 sm:border-l sm:border-slate-800 sm:pl-4">
            <select
              id="facility-select"
              value={selectedFacilityId}
              onChange={handleFacilityChange}
              className="rounded-lg border border-slate-700 bg-slate-950 text-slate-200 px-3 py-1.5 text-xs font-medium shadow-sm focus:border-sky-500 focus:outline-none"
            >
              {facilities.map((fac) => (
                <option key={fac.facility_id} value={fac.facility_id}>
                  {fac.facility_name} ({fac.capacity} {fac.capacity_unit})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right: Engine Lifecycle Controls & Stream Indicator */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Connection State Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono">
            {connectionState === 'connected' ? (
              <>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-emerald-400 font-bold">STREAM LIVE</span>
              </>
            ) : connectionState === 'resyncing' ? (
              <>
                <RefreshCw className="w-3 h-3 text-amber-400 animate-spin" />
                <span className="text-amber-400 font-bold">RESYNCING</span>
              </>
            ) : connectionState === 'connecting' ? (
              <>
                <RefreshCw className="w-3 h-3 text-sky-400 animate-spin" />
                <span className="text-sky-400">CONNECTING</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3 text-rose-400" />
                <span className="text-rose-400">DISCONNECTED</span>
              </>
            )}
            <span className="text-slate-600">|</span>
            <span className="text-slate-300 font-bold">v{effectiveVersion}</span>
          </div>

          {/* Engine Lifecycle Controls */}
          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 p-1 rounded-lg">
            {currentLifecycle !== 'running' ? (
              <button
                onClick={() => {
                  if (currentLifecycle === 'paused') {
                    resumeEngineMutation.mutate();
                  } else {
                    startEngineMutation.mutate();
                  }
                }}
                disabled={startEngineMutation.isPending || resumeEngineMutation.isPending}
                className="flex items-center gap-1 px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-semibold shadow-sm transition-colors"
                title={currentLifecycle === 'paused' ? 'Resume Engine' : 'Start Engine (1Hz)'}
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{currentLifecycle === 'paused' ? 'RESUME' : 'START'}</span>
              </button>
            ) : (
              <button
                onClick={() => pauseEngineMutation.mutate()}
                disabled={pauseEngineMutation.isPending}
                className="flex items-center gap-1 px-3 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white font-mono text-xs font-semibold shadow-sm transition-colors"
                title="Pause Engine"
              >
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>PAUSE</span>
              </button>
            )}

            <button
              onClick={() => stopEngineMutation.mutate()}
              disabled={stopEngineMutation.isPending || currentLifecycle === 'stopped'}
              className="flex items-center gap-1 px-2.5 py-1 rounded hover:bg-slate-800 text-slate-300 disabled:opacity-40 font-mono text-xs font-semibold transition-colors"
              title="Stop Engine"
            >
              <Square className="w-3.5 h-3.5 fill-current text-rose-400" />
              <span>STOP</span>
            </button>
          </div>

          {/* Manual Refresh / Reconnect */}
          <button
            onClick={() => {
              reconnect();
              stateQuery.refetch();
            }}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors border border-slate-800"
            title="Force Stream Reconnect & State Sync"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Facility Status Summary Ribbon */}
      {activeTwinState && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs flex flex-wrap items-center justify-between gap-3 text-slate-300">
          <div className="flex items-center gap-6 flex-wrap">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Facility Profile</span>
              <span className="font-semibold text-slate-100">{selectedFacility?.facility_name || 'Central Delhi STP'}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Technology</span>
              <span className="font-medium text-slate-300 capitalize">
                {selectedFacility?.facility_type?.replace('_', ' ') || 'Activated Sludge Process (ASP)'}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Observed Clock</span>
              <span className="font-mono text-slate-300">
                {new Date(activeTwinState.observed_at).toLocaleTimeString([], { hour12: false })}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Simulation Ticks</span>
              <span className="font-mono font-bold text-sky-400">
                {activeEngineStatus?.tick_count ?? 0} ticks
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Freshness Badge */}
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                activeTwinState.state_freshness === 'fresh'
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  : activeTwinState.state_freshness === 'stale'
                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                  : 'bg-rose-950 text-rose-300 border border-rose-800'
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  activeTwinState.state_freshness === 'fresh'
                    ? 'bg-emerald-400 animate-pulse'
                    : activeTwinState.state_freshness === 'stale'
                    ? 'bg-amber-400'
                    : 'bg-rose-400'
                }`}
              />
              {activeTwinState.state_freshness === 'fresh'
                ? 'Live Synchronized'
                : activeTwinState.state_freshness === 'stale'
                ? 'Telemetry Stale'
                : 'Telemetry Expired'}
            </span>

            {/* Data Quality Badge */}
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                activeTwinState.data_quality === 'valid'
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  : activeTwinState.data_quality === 'suspect'
                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                  : 'bg-rose-950 text-rose-300 border border-rose-800'
              }`}
            >
              {activeTwinState.data_quality === 'valid' ? (
                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
              ) : (
                <AlertTriangle className="h-3 w-3 text-amber-400" />
              )}
              Quality: {activeTwinState.data_quality.toUpperCase()}
            </span>
          </div>
        </div>
      )}

      {/* Nav Tabs */}
      <div className="border-b border-slate-800">
        <nav className="flex space-x-6">
          {[
            { id: 'overview', label: 'Animated Process SCADA Canvas', icon: Layers },
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
                className={`flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  isSelected
                    ? 'border-sky-500 text-sky-400 font-bold'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: ANIMATED PROCESS SCADA CANVAS & LIVE TELEMETRY     */}
      {/* ========================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* PRIMARY VIEWPORT: MASTER INDUSTRIAL SYNOPTIC PROCESS FLOW */}
          <SynopticProcessFlow
            twinState={activeTwinState || null}
            activeAlarms={activeAlarms}
            selectedStageId={selectedStageId}
            onSelectStage={(stageId) => setSelectedStageId(stageId)}
            isLoading={stateQuery.isLoading && !activeTwinState}
          />

          {/* Contextual Stage Inspection Drawer (Slide-Over) */}
          <StageInspectionDrawer
            stageId={selectedStageId}
            twinState={activeTwinState || null}
            alarms={activeAlarms}
            onClose={() => setSelectedStageId(null)}
            onAcknowledgeAlarm={acknowledgeAlarm}
          />

          {/* 1Hz Live Telemetry Trends (Rolling Sparklines) */}
          <LiveTelemetryTrends twinState={activeTwinState || null} maxPoints={45} />

          {/* Live SCADA Alarms & Compliance Event Console */}
          <AlarmConsole
            alarms={activeAlarms}
            onAcknowledge={acknowledgeAlarm}
            isLoading={false}
          />

          {/* Operational Advisory Recommendations */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-sky-400" />
                <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
                  Active Operational Recommendations
                </h3>
              </div>
              <span className="text-xs bg-sky-950 text-sky-300 border border-sky-800 px-2.5 py-1 rounded font-medium">
                Advisory Only — Requires Human Approval
              </span>
            </div>

            {recommendationsQuery.isLoading ? (
              <p className="text-sm text-slate-400">Checking plant operating constraints...</p>
            ) : recommendationsQuery.data && recommendationsQuery.data.length > 0 ? (
              <div className="space-y-3">
                {recommendationsQuery.data.map((rec) => {
                  const isAcknowledged = acknowledgedRecs[rec.recommendation_id];
                  return (
                    <div
                      key={rec.recommendation_id}
                      className={`border rounded-lg p-4 transition ${
                        isAcknowledged
                          ? 'bg-slate-950/40 border-slate-800 opacity-60'
                          : 'bg-slate-950 border-slate-800 shadow-sm'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                                rec.priority === 'urgent'
                                  ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                  : rec.priority === 'high'
                                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                  : 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                              }`}
                            >
                              {rec.priority}
                            </span>
                            <h4 className="text-sm font-semibold text-slate-100">{rec.suggested_action}</h4>
                          </div>
                          <p className="text-xs text-slate-400">{rec.expected_outcome}</p>
                          <div className="text-[11px] text-slate-500 mt-2">
                            <span className="font-medium text-slate-400">Evidence: </span>
                            {rec.evidence.join('; ')}
                          </div>
                        </div>

                        <div>
                          {isAcknowledged ? (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-semibold">
                              <Check className="h-4 w-4" /> Confirmed
                            </span>
                          ) : (
                            <button
                              onClick={() =>
                                setAcknowledgedRecs((prev) => ({ ...prev, [rec.recommendation_id]: true }))
                              }
                              className="px-3 py-1.5 text-xs font-medium text-white bg-sky-600 hover:bg-sky-500 rounded-lg shadow-sm transition"
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
              <p className="text-xs text-slate-400 italic">
                All operating variables and biological stages are currently within optimal kinetic envelopes.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: WHAT-IF SCENARIO SIMULATION STUDIO                 */}
      {/* ========================================================= */}
      {activeTab === 'scenarios' && (
        <div className="space-y-6">
          <div className="bg-amber-950/40 border-l-4 border-amber-500 p-4 rounded-r-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
              <h4 className="text-sm font-bold text-amber-200">Isolated What-If Simulation Sandbox</h4>
            </div>
            <p className="text-xs text-amber-300/80 mt-1">
              Scenarios run in total isolation on virtual state copies. They explore hypothetical plant behavior and
              <strong> do not</strong> overwrite observed measurements, modify accepted state, or generate regulatory
              compliance certificates.
            </p>
          </div>

          {/* Scenario Configuration Controls */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-100">Define Scenario Parameters</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Scenario Type</label>
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
                  className="w-full text-sm rounded-lg border border-slate-700 bg-slate-950 text-slate-200 p-2 focus:ring-1 focus:ring-sky-500"
                >
                  <option value="influent_quality_change">Influent Quality Shock (Organic Overload)</option>
                  <option value="aeration_failure">Aeration Failure (Blower Outage)</option>
                  <option value="hydraulic_surge">Hydraulic Surge (Storm Infiltration)</option>
                  <option value="chemical_overdosing">Chemical Overdosing</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Scenario Name</label>
                <input
                  type="text"
                  value={scenarioName}
                  onChange={(e) => setScenarioName(e.target.value)}
                  className="w-full text-sm rounded-lg border border-slate-700 bg-slate-950 text-slate-200 p-2 focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Duration (Minutes)</label>
                <select
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="w-full text-sm rounded-lg border border-slate-700 bg-slate-950 text-slate-200 p-2 focus:ring-1 focus:ring-sky-500"
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
                <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                  <span>Influent BOD Shock Percentage</span>
                  <span className="text-sky-400">+{bodChange}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="150"
                  step="5"
                  value={bodChange}
                  onChange={(e) => setBodChange(Number(e.target.value))}
                  className="w-full accent-sky-500 cursor-pointer"
                />
              </div>
            )}

            {scenarioType === 'aeration_failure' && (
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                  <span>Dissolved Oxygen Reduction Percentage</span>
                  <span className="text-rose-400">-{doDrop}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="95"
                  step="5"
                  value={doDrop}
                  onChange={(e) => setDoDrop(Number(e.target.value))}
                  className="w-full accent-rose-500 cursor-pointer"
                />
              </div>
            )}

            <button
              onClick={handleExecuteScenario}
              disabled={runScenarioMutation.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold rounded-lg shadow-sm transition disabled:opacity-50"
            >
              <Play className="h-4 w-4" />
              {runScenarioMutation.isPending ? 'Simulating Kinetics...' : 'Execute What-If Scenario'}
            </button>
          </div>

          {/* Scenario Results Comparative Visualization */}
          {scenarioResult && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-100">Effluent BOD Trajectory Comparison</h3>
                  <p className="text-xs text-slate-400">
                    Baseline accepted state vs. Simulated what-if perturbation across forward timeline.
                  </p>
                </div>
                {scenarioResult.comparison_summary && (
                  <span
                    className={`px-3 py-1 text-xs font-bold rounded-full ${
                      scenarioResult.comparison_summary.compliance_risk_detected
                        ? 'bg-rose-950 text-rose-300 border border-rose-800'
                        : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
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
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="time" stroke="#64748b" fontSize={12} />
                    <YAxis
                      stroke="#64748b"
                      fontSize={12}
                      label={{ value: 'BOD (mg/L)', angle: -90, position: 'insideLeft', offset: 10, fill: '#94a3b8' }}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }}
                    />
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

      {/* ========================================================= */}
      {/* TAB 3: FORWARD PREDICTIVE HORIZON                         */}
      {/* ========================================================= */}
      {activeTab === 'predictions' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-100">Steady-State Effluent Projection</h3>
                <p className="text-xs text-slate-400">
                  Evidence-gated effluent estimates calculated via first-principles CSTR kinetics with empirical holdout uncertainty bounds (±1.96 RMSE).
                </p>
              </div>
              <span className="text-xs bg-purple-950 text-purple-300 border border-purple-800 px-2.5 py-1 rounded font-semibold">
                [KINETIC PROJECTION]
              </span>
            </div>

            {predictionsQuery.isLoading ? (
              <LoadingState message="Computing forward estimates..." />
            ) : predictionsQuery.data?.status === 'insufficient_data' ? (
              <div className="bg-amber-950/40 border border-amber-800 rounded p-4 text-xs text-amber-300 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
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
                    <div key={param} className="border border-purple-900/60 bg-purple-950/20 rounded-lg p-4 shadow-sm">
                      <span className="text-xs uppercase font-bold text-purple-400">{param.toUpperCase()}</span>
                      <div className="text-2xl font-extrabold text-slate-100 mt-1 font-mono">
                        {valDisplay} <span className="text-xs font-normal text-slate-500">{unitDisplay}</span>
                      </div>
                      {bounds && bounds.lower_bound != null && bounds.upper_bound != null && (
                        <div className="text-[11px] text-slate-400 mt-2 font-mono">
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

      {/* ========================================================= */}
      {/* TAB 4: WATER RECYCLING & SUSTAINABILITY                   */}
      {/* ========================================================= */}
      {activeTab === 'sustainability' && (
        <div className="space-y-6">
          {sustainabilityQuery.isLoading ? (
            <LoadingState message="Calculating water reuse metrics..." />
          ) : sustainabilityQuery.data ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Daily Reclaimed Water</span>
                <div className="text-3xl font-extrabold text-sky-400 font-mono">
                  {sustainabilityQuery.data.reuse_volume_m3_day != null ? sustainabilityQuery.data.reuse_volume_m3_day.toLocaleString() : '—'}{' '}
                  <span className="text-sm font-normal text-slate-500 font-sans">m³/day</span>
                </div>
                <p className="text-xs text-slate-400">Based on 75% reuse allocation from operational STP throughput.</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Annual Freshwater Saved</span>
                <div className="text-3xl font-extrabold text-emerald-400 font-mono">
                  {sustainabilityQuery.data.annual_freshwater_saved_m3 != null ? sustainabilityQuery.data.annual_freshwater_saved_m3.toLocaleString() : '—'}{' '}
                  <span className="text-sm font-normal text-slate-500 font-sans">m³/year</span>
                </div>
                <p className="text-xs text-slate-400">Displaces municipal freshwater extraction for non-potable needs.</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Safe Reuse Gate</span>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 text-xl font-extrabold px-3 py-1 rounded-lg ${
                      sustainabilityQuery.data.safe_reuse_gate === 'PASSED'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : 'bg-amber-950 text-amber-300 border border-amber-800'
                    }`}
                  >
                    <CheckCircle2 className="h-5 w-5" />
                    {sustainabilityQuery.data.safe_reuse_gate ?? 'HELD'}
                  </span>
                </div>
                <p className="text-xs text-slate-400">CPCB non-potable reuse standard verification.</p>
              </div>

              <div className="md:col-span-3 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
                <h4 className="text-sm font-bold text-slate-100">Approved Non-Potable Water Reuse Applications</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {sustainabilityQuery.data.reuse_applications?.map((app, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-slate-300 bg-slate-950 border border-slate-800 p-2.5 rounded-lg">
                      <Droplets className="h-4 w-4 text-sky-400 flex-shrink-0" />
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
