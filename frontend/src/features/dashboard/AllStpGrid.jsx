import { useState, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Building2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Search,
  Filter,
  LayoutGrid,
  Table as TableIcon,
  ChevronRight,
  ExternalLink,
  Activity,
  Layers,
  MapPin,
  Sliders,
  Calendar,
} from 'lucide-react'
import Card from '../../components/ui/Card.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import StatusBadge from '../../components/ui/StatusBadge.jsx'
import Button from '../../components/ui/Button.jsx'
import useAsyncData from '../../hooks/useAsyncData.js'
import { getAllStpSnapshots } from '../../services/monitoring.js'
import { getUpStpDataset } from '../../data/upStpDataset.js'
import { formatUtcDate } from '../../utils/format.js'

export default function AllStpGrid({ onSelectStp, selectedStpId }) {
  const [fleet, setFleet] = useState('bangalore') // 'bangalore' | 'up'
  const [filterStatus, setFilterStatus] = useState('all') // 'all' | 'compliant' | 'marginal' | 'non_compliant'
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState('grid') // 'grid' | 'table'

  const fetcher = useCallback(async () => {
    try {
      const [bangaloreStps, upStps] = await Promise.all([
        getAllStpSnapshots(),
        getUpStpDataset().catch(() => []),
      ])
      return {
        bangaloreStps: Array.isArray(bangaloreStps) ? bangaloreStps : [],
        upStps: Array.isArray(upStps) ? upStps : [],
      }
    } catch (err) {
      console.error('AllStpGrid fetcher failed:', err)
      return { bangaloreStps: [], upStps: [] }
    }
  }, [])

  const { status, data, error, reload } = useAsyncData(fetcher)

  const currentFleetData = useMemo(() => {
    if (!data) return []
    const list = fleet === 'bangalore' ? data.bangaloreStps : data.upStps
    return Array.isArray(list) ? list : []
  }, [data, fleet])


  const filteredStps = useMemo(() => {
    return currentFleetData.filter((item) => {
      const matchesStatus =
        filterStatus === 'all' || item.complianceStatus === filterStatus

      const matchesSearch =
        !searchQuery.trim() ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.city && item.city.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.treatmentFacility && item.treatmentFacility.toLowerCase().includes(searchQuery.toLowerCase()))

      return matchesStatus && matchesSearch
    })
  }, [currentFleetData, filterStatus, searchQuery])

  // Aggregate stats for current fleet
  const counts = useMemo(() => {
    const total = currentFleetData.length
    const compliant = currentFleetData.filter((s) => s.complianceStatus === 'compliant').length
    const marginal = currentFleetData.filter((s) => s.complianceStatus === 'marginal').length
    const nonCompliant = currentFleetData.filter((s) => s.complianceStatus === 'non_compliant').length
    const totalMld = currentFleetData.reduce((sum, s) => sum + (s.installedCapacityMld || 0), 0)
    return { total, compliant, marginal, nonCompliant, totalMld }
  }, [currentFleetData])

  const maxCapacity = useMemo(() => {
    if (!currentFleetData || currentFleetData.length === 0) return 60
    const caps = currentFleetData.map((s) => s.installedCapacityMld || 0)
    return Math.max(60, ...caps)
  }, [currentFleetData])


  const handleInspect = (stpId) => {
    if (onSelectStp) {
      onSelectStp(stpId)
      // Scroll smoothly to inspector card
      const elem = document.getElementById('single-stp-inspector')
      if (elem) {
        elem.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }

  return (
    <Card
      title="Regional STP Fleet Operational Matrix"
      subtitle="Comprehensive multi-facility telemetry, design capacities, and CPCB statutory compliance"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {/* Fleet Switcher */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-medium">
            <button
              type="button"
              onClick={() => setFleet('bangalore')}
              className={`rounded-md px-3 py-1.5 transition-colors ${
                fleet === 'bangalore'
                  ? 'bg-white text-slate-800 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Bengaluru Urban (9 STPs)
            </button>
            <button
              type="button"
              onClick={() => setFleet('up')}
              className={`rounded-md px-3 py-1.5 transition-colors ${
                fleet === 'up'
                  ? 'bg-white text-slate-800 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              CPCB UP River Basin (125 STPs)
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md ${
                viewMode === 'grid'
                  ? 'bg-slate-100 text-slate-900'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md ${
                viewMode === 'table'
                  ? 'bg-slate-100 text-slate-900'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
              title="Matrix Table View"
            >
              <TableIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      }
    >
      {/* Fleet Summary & Control Bar */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-1">
          {/* Quick Filter Chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFilterStatus('all')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                filterStatus === 'all'
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span>All Facilities</span>
              <span className="rounded-full bg-slate-700/30 px-1.5 py-0.2 text-[10px] font-bold">
                {counts.total}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilterStatus('compliant')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                filterStatus === 'compliant'
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50/50'
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Compliant</span>
              <span className="rounded-full bg-emerald-800/30 px-1.5 py-0.2 text-[10px] font-bold">
                {counts.compliant}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilterStatus('marginal')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                filterStatus === 'marginal'
                  ? 'bg-amber-600 text-white border-amber-600'
                  : 'bg-white text-amber-700 border-amber-200 hover:bg-amber-50/50'
              }`}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Marginal</span>
              <span className="rounded-full bg-amber-800/30 px-1.5 py-0.2 text-[10px] font-bold">
                {counts.marginal}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilterStatus('non_compliant')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                filterStatus === 'non_compliant'
                  ? 'bg-rose-600 text-white border-rose-600'
                  : 'bg-white text-rose-700 border-rose-200 hover:bg-rose-50/50'
              }`}
            >
              <XCircle className="h-3.5 w-3.5" />
              <span>Non-Compliant</span>
              <span className="rounded-full bg-rose-800/30 px-1.5 py-0.2 text-[10px] font-bold">
                {counts.nonCompliant}
              </span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[220px]">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search plant, technology, city…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            />
          </div>
        </div>

        {/* Loading State */}
        {status === 'loading' && (
          <div className="py-12">
            <Spinner size="lg" label="Parsing regional STP dataset telemetry…" />
          </div>
        )}

        {/* Error State */}
        {status === 'error' && (
          <div className="p-6 text-center text-sm text-red-600 bg-red-50 rounded-lg">
            Could not load STP dataset: {error?.message}
          </div>
        )}

        {/* Main Content: Grid Mode */}
        {status === 'success' && viewMode === 'grid' && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredStps.map((stp) => {
              const isSelected = selectedStpId === stp.id
              const isCompliant = stp.complianceStatus === 'compliant'
              const isMarginal = stp.complianceStatus === 'marginal'

              return (
                <div
                  key={stp.id}
                  className={`group relative rounded-xl border p-4 transition-all duration-150 flex flex-col justify-between ${
                    isSelected
                      ? 'border-sky-500 bg-sky-50/40 ring-2 ring-sky-400/50 shadow-md'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                  }`}
                >
                  {/* Card Top: Plant Header */}
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                              isCompliant
                                ? 'bg-emerald-500 ring-2 ring-emerald-200'
                                : isMarginal
                                  ? 'bg-amber-500 ring-2 ring-amber-200'
                                  : 'bg-rose-500 ring-2 ring-rose-200 animate-pulse'
                            }`}
                          />
                          <h4 className="font-semibold text-sm text-slate-800 truncate" title={stp.name}>
                            {stp.name}
                          </h4>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                          <span className="truncate">{stp.city || 'Karnataka / BWSSB'}</span>
                        </p>
                      </div>

                      {/* Status Badge */}
                      <StatusBadge
                        tone={isCompliant ? 'success' : isMarginal ? 'warning' : 'danger'}
                        label={
                          isCompliant
                            ? 'CPCB Pass'
                            : isMarginal
                              ? 'Marginal'
                              : 'Exceeded'
                        }
                        dot={false}
                      />
                    </div>

                    {/* Capacity & Process Tech */}
                    <div className="mt-3 rounded-lg bg-slate-50 p-2.5 border border-slate-100 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-medium">Design Capacity:</span>
                        <span className="font-bold text-slate-800 font-mono">
                          {typeof stp.installedCapacityMld === 'number'
                            ? `${stp.installedCapacityMld} MLD`
                            : 'N/A'}
                        </span>
                      </div>
                      {typeof stp.installedCapacityMld === 'number' && (
                        <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-sky-600 rounded-full"
                            style={{
                              width: `${Math.min(
                                100,
                                Math.max(8, (stp.installedCapacityMld / maxCapacity) * 100)
                              )}%`,
                            }}
                          />
                        </div>
                      )}
                      <p className="text-[11px] text-slate-600 line-clamp-1" title={stp.treatmentFacility}>
                        <span className="text-slate-400 font-medium">Tech: </span>
                        {stp.treatmentFacility || 'Secondary Biological'}
                      </p>
                    </div>

                    {/* Latest Effluent Parameters Grid */}
                    <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
                      {/* pH */}
                      <div className="rounded-md border border-slate-100 bg-slate-50/70 p-1.5">
                        <span className="text-[10px] text-slate-400 font-semibold block">pH</span>
                        <span
                          className={`text-xs font-mono font-bold block ${
                            stp.readings?.ph != null && (stp.readings.ph < 6.5 || stp.readings.ph > 8.5)
                              ? 'text-rose-600 font-extrabold'
                              : 'text-slate-700'
                          }`}
                        >
                          {stp.readings?.ph != null ? stp.readings.ph.toFixed(2) : '\u2014'}
                        </span>
                        <span className="text-[9px] text-slate-400">6.5-8.5</span>
                      </div>

                      {/* BOD */}
                      <div className="rounded-md border border-slate-100 bg-slate-50/70 p-1.5">
                        <span className="text-[10px] text-slate-400 font-semibold block">BOD</span>
                        <span
                          className={`text-xs font-mono font-bold block ${
                            stp.readings?.bod != null && stp.readings.bod > 10
                              ? 'text-rose-600 font-extrabold'
                              : 'text-slate-700'
                          }`}
                        >
                          {stp.readings?.bod != null ? stp.readings.bod.toFixed(1) : '\u2014'}
                        </span>
                        <span className="text-[9px] text-slate-400">≤10 mg/L</span>
                      </div>

                      {/* COD */}
                      <div className="rounded-md border border-slate-100 bg-slate-50/70 p-1.5">
                        <span className="text-[10px] text-slate-400 font-semibold block">COD</span>
                        <span
                          className={`text-xs font-mono font-bold block ${
                            stp.readings?.cod != null && stp.readings.cod > 50
                              ? 'text-rose-600 font-extrabold'
                              : 'text-slate-700'
                          }`}
                        >
                          {stp.readings?.cod != null ? stp.readings.cod.toFixed(1) : '\u2014'}
                        </span>
                        <span className="text-[9px] text-slate-400">≤50 mg/L</span>
                      </div>

                      {/* TSS */}
                      <div className="rounded-md border border-slate-100 bg-slate-50/70 p-1.5">
                        <span className="text-[10px] text-slate-400 font-semibold block">TSS</span>
                        <span
                          className={`text-xs font-mono font-bold block ${
                            stp.readings?.tss != null && stp.readings.tss > 20
                              ? 'text-rose-600 font-extrabold'
                              : 'text-slate-700'
                          }`}
                        >
                          {stp.readings?.tss != null ? stp.readings.tss.toFixed(1) : '\u2014'}
                        </span>
                        <span className="text-[9px] text-slate-400">≤20 mg/L</span>
                      </div>

                      {/* Ammonical N */}
                      <div className="rounded-md border border-slate-100 bg-slate-50/70 p-1.5">
                        <span className="text-[10px] text-slate-400 font-semibold block">NH4-N</span>
                        <span
                          className={`text-xs font-mono font-bold block ${
                            stp.readings?.['ammonical-nitrogen'] != null &&
                            stp.readings['ammonical-nitrogen'] > 5
                              ? 'text-rose-600 font-extrabold'
                              : 'text-slate-700'
                          }`}
                        >
                          {stp.readings?.['ammonical-nitrogen'] != null
                            ? stp.readings['ammonical-nitrogen'].toFixed(2)
                            : '\u2014'}
                        </span>
                        <span className="text-[9px] text-slate-400">≤5 mg/L</span>
                      </div>

                      {/* Total N */}
                      <div className="rounded-md border border-slate-100 bg-slate-50/70 p-1.5">
                        <span className="text-[10px] text-slate-400 font-semibold block">Total N</span>
                        <span
                          className={`text-xs font-mono font-bold block ${
                            stp.readings?.['total-nitrogen'] != null &&
                            stp.readings['total-nitrogen'] > 10
                              ? 'text-rose-600 font-extrabold'
                              : 'text-slate-700'
                          }`}
                        >
                          {stp.readings?.['total-nitrogen'] != null
                            ? stp.readings['total-nitrogen'].toFixed(2)
                            : '\u2014'}
                        </span>
                        <span className="text-[9px] text-slate-400">≤10 mg/L</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom: Timestamp & Quick Action Buttons */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {stp.recordedAt ? formatUtcDate(stp.recordedAt) : 'Lab Verified'}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleInspect(stp.id)}
                        className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                          isSelected
                            ? 'bg-sky-600 text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {isSelected ? 'Active' : 'Inspect'}
                      </button>
                      <Link
                        to="/process"
                        className="p-1 rounded text-slate-400 hover:text-sky-600 hover:bg-slate-100 transition-colors"
                        title="Open Process P&ID Mimic"
                      >
                        <Activity className="h-3.5 w-3.5" />
                      </Link>
                      <Link
                        to={`/monitoring?stp=${stp.id}`}
                        className="p-1 rounded text-slate-400 hover:text-sky-600 hover:bg-slate-100 transition-colors"
                        title="Historical Telemetry Trend"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Main Content: SCADA Matrix Table View */}
        {status === 'success' && viewMode === 'table' && (
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-mono tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2.5">Plant Name</th>
                  <th className="px-3 py-2.5">Capacity</th>
                  <th className="px-3 py-2.5">Treatment Tech</th>
                  <th className="px-3 py-2.5 text-center">pH (6.5-8.5)</th>
                  <th className="px-3 py-2.5 text-center">BOD (≤10)</th>
                  <th className="px-3 py-2.5 text-center">COD (≤50)</th>
                  <th className="px-3 py-2.5 text-center">TSS (≤20)</th>
                  <th className="px-3 py-2.5 text-center">Status</th>
                  <th className="px-3 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {filteredStps.map((stp) => {
                  const isSelected = selectedStpId === stp.id
                  const isCompliant = stp.complianceStatus === 'compliant'
                  const isMarginal = stp.complianceStatus === 'marginal'

                  return (
                    <tr
                      key={stp.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isSelected ? 'bg-sky-50/50 font-medium' : ''
                      }`}
                    >
                      <td className="px-3 py-2.5 font-sans font-medium text-slate-800">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`h-2 w-2 rounded-full shrink-0 ${
                              isCompliant
                                ? 'bg-emerald-500'
                                : isMarginal
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500'
                            }`}
                          />
                          <span>{stp.name}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 block font-normal">
                          {stp.city || 'Karnataka'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-slate-700">
                        {typeof stp.installedCapacityMld === 'number'
                          ? `${stp.installedCapacityMld} MLD`
                          : '\u2014'}
                      </td>
                      <td className="px-3 py-2.5 font-sans text-slate-600 max-w-[180px] truncate" title={stp.treatmentFacility}>
                        {stp.treatmentFacility || 'Secondary Biological'}
                      </td>
                      <td
                        className={`px-3 py-2.5 text-center ${
                          stp.readings?.ph != null && (stp.readings.ph < 6.5 || stp.readings.ph > 8.5)
                            ? 'text-rose-600 font-bold bg-rose-50/50'
                            : 'text-slate-700'
                        }`}
                      >
                        {stp.readings?.ph != null ? stp.readings.ph.toFixed(2) : '\u2014'}
                      </td>
                      <td
                        className={`px-3 py-2.5 text-center ${
                          stp.readings?.bod != null && stp.readings.bod > 10
                            ? 'text-rose-600 font-bold bg-rose-50/50'
                            : 'text-slate-700'
                        }`}
                      >
                        {stp.readings?.bod != null ? stp.readings.bod.toFixed(1) : '\u2014'}
                      </td>
                      <td
                        className={`px-3 py-2.5 text-center ${
                          stp.readings?.cod != null && stp.readings.cod > 50
                            ? 'text-rose-600 font-bold bg-rose-50/50'
                            : 'text-slate-700'
                        }`}
                      >
                        {stp.readings?.cod != null ? stp.readings.cod.toFixed(1) : '\u2014'}
                      </td>
                      <td
                        className={`px-3 py-2.5 text-center ${
                          stp.readings?.tss != null && stp.readings.tss > 20
                            ? 'text-rose-600 font-bold bg-rose-50/50'
                            : 'text-slate-700'
                        }`}
                      >
                        {stp.readings?.tss != null ? stp.readings.tss.toFixed(1) : '\u2014'}
                      </td>
                      <td className="px-3 py-2.5 text-center font-sans">
                        <StatusBadge
                          tone={isCompliant ? 'success' : isMarginal ? 'warning' : 'danger'}
                          label={
                            isCompliant
                              ? 'Pass'
                              : isMarginal
                                ? 'Marginal'
                                : 'Exceed'
                          }
                          dot={false}
                        />
                      </td>
                      <td className="px-3 py-2.5 text-right font-sans">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleInspect(stp.id)}
                            className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                          >
                            Inspect
                          </button>
                          <Link
                            to="/process"
                            className="p-1 rounded text-slate-400 hover:text-sky-600"
                            title="Process Mimic"
                          >
                            <Activity className="h-3 w-3" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Empty Search Result */}
        {status === 'success' && filteredStps.length === 0 && (
          <div className="py-10 text-center text-slate-500 text-xs">
            No wastewater treatment facilities match the filter or search query.
          </div>
        )}
      </div>
    </Card>
  )
}
