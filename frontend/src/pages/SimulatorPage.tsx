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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1F293D]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-semibold bg-cyan-950/60 border border-cyan-800/80 px-2 py-0.5 rounded">
              SCADA Telemetry Edge Engine
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <Radio className="w-5 h-5 text-cyan-400" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-mono">
              SCADA Telemetry Simulator &amp; Anomaly Studio
            </h1>
            <span
              className={`px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase border shadow-sm ${
                sim?.is_running
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
                  : 'bg-slate-900 text-slate-400 border-slate-700'
              }`}
            >
              {sim?.is_running ? 'STREAMING ACTIVE' : 'STOPPED'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#111827] border border-[#1F293D] text-xs font-mono">
            <span
              className={`w-2 h-2 rounded-full ${
                wsConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
              }`}
            />
            <span className="text-slate-300">
              WebSocket: <strong className={wsConnected ? 'text-emerald-400' : 'text-rose-400'}>{wsConnected ? 'CONNECTED' : 'POLLING'}</strong>
            </span>
          </div>
          <button
            onClick={() => statusQuery.refetch()}
            disabled={statusQuery.isFetching}
            className="p-2 bg-[#1E293B] border border-[#334155] rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
            title="Refresh Status"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${statusQuery.isFetching ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </div>

      {wsError && (
        <div className="p-3 bg-amber-950/40 border border-amber-800/80 text-amber-300 rounded-xl text-xs font-mono">
          Notice: {wsError}. HTTP polling active.
        </div>
      )}

      {/* Digital Twin Synchronization Banner */}
      <div className="scada-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-slate-200">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-cyan-950/70 border border-cyan-800 text-cyan-400">
            <Cpu className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 font-mono">
                Digital Twin SCADA Synchronization Active
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-800 font-semibold">
                1Hz ENGINE SYNC
              </span>
            </div>
          </div>
        </div>
        <Link
          to={activeFacilityId ? `/facilities/${activeFacilityId}/twin` : '/facilities'}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-sm transition-colors whitespace-nowrap self-start sm:self-auto font-mono"
        >
          <span>Open Digital Twin Control Room</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Visualizer Mode Toggle */}
      <div className="flex items-center justify-between border-b border-[#1F293D] pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('pipeline')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold font-mono transition-all ${
              viewMode === 'pipeline'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>SCADA Telemetry Pipeline Canvas</span>
          </button>
          <button
            onClick={() => setViewMode('synoptic')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold font-mono transition-all ${
              viewMode === 'synoptic'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>STP 5-Stage Synoptic Process Flow</span>
          </button>
        </div>
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
      <div className="scada-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1F293D]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white uppercase tracking-wide font-mono">
                Runtime Simulation Configuration
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Target Facility: <span className="text-cyan-400">{sim?.active_facility_name || selectedFacilityName}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            {!sim?.is_running ? (
              <button
                onClick={() => startMutation.mutate()}
                disabled={startMutation.isPending}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 font-mono"
              >
                <Play className="w-3.5 h-3.5" />
                {startMutation.isPending ? 'Starting...' : 'Start Telemetry Generation'}
              </button>
            ) : (
              <button
                onClick={() => stopMutation.mutate()}
                disabled={stopMutation.isPending}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 font-mono"
              >
                <Square className="w-3.5 h-3.5" />
                {stopMutation.isPending ? 'Stopping...' : 'Stop Telemetry Stream'}
              </button>
            )}
          </div>
        </div>

        {/* Configuration Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 text-xs font-mono">
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">
              Target Facility Profile
            </label>
            <select
              value={selectedFacilityName}
              onChange={(e) => setSelectedFacilityName(e.target.value)}
              disabled={sim?.is_running}
              className="w-full scada-select disabled:opacity-60"
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
            <label className="block text-slate-300 font-semibold mb-1.5 flex items-center justify-between">
              <span>Telemetry Ingestion Tick Interval:</span>
              <span className="text-cyan-400 font-bold">{intervalSeconds}s</span>
            </label>
            <input
              type="range"
              min="0.5"
              max="5.0"
              step="0.5"
              value={intervalSeconds}
              onChange={(e) => setIntervalSeconds(parseFloat(e.target.value))}
              disabled={sim?.is_running}
              className="w-full mt-2 accent-cyan-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
              <span>0.5s (High Speed)</span>
              <span>1.0s (Nominal 1Hz)</span>
              <span>5.0s (Slow)</span>
            </div>
          </div>
        </div>

        {/* Runtime Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 mt-4 border-t border-[#1F293D] text-xs font-mono">
          <div className="bg-[#0B0F17]/80 p-3.5 rounded-lg border border-[#1F293D]">
            <span className="text-slate-500 block text-[10px] uppercase font-semibold">Steps Generated</span>
            <span className="text-xl font-bold text-white tabular-nums">{sim?.steps_generated ?? 0}</span>
          </div>

          <div className="bg-[#0B0F17]/80 p-3.5 rounded-lg border border-[#1F293D]">
            <span className="text-slate-500 block text-[10px] uppercase font-semibold">Readings Ingested</span>
            <span className="text-xl font-bold text-cyan-400 tabular-nums">{sim?.readings_ingested ?? 0}</span>
          </div>

          <div className="bg-[#0B0F17]/80 p-3.5 rounded-lg border border-[#1F293D]">
            <span className="text-slate-500 block text-[10px] uppercase font-semibold">Physical Scenario</span>
            <span className="font-semibold text-slate-200 uppercase block mt-1 truncate">
              {sim?.current_scenario || 'baseline_normal'}
            </span>
          </div>

          <div className="bg-[#0B0F17]/80 p-3.5 rounded-lg border border-[#1F293D]">
            <span className="text-slate-500 block text-[10px] uppercase font-semibold">Last Tick At</span>
            <span className="text-slate-300 block mt-1">
              {sim?.last_tick_at ? new Date(sim.last_tick_at).toLocaleTimeString() : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* Disturbance Scenario Studio (Anomaly Injection) */}
      <div className="scada-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white uppercase tracking-wide flex items-center gap-2 font-mono">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            Disturbance Scenario Studio &amp; Anomaly Injection
          </h2>
        </div>

        {/* Quick Scenario Selector Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2">
          {AUTHORIZED_ANOMALY_SCENARIOS.map((sc) => (
            <button
              key={sc.id}
              type="button"
              onClick={() => setScenarioId(sc.id)}
              className={`p-3 rounded-xl border text-left transition-all ${
                scenarioId === sc.id
                  ? 'border-rose-500/80 bg-rose-950/40 shadow-sm shadow-rose-950/50'
                  : 'border-[#1F293D] hover:border-slate-700 bg-[#0B0F17]/80 hover:bg-[#161F30]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs text-slate-200 font-mono">{sc.name}</span>
                {scenarioId === sc.id && <span className="w-2 h-2 rounded-full bg-rose-500"></span>}
              </div>
              <span className="text-[10px] font-mono text-rose-400 block mt-1">{sc.target}</span>
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            injectMutation.mutate();
          }}
          className="space-y-4 text-xs pt-2 font-mono"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Disturbance Severity Magnitude (0.1 to 5.0)
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                max="5.0"
                value={severity}
                onChange={(e) => setSeverity(parseFloat(e.target.value))}
                className="w-full scada-input"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Duration (Simulation Steps, 1 to 500)
              </label>
              <input
                type="number"
                min="1"
                max="500"
                value={durationSteps}
                onChange={(e) => setDurationSteps(parseInt(e.target.value, 10))}
                className="w-full scada-input"
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
              <span className="text-[11px] text-amber-400 font-mono">
                Simulation engine must be running before disturbances can be injected.
              </span>
            )}
          </div>
        </form>

        {injectMutation.isError && <ErrorState error={injectMutation.error} />}

        {injectMutation.isSuccess && (
          <div className="p-3 bg-emerald-950/60 border border-emerald-800 rounded-lg text-xs font-mono text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Disturbance scenario successfully dispatched into synthetic telemetry stream! Check the live canvas above.
          </div>
        )}
      </div>
    </div>
  );
};
export default SimulatorPage;
