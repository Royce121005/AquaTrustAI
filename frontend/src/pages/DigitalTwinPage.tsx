import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Cpu,
  Activity,
  Layers,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Play,
  Pause,
  Square,
  ShieldAlert,
  Droplets,
  Sliders,
  Check,
  RefreshCw,
  Radio,
  ChevronDown,
  Clock,
  Sparkles,
  Info,
  PanelRight,
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
import { IntegratedStageInspector } from '../components/digitalTwin/IntegratedStageInspector';
import { KeyPlantParameters } from '../components/digitalTwin/KeyPlantParameters';
import { LiveEventsConsole } from '../components/digitalTwin/LiveEventsConsole';
import { SimulatorCanvas } from '../components/simulator/SimulatorCanvas';
import { LoadingState } from '../components/common/States';
import { ScenarioCreateRequest, ScenarioResponse } from '../types/digitalTwin';

type TabType =
  | 'process_flow'
  | 'telemetry_pipeline'
  | 'scenarios'
  | 'predictions'
  | 'sustainability'
  | 'analytics';

export const DigitalTwinPage: React.FC = () => {
  const { facilityId: routeFacilityId } = useParams<{ facilityId?: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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

  // Tab navigation matching the reference architecture
  const [activeTab, setActiveTab] = useState<TabType>('process_flow');

  // Selected stage for inspection
  const [selectedStageId, setSelectedStageId] = useState<string | null>('biological_aeration');

  // Inspector layout placement mode: 'drawer' (slide-over overlay) | 'below' (docked underneath canvas)
  const [inspectorPlacement, setInspectorPlacement] = useState<'drawer' | 'below'>('drawer');

  // Close slide drawer on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedStageId && inspectorPlacement === 'drawer') {
        setSelectedStageId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedStageId, inspectorPlacement]);

  // Scenario configuration state
  const [scenarioType, setScenarioType] = useState<ScenarioCreateRequest['scenario_type']>('influent_quality_change');
  const [scenarioName, setScenarioName] = useState<string>('Organic Inflow Shock (+40%)');
  const [bodChange, setBodChange] = useState<number>(40);
  const [doDrop, setDoDrop] = useState<number>(75);
  const [durationMinutes, setDurationMinutes] = useState<number>(120);
  const [scenarioResult, setScenarioResult] = useState<ScenarioResponse | null>(null);

  // Acknowledged recommendations state (local UI)
  const [acknowledgedRecs, setAcknowledgedRecs] = useState<Record<string, boolean>>({});

  // Real-time ticking clock for age calculations
  const [nowMs, setNowMs] = useState<number>(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

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
    enabled: !!selectedFacilityId && (activeTab === 'process_flow' || activeTab === 'predictions'),
  });

  const recommendationsQuery = useQuery({
    queryKey: ['twin-recommendations', selectedFacilityId],
    queryFn: () => getFacilityRecommendationsApi(selectedFacilityId),
    enabled: !!selectedFacilityId && (activeTab === 'process_flow' || activeTab === 'analytics'),
  });

  const sustainabilityQuery = useQuery({
    queryKey: ['twin-sustainability', selectedFacilityId],
    queryFn: () => getFacilitySustainabilityApi(selectedFacilityId),
    enabled: !!selectedFacilityId && (activeTab === 'process_flow' || activeTab === 'sustainability'),
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
    setSelectedStageId('biological_aeration');
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

  const modeDisplayLabel =
    activeTab === 'scenarios'
      ? 'WHAT-IF SCENARIO'
      : currentMode === 'live'
      ? 'LIVE TELEMETRY'
      : currentMode === 'historical_replay'
      ? 'HISTORICAL REPLAY'
      : 'LIVE SIMULATION';

  // Last update age and formatted IST time
  const observedTime = activeTwinState?.observed_at ? new Date(activeTwinState.observed_at) : null;
  const secondsAgo = observedTime ? Math.max(0, Math.floor((nowMs - observedTime.getTime()) / 1000)) : 0;
  const lastUpdateFormatted = observedTime
    ? observedTime.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
      ' ' +
      observedTime.toLocaleTimeString([], { hour12: false })
    : '18 Oct 2026 14:32:18';

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

  const navTabs: { id: TabType; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'process_flow', label: 'Process Flow', icon: Layers },
    { id: 'telemetry_pipeline', label: 'Telemetry Pipeline', icon: Radio },
    { id: 'scenarios', label: 'What-If Scenario', icon: Sliders },
    { id: 'predictions', label: 'Predictive Horizon', icon: TrendingUp },
    { id: 'sustainability', label: 'Water Recycling & Reuse', icon: Droplets },
    { id: 'analytics', label: 'Analytics & Reports', icon: Activity },
  ];

  return (
    <div className="space-y-4 pb-12">
      {/* ========================================================= */}
      {/* 1. GLOBAL SCADA OPERATIONS HEADER & CONTROLS              */}
      {/* ========================================================= */}
      <header className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-xl flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        {/* Left: Branding & Facility Select */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-sky-950/90 border border-sky-800/80 flex items-center justify-center text-sky-400 shadow-md">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold tracking-tight text-white">AquaTrustAI</span>
                <span className="text-xs text-slate-400 font-medium">STP Digital Twin</span>
              </div>
              <div className="relative mt-0.5 inline-block">
                <select
                  id="facility-select"
                  value={selectedFacilityId}
                  onChange={handleFacilityChange}
                  className="appearance-none bg-slate-950/80 hover:bg-slate-800/80 border border-slate-700/80 text-slate-200 text-xs font-semibold pl-2.5 pr-7 py-1 rounded-md cursor-pointer focus:outline-none focus:border-sky-500 transition-colors"
                >
                  {facilities.map((fac) => (
                    <option key={fac.facility_id} value={fac.facility_id} className="bg-slate-900 text-slate-200">
                      {fac.facility_name} • {(fac.location as { city?: string })?.city || (fac.location as { state?: string })?.state || 'Lucknow'}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Mode Badge, State Version, Last Update & Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Live Simulation Mode Pill */}
          <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800/90 px-3 py-1.5 rounded-lg shadow-sm">
            <span className="flex h-2.5 w-2.5 relative">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full ${
                  currentLifecycle === 'running' ? 'bg-emerald-400 opacity-75' : 'bg-amber-400 opacity-75'
                }`}
              ></span>
              <span
                className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                  currentLifecycle === 'running'
                    ? 'bg-emerald-500'
                    : currentLifecycle === 'paused'
                    ? 'bg-amber-500'
                    : 'bg-slate-500'
                }`}
              ></span>
            </span>
            <div>
              <div className="text-[11px] font-mono font-bold text-emerald-400 tracking-wide uppercase">
                ● {modeDisplayLabel}
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                {currentLifecycle === 'running'
                  ? 'Twin Running | Simulator'
                  : currentLifecycle === 'paused'
                  ? 'Twin Paused | Simulator'
                  : 'Twin Stopped | Standby'}
              </div>
            </div>
          </div>

          {/* State Version Pill */}
          <div className="bg-slate-950/80 border border-slate-800/90 px-3 py-1.5 rounded-lg shadow-sm text-center">
            <div className="text-[10px] text-slate-400 font-mono uppercase">State Version</div>
            <div className="text-xs font-mono font-bold text-sky-400">State v{effectiveVersion}</div>
          </div>

          {/* Last Update Clock */}
          <div className="bg-slate-950/80 border border-slate-800/90 px-3 py-1.5 rounded-lg shadow-sm">
            <div className="text-[10px] text-slate-400 font-mono uppercase flex items-center gap-1">
              <Clock className="w-2.5 h-2.5 text-slate-400" />
              Last Update (IST)
            </div>
            <div className="text-xs font-mono text-slate-200">
              {lastUpdateFormatted}{' '}
              <span className="text-emerald-400 font-bold">
                ● {secondsAgo}s ago
              </span>
            </div>
          </div>

          {/* Engine Lifecycle Controls */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 p-1 rounded-lg shadow-sm">
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
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-semibold shadow-sm transition-colors"
                title={currentLifecycle === 'paused' ? 'Resume Engine' : 'Start Engine (1Hz)'}
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{currentLifecycle === 'paused' ? 'Resume' : 'Start'}</span>
              </button>
            ) : (
              <button
                onClick={() => pauseEngineMutation.mutate()}
                disabled={pauseEngineMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-600/90 hover:bg-emerald-500 text-white font-mono text-xs font-semibold shadow-sm transition-colors"
                title="Twin Engine Running (Click to Pause)"
              >
                <Play className="w-3.5 h-3.5 fill-current text-white" />
                <span>Running</span>
              </button>
            )}

            {currentLifecycle === 'running' && (
              <button
                onClick={() => pauseEngineMutation.mutate()}
                disabled={pauseEngineMutation.isPending}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-white font-mono text-xs font-semibold shadow-sm transition-colors"
                title="Pause Engine"
              >
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Pause</span>
              </button>
            )}

            <button
              onClick={() => stopEngineMutation.mutate()}
              disabled={stopEngineMutation.isPending || currentLifecycle === 'stopped'}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded hover:bg-slate-800 text-slate-300 disabled:opacity-40 font-mono text-xs font-semibold transition-colors"
              title="Stop Engine"
            >
              <Square className="w-3.5 h-3.5 fill-current text-rose-400" />
              <span>Stop</span>
            </button>

            <button
              onClick={() => {
                reconnect();
                stateQuery.refetch();
              }}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
              title="Force Stream Reconnect & Resync"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* ========================================================= */}
      {/* 2. SUB-NAVIGATION BAR (6 PROCESS TABS)                    */}
      {/* ========================================================= */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 flex flex-wrap items-center justify-between gap-3 shadow-md">
        <nav className="flex items-center gap-1.5 flex-wrap">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  isSelected
                    ? 'bg-sky-950 text-sky-400 border border-sky-800/80 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Right SCADA Controls & Inspector Mode Switcher */}
        <div className="flex items-center gap-2">
          {activeTab === 'process_flow' && (
            <div className="flex items-center gap-1.5 text-xs text-slate-300 bg-slate-950 border border-slate-800 px-2 py-1 rounded-lg font-mono">
              <span className="text-slate-400 text-[10px] uppercase">Inspector:</span>
              <button
                onClick={() => setInspectorPlacement('drawer')}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                  inspectorPlacement === 'drawer'
                    ? 'bg-sky-950 text-sky-400 border border-sky-800'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Inspector slides over as a side drawer (Canvas width stays 100%)"
              >
                Slide Drawer
              </button>
              <button
                onClick={() => setInspectorPlacement('below')}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                  inspectorPlacement === 'below'
                    ? 'bg-sky-950 text-sky-400 border border-sky-800'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Inspector docks below canvas (Canvas width stays 100%)"
              >
                Dock Below
              </button>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-xs text-slate-300 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg font-mono">
            <span>Main SCADA View</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. TAB 1: PROCESS FLOW VIEW                               */}
      {/* ========================================================= */}
      {activeTab === 'process_flow' && (
        <div className="space-y-4 w-full min-w-0">
          {/* Top Section: Full-Width 5-Stage Animated SCADA Canvas (Never shrunken) */}
          <div className="w-full min-w-0">
            <SynopticProcessFlow
              twinState={activeTwinState || null}
              activeAlarms={activeAlarms}
              selectedStageId={selectedStageId}
              onSelectStage={(stageId) => {
                setSelectedStageId(stageId);
              }}
              isLoading={stateQuery.isLoading && !activeTwinState}
              isRunning={currentLifecycle === 'running'}
            />
          </div>

          {/* Mode A: Below-Canvas Inspector (When inspectorPlacement === 'below' and stage is selected) */}
          {selectedStageId && inspectorPlacement === 'below' && (
            <div className="w-full min-w-0 transition-all duration-300">
              <IntegratedStageInspector
                stageId={selectedStageId}
                twinState={activeTwinState || null}
                alarms={activeAlarms}
                onClose={() => setSelectedStageId(null)}
                onAcknowledgeAlarm={acknowledgeAlarm}
                placementMode="below"
                onTogglePlacement={(mode) => setInspectorPlacement(mode)}
                onSelectStage={(id) => setSelectedStageId(id)}
              />
            </div>
          )}

          {/* Mode B: Slide Drawer Overlay (When inspectorPlacement === 'drawer' and stage is selected) */}
          {/* Note: Overlay renders over the page without touching or shrinking canvas width! */}
          {selectedStageId && inspectorPlacement === 'drawer' && (
            <div className="fixed inset-0 z-50 overflow-hidden">
              {/* Semi-transparent Backdrop click to close */}
              <div
                className="fixed inset-0 bg-slate-950/60 backdrop-blur-[2px] transition-opacity cursor-pointer"
                onClick={() => setSelectedStageId(null)}
                aria-hidden="true"
              />
              {/* Slide Drawer Panel */}
              <div className="fixed inset-y-0 right-0 max-w-full flex pl-10 pointer-events-none">
                <div className="w-screen max-w-md sm:max-w-lg bg-[#0b1329] border-l border-slate-700/80 shadow-2xl p-4 overflow-y-auto pointer-events-auto">
                  <IntegratedStageInspector
                    stageId={selectedStageId}
                    twinState={activeTwinState || null}
                    alarms={activeAlarms}
                    onClose={() => setSelectedStageId(null)}
                    onAcknowledgeAlarm={acknowledgeAlarm}
                    placementMode="drawer"
                    onTogglePlacement={(mode) => setInspectorPlacement(mode)}
                    onSelectStage={(id) => setSelectedStageId(id)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Bottom Section: Key Plant Parameters + Live Events Console */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 w-full min-w-0 items-stretch">
            <div className="xl:col-span-8 min-w-0">
              <KeyPlantParameters
                twinState={activeTwinState || null}
                isRunning={currentLifecycle === 'running'}
                lastMessageAt={lastMessageAt ? new Date(lastMessageAt).toISOString() : null}
              />
            </div>
            <div className="xl:col-span-4 min-w-0 flex flex-col">
              <LiveEventsConsole
                twinState={activeTwinState || null}
                alarms={activeAlarms}
                onAcknowledgeAlarm={acknowledgeAlarm}
              />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. TAB 2: TELEMETRY PIPELINE (SIMULATOR CANVAS)           */}
      {/* ========================================================= */}
      {activeTab === 'telemetry_pipeline' && (
        <div className="space-y-4">
          <SimulatorCanvas
            isRunning={currentLifecycle === 'running'}
            activeFacilityName={selectedFacility?.facility_name || 'Bharwara STP Lucknow'}
            stepsGenerated={activeEngineStatus?.tick_count ?? 0}
            readingsIngested={(activeEngineStatus?.tick_count ?? 0) * 5}
            currentScenario={activeEngineStatus?.current_scenario || 'baseline'}
            lastTickAt={activeEngineStatus?.last_tick_at || activeTwinState?.observed_at || null}
            onStart={() => startEngineMutation.mutate()}
            onStop={() => stopEngineMutation.mutate()}
            isStarting={startEngineMutation.isPending}
            isStopping={stopEngineMutation.isPending}
          />
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. TAB 3: WHAT-IF SCENARIO SIMULATION STUDIO              */}
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
      {/* 6. TAB 4: FORWARD PREDICTIVE HORIZON                      */}
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
      {/* 7. TAB 5: WATER RECYCLING & SUSTAINABILITY                */}
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

      {/* ========================================================= */}
      {/* 8. TAB 6: ANALYTICS & OPERATIONAL REPORTS                 */}
      {/* ========================================================= */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
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
    </div>
  );
};
