import { useState, useEffect } from 'react';

export interface EquipmentState {
  id: string;
  name: string;
  type: 'pump' | 'blower' | 'dosing';
  status: 'running' | 'stopped' | 'fault' | 'tripped';
  mode: 'auto' | 'manual';
  powerKw: number;
}

export interface PidLoop {
  tag: string;
  name: string;
  setpoint: number; // e.g. 2.0 mg/L DO
  processValue: number; // live reading
  outputPct: number; // 0 - 100%
  minSp: number;
  maxSp: number;
  unit: string;
}

export interface AlarmItem {
  id: string;
  tag: string;
  parameter: string;
  level: 'LL' | 'L' | 'H' | 'HH';
  value: number;
  threshold: number;
  timeIn: string;
  state: 'UNACK_ALARM' | 'ACKED' | 'SHELVED';
  shelvedUntil?: string;
}

const INITIAL_EQUIPMENT: EquipmentState[] = [
  { id: 'P-101', name: 'Raw Sewage Pump 1', type: 'pump', status: 'running', mode: 'auto', powerKw: 45.2 },
  { id: 'P-102', name: 'Raw Sewage Pump 2', type: 'pump', status: 'running', mode: 'auto', powerKw: 44.8 },
  { id: 'P-103', name: 'Raw Sewage Pump 3 (Standby)', type: 'pump', status: 'stopped', mode: 'manual', powerKw: 0.0 },
  { id: 'P-104', name: 'Sludge Recirculation Pump', type: 'pump', status: 'running', mode: 'auto', powerKw: 22.4 },
  { id: 'BLW-201', name: 'Aeration Blower Unit 1', type: 'blower', status: 'running', mode: 'auto', powerKw: 110.5 },
  { id: 'BLW-202', name: 'Aeration Blower Unit 2', type: 'blower', status: 'running', mode: 'auto', powerKw: 108.2 },
  { id: 'DP-401', name: 'Chlorine Dosing Skid', type: 'dosing', status: 'running', mode: 'auto', powerKw: 3.5 },
];

const INITIAL_PID: PidLoop = {
  tag: 'FIC-201',
  name: 'Aeration Basin Dissolved Oxygen (DO) Control',
  setpoint: 2.1,
  processValue: 2.05,
  outputPct: 68.4,
  minSp: 1.0,
  maxSp: 4.0,
  unit: 'mg/L',
};

const INITIAL_ALARMS: AlarmItem[] = [
  {
    id: 'ALM-001',
    tag: 'AIT-503',
    parameter: 'Effluent COD',
    level: 'H',
    value: 52.4,
    threshold: 50.0,
    timeIn: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    state: 'UNACK_ALARM',
  },
  {
    id: 'ALM-002',
    tag: 'AIT-201',
    parameter: 'Aeration Basin DO',
    level: 'L',
    value: 1.85,
    threshold: 2.0,
    timeIn: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    state: 'ACKED',
  },
];

export function useScadaStore() {
  const [equipment, setEquipment] = useState<EquipmentState[]>(() => {
    const saved = localStorage.getItem('aquatrust.scada.equipment');
    return saved ? JSON.parse(saved) : INITIAL_EQUIPMENT;
  });

  const [pid, setPid] = useState<PidLoop>(() => {
    const saved = localStorage.getItem('aquatrust.scada.pid');
    return saved ? JSON.parse(saved) : INITIAL_PID;
  });

  const [alarms, setAlarms] = useState<AlarmItem[]>(() => {
    const saved = localStorage.getItem('aquatrust.scada.alarms');
    return saved ? JSON.parse(saved) : INITIAL_ALARMS;
  });

  const [sensorHoldList, setSensorHoldList] = useState<string[]>(() => {
    const saved = localStorage.getItem('aquatrust.scada.holds');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('aquatrust.scada.equipment', JSON.stringify(equipment));
  }, [equipment]);

  useEffect(() => {
    localStorage.setItem('aquatrust.scada.pid', JSON.stringify(pid));
  }, [pid]);

  useEffect(() => {
    localStorage.setItem('aquatrust.scada.alarms', JSON.stringify(alarms));
  }, [alarms]);

  useEffect(() => {
    localStorage.setItem('aquatrust.scada.holds', JSON.stringify(sensorHoldList));
  }, [sensorHoldList]);

  const toggleEquipment = (id: string, pin: string, justification: string): { ok: boolean; error?: string } => {
    if (pin !== '1234') {
      return { ok: false, error: 'Invalid 4-digit Operator PIN. Enter 1234.' };
    }
    if (!justification.trim()) {
      return { ok: false, error: 'Operating justification is required for 21 CFR Part 11 audit journal.' };
    }

    setEquipment((prev) =>
      prev.map((eq) => {
        if (eq.id === id) {
          const nextStatus = eq.status === 'running' ? 'stopped' : 'running';
          return {
            ...eq,
            status: nextStatus,
            powerKw: nextStatus === 'running' ? (eq.type === 'blower' ? 110.0 : eq.type === 'pump' ? 45.0 : 3.5) : 0,
          };
        }
        return eq;
      })
    );
    return { ok: true };
  };

  const updatePidSetpoint = (newSp: number, pin: string): { ok: boolean; error?: string } => {
    if (pin !== '1234') {
      return { ok: false, error: 'Invalid 4-digit Operator PIN. Enter 1234.' };
    }
    const currentSp = pid.setpoint;
    if (Math.abs(newSp - currentSp) > 2.0) {
      return { ok: false, error: 'Rate of Change (RoC) limit exceeded: swings > 2.0 mg/L rejected for process stability.' };
    }
    if (newSp < pid.minSp || newSp > pid.maxSp) {
      return { ok: false, error: `Setpoint must remain within safe operational bounds (${pid.minSp} - ${pid.maxSp} mg/L).` };
    }

    setPid((prev) => ({
      ...prev,
      setpoint: Number(newSp.toFixed(2)),
      outputPct: Math.min(100, Math.max(10, Math.round((newSp / 4.0) * 90))),
    }));
    return { ok: true };
  };

  const acknowledgeAlarm = (alarmId: string) => {
    setAlarms((prev) =>
      prev.map((a) => (a.id === alarmId ? { ...a, state: 'ACKED' } : a))
    );
  };

  const shelveAlarm = (alarmId: string, durationMinutes: number) => {
    const until = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();
    setAlarms((prev) =>
      prev.map((a) => (a.id === alarmId ? { ...a, state: 'SHELVED', shelvedUntil: until } : a))
    );
  };

  const toggleSensorHold = (sensorTag: string) => {
    setSensorHoldList((prev) =>
      prev.includes(sensorTag) ? prev.filter((t) => t !== sensorTag) : [...prev, sensorTag]
    );
  };

  return {
    equipment,
    pid,
    alarms,
    sensorHoldList,
    toggleEquipment,
    updatePidSetpoint,
    acknowledgeAlarm,
    shelveAlarm,
    toggleSensorHold,
  };
}
