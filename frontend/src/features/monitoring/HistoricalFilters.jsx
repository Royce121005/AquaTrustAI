import { useState } from 'react'
import Card from '../../components/ui/Card.jsx'
import Button from '../../components/ui/Button.jsx'
import { HISTORY_INTERVAL_OPTIONS, PARAMETER_OPTIONS } from '../../constants/monitoring.js'

const inputClasses =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100'

export default function HistoricalFilters({ applied, onApply }) {
  const [draft, setDraft] = useState(applied)

  const rangeInvalid =
    Boolean(draft.from && draft.to) && new Date(draft.from).getTime() > new Date(draft.to).getTime()

  const update = (patch) => setDraft((previous) => ({ ...previous, ...patch }))

  return (
    <Card title="Filters" subtitle="Provisional data is generated for the selected window">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="space-y-1">
          <label htmlFor="history-parameter" className="text-xs font-medium text-slate-500">
            Parameter
          </label>
          <select
            id="history-parameter"
            value={draft.parameterId}
            onChange={(event) => update({ parameterId: event.target.value })}
            className={inputClasses}
          >
            {PARAMETER_OPTIONS.map((parameter) => (
              <option key={parameter.id} value={parameter.id}>
                {parameter.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label htmlFor="history-from" className="text-xs font-medium text-slate-500">
            From
          </label>
          <input
            id="history-from"
            type="date"
            value={draft.from}
            onChange={(event) => update({ from: event.target.value })}
            className={inputClasses}
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="history-to" className="text-xs font-medium text-slate-500">
            To
          </label>
          <input
            id="history-to"
            type="date"
            value={draft.to}
            onChange={(event) => update({ to: event.target.value })}
            className={inputClasses}
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="history-interval" className="text-xs font-medium text-slate-500">
            Interval
          </label>
          <select
            id="history-interval"
            value={draft.intervalMinutes}
            onChange={(event) => update({ intervalMinutes: Number(event.target.value) })}
            className={inputClasses}
          >
            {HISTORY_INTERVAL_OPTIONS.map((interval) => (
              <option key={interval.value} value={interval.value}>
                {interval.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end gap-2 sm:col-span-2 xl:col-span-1">
          <Button onClick={() => onApply(draft)} disabled={rangeInvalid} className="flex-1">
            Apply
          </Button>
          <Button variant="ghost" onClick={() => setDraft(applied)}>
            Reset
          </Button>
        </div>
      </div>

      {rangeInvalid && (
        <p className="mt-3 text-xs text-red-600">The start date must be before the end date.</p>
      )}
    </Card>
  )
}
