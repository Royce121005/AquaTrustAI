import { NavLink } from 'react-router-dom'

const TABS = [
  { to: '/monitoring', label: 'Trends', end: true },
  { to: '/monitoring/sensors', label: 'Sensors', end: false },
  { to: '/monitoring/history', label: 'History', end: false },
]

export default function MonitoringTabs() {
  return (
    <nav
      aria-label="Monitoring views"
      className="flex w-fit flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm"
    >
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) =>
            `rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-sky-600 text-white'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
            }`
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}
