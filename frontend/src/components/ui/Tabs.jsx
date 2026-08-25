export default function Tabs({ tabs, activeKey, onChange, className = '' }) {
  return (
    <div
      role="tablist"
      aria-label="Section views"
      className={`flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = tab.key === activeKey
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.key)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 ${
              isActive ? 'bg-sky-600 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
