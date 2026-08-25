import { PARAMETER_OPTIONS } from '../../constants/monitoring.js'

export default function ParameterSelector({ value, onChange, disabled = false, id = 'parameter-select' }) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="whitespace-nowrap text-xs font-medium text-slate-500">
        Parameter
      </label>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-50 sm:w-auto sm:min-w-44"
      >
        {PARAMETER_OPTIONS.map((parameter) => (
          <option key={parameter.id} value={parameter.id}>
            {parameter.label}
          </option>
        ))}
      </select>
    </div>
  )
}
