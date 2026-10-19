import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getSimulatorStatusApi,
  startSimulatorApi,
  stopSimulatorApi,
  injectAnomalyApi,
  getSimulatorWebSocketUrl,
} from '../api/simulator';
import { listFacilitiesApi } from '../api/facilities';
import { getFacilityTwinStateApi } from '../api/digitalTwin';
import { useAuth } from '../context/AuthContext';
import { LoadingState, ErrorState } from '../components/common/States';
import { SimulatorCanvas } from '../components/simulator/SimulatorCanvas';
import { SynopticProcessFlow } from '../components/digitalTwin/SynopticProcessFlow';
import { StageInspectionDrawer } from '../components/digitalTwin/StageInspectionDrawer';
import { IntegratedStageInspector } from '../components/digitalTwin/IntegratedStageInspector';
import {
  Play,
  Square,
  AlertTriangle,
  RefreshCw,
  Radio,
  Clock,
  Layers,
  Cpu,
  CheckCircle2,
  ArrowRight,
  Sliders,
  Activity,
  Flame,
  ShieldAlert,
} from 'lucide-react';

const AUTHORIZED_ANOMALY_SCENARIOS = [
  { id: 'organic_shock', name: 'Organic Shock Load', desc: 'Sudden spike in high-strength organic influent (BOD/COD)', target: 'Stage 1 (Influent)' },
  { id: 'aeration_failure', name: 'Aeration Basin Blower Failure', desc: 'Dissolved oxygen collapse following blower trip', target: 'Stage 3 (Aeration)' },
  { id: 'ph_drift', name: 'pH Acidic/Alkaline Drift', desc: 'Rapid pH boundary deviation outside 6.5 - 8.5 range', target: 'Stage 1 & 5' },
  { id: 'toxic_inflow', name: 'Toxic Industrial Inflow', desc: 'Inflow of toxic chemical suppressing autotrophic nitrifiers', target: 'Stage 3 (Biomass)' },
  { id: 'sensor_freeze', name: 'Sensor Flatline Freeze', desc: 'Physical sensor hardware lock generating zero variance', target: 'Sensor Probe' },
  { id: 'sensor_drift', name: 'Sensor Calibration Drift', desc: 'Slow progressive offset distortion in optical DO probe', target: 'Stage 3 (DO Probe)' },
  { id: 'false_compliance', name: 'False Compliance Masquerade', desc: 'Unphysical artificially clean telemetry under heavy loading', target: 'Audit Trap' },
  { id: 'storm_dilution', name: 'Storm Inflow Dilution', desc: 'Volumetric precipitation hydraulic surge diluting concentrations', target: 'All Stages' },
];

export const SimulatorPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Controls state
  const [intervalSeconds, setIntervalSeconds] = useState<number>(1.0);
  const [selectedFacilityName, setSelectedFacilityName] = useState<string>('Bharwara STP Lucknow');
  const [scenarioId, setScenarioId] = useState<string>('organic_shock');
  const [severity, setSeverity] = useState<number>(1.5);
  const [durationSteps, setDurationSteps] = useState<number>(15);

  // Visualization mode toggle: 'pipeline' (Telemetry Transmission) vs 'synoptic' (5-Stage STP)
  const [viewMode, setViewMode] = useState<'pipeline' | 'synoptic'>('pipeline');
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);

  // WebSocket Live Stream state
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [lastWsMessage, setLastWsMessage] = useState<any>(null);
  const [wsError, setWsError] = useState<string | null>(null);

  const { data: facilities } = useQuery({
    queryKey: ['facilities'],
    queryFn: listFacilitiesApi,
    staleTime: 60000,
  });

  const statusQuery = useQuery({
    queryKey: ['simulator-status'],
    queryFn: getSimulatorStatusApi,
    refetchInterval: (query) => (query.state.data?.is_running ? 1000 : 3000),
  });

  const sim = lastWsMessage?.status || statusQuery.data;
  const activeFacilityId = sim?.active_facility_id || (facilities && facilities.length > 0 ? facilities[0].facility_id : '');

  // Fetch twin state for synoptic view fallback
  const twinStateQuery = useQuery({
    queryKey: ['twin-state', activeFacilityId],
    queryFn: () => getFacilityTwinStateApi(activeFacilityId),
    enabled: !!activeFacilityId && viewMode === 'synoptic',
    refetchInterval: 5000,
  });

  const startMutation = useMutation({
    mutationFn: () =>
      startSimulatorApi({
        facility_name: selectedFacilityName,
        interval_seconds: intervalSeconds,
        auto_ingest: true,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['simulator-status'] });
      statusQuery.refetch();
    },
  });

  const stopMutation = useMutation({
    mutationFn: () => stopSimulatorApi(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['simulator-status'] });
      statusQuery.refetch();
    },
  });

  const injectMutation = useMutation({
    mutationFn: () =>
      injectAnomalyApi({
        scenario_id: scenarioId,
        severity,
        duration_steps: durationSteps,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['simulator-status'] });
    },
  });

  // Native Browser WebSocket connection to /api/v1/simulator/stream?token=...
  useEffect(() => {
    let ws: WebSocket | null = null;
    let shouldReconnect = true;

    const connectWs = () => {
      try {
        const url = getSimulatorWebSocketUrl();
        ws = new WebSocket(url);

        ws.onopen = () => {
          setWsConnected(true);
          setWsError(null);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            setLastWsMessage(data);
            if (data.status) {
              queryClient.setQueryData(['simulator-status'], data.status);
            }
          } catch (e) {
            console.error('Failed to parse WebSocket message', e);
          }
        };

        ws.onerror = () => {
          setWsError('WebSocket communication error. Using polling fallback.');
          setWsConnected(false);
        };

        ws.onclose = () => {
          setWsConnected(false);
        };
      } catch (err: any) {
        setWsError(err.message || 'Unable to initialize WebSocket connection');
      }
    };

    connectWs();

    return () => {
      shouldReconnect = false;
      if (ws) {
        ws.close();
      }
    };
  }, [queryClient]);

  return (
    <div className="space-y-6 pb-12">
      {/* Top SCADA Operations Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-sky-600" />
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              SCADA Telemetry Simulator & Anomaly Studio
            </h1>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                sim?.is_running
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {sim?.is_running ? 'STREAMING ACTIVE' : 'STOPPED'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time synthetic wastewater treatment basin telemetry generation, live SCADA packet transmission, and physical anomaly injection.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 text-xs font-mono">
            <span
              className={`w-2 h-2 rounded-full ${
                wsConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
              }`}
            />
            <span className="text-slate-300">
              WebSocket: {wsConnected ? 'CONNECTED' : 'POLLING'}
            </span>
          </div>
          <button
            onClick={() => statusQuery.refetch()}
            disabled={statusQuery.isFetching}
            className="p-1.5 bg-white border border-slate-300 rounded text-slate-600 hover:bg-slate-50 transition-colors"
            title="Refresh Status"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${statusQuery.isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {wsError && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs font-mono">
          Notice: {wsError}. HTTP polling active.
        </div>
      )}

      {/* Digital Twin Synchronization Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-slate-200 shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-sky-950 border border-sky-800 text-sky-400">
            <Cpu className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-400">
                Digital Twin SCADA Synchronization Active
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-800">
                1Hz ENGINE SYNC
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Simulated telemetry is automatically mapped to virtual treatment basins in the 5-stage animated SCADA control room.
            </p>
          </div>
        </div>
        <Link
          to={activeFacilityId ? `/facilities/${activeFacilityId}/twin` : '/facilities'}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-sm transition-colors whitespace-nowrap self-start sm:self-auto"
        >
          <span>Open Full Digital Twin Control Room</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Visualizer Mode Toggle */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('pipeline')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              viewMode === 'pipeline'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>SCADA Telemetry Pipeline Canvas</span>
          </button>
          <button
            onClick={() => setViewMode('synoptic')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              viewMode === 'synoptic'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>STP 5-Stage Synoptic Process Flow</span>
          </button>
        </div>
        <span className="text-[11px] font-mono text-slate-500">
          Mode: {viewMode === 'pipeline' ? 'Sensor Node Bus View' : 'Treatment Process View'}
        </span>
      </div>

      {/* PRIMARY REAL-TIME SCADA VISUALIZATION CANVAS */}
      {viewMode === 'pipeline' ? (
        <SimulatorCanvas
          isRunning={!!sim?.is_running}
          activeFacilityName={sim?.active_facility_name || selectedFacilityName}
          stepsGenerated={sim?.steps_generated ?? 0}
          readingsIngested={sim?.readings_ingested ?? 0}
          currentScenario={sim?.current_scenario || 'baseline_normal'}
          lastTickAt={sim?.last_tick_at || null}
          onStart={() => startMutation.mutate()}
          onStop={() => stopMutation.mutate()}
          isStarting={startMutation.isPending}
          isStopping={stopMutation.isPending}
        />
      ) : (
        <div className="flex flex-col lg:flex-row gap-3 w-full min-w-0 items-stretch">
          <div className="flex-1 min-w-0">
            <SynopticProcessFlow
              twinState={twinStateQuery.data || null}
              activeAlarms={[]}
              selectedStageId={selectedStageId}
              onSelectStage={(id) => setSelectedStageId(id)}
              isLoading={twinStateQuery.isLoading}
              isRunning={!!sim?.is_running}
            />
          </div>
          {selectedStageId && (
            <div className="w-full lg:w-[330px] xl:w-[370px] shrink-0 min-w-0 flex flex-col">
              <IntegratedStageInspector
                stageId={selectedStageId}
                twinState={twinStateQuery.data || null}
                alarms={[]}
                onClose={() => setSelectedStageId(null)}
                onAcknowledgeAlarm={() => {}}
              />
            </div>
          )}
        </div>
      )}

      {/* Simulator Runtime State & Ingestion Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-800 uppercase tracking-wide">
                Runtime Simulation Configuration
              </span>
            </div>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Target Facility: {sim?.active_facility_name || selectedFacilityName}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {!sim?.is_running ? (
              <button
                onClick={() => startMutation.mutate()}
                disabled={startMutation.isPending}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5" />
                {startMutation.isPending ? 'Starting...' : 'Start Telemetry Generation'}
              </button>
            ) : (
              <button
                onClick={() => stopMutation.mutate()}
                disabled={stopMutation.isPending}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <Square className="w-3.5 h-3.5" />
                {stopMutation.isPending ? 'Stopping...' : 'Stop Telemetry Stream'}
              </button>
            )}
          </div>
        </div>

        {/* Configuration Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Target Facility Profile
            </label>
            <select
              value={selectedFacilityName}
              onChange={(e) => setSelectedFacilityName(e.target.value)}
              disabled={sim?.is_running}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-800 disabled:opacity-60"
            >
              {facilities?.map((f) => (
                <option key={f.facility_id} value={f.facility_name}>
                  {f.facility_name} ({f.capacity} {f.capacity_unit})
                </option>
              )) || (
                <option value="Bharwara STP Lucknow">Bharwara STP Lucknow (10.0 MLD)</option>
              )}
            </select>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Telemetry Ingestion Tick Interval: {intervalSeconds}s
            </label>
            <input
              type="range"
              min="0.5"
              max="5.0"
              step="0.5"
              value={intervalSeconds}
              onChange={(e) => setIntervalSeconds(parseFloat(e.target.value))}
              disabled={sim?.is_running}
              className="w-full mt-2"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>0.5s (High Speed)</span>
              <span>1.0s (Nominal 1Hz)</span>
              <span>5.0s (Slow)</span>
            </div>
          </div>
        </div>

        {/* Runtime Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 mt-4 border-t border-slate-100 text-xs font-mono">
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <span className="text-slate-500 block text-[11px]">Steps Generated</span>
            <span className="text-xl font-bold text-slate-900">{sim?.steps_generated ?? 0}</span>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <span className="text-slate-500 block text-[11px]">Readings Ingested</span>
            <span className="text-xl font-bold text-sky-600">{sim?.readings_ingested ?? 0}</span>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <span className="text-slate-500 block text-[11px]">Physical Scenario</span>
            <span className="font-semibold text-slate-800 uppercase block mt-1">
              {sim?.current_scenario || 'baseline_normal'}
            </span>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <span className="text-slate-500 block text-[11px]">Last Tick At</span>
            <span className="text-slate-700 block mt-1">
              {sim?.last_tick_at ? new Date(sim.last_tick_at).toLocaleTimeString() : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* Disturbance Scenario Studio (Anomaly Injection) */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            Disturbance Scenario Studio & Anomaly Injection
          </h2>
          <span className="text-[11px] font-mono text-slate-500">
            Physical / Sensor / Attack Vectors
          </span>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          Injects deterministic disturbance scenarios to verify pre-AI quality filters, Isolation Forest anomaly alerts, Monod kinetic reactions, and CPCB non-compliance triggers in real time.
        </p>

        {/* Quick Scenario Selector Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2">
          {AUTHORIZED_ANOMALY_SCENARIOS.map((sc) => (
            <button
              key={sc.id}
              type="button"
              onClick={() => setScenarioId(sc.id)}
              className={`p-3 rounded-lg border text-left transition-all ${
                scenarioId === sc.id
                  ? 'border-rose-500 bg-rose-50/60 shadow-sm'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs text-slate-800">{sc.name}</span>
                {scenarioId === sc.id && <span className="w-2 h-2 rounded-full bg-rose-500"></span>}
              </div>
              <span className="text-[10px] font-mono text-rose-600 block mt-1">{sc.target}</span>
              <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">{sc.desc}</p>
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            injectMutation.mutate();
          }}
          className="space-y-4 text-xs pt-2"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Disturbance Severity Magnitude (0.1 to 5.0)
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                max="5.0"
                value={severity}
                onChange={(e) => setSeverity(parseFloat(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-mono text-slate-800"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Duration (Simulation Steps, 1 to 500)
              </label>
              <input
                type="number"
                min="1"
                max="500"
                value={durationSteps}
                onChange={(e) => setDurationSteps(parseInt(e.target.value, 10))}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-mono text-slate-800"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={injectMutation.isPending || !sim?.is_running}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              {injectMutation.isPending ? 'Injecting Disturbance...' : 'Inject Disturbance Scenario'}
            </button>
            {!sim?.is_running && (
              <span className="text-[11px] text-amber-600 font-mono">
                Simulation engine must be running before disturbances can be injected.
              </span>
            )}
          </div>
        </form>

        {injectMutation.isError && <ErrorState error={injectMutation.error} />}

        {injectMutation.isSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-lg text-xs font-mono text-emerald-950 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Disturbance scenario successfully dispatched into synthetic telemetry stream! Check the live canvas above.
          </div>
        )}
      </div>
    </div>
  );
};
