import { useState } from 'react'

// STP selector styled identically to ParameterSelector.
export default function StpSelector({ options, value, onChange, disabled = false, id = 'stp-select', label = 'STP' }) {
  const [hasOptions] = useState(() => Array.isArray(options) && options.length > 0)

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="whitespace-nowrap text-xs font-medium text-slate-500">
        {label}
      </label>
      <select
        id={id}
        value={value}
        disabled={disabled || !hasOptions}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-50 sm:w-auto sm:min-w-44"
      >
        {(options ?? []).map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
    </div>
  )
}
