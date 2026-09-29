import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Droplets, Maximize2 } from 'lucide-react'
import { NAV_ITEMS } from '../constants/navigation.js'
import RoleSwitcher from '../components/layout/RoleSwitcher.jsx'
import AlarmAnnunciatorBar from '../components/layout/AlarmAnnunciatorBar.jsx'
import NocModeBar from '../components/layout/NocModeBar.jsx'
import OfflineBanner from '../components/layout/OfflineBanner.jsx'
import ScenarioInjector from '../features/demo/ScenarioInjector.jsx'

const SECTION_TITLES = [
  ['/dashboard', 'Dashboard'],
  ['/process', 'Process Overview'],
  ['/alarms', 'Alarm Console'],
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
  const [isNocMode, setIsNocMode] = useState(false)

  useEffect(() => {
    document.title = resolveTitle(location.pathname)
  }, [location.pathname])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  // Toggle fullscreen mode on enter/exit NOC
  const handleEnterNoc = () => {
    setIsNocMode(true)
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {})
      }
    } catch {
      // Ignore fullscreen restrictions
    }
  }

  const handleExitNoc = () => {
    setIsNocMode(false)
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {})
      }
    } catch {
      // Ignore
    }
  }

  return (
    <div className={`flex h-screen ${isNocMode ? 'bg-slate-900 text-slate-100' : 'bg-slate-50'}`}>
      
      {/* Standard Sidebar (Hidden in NOC Mode) */}
      {!isNocMode && (
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
      )}

      {/* Main View Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header: NOC Ticker or Standard Header */}
        {isNocMode ? (
          <NocModeBar onExitNoc={handleExitNoc} />
        ) : (
          <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3.5">
            <div>
              <h1 className="text-sm font-medium text-slate-800">AquaTrust AI Enterprise SCADA</h1>
              <p className="text-xs text-slate-500">Decentralized Wastewater Quality Assurance & CPCB/SPCB Compliance</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleEnterNoc}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-sky-700 hover:text-sky-900 bg-sky-50 hover:bg-sky-100 border border-sky-200 transition-colors"
                title="Enter 24/7 Control Room NOC Wall Mode"
              >
                <Maximize2 className="h-3.5 w-3.5" />
                <span>NOC Kiosk Mode</span>
              </button>
              <RoleSwitcher />
            </div>
          </header>
        )}

        {/* Plant Floor Offline Status Banner */}
        <OfflineBanner />

        {/* ISA-18.2 Process Alarm Annunciator Bar */}
        <AlarmAnnunciatorBar />

        {/* Main Content Workspace */}
        <main className={`flex-1 overflow-y-auto p-6 ${isNocMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
          <Outlet />
        </main>
      </div>

      {/* Floating Demo Scenario & Fault Injector (Visible only with ?demo=true) */}
      <ScenarioInjector />
    </div>
  )
}
