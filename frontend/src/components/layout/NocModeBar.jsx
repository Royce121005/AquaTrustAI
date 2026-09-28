import { useState, useEffect } from 'react'
import { Minimize2, ShieldCheck, Activity, Radio, Cpu, HardDrive } from 'lucide-react'

export default function NocModeBar({ onExitNoc }) {
  const [clock, setClock] = useState('')

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setClock(
        now.toLocaleString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      )
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="bg-slate-950 text-white border-b border-sky-900/60 px-6 py-2.5 flex flex-wrap items-center justify-between gap-4 font-mono text-xs select-none">
      
      {/* Plant ID & Live Status */}
      <div className="flex items-center gap-3">
        <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping" />
        <div className="flex items-center gap-2">
          <span className="font-bold text-sky-400 tracking-wider">AQUATRUST SCADA NOC</span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-300">STP-KORAMANGALA-01 (60 MLD)</span>
        </div>
      </div>

      {/* Real-Time Live SCADA Sensor Ticker */}
      <div className="hidden lg:flex items-center gap-5 text-slate-300 text-[11px]">
        <div className="flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5 text-sky-400" />
          <span>INFLOW:</span>
          <strong className="text-white">41.8 MLD</strong>
        </div>
        <div className="flex items-center gap-1.5">
          <Radio className="h-3.5 w-3.5 text-emerald-400" />
          <span>AERATION DO:</span>
          <strong className="text-emerald-300">2.42 mg/L</strong>
        </div>
        <div className="flex items-center gap-1.5">
          <Cpu className="h-3.5 w-3.5 text-amber-400" />
          <span>EFFLUENT TSS:</span>
          <strong className="text-white">11.6 mg/L</strong>
        </div>
        <div className="flex items-center gap-1.5">
          <HardDrive className="h-3.5 w-3.5 text-sky-300" />
          <span>pH:</span>
          <strong className="text-white">7.28</strong>
        </div>
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          <span>FABRIC DLT:</span>
          <strong className="text-emerald-300">BLOCK #104</strong>
        </div>
      </div>

      {/* Clock & Exit Kiosk Button */}
      <div className="flex items-center gap-4">
        <div className="text-right">
          <span className="text-[10px] text-slate-400 block font-sans">CONTROL ROOM IST</span>
          <span className="font-bold text-amber-400">{clock}</span>
        </div>
        <button
          onClick={onExitNoc}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-900/80 hover:bg-sky-800 text-sky-200 border border-sky-700 text-xs font-sans transition-colors"
          title="Exit Fullscreen NOC Kiosk Mode"
        >
          <Minimize2 className="h-3.5 w-3.5" />
          Exit NOC
        </button>
      </div>

    </div>
  )
}
