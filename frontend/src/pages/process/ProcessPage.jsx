import { useState } from 'react'
import {
  Activity,
  Sliders,
  ShieldAlert,
  Radio,
  Cpu,
  RefreshCw,
  HardDrive,
  Info,
} from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader.jsx'
import ProcessMimic from '../../features/process/ProcessMimic.jsx'
import EquipmentFaceplate from '../../features/process/EquipmentFaceplate.jsx'
import { useTagStream } from '../../lib/tags/useTagStream.js'
import { TAG_REGISTRY, QUALITY } from '../../lib/tags/registry.js'

export default function ProcessPage() {
  const {
    tagValues,
    assetStates,
    historyBuffer,
    togglePump,
    injectTagQuality,
    isPumping,
    isAerating,
  } = useTagStream()

  const [selectedAssetId, setSelectedAssetId] = useState(null)
  const [injectedBad, setInjectedBad] = useState(false)

  const handleSelectAsset = (assetId) => {
    setSelectedAssetId(assetId)
  }

  const handleCloseFaceplate = () => {
    setSelectedAssetId(null)
  }

  const handleToggleBadQuality = () => {
    const nextState = !injectedBad
    setInjectedBad(nextState)
    injectTagQuality('AIT-201', nextState ? QUALITY.BAD : QUALITY.GOOD)
  }

  const selectedMeta = selectedAssetId ? TAG_REGISTRY[selectedAssetId] : null
  const selectedState = selectedAssetId ? assetStates[selectedAssetId] : null

  return (
    <div className="space-y-4">
      {/* Top Header with Simulated Data Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800">
            Process Overview & Dynamic P&ID Mimic
          </h1>
          <p className="text-xs text-slate-500">
            ISA-101 high-performance supervisory mimic, asset faceplates, and live hydraulic routing
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Engineering Rule: Global Simulated Data Indicator */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-700 text-xs font-semibold border border-amber-300">
            <Radio className="h-3.5 w-3.5 animate-pulse text-amber-600" />
            <span>SIMULATED SCADA STREAM</span>
          </div>

          <button
            type="button"
            onClick={handleToggleBadQuality}
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
              injectedBad
                ? 'bg-red-600 text-white border-red-700'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
            title="Inject sensor fault to test Bad quality indicator"
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>{injectedBad ? 'Clear Fault' : 'Test Bad Sensor Quality'}</span>
          </button>
        </div>
      </div>

      {/* Main Process Mimic */}
      <ProcessMimic
        tagValues={tagValues}
        assetStates={assetStates}
        onSelectAsset={handleSelectAsset}
        selectedAssetId={selectedAssetId}
      />

      {/* Bottom Equipment Status Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          { id: 'P-101', name: 'Raw Sewage Pump 1', type: 'Duty' },
          { id: 'P-102', name: 'Raw Sewage Pump 2', type: 'Standby' },
          { id: 'BLW-201', name: 'Aeration Blower 1', type: 'Duty' },
          { id: 'P-103', name: 'RAS Sludge Pump', type: 'Recycle' },
          { id: 'P-104', name: 'WAS Sludge Pump', type: 'Waste' },
          { id: 'DP-401', name: 'Chlorine Dosing', type: 'Disinfection' },
        ].map((asset) => {
          const state = assetStates[asset.id]
          const isRun = state?.status === 'Running'
          return (
            <button
              key={asset.id}
              onClick={() => handleSelectAsset(asset.id)}
              className={`p-3 rounded-lg border text-left transition-all ${
                selectedAssetId === asset.id
                  ? 'bg-sky-50 border-sky-400 ring-2 ring-sky-300'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-slate-800">{asset.id}</span>
                <span
                  className={`h-2 w-2 rounded-full ${
                    isRun ? 'bg-emerald-500' : 'bg-slate-400'
                  }`}
                />
              </div>
              <p className="text-[11px] font-medium text-slate-700 mt-1 truncate">{asset.name}</p>
              <span className="text-[10px] text-slate-400 block">{asset.type} · {state?.status}</span>
            </button>
          )
        })}
      </div>

      {/* Equipment Faceplate Drawer */}
      {selectedAssetId && (
        <EquipmentFaceplate
          assetId={selectedAssetId}
          assetMeta={selectedMeta || { assetName: selectedAssetId, description: 'Treatment Subsystem' }}
          assetState={selectedState}
          historyData={historyBuffer['FIT-101'] || []}
          onTogglePump={togglePump}
          onClose={handleCloseFaceplate}
        />
      )}
    </div>
  )
}
