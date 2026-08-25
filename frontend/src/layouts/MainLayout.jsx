import { useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Droplets } from 'lucide-react'
import { NAV_ITEMS } from '../constants/navigation.js'

const SECTION_TITLES = [
  ['/dashboard', 'Dashboard'],
  ['/monitoring', 'Monitoring'],
  ['/insights', 'AI Insights'],
  ['/compliance', 'Compliance'],
  ['/blockchain', 'Blockchain'],
  ['/settings', 'Settings'],
]

function resolveTitle(pathname) {
  const match = SECTION_TITLES.find(([prefix]) => pathname.startsWith(prefix))
  return match ? `${match[1]} · AquaTrust AI` : 'AquaTrust AI'
}

export default function MainLayout() {
  const location = useLocation()

  useEffect(() => {
    document.title = resolveTitle(location.pathname)
  }, [location.pathname])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  return (
    <div className="flex h-screen bg-slate-50">
      <aside className="flex w-60 shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="flex items-center gap-2 px-5 py-5">
          <Droplets className="h-6 w-6 text-sky-600" />
          <span className="text-lg font-semibold tracking-tight text-slate-800">AquaTrust AI</span>
        </div>
        <nav className="flex flex-col gap-1 px-3">
          {NAV_ITEMS.map(({ label, to, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-sky-50 text-sky-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-slate-200 bg-white px-6 py-4">
          <h1 className="text-sm font-medium text-slate-500">Water Treatment Intelligence Platform</h1>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
