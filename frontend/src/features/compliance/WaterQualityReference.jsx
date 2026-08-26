import { useCallback, useState } from 'react'
import { TriangleAlert } from 'lucide-react'
import Card from '../../components/ui/Card.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import StatusBadge from '../../components/ui/StatusBadge.jsx'
import Button from '../../components/ui/Button.jsx'
import Table from '../../components/ui/Table.jsx'
import useAsyncData from '../../hooks/useAsyncData.js'
import { getWaterQualityReference } from '../../services/compliance.js'

const selectClasses =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-50'

function formatRange(range, decimals = 1) {
  const { min, max } = range ?? {}
  if (typeof min !== 'number' && typeof max !== 'number') return '\u2014'
  const fmt = (value) => (typeof value === 'number' ? Number(value).toFixed(decimals) : null)
  if (typeof min === 'number' && typeof max === 'number') {
    return min === max ? fmt(min) : `${fmt(min)} \u2013 ${fmt(max)}`
  }
  return fmt(min) ?? fmt(max)
}

// Dataset-derived water-quality reference records (indian_water_clean.csv).
// No regulatory thresholds exist in this project yet, so no compliance
// verdicts are derived here — measured ranges are shown as-is.
export default function WaterQualityReference() {
  const [filters, setFilters] = useState({ state: '', year: '', waterBodyType: '' })
  const [draft, setDraft] = useState(filters)

  const fetcher = useCallback(() => {
    const active = {
      state: filters.state || undefined,
      year: filters.year || undefined,
      waterBodyType: filters.waterBodyType || undefined,
    }
    return getWaterQualityReference(active)
  }, [filters])

  const { status, data, error, reload } = useAsyncData(fetcher)

  const update = (patch) => setDraft((previous) => ({ ...previous, ...patch }))

  const COLUMNS = [
    { key: 'stnCode', header: 'STN code', className: 'font-mono text-xs text-slate-500' },
    { key: 'location', header: 'Monitoring location', className: 'max-w-xs whitespace-normal font-medium text-slate-800' },
    { key: 'year', header: 'Year', render: (row) => <span className="tabular-nums">{row.year}</span> },
    { key: 'waterBodyType', header: 'Water body', className: 'text-slate-600' },
    {
      key: 'ph',
      header: 'pH',
      render: (row) => formatRange(row.ranges.ph, 1),
      className: 'tabular-nums text-slate-600',
    },
    {
      key: 'dissolvedOxygen',
      header: 'DO (mg/L)',
      render: (row) => formatRange(row.ranges.dissolvedOxygenMgPerL),
      className: 'tabular-nums text-slate-600',
    },
    {
      key: 'bod',
      header: 'BOD (mg/L)',
      render: (row) => formatRange(row.ranges.bodMgPerL),
      className: 'tabular-nums text-slate-600',
    },
    {
      key: 'nitrate',
      header: 'Nitrate-N (mg/L)',
      render: (row) => formatRange(row.ranges.nitrateNMgPerL),
      className: 'tabular-nums text-slate-600',
    },
    {
      key: 'totalColiform',
      header: 'Total coliform (MPN/100ml)',
      render: (row) => formatRange(row.ranges.totalColiformMpnPer100ml, 0),
      className: 'tabular-nums text-slate-600',
    },
    {
      key: 'fecal',
      header: 'Fecal coliform (MPN/100ml)',
      render: (row) =>
        row.ranges.fecalColiformMpnPer100ml.min === null && row.ranges.fecalColiformMpnPer100ml.max === null
          ? 'Not recorded'
          : formatRange(row.ranges.fecalColiformMpnPer100ml, 0),
      className: 'tabular-nums text-slate-600',
    },
  ]

  return (
    <Card
      title="Water-quality reference data"
      subtitle="Measured ranges from national monitoring stations · indian_water_clean.csv"
      actions={<StatusBadge tone="info" label="dataset-derived" dot={false} />}
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1">
            <label htmlFor="wq-state" className="text-xs font-medium text-slate-500">
              State
            </label>
            <select
              id="wq-state"
              value={draft.state}
              disabled={status === 'loading' || !data}
              onChange={(event) => update({ state: event.target.value })}
              className={selectClasses}
            >
              <option value="">All states</option>
              {(data?.meta?.states ?? []).map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="wq-year" className="text-xs font-medium text-slate-500">
              Year
            </label>
            <select
              id="wq-year"
              value={draft.year}
              disabled={status === 'loading' || !data}
              onChange={(event) => update({ year: event.target.value })}
              className={selectClasses}
            >
              <option value="">All years</option>
              {(data?.meta?.years ?? []).map((year) => (
                <option key={year} value={String(year)}>
                  {year}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="wq-type" className="text-xs font-medium text-slate-500">
              Water body type
            </label>
            <select
              id="wq-type"
              value={draft.waterBodyType}
              disabled={status === 'loading' || !data}
              onChange={(event) => update({ waterBodyType: event.target.value })}
              className={selectClasses}
            >
              <option value="">All types</option>
              {(data?.meta?.waterBodyTypes ?? []).map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
            <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" aria-hidden="true" />
            Reference thresholds are not configured in this project, so no compliance verdicts are
            derived from these values.
          </p>
          <Button size="sm" onClick={() => { setFilters(draft); }} disabled={status === 'loading'}>
            Apply filters
          </Button>
        </div>

        {status === 'loading' && (
          <div className="py-10">
            <Spinner size="lg" label="Loading reference data…" />
          </div>
        )}

        {status === 'error' && (
          <EmptyState
            icon={TriangleAlert}
            title="Could not load reference data"
            description={error?.message ?? 'Something went wrong while loading water-quality reference data.'}
            action={<Button onClick={reload}>Try again</Button>}
          />
        )}

        {status === 'success' && (
          <>
            <p className="text-xs text-slate-400">
              Showing {data.records.length} of {data.meta.totalCount} station-year records · Source:{' '}
              {data.sourceLabel}
            </p>
            <Table columns={COLUMNS} rows={data.records} getRowKey={(row) => row.id} />
          </>
        )}
      </div>
    </Card>
  )
}
