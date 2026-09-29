import { useState } from 'react'
import { TriangleAlert, Wrench, ShieldAlert, CheckCircle2, Clock } from 'lucide-react'
import Card from '../../components/ui/Card.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import StatusBadge from '../../components/ui/StatusBadge.jsx'
import Button from '../../components/ui/Button.jsx'
import Table from '../../components/ui/Table.jsx'
import useAsyncData from '../../hooks/useAsyncData.js'
import { getSensors } from '../../services/monitoring.js'
import { getParameterLabel } from '../../constants/monitoring.js'
import { formatTimestamp, formatDate } from '../../utils/format.js'
import {
  useSensorCalibrations,
  CALIBRATION_STATUS,
  isSensorExcludedFromCompliance,
} from '../../lib/calibration/calibrationStore.js'
import CalibrationWizard from './CalibrationWizard.jsx'

const STATUS_TONES = {
  online: 'success',
  maintenance: 'warning',
  offline: 'danger',
  idle: 'info',
}

export default function SensorTable() {
  const { status, data, error, reload } = useAsyncData(getSensors)
  const calibrations = useSensorCalibrations()
  const [selectedSensor, setSelectedSensor] = useState(null)

  if (status === 'loading') {
    return (
      <Card bodyClassName="py-16">
        <Spinner size="lg" label="Loading sensors…" />
      </Card>
    )
  }

  if (status === 'error') {
    return (
      <EmptyState
        icon={TriangleAlert}
        title="Could not load sensors"
        description={error?.message ?? 'Something went wrong while loading sensors.'}
        action={<Button onClick={reload}>Try again</Button>}
      />
    )
  }

  if (!data || data.length === 0) {
    return (
      <EmptyState title="No sensors found" description="No sensors are currently registered." />
    )
  }

  const columns = [
    { key: 'id', header: 'ID', className: 'font-mono text-xs text-slate-500' },
    { key: 'name', header: 'Name', className: 'font-medium text-slate-800' },
    {
      key: 'parameterId',
      header: 'Parameter',
      render: (row) => getParameterLabel(row.parameterId),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge tone={STATUS_TONES[row.status] ?? 'neutral'} label={row.status} />,
    },
    {
      key: 'calibration',
      header: 'Metrology & Calibration',
      render: (row) => {
        const cal = calibrations[row.id] || calibrations['AIT-201']
        const isExcluded = isSensorExcludedFromCompliance(row.id)
        const isHold = cal?.inHold || cal?.status === CALIBRATION_STATUS.HOLD
        const isFailed = cal?.lastResult === 'FAIL'
        const isDue = cal?.status === CALIBRATION_STATUS.DUE

        if (isHold) {
          return (
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                <ShieldAlert className="h-3 w-3" />
                <span>UNDER CALIBRATION</span>
              </span>
              <span className="block text-[9px] font-extrabold text-rose-600 uppercase tracking-tight">
                EXCLUDED FROM COMPLIANCE SCORE
              </span>
            </div>
          )
        }

        if (isFailed) {
          return (
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                <TriangleAlert className="h-3 w-3" />
                <span>CALIBRATION FAILED</span>
              </span>
              <span className="block text-[9px] font-extrabold text-rose-600 uppercase tracking-tight">
                EXCLUDED FROM COMPLIANCE SCORE
              </span>
            </div>
          )
        }

        if (isDue) {
          return (
            <div className="space-y-0.5">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                <Clock className="h-3 w-3" />
                <span>Due in 2 days</span>
              </span>
              <span className="text-[10px] text-slate-400 block font-mono">
                Last: {cal?.lastCalibrated ? formatDate(cal.lastCalibrated) : 'N/A'}
              </span>
            </div>
          )
        }

        return (
          <div className="space-y-0.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="h-3 w-3" />
              <span>Valid (Slope {cal?.slope ?? '1.00'})</span>
            </span>
            <span className="text-[10px] text-slate-400 block font-mono">
              Due: {cal?.nextDueDate ? formatDate(cal.nextDueDate) : 'in 28 days'}
            </span>
          </div>
        )
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (row) => (
        <button
          type="button"
          onClick={() => setSelectedSensor(row)}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 transition-colors shadow-2xs"
        >
          <Wrench className="h-3 w-3" />
          <span>Calibrate</span>
        </button>
      ),
    },
  ]

  return (
    <>
      <Table columns={columns} rows={data} getRowKey={(row) => row.id} />

      {selectedSensor && (
        <CalibrationWizard
          sensor={selectedSensor}
          onClose={() => setSelectedSensor(null)}
          onComplete={() => {
            reload()
          }}
        />
      )}
    </>
  )
}
