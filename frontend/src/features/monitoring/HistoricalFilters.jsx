import { useState } from 'react'
import Card from '../../components/ui/Card.jsx'
import Button from '../../components/ui/Button.jsx'
import { STP_PARAMETER_OPTIONS } from '../../constants/stpParameters.js'

const inputClasses =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100'

// Filters the Bangalore STP dataset (daily records). Empty from/to means the
// full range available in the dataset.
export default function HistoricalFilters({ applied, options, minDate, maxDate, onApply }) {
  const [draft, setDraft] = useState(applied)

  const activeStpId = draft.stpId || options?.[0]?.id || ''
  const rangeInvalid =
    Boolean(draft.from && draft.to) && new Date(draft.from).getTime() > new Date(draft.to).getTime()

  const update = (patch) => setDraft((previous) => ({ ...previous, ...patch }))

  const apply = () => {
    onApply({ ...draft, stpId: activeStpId })
  }

  return (
    <Card
      title="Filters"
      subtitle="Historical readings from bangalore_clean.csv · leave dates empty for the full dataset range"
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="space-y-1">
          <label htmlFor="history-stp" className="text-xs font-medium text-slate-500">
            STP
          </label>
          <select
            id="history-stp"
            value={activeStpId}
            disabled={!options}
            onChange={(event) => update({ stpId: event.target.value })}
            className={inputClasses}
          >
            {(options ?? []).map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </div>

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
            {STP_PARAMETER_OPTIONS.map((parameter) => (
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
            min={minDate}
            max={maxDate}
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
            min={minDate}
            max={maxDate}
            value={draft.to}
            onChange={(event) => update({ to: event.target.value })}
            className={inputClasses}
          />
        </div>

        <div className="flex items-end gap-2 sm:col-span-2 xl:col-span-1">
          <Button onClick={apply} disabled={rangeInvalid} className="flex-1">
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
