const TONES = {
  neutral: 'bg-slate-100 text-slate-600 ring-slate-200',
  info: 'bg-sky-50 text-sky-700 ring-sky-200',
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  warning: 'bg-amber-50 text-amber-700 ring-amber-200',
  danger: 'bg-red-50 text-red-700 ring-red-200',
}

export default function StatusBadge({ tone = 'neutral', label, dot = true }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
        TONES[tone] ?? TONES.neutral
      }`}
    >
      {dot && <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />}
      {label}
    </span>
  )
}
