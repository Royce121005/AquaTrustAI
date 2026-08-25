import StatusBadge from '../../components/ui/StatusBadge.jsx'
import Table from '../../components/ui/Table.jsx'
import { getParameterLabel } from '../../constants/monitoring.js'
import { formatTimestamp } from '../../utils/format.js'

const SEVERITY_TONES = {
  high: 'danger',
  medium: 'warning',
  low: 'info',
}

const COLUMNS = [
  {
    key: 'timestamp',
    header: 'Timestamp',
    render: (row) => formatTimestamp(row.timestamp),
    className: 'text-slate-600',
  },
  {
    key: 'severity',
    header: 'Severity',
    render: (row) => <StatusBadge tone={SEVERITY_TONES[row.severity] ?? 'neutral'} label={row.severity} />,
  },
  {
    key: 'parameterId',
    header: 'Parameter',
    render: (row) => getParameterLabel(row.parameterId),
  },
  {
    key: 'score',
    header: 'Score',
    render: (row) => <span className="tabular-nums">{Number(row.score).toFixed(2)}</span>,
  },
  { key: 'description', header: 'Description', className: 'max-w-md whitespace-normal text-slate-600' },
]

export default function AnomalyTable({ anomalies }) {
  return <Table columns={COLUMNS} rows={anomalies} getRowKey={(row) => row.id} />
}
