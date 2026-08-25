const SIZES = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-10 w-10 border-4',
}

export default function Spinner({ size = 'md', label }) {
  return (
    <div role="status" aria-live="polite" className="flex items-center justify-center gap-3">
      <span
        aria-hidden="true"
        className={`${SIZES[size] ?? SIZES.md} inline-block animate-spin rounded-full border-slate-300 border-t-sky-600`}
      />
      {label && <span className="text-sm text-slate-500">{label}</span>}
      <span className="sr-only">Loading</span>
    </div>
  )
}
