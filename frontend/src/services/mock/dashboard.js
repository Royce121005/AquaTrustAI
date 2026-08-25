// PROVISIONAL — pending backend contract
// All values below are illustrative placeholders, NOT real measurements.
import { respondWith } from './mockUtils.js'

const OVERVIEW = {
  generatedAt: '2026-08-25T08:00:00Z',
  systemStatus: 'nominal',
  kpis: [
    { id: 'kpi-active-treatments', label: 'Active treatments', value: '4', status: 'success' },
    { id: 'kpi-sensors-online', label: 'Sensors online', value: '12 / 13', status: 'warning' },
    { id: 'kpi-alerts-24h', label: 'Alerts (last 24h)', value: '3', status: 'warning' },
    { id: 'kpi-data-freshness', label: 'Data freshness', value: '< 1 min', status: 'success' },
  ],
}

const TREATMENT_UNITS = [
  { id: 'unit-a', name: 'Treatment Unit A', stage: 'stage-1', status: 'running', progressPct: 72, startedAt: '2026-08-25T05:30:00Z' },
  { id: 'unit-b', name: 'Treatment Unit B', stage: 'stage-2', status: 'running', progressPct: 45, startedAt: '2026-08-25T06:10:00Z' },
  { id: 'unit-c', name: 'Treatment Unit C', stage: 'stage-1', status: 'idle', progressPct: 0, startedAt: null },
  { id: 'unit-d', name: 'Treatment Unit D', stage: 'maintenance', status: 'maintenance', progressPct: 20, startedAt: '2026-08-25T07:00:00Z' },
]

const RECENT_ALERTS = [
  { id: 'alert-001', timestamp: '2026-08-25T07:42:00Z', severity: 'critical', source: 'sensor-05', description: 'Placeholder alert: reading outside expected range', acknowledged: false },
  { id: 'alert-002', timestamp: '2026-08-25T06:55:00Z', severity: 'warning', source: 'unit-b', description: 'Placeholder alert: maintenance window approaching', acknowledged: false },
  { id: 'alert-003', timestamp: '2026-08-25T04:12:00Z', severity: 'info', source: 'system', description: 'Placeholder notice: nightly data sync completed', acknowledged: true },
]

export async function getDashboardOverview() {
  return respondWith(OVERVIEW)
}

export async function getTreatmentStatus() {
  return respondWith(TREATMENT_UNITS)
}

export async function getRecentAlerts() {
  return respondWith(RECENT_ALERTS)
}
