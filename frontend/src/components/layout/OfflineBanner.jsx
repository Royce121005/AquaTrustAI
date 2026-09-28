import { useState } from 'react'
import { WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react'
import { useOnlineStatus } from '../../hooks/useOnlineStatus.js'

export default function OfflineBanner() {
  const isOnlineSystem = useOnlineStatus()
  const [simulatedOffline, setSimulatedOffline] = useState(false)

  const isActuallyOffline = !isOnlineSystem || simulatedOffline

  if (!isActuallyOffline) return null

  return (
    <div className="bg-amber-600 text-slate-900 px-6 py-2 flex items-center justify-between text-xs font-medium shadow-md">
      <div className="flex items-center gap-2">
        <WifiOff className="h-4 w-4 shrink-0 text-slate-900 animate-pulse" />
        <span>
          <strong>OFFLINE FIELD MODE:</strong> Network connectivity lost near treatment basins. 
          AquaTrust AI is operating from persistent local cache. 
          Sensor logs and audit inputs will be queued and synchronized once network is restored.
        </span>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={() => {
            if (simulatedOffline) setSimulatedOffline(false)
            else window.location.reload()
          }}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-900 text-white hover:bg-slate-800 text-[11px] font-semibold transition-colors"
        >
          <RefreshCw className="h-3 w-3" />
          {simulatedOffline ? 'Resume Online' : 'Check Link'}
        </button>
      </div>
    </div>
  )
}
