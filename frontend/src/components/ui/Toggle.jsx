import { useId } from 'react'

export default function Toggle({ checked, onChange, label, description, disabled = false }) {
  const id = useId()

  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <label htmlFor={id} className="block cursor-pointer text-sm font-medium text-slate-700">
          {label}
        </label>
        {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 disabled:cursor-not-allowed disabled:opacity-50 ${
          checked ? 'bg-sky-600' : 'bg-slate-200'
        }`}
      >
        <span
          aria-hidden="true"
          className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  )
}
