import { TriangleAlert } from 'lucide-react'
import Card from '../../components/ui/Card.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import StatusBadge from '../../components/ui/StatusBadge.jsx'
import Button from '../../components/ui/Button.jsx'
import Table from '../../components/ui/Table.jsx'
import useAsyncData from '../../hooks/useAsyncData.js'
import { getSensors } from '../../services/monitoring.js'
import { getParameterLabel } from '../../constants/monitoring.js'
import { formatTimestamp } from '../../utils/format.js'

const STATUS_TONES = {
  online: 'success',
  maintenance: 'warning',
  offline: 'danger',
  idle: 'info',
}

const COLUMNS = [
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
    key: 'lastReadingAt',
    header: 'Last reading',
    render: (row) => (row.lastReadingAt ? formatTimestamp(row.lastReadingAt) : '\u2014'),
  },
  {
    key: 'batteryPct',
    header: 'Battery',
    render: (row) =>
      typeof row.batteryPct === 'number' ? (
        <span
          className={`tabular-nums ${
            row.batteryPct < 20 ? 'font-medium text-red-600' : row.batteryPct < 35 ? 'text-amber-600' : 'text-slate-700'
          }`}
        >
          {row.batteryPct}%
        </span>
      ) : (
        '\u2014'
      ),
  },
]

export default function SensorTable() {
  const { status, data, error, reload } = useAsyncData(getSensors)

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

  return <Table columns={COLUMNS} rows={data} getRowKey={(row) => row.id} />
}
