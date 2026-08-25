const VARIANTS = {
  primary: 'bg-sky-600 text-white hover:bg-sky-700 focus-visible:outline-sky-600',
  secondary:
    'bg-white text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus-visible:outline-sky-600',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-slate-400',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:outline-red-600',
}

const SIZES = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  type = 'button',
  disabled = false,
  onClick,
  className = '',
  children,
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
        VARIANTS[variant] ?? VARIANTS.primary
      } ${SIZES[size] ?? SIZES.md} ${className}`}
    >
      {children}
    </button>
  )
}
