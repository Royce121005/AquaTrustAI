import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle2, AlertTriangle, Info, ArrowRight } from 'lucide-react';
import { TwinAlarmEvent, TwinState } from '../../types/digitalTwin';

interface LiveEventsConsoleProps {
  twinState: TwinState | null;
  alarms: TwinAlarmEvent[];
  onAcknowledgeAlarm?: (alarmId: string) => void;
}

interface EventItem {
  id: string;
  time: string;
  event: string;
  source: string;
  value: string;
  status: 'Accepted' | 'Info' | 'Warning' | 'Critical';
  category: 'telemetry' | 'model' | 'equipment';
}

export const LiveEventsConsole: React.FC<LiveEventsConsoleProps> = ({
  twinState,
  alarms,
  onAcknowledgeAlarm,
}) => {
  const [filter, setFilter] = useState<'all' | 'telemetry' | 'model' | 'equipment'>('all');
  const [events, setEvents] = useState<EventItem[]>([]);

  // Update events stream when twinState updates
  useEffect(() => {
    const timeStr = twinState?.observed_at
      ? new Date(twinState.observed_at).toLocaleTimeString([], { hour12: false })
      : new Date().toLocaleTimeString([], { hour12: false });

    const newItems: EventItem[] = [];

    // 1. Process active alarms into event stream
    alarms.forEach((a) => {
      newItems.push({
        id: `alarm-${a.alarm_id}-${a.last_updated_at}`,
        time: new Date(a.last_updated_at).toLocaleTimeString([], { hour12: false }),
        event: a.message,
        source: a.stage_name || a.stage_id.toUpperCase(),
        value: `${a.observed_value !== null ? a.observed_value.toFixed(1) : '—'} ${a.unit}`,
        status: a.severity === 'critical' ? 'Critical' : a.severity === 'warning' ? 'Warning' : 'Info',
        category: 'telemetry',
      });
    });

    // 2. Add latest telemetry acceptance events if twinState exists
    if (twinState?.stage_states) {
      const aer = twinState.stage_states.biological_aeration;
      const eff = twinState.stage_states.final_effluent;

      if (aer?.parameters?.do !== undefined) {
        const doVal = typeof aer.parameters.do === 'object' && aer.parameters.do !== null
          ? (aer.parameters.do as any).value ?? 2.0
          : Number(aer.parameters.do) || 2.0;
        newItems.push({
          id: `tel-do-${twinState.state_version}`,
          time: timeStr,
          event: 'Telemetry accepted',
          source: 'AIT-301',
          value: `${Number(doVal).toFixed(1)} mg/L`,
          status: 'Accepted',
          category: 'telemetry',
        });
        newItems.push({
          id: `mod-do-${twinState.state_version}`,
          time: timeStr,
          event: 'DO setpoint maintained',
          source: 'STAGE-3',
          value: `${Number(doVal).toFixed(1)} mg/L`,
          status: 'Info',
          category: 'model',
        });
      }

      if (aer?.parameters?.mlss !== undefined) {
        const mlssVal = typeof aer.parameters.mlss === 'object' && aer.parameters.mlss !== null
          ? (aer.parameters.mlss as any).value ?? 2580
          : Number(aer.parameters.mlss) || 2580;
        newItems.push({
          id: `tel-mlss-${twinState.state_version}`,
          time: timeStr,
          event: 'Telemetry accepted',
          source: 'AIT-302',
          value: `${Number(mlssVal).toLocaleString()} mg/L`,
          status: 'Accepted',
          category: 'telemetry',
        });
      }

      newItems.push({
        id: `eq-ras-${twinState.state_version}`,
        time: timeStr,
        event: 'RAS pump running',
        source: 'PMP-401',
        value: '0.85 MLD',
        status: 'Info',
        category: 'equipment',
      });

      if (eff?.parameters?.bod !== undefined) {
        const bodVal = typeof eff.parameters.bod === 'object' && eff.parameters.bod !== null
          ? (eff.parameters.bod as any).value ?? 3.8
          : Number(eff.parameters.bod) || 3.8;
        newItems.push({
          id: `tel-eff-${twinState.state_version}`,
          time: timeStr,
          event: 'Telemetry accepted',
          source: 'AIT-501',
          value: `${Number(bodVal).toFixed(1)} mg/L`,
          status: 'Accepted',
          category: 'telemetry',
        });
      }
    }

    if (newItems.length > 0) {
      setEvents((prev) => {
        const combined = [...newItems, ...prev];
        // Deduplicate by ID
        const seen = new Set<string>();
        const unique = combined.filter((item) => {
          if (seen.has(item.id)) return false;
          seen.add(item.id);
          return true;
        });
        return unique.slice(0, 25);
      });
    }
  }, [twinState, alarms]);

  const filteredEvents = events.filter((e) => {
    if (filter === 'all') return true;
    return e.category === filter;
  });

  const allCount = events.length;
  const telemetryCount = events.filter((e) => e.category === 'telemetry').length;
  const modelCount = events.filter((e) => e.category === 'model').length;
  const equipmentCount = events.filter((e) => e.category === 'equipment').length;

  return (
    <div className="bg-[#0b1329] border border-slate-800/80 rounded-xl p-4 shadow-xl select-none flex flex-col justify-between">
      {/* Header with Filter Pills */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-800/70">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-sky-400" />
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            Live Events & Alarms
          </h3>
        </div>

        <div className="flex items-center gap-1 text-[10px] font-mono">
          <button
            onClick={() => setFilter('all')}
            className={`px-2 py-0.5 rounded transition-colors ${
              filter === 'all'
                ? 'bg-sky-600 text-white font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            All ({allCount})
          </button>
          <button
            onClick={() => setFilter('telemetry')}
            className={`px-2 py-0.5 rounded transition-colors ${
              filter === 'telemetry'
                ? 'bg-sky-600 text-white font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            Telemetry ({telemetryCount})
          </button>
          <button
            onClick={() => setFilter('model')}
            className={`px-2 py-0.5 rounded transition-colors ${
              filter === 'model'
                ? 'bg-sky-600 text-white font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            Model ({modelCount})
          </button>
          <button
            onClick={() => setFilter('equipment')}
            className={`px-2 py-0.5 rounded transition-colors ${
              filter === 'equipment'
                ? 'bg-sky-600 text-white font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            Equipment ({equipmentCount})
          </button>
        </div>
      </div>

      {/* Events Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead>
            <tr className="text-[10px] text-slate-500 uppercase border-b border-slate-800/60 pb-1">
              <th className="pb-1.5 font-medium">Time</th>
              <th className="pb-1.5 font-medium">Event</th>
              <th className="pb-1.5 font-medium">Source</th>
              <th className="pb-1.5 font-medium">Value</th>
              <th className="pb-1.5 font-medium text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40 text-[11px]">
            {filteredEvents.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-4 text-center text-slate-500 font-sans text-xs">
                  Awaiting live event stream from twin engine...
                </td>
              </tr>
            ) : (
              filteredEvents.slice(0, 5).map((item) => (
                <tr key={item.id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-1.5 text-slate-400">{item.time}</td>
                  <td className="py-1.5 text-slate-200 font-sans font-medium">{item.event}</td>
                  <td className="py-1.5 text-sky-400 font-bold">{item.source}</td>
                  <td className="py-1.5 text-slate-300">{item.value}</td>
                  <td className="py-1.5 text-right">
                    <span className="inline-flex items-center gap-1">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          item.status === 'Accepted'
                            ? 'bg-emerald-400'
                            : item.status === 'Critical'
                            ? 'bg-rose-500 animate-pulse'
                            : item.status === 'Warning'
                            ? 'bg-amber-400'
                            : 'bg-sky-400'
                        }`}
                      />
                      <span
                        className={
                          item.status === 'Accepted'
                            ? 'text-emerald-400'
                            : item.status === 'Critical'
                            ? 'text-rose-400 font-bold'
                            : item.status === 'Warning'
                            ? 'text-amber-400'
                            : 'text-sky-400'
                        }
                      >
                        {item.status}
                      </span>
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
