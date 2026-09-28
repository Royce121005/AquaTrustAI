import { useState, useRef } from 'react'
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Info,
  CheckCircle2,
  Sliders,
} from 'lucide-react'
import TagValue from '../../components/ui/TagValue.jsx'
import { TAG_REGISTRY } from '../../lib/tags/registry.js'

export default function ProcessMimic({
  tagValues,
  assetStates,
  onSelectAsset,
  selectedAssetId,
}) {
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [startPan, setStartPan] = useState({ x: 0, y: 0 })
  const [showLegend, setShowLegend] = useState(false)
  const svgRef = useRef(null)

  const isPumping = assetStates['P-101']?.status === 'Running'
  const isAerating = assetStates['BLW-201']?.status === 'Running'

  // Pan and Zoom handlers
  const handleWheel = (e) => {
    e.preventDefault()
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9
    setZoom((prev) => Math.max(0.6, Math.min(2.5, prev * zoomFactor)))
  }

  const handleMouseDown = (e) => {
    if (e.target.closest('button') || e.target.closest('.interactive-node')) return
    setIsPanning(true)
    setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y })
  }

  const handleMouseMove = (e) => {
    if (!isPanning) return
    setPan({ x: e.clientX - startPan.x, y: e.clientY - startPan.y })
  }

  const handleMouseUp = () => setIsPanning(false)

  const handleResetView = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  return (
    <div className="relative w-full h-[620px] lg:h-[700px] bg-slate-950 rounded-xl border border-slate-800 overflow-hidden select-none shadow-2xl">
      
      {/* Top Floating Control Bar */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
        <div className="flex items-center gap-1 bg-slate-900/90 backdrop-blur-xs p-1.5 rounded-lg border border-slate-700 shadow-md">
          <button
            onClick={() => setZoom((z) => Math.min(2.5, z + 0.15))}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(0.6, z - 0.15))}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <button
            onClick={handleResetView}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
            title="Fit to Screen"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
          <div className="h-4 w-px bg-slate-700 mx-1" />
          <span className="text-[11px] font-mono text-slate-400 px-1">
            {Math.round(zoom * 100)}%
          </span>
        </div>

        <button
          onClick={() => setShowLegend(!showLegend)}
          className="flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-medium text-slate-300 hover:text-white shadow-md transition-colors"
        >
          <Info className="h-3.5 w-3.5 text-sky-400" />
          <span>ISA-101 Legend</span>
        </button>
      </div>

      {/* Floating System Status Pill */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/90 backdrop-blur-xs border border-slate-700 text-xs text-slate-300 font-mono shadow-md">
          <span className={`h-2.5 w-2.5 rounded-full ${isPumping ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
          <span>HYDRAULIC FLOW: {isPumping ? 'ONLINE (42.4 MLD)' : 'PUMPS HALTED'}</span>
        </div>
      </div>

      {/* Collapsible ISA-101 Legend Modal / Overlay */}
      {showLegend && (
        <div className="absolute top-16 left-4 z-30 w-72 bg-slate-900/95 backdrop-blur-md p-4 rounded-xl border border-slate-700 shadow-2xl text-xs text-slate-300 space-y-3">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <span className="font-bold text-white uppercase tracking-wider text-[11px]">ISA-101 HMI Symbology</span>
            <button onClick={() => setShowLegend(false)} className="text-slate-400 hover:text-white">✕</button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-emerald-500" />
              <span>Running / Active</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-slate-600" />
              <span>Standby / Stopped</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-amber-500" />
              <span>Warning (Alarm)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-red-600" />
              <span>Critical (Trip)</span>
            </div>
            <div className="flex items-center gap-2 col-span-2">
              <span className="font-mono text-red-400 font-bold">???</span>
              <span>Bad / Stale Quality (Sensor Hatch)</span>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 italic pt-1 border-t border-slate-800">
            * Muted greys for nominal operation; color reserved strictly for abnormal process states.
          </p>
        </div>
      )}

      {/* SVG Canvas Workspace */}
      <div
        className="w-full h-full cursor-grab active:cursor-grabbing overflow-hidden flex items-center justify-center"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
      >
        <svg
          ref={svgRef}
          viewBox="0 0 1600 850"
          className="w-full h-full transition-transform duration-75 ease-out select-none"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
          }}
        >
          <defs>
            {/* SVG Hatch Pattern for BAD / STALE quality */}
            <pattern id="bad-hatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="8" stroke="#ef4444" strokeWidth="2" />
            </pattern>
            {/* Grid Backdrop Pattern */}
            <pattern id="scada-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="0.5" />
            </pattern>
          </defs>

          {/* Grid Background */}
          <rect width="1600" height="850" fill="url(#scada-grid)" />

          {/* ========================================================================= */}
          {/* FLOW PIPING NETWORK (Animated stroke-dasharray)                            */}
          {/* ========================================================================= */}
          <g className="flow-lines">
            {/* 1. Inlet -> Equalization Tank */}
            <path
              d="M 60 320 L 220 320"
              fill="none"
              stroke={isPumping ? '#38bdf8' : '#475569'}
              strokeWidth="6"
              strokeDasharray={isPumping ? '10 8' : 'none'}
              className={isPumping ? 'animate-flow' : ''}
            />

            {/* 2. Equalization -> Aeration Basin (Through Lift Pump P-101) */}
            <path
              d="M 380 340 L 450 340 L 450 300 L 580 300"
              fill="none"
              stroke={isPumping ? '#38bdf8' : '#475569'}
              strokeWidth="6"
              strokeDasharray={isPumping ? '10 8' : 'none'}
              className={isPumping ? 'animate-flow' : ''}
            />

            {/* 3. Aeration Basin -> Secondary Clarifier */}
            <path
              d="M 880 320 L 980 320"
              fill="none"
              stroke={isPumping ? '#38bdf8' : '#475569'}
              strokeWidth="6"
              strokeDasharray={isPumping ? '10 8' : 'none'}
              className={isPumping ? 'animate-flow' : ''}
            />

            {/* 4. Clarifier Clarified Overflow -> Chlorine Contact Tank */}
            <path
              d="M 1200 320 L 1270 320"
              fill="none"
              stroke={isPumping ? '#38bdf8' : '#475569'}
              strokeWidth="6"
              strokeDasharray={isPumping ? '10 8' : 'none'}
              className={isPumping ? 'animate-flow' : ''}
            />

            {/* 5. Chlorine Contact Tank -> Final CPCB Outfall */}
            <path
              d="M 1430 320 L 1540 320"
              fill="none"
              stroke={isPumping ? '#34d399' : '#475569'}
              strokeWidth="6"
              strokeDasharray={isPumping ? '10 8' : 'none'}
              className={isPumping ? 'animate-flow' : ''}
            />

            {/* 6. RECYCLE SLUDGE (RAS) LOOP: Clarifier Underflow back to Aeration Basin */}
            <path
              d="M 1090 470 L 1090 560 L 640 560 L 640 400"
              fill="none"
              stroke="#ca8a04"
              strokeWidth="4"
              strokeDasharray={assetStates['P-103']?.status === 'Running' ? '8 6' : 'none'}
              className={assetStates['P-103']?.status === 'Running' ? 'animate-flow-reverse' : ''}
            />

            {/* 7. WASTE SLUDGE (WAS) LOOP: Branch to Sludge Dewatering */}
            <path
              d="M 1090 560 L 1090 640 L 1260 640"
              fill="none"
              stroke="#9a3412"
              strokeWidth="4"
              strokeDasharray={assetStates['P-104']?.status === 'Running' ? '8 6' : 'none'}
              className={assetStates['P-104']?.status === 'Running' ? 'animate-flow' : ''}
            />

            {/* 8. AIR BLOWER HEADER: Blower BLW-201 down into Aeration Diffusers */}
            <path
              d="M 730 150 L 730 370"
              fill="none"
              stroke={isAerating ? '#38bdf8' : '#475569'}
              strokeWidth="5"
              strokeDasharray={isAerating ? '6 6' : 'none'}
              className={isAerating ? 'animate-flow' : ''}
            />
          </g>

          {/* ========================================================================= */}
          {/* PROCESS UNITS (Tanks, Basins, Clarifiers)                                 */}
          {/* ========================================================================= */}

          {/* 1. BAR SCREEN & INLET CHAMBER */}
          <g id="screen-01" className="cursor-pointer" onClick={() => onSelectAsset('SCREEN-01')}>
            <rect x="70" y="240" width="80" height="160" rx="4" fill="#0f172a" stroke="#334155" strokeWidth="2" />
            {/* Screen Rake Blades */}
            <line x1="90" y1="260" x2="130" y2="380" stroke="#64748b" strokeWidth="3" />
            <line x1="100" y1="260" x2="140" y2="380" stroke="#64748b" strokeWidth="3" />
            <text x="110" y="230" fill="#94a3b8" fontSize="12" fontFamily="sans-serif" textAnchor="middle" fontWeight="bold">
              BAR SCREEN
            </text>
          </g>

          {/* 2. EQUALIZATION BASIN (TK-101) */}
          <g id="tk-101" className="cursor-pointer" onClick={() => onSelectAsset('TK-101')}>
            <rect x="220" y="200" width="160" height="220" rx="6" fill="#0f172a" stroke={selectedAssetId === 'TK-101' ? '#38bdf8' : '#334155'} strokeWidth="2.5" />
            {/* Animated Liquid Fill Level */}
            <rect
              x="222"
              y={200 + 220 * (1 - (tagValues['LIT-101']?.value || 58) / 100)}
              width="156"
              height={220 * ((tagValues['LIT-101']?.value || 58) / 100)}
              rx="4"
              fill="#0369a1"
              fillOpacity="0.4"
            />
            {/* Tank Agitator / Mixer Shaft */}
            <line x1="300" y1="200" x2="300" y2="380" stroke="#94a3b8" strokeWidth="3" />
            <polygon points="275,375 325,375 300,385" fill="#64748b" />
            <text x="300" y="190" fill="#94a3b8" fontSize="12" fontFamily="sans-serif" textAnchor="middle" fontWeight="bold">
              EQUALIZATION TANK
            </text>
            <text x="300" y="410" fill="#38bdf8" fontSize="11" fontFamily="monospace" textAnchor="middle">
              LIT-101: {tagValues['LIT-101']?.formatted}%
            </text>
          </g>

          {/* 3. LIFT PUMP STATION (P-101 Duty, P-102 Standby) */}
          <g
            id="p-101"
            className="cursor-pointer interactive-node"
            onClick={() => onSelectAsset('P-101')}
          >
            {/* Centrifugal Pump Symbol (ISA-5.1: Circle with tangent nozzle) */}
            <circle
              cx="450"
              cy="340"
              r="22"
              fill={assetStates['P-101']?.status === 'Running' ? '#065f46' : '#1e293b'}
              stroke={assetStates['P-101']?.status === 'Running' ? '#10b981' : '#64748b'}
              strokeWidth="2.5"
            />
            <polygon points="450,318 472,340 450,340" fill={assetStates['P-101']?.status === 'Running' ? '#10b981' : '#64748b'} />
            <text x="450" y="344" fill="#ffffff" fontSize="10" fontFamily="sans-serif" textAnchor="middle" fontWeight="bold">
              P-101
            </text>
            <text x="450" y="375" fill={assetStates['P-101']?.status === 'Running' ? '#34d399' : '#94a3b8'} fontSize="10" fontFamily="sans-serif" textAnchor="middle">
              {assetStates['P-101']?.status}
            </text>
          </g>

          {/* 4. BIOLOGICAL AERATION BASIN (BIO-201) */}
          <g id="bio-201" className="cursor-pointer" onClick={() => onSelectAsset('BIO-201')}>
            <rect
              x="580"
              y="180"
              width="300"
              height="250"
              rx="6"
              fill="#0f172a"
              stroke={selectedAssetId === 'BIO-201' ? '#38bdf8' : '#334155'}
              strokeWidth="2.5"
            />
            {/* Aerated Liquid Fill */}
            <rect x="582" y="240" width="296" height="188" rx="4" fill="#0284c7" fillOpacity="0.3" />
            {/* Fine Bubble Diffuser Grid at Bottom */}
            <line x1="610" y1="410" x2="850" y2="410" stroke="#38bdf8" strokeWidth="4" strokeDasharray="6 4" />
            {isAerating && (
              <g className="animate-pulse">
                <circle cx="640" cy="380" r="3" fill="#bae6fd" />
                <circle cx="680" cy="340" r="4" fill="#bae6fd" />
                <circle cx="740" cy="360" r="3.5" fill="#bae6fd" />
                <circle cx="790" cy="320" r="4.5" fill="#bae6fd" />
                <circle cx="830" cy="370" r="3" fill="#bae6fd" />
              </g>
            )}
            <text x="730" y="170" fill="#94a3b8" fontSize="12" fontFamily="sans-serif" textAnchor="middle" fontWeight="bold">
              BIOLOGICAL AERATION BASIN
            </text>
          </g>

          {/* 5. AIR BLOWER (BLW-201) */}
          <g
            id="blw-201"
            className="cursor-pointer interactive-node"
            onClick={() => onSelectAsset('BLW-201')}
          >
            <circle
              cx="730"
              cy="110"
              r="24"
              fill={assetStates['BLW-201']?.status === 'Running' ? '#065f46' : '#1e293b'}
              stroke={assetStates['BLW-201']?.status === 'Running' ? '#10b981' : '#64748b'}
              strokeWidth="2.5"
            />
            <polygon points="730,86 754,110 730,110" fill={assetStates['BLW-201']?.status === 'Running' ? '#10b981' : '#64748b'} />
            <text x="730" y="114" fill="#ffffff" fontSize="10" fontFamily="sans-serif" textAnchor="middle" fontWeight="bold">
              BLW-201
            </text>
            <text x="730" y="75" fill={assetStates['BLW-201']?.status === 'Running' ? '#34d399' : '#94a3b8'} fontSize="10" fontFamily="sans-serif" textAnchor="middle">
              AIR BLOWER ({assetStates['BLW-201']?.speedPct}%)
            </text>
          </g>

          {/* 6. SECONDARY CLARIFIER (CLR-301) */}
          <g id="clr-301" className="cursor-pointer" onClick={() => onSelectAsset('CLR-301')}>
            {/* Cylindrical Upper with Conical Bottom */}
            <path
              d="M 980 220 L 1200 220 L 1200 380 L 1090 470 L 980 380 Z"
              fill="#0f172a"
              stroke={selectedAssetId === 'CLR-301' ? '#38bdf8' : '#334155'}
              strokeWidth="2.5"
            />
            {/* Settled Sludge Layer at Bottom */}
            <polygon points="1020,380 1160,380 1090,465" fill="#713f12" fillOpacity="0.6" />
            {/* Center Scraper Mechanism */}
            <line x1="1090" y1="200" x2="1090" y2="440" stroke="#94a3b8" strokeWidth="3" />
            <line x1="1030" y1="390" x2="1150" y2="390" stroke="#64748b" strokeWidth="2.5" />
            <text x="1090" y="210" fill="#94a3b8" fontSize="12" fontFamily="sans-serif" textAnchor="middle" fontWeight="bold">
              SECONDARY CLARIFIER
            </text>
            <text x="1090" y="495" fill="#ca8a04" fontSize="11" fontFamily="monospace" textAnchor="middle">
              BLANKET: {tagValues['LIT-301']?.formatted} m
            </text>
          </g>

          {/* 7. RECYCLE SLUDGE PUMPS (P-103 RAS & P-104 WAS) */}
          <g id="p-103" className="cursor-pointer interactive-node" onClick={() => onSelectAsset('P-103')}>
            <circle
              cx="920"
              cy="560"
              r="18"
              fill={assetStates['P-103']?.status === 'Running' ? '#065f46' : '#1e293b'}
              stroke={assetStates['P-103']?.status === 'Running' ? '#10b981' : '#64748b'}
              strokeWidth="2"
            />
            <text x="920" y="564" fill="#ffffff" fontSize="9" fontFamily="sans-serif" textAnchor="middle" fontWeight="bold">
              P-103
            </text>
            <text x="920" y="590" fill="#ca8a04" fontSize="10" fontFamily="sans-serif" textAnchor="middle">
              RAS PUMP
            </text>
          </g>

          <g id="p-104" className="cursor-pointer interactive-node" onClick={() => onSelectAsset('P-104')}>
            <circle
              cx="1160"
              cy="640"
              r="18"
              fill={assetStates['P-104']?.status === 'Running' ? '#065f46' : '#1e293b'}
              stroke={assetStates['P-104']?.status === 'Running' ? '#10b981' : '#64748b'}
              strokeWidth="2"
            />
            <text x="1160" y="644" fill="#ffffff" fontSize="9" fontFamily="sans-serif" textAnchor="middle" fontWeight="bold">
              P-104
            </text>
            <text x="1160" y="670" fill="#ea580c" fontSize="10" fontFamily="sans-serif" textAnchor="middle">
              WAS PUMP
            </text>
          </g>

          {/* 8. CHLORINE CONTACT TANK (CCT-401) */}
          <g id="cct-401" className="cursor-pointer" onClick={() => onSelectAsset('CCT-401')}>
            <rect x="1270" y="240" width="160" height="160" rx="4" fill="#0f172a" stroke="#334155" strokeWidth="2.5" />
            {/* Serpentine Internal Baffle Walls */}
            <line x1="1320" y1="240" x2="1320" y2="360" stroke="#334155" strokeWidth="4" />
            <line x1="1370" y1="280" x2="1370" y2="400" stroke="#334155" strokeWidth="4" />
            <text x="1350" y="230" fill="#94a3b8" fontSize="12" fontFamily="sans-serif" textAnchor="middle" fontWeight="bold">
              CHLORINE CONTACT TANK
            </text>
          </g>

          {/* 9. FINAL DISCHARGE OUTFALL & CPCB OCEMS STATION */}
          <g id="outfall-01" className="cursor-pointer" onClick={() => onSelectAsset('OUTFALL-01')}>
            <rect x="1460" y="260" width="100" height="130" rx="6" fill="#064e3b" fillOpacity="0.4" stroke="#10b981" strokeWidth="2" />
            <circle cx="1510" cy="320" r="28" fill="#047857" fillOpacity="0.6" stroke="#34d399" strokeWidth="2" />
            <text x="1510" y="324" fill="#ffffff" fontSize="10" fontFamily="sans-serif" textAnchor="middle" fontWeight="bold">
              OCEMS
            </text>
            <text x="1510" y="250" fill="#34d399" fontSize="12" fontFamily="sans-serif" textAnchor="middle" fontWeight="bold">
              CPCB OUTFALL
            </text>
          </g>

          {/* ========================================================================= */}
          {/* ANALYZER BUBBLE INSTRUMENTS (ISA-5.1: Circle with horizontal split line)   */}
          {/* ========================================================================= */}
          
          {/* AIT-201: Dissolved Oxygen */}
          <g id="bubble-ait-201" transform="translate(640, 200)">
            <circle cx="0" cy="0" r="18" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
            <line x1="-18" y1="0" x2="18" y2="0" stroke="#38bdf8" strokeWidth="1" />
            <text x="0" y="-4" fill="#ffffff" fontSize="8" fontFamily="sans-serif" textAnchor="middle" fontWeight="bold">AIT</text>
            <text x="0" y="10" fill="#94a3b8" fontSize="8" fontFamily="sans-serif" textAnchor="middle">201</text>
          </g>

          {/* AIT-202: Aeration pH */}
          <g id="bubble-ait-202" transform="translate(730, 200)">
            <circle cx="0" cy="0" r="18" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
            <line x1="-18" y1="0" x2="18" y2="0" stroke="#38bdf8" strokeWidth="1" />
            <text x="0" y="-4" fill="#ffffff" fontSize="8" fontFamily="sans-serif" textAnchor="middle" fontWeight="bold">AIT</text>
            <text x="0" y="10" fill="#94a3b8" fontSize="8" fontFamily="sans-serif" textAnchor="middle">202</text>
          </g>

          {/* AIT-401: Chlorine Residual */}
          <g id="bubble-ait-401" transform="translate(1350, 200)">
            <circle cx="0" cy="0" r="18" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
            <line x1="-18" y1="0" x2="18" y2="0" stroke="#38bdf8" strokeWidth="1" />
            <text x="0" y="-4" fill="#ffffff" fontSize="8" fontFamily="sans-serif" textAnchor="middle" fontWeight="bold">AIT</text>
            <text x="0" y="10" fill="#94a3b8" fontSize="8" fontFamily="sans-serif" textAnchor="middle">401</text>
          </g>

        </svg>

        {/* ========================================================================= */}
        {/* LIVE PINNED VALUE TAGS OVER SVG                                            */}
        {/* ========================================================================= */}
        {/* Raw Inflow Tag */}
        <div className="absolute top-[280px] left-[70px] pointer-events-auto">
          <TagValue tag={TAG_REGISTRY['FIT-101']} data={tagValues['FIT-101']} compact />
        </div>

        {/* Aeration DO Tag */}
        <div className="absolute top-[160px] left-[590px] pointer-events-auto">
          <TagValue tag={TAG_REGISTRY['AIT-201']} data={tagValues['AIT-201']} compact />
        </div>

        {/* Aeration pH Tag */}
        <div className="absolute top-[160px] left-[680px] pointer-events-auto">
          <TagValue tag={TAG_REGISTRY['AIT-202']} data={tagValues['AIT-202']} compact />
        </div>

        {/* Residual Chlorine Tag */}
        <div className="absolute top-[160px] left-[1280px] pointer-events-auto">
          <TagValue tag={TAG_REGISTRY['AIT-401']} data={tagValues['AIT-401']} compact />
        </div>

        {/* Final Effluent Outflow Tag */}
        <div className="absolute top-[370px] right-[40px] pointer-events-auto flex flex-col gap-1">
          <TagValue tag={TAG_REGISTRY['FIT-501']} data={tagValues['FIT-501']} compact />
          <TagValue tag={TAG_REGISTRY['AIT-504']} data={tagValues['AIT-504']} compact />
        </div>
      </div>

    </div>
  )
}
