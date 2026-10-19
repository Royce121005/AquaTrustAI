import { useState, useEffect, useRef, useCallback } from 'react';
import {
  TwinState,
  TwinEngineStatus,
  TwinAlarmEvent,
  TwinWebSocketMessage,
  TwinSnapshotMessage,
  TwinStateDeltaMessage,
} from '../types/digitalTwin';
import { getTwinWebSocketUrl, acknowledgeTwinAlarmApi } from '../api/digitalTwin';

export type TwinConnectionState = 'connected' | 'connecting' | 'disconnected' | 'resyncing';

export interface UseTwinStreamOptions {
  enabled?: boolean;
  onSnapshot?: (snapshot: TwinSnapshotMessage) => void;
  onDelta?: (delta: TwinStateDeltaMessage) => void;
  onError?: (err: Event | Error) => void;
}

export interface UseTwinStreamResult {
  connectionState: TwinConnectionState;
  twinState: TwinState | null;
  activeAlarms: TwinAlarmEvent[];
  engineStatus: TwinEngineStatus | null;
  stateVersion: number;
  lastMessageAt: string | null;
  error: string | null;
  acknowledgeAlarm: (alarmId: string) => Promise<void>;
  resync: () => void;
  reconnect: () => void;
}

export function useTwinStream(
  facilityId: string | undefined,
  options: UseTwinStreamOptions = {}
): UseTwinStreamResult {
  const { enabled = true, onSnapshot, onDelta, onError } = options;

  const [connectionState, setConnectionState] = useState<TwinConnectionState>('disconnected');
  const [twinState, setTwinState] = useState<TwinState | null>(null);
  const [activeAlarms, setActiveAlarms] = useState<TwinAlarmEvent[]>([]);
  const [engineStatus, setEngineStatus] = useState<TwinEngineStatus | null>(null);
  const [stateVersion, setStateVersion] = useState<number>(0);
  const [lastMessageAt, setLastMessageAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backoffRef = useRef<number>(1000);
  const isMountedRef = useRef<boolean>(true);
  const currentVersionRef = useRef<number>(0);

  // Keep current version ref in sync
  currentVersionRef.current = stateVersion;

  const buildTwinStateFromMessage = useCallback(
    (msg: TwinSnapshotMessage | TwinStateDeltaMessage): TwinState => {
      return {
        facility_id: msg.facility_id,
        state_version: msg.state_version,
        observed_at: msg.observed_at,
        source_mode: msg.source_mode || 'live',
        facility_profile_version: 'profile-v1.0',
        stage_states: msg.stage_states || {},
        latest_observations: msg.latest_observations,
        operating_variables: msg.operating_variables || null,
        data_quality: msg.data_quality || 'valid',
        state_freshness: msg.state_freshness || 'fresh',
      };
    },
    []
  );

  const resync = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      setConnectionState('resyncing');
      wsRef.current.send(JSON.stringify({ action: 'RESYNC' }));
    }
  }, []);

  const acknowledgeAlarm = useCallback(
    async (alarmId: string) => {
      // 1. Optimistic UI update
      setActiveAlarms((prev) =>
        prev.map((a) => (a.alarm_id === alarmId ? { ...a, acknowledged: true, status: 'acknowledged' } : a))
      );

      // 2. WebSocket message if connected
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ action: 'ACK_ALARM', alarm_id: alarmId }));
      }

      // 3. Fallback/authoritative REST API call
      if (facilityId) {
        try {
          await acknowledgeTwinAlarmApi(facilityId, alarmId);
        } catch (apiErr) {
          console.warn('REST alarm ack warning:', apiErr);
        }
      }
    },
    [facilityId]
  );

  const connect = useCallback(() => {
    if (!facilityId || !enabled) return;

    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {
        // ignore
      }
      wsRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    setConnectionState('connecting');
    setError(null);

    try {
      const url = getTwinWebSocketUrl(facilityId);
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isMountedRef.current) return;
        setConnectionState('connected');
        backoffRef.current = 1000; // Reset exponential backoff
      };

      ws.onmessage = (event: MessageEvent) => {
        if (!isMountedRef.current) return;
        try {
          const message: TwinWebSocketMessage = JSON.parse(event.data);
          const nowIso = new Date().toISOString();
          setLastMessageAt(nowIso);

          if (message.type === 'TWIN_SNAPSHOT') {
            const nextState = buildTwinStateFromMessage(message);
            setTwinState(nextState);
            setStateVersion(message.state_version);
            if (message.active_alarms) {
              setActiveAlarms(message.active_alarms);
            }
            if (message.engine_status) {
              setEngineStatus(message.engine_status);
            }
            setConnectionState('connected');
            if (onSnapshot) onSnapshot(message);
          } else if (message.type === 'TWIN_STATE_DELTA') {
            const curVer = currentVersionRef.current;
            // Gap detection: incoming version jumped more than 1 ahead
            if (curVer > 0 && message.state_version > curVer + 1) {
              console.warn(
                `[TwinStream] Gap detected: current=${curVer}, incoming=${message.state_version}. Requesting RESYNC.`
              );
              setConnectionState('resyncing');
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ action: 'RESYNC' }));
              }
            } else {
              const nextState = buildTwinStateFromMessage(message);
              setTwinState(nextState);
              setStateVersion(message.state_version);
              if (message.active_alarms) {
                setActiveAlarms(message.active_alarms);
              }
              if (message.engine_status) {
                setEngineStatus(message.engine_status);
              }
              if (onDelta) onDelta(message);
            }
          } else if (message.type === 'TWIN_ALARM_ACKNOWLEDGED') {
            setActiveAlarms((prev) =>
              prev.map((a) =>
                a.alarm_id === message.alarm_id
                  ? { ...a, acknowledged: true, status: 'acknowledged', last_updated_at: message.acknowledged_at || new Date().toISOString() }
                  : a
              )
            );
          } else if (message.type === 'HEARTBEAT') {
            // Heartbeat keeps connection alive
          }
        } catch (parseErr) {
          console.error('[TwinStream] Failed to parse message', parseErr);
        }
      };

      ws.onerror = (err) => {
        if (!isMountedRef.current) return;
        setError('SCADA WebSocket stream connection error.');
        if (onError) onError(err);
      };

      ws.onclose = () => {
        if (!isMountedRef.current) return;
        setConnectionState('disconnected');
        // Exponential backoff reconnect: 1s, 2s, 4s, max 10s
        const delay = backoffRef.current;
        backoffRef.current = Math.min(backoffRef.current * 2, 10000);

        reconnectTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current && enabled) {
            connect();
          }
        }, delay);
      };
    } catch (initErr: any) {
      if (!isMountedRef.current) return;
      setError(initErr.message || 'Unable to initialize WebSocket connection');
      setConnectionState('disconnected');
    }
  }, [facilityId, enabled, buildTwinStateFromMessage, onSnapshot, onDelta, onError]);

  const reconnect = useCallback(() => {
    backoffRef.current = 1000;
    connect();
  }, [connect]);

  useEffect(() => {
    isMountedRef.current = true;
    connect();

    return () => {
      isMountedRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {
          // ignore
        }
        wsRef.current = null;
      }
    };
  }, [connect]);

  return {
    connectionState,
    twinState,
    activeAlarms,
    engineStatus,
    stateVersion,
    lastMessageAt,
    error,
    acknowledgeAlarm,
    resync,
    reconnect,
  };
}
