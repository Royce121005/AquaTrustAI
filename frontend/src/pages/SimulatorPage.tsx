import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getSimulatorStatusApi,
  startSimulatorApi,
  stopSimulatorApi,
  injectAnomalyApi,
  getSimulatorWebSocketUrl,
} from '../api/simulator';
import { listFacilitiesApi } from '../api/facilities';
import { useAuth } from '../context/AuthContext';
import { LoadingState, ErrorState } from '../components/common/States';
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
} from 'lucide-react';

const AUTHORIZED_ANOMALY_SCENARIOS = [
  { id: 'organic_shock', name: 'Organic Shock Load', desc: 'Sudden spike in high-strength organic influent (BOD/COD)' },
  { id: 'toxic_inflow', name: 'Toxic Industrial Inflow', desc: 'Inflow of toxic inhibitory chemical suppressing biological activity' },
  { id: 'ph_drift', name: 'pH Acidic/Alkaline Drift', desc: 'Rapid pH boundary deviation outside 5.5 - 9.0 range' },
  { id: 'sensor_freeze', name: 'Sensor Flatline Freeze', desc: 'Physical sensor hardware lock generating zero variance' },
  { id: 'sensor_drift', name: 'Sensor Calibration Drift', desc: 'Slow progressive offset distortion in probe calibration' },
  { id: 'false_compliance', name: 'False Compliance Masquerade', desc: 'Unphysical artificially clean telemetry under heavy loading' },
  { id: 'storm_dilution', name: 'Storm Inflow Dilution', desc: 'High volumetric precipitation hydraulic surge diluting concentrations' },
  { id: 'aeration_failure', name: 'Aeration Basin Blower Failure', desc: 'Dissolved oxygen crash following blower or diffuser trip' },
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
    },
  });

  const stopMutation = useMutation({
    mutationFn: () => stopSimulatorApi(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['simulator-status'] });
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
            // Optionally update query client with status data
            if (data.status) {
              queryClient.setQueryData(['simulator-status'], data.status);
            }
          } catch (e) {
            console.error('Failed to parse WebSocket message', e);
          }
        };

        ws.onerror = () => {
          setWsError('WebSocket communication error. Verify backend connection.');
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

  const sim = lastWsMessage?.status || statusQuery.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Radio className="w-5 h-5 text-brand-600" />
            SCADA Telemetry Simulator & Anomaly Injection
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Synthetic wastewater basin simulation bridge with authenticated live WebSocket status streaming.
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
              WebSocket: {wsConnected ? 'CONNECTED' : 'DISCONNECTED'}
            </span>
          </div>
          <button
            onClick={() => statusQuery.refetch()}
            disabled={statusQuery.isFetching}
            className="p-1.5 bg-white border border-slate-300 rounded text-slate-600 hover:bg-slate-50"
            title="Refresh Status"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${statusQuery.isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {wsError && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs font-mono">
          Notice: {wsError}. HTTP polling fallback active.
        </div>
      )}

      {/* Simulator Runtime State */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-800 uppercase tracking-wide">
                Runtime Simulation Engine
              </span>
              <span
                className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold uppercase ${
                  sim?.is_running
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {sim?.is_running ? 'STREAMING ACTIVE' : 'STOPPED'}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Target Plant: {sim?.active_facility_name || 'None'}
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

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 text-xs font-mono">
          <div>
            <span className="text-slate-400 block text-[11px]">Steps Generated</span>
            <span className="text-lg font-bold text-slate-900">{sim?.steps_generated ?? 0}</span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px]">Readings Ingested</span>
            <span className="text-lg font-bold text-brand-700">{sim?.readings_ingested ?? 0}</span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px]">Current Physical Scenario</span>
            <span className="font-semibold text-slate-800 uppercase">
              {sim?.current_scenario || 'baseline_normal'}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px]">Last Tick At</span>
            <span className="text-slate-600">
              {sim?.last_tick_at ? new Date(sim.last_tick_at).toLocaleTimeString() : 'N/A'}
            </span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 text-[10px] text-slate-400 font-mono">
          WebSocket endpoint: /api/v1/simulator/stream?token=&lt;jwt&gt; (Broadcasting SimulatorStatus updates)
        </div>
      </div>

      {/* Anomaly Injection Control Panel */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600" />
          Inject Real-Time Physical or Sensor Anomaly
        </h2>
        <p className="text-xs text-slate-500">
          Injects deterministic disturbance scenarios to verify pre-AI quality filters, Isolation Forest anomaly alerts, and CPCB non-compliance triggers.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            injectMutation.mutate();
          }}
          className="space-y-4 text-xs"
        >
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Authorized Disturbance Scenario
            </label>
            <select
              value={scenarioId}
              onChange={(e) => setScenarioId(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-xs font-mono text-slate-800"
            >
              {AUTHORIZED_ANOMALY_SCENARIOS.map((sc) => (
                <option key={sc.id} value={sc.id}>
                  {sc.name} ({sc.id}) — {sc.desc}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Severity Magnitude (0.1 to 5.0)
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                max="5.0"
                value={severity}
                onChange={(e) => setSeverity(parseFloat(e.target.value))}
                className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 font-mono text-slate-800"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Duration (Steps, 1 to 500)
              </label>
              <input
                type="number"
                min="1"
                max="500"
                value={durationSteps}
                onChange={(e) => setDurationSteps(parseInt(e.target.value, 10))}
                className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 font-mono text-slate-800"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={injectMutation.isPending || !sim?.is_running}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded font-semibold transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            {injectMutation.isPending ? 'Injecting Disturbance...' : 'Inject Anomaly Scenario'}
          </button>
          {!sim?.is_running && (
            <span className="text-[11px] text-amber-600 font-mono block">
              Simulation must be running before anomaly scenarios can be injected.
            </span>
          )}
        </form>

        {injectMutation.isError && <ErrorState error={injectMutation.error} />}

        {injectMutation.isSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-300 rounded text-xs font-mono text-emerald-950 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Disturbance scenario successfully dispatched into synthetic telemetry stream.
          </div>
        )}
      </div>
    </div>
  );
};
