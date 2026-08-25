import Card from '../../components/ui/Card.jsx'
import { useSettings } from '../../hooks/useSettings.js'
import { PARAMETER_OPTIONS } from '../../constants/monitoring.js'

const AUTO_REFRESH_OPTIONS = [
  { value: 'off', label: 'Off' },
  { value: '30', label: 'Every 30 seconds' },
  { value: '60', label: 'Every 60 seconds' },
]

const selectClasses =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100'

export default function DataPreferences() {
  const { settings, updateSettings } = useSettings()

  return (
    <Card
      title="Data"
      subtitle="Frontend defaults — background refresh activates with live data streams"
    >
      <div className="space-y-4">
        <div className="space-y-1">
          <label htmlFor="default-parameter" className="text-xs font-medium text-slate-500">
            Default monitoring parameter
          </label>
          <select
            id="default-parameter"
            value={settings.defaultMonitoringParameter}
            onChange={(event) => updateSettings({ defaultMonitoringParameter: event.target.value })}
            className={selectClasses}
          >
            {PARAMETER_OPTIONS.map((parameter) => (
              <option key={parameter.id} value={parameter.id}>
                {parameter.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-500">Preselected whenever the Monitoring trends view opens.</p>
        </div>

        <div className="space-y-1">
          <label htmlFor="auto-refresh" className="text-xs font-medium text-slate-500">
            Auto-refresh interval
          </label>
          <select
            id="auto-refresh"
            value={settings.autoRefresh}
            onChange={(event) => updateSettings({ autoRefresh: event.target.value })}
            className={selectClasses}
          >
            {AUTO_REFRESH_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-500">Saved locally; applies once live data streaming exists.</p>
        </div>
      </div>
    </Card>
  )
}
