import StatusBadge from '../../components/ui/StatusBadge.jsx'
import Table from '../../components/ui/Table.jsx'
import { getParameterLabel } from '../../constants/monitoring.js'
import { getStpParameter } from '../../constants/stpParameters.js'
import { formatTimestamp } from '../../utils/format.js'

const SEVERITY_TONES = {
  high: 'danger',
  medium: 'warning',
  low: 'info',
}

function resolveParameterLabel(parameterId) {
  return getStpParameter(parameterId)?.label ?? getParameterLabel(parameterId)
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
    render: (row) => resolveParameterLabel(row.parameterId),
  },
  {
    key: 'observedValue',
    header: 'Observed / expected',
    render: (row) =>
      typeof row.observedValue === 'number' || typeof row.expectedValue === 'number' ? (
        <span className="tabular-nums">
          {typeof row.observedValue === 'number' ? row.observedValue : '\u2014'}
          {' / '}
          {typeof row.expectedValue === 'number' ? row.expectedValue : '\u2014'}
        </span>
      ) : (
        '\u2014'
      ),
    className: 'text-slate-600',
  },
  {
    key: 'score',
    header: 'Score',
    render: (row) => <span className="tabular-nums">{Number(row.score).toFixed(2)}</span>,
  },
  {
    key: 'description',
    header: 'Description',
    className: 'max-w-md whitespace-normal text-slate-600',
    render: (row) => (
      <>
        {row.description}
        {row.explanation && (
          <span className="mt-1 block text-xs text-slate-400">{row.explanation}</span>
        )}
      </>
    ),
  },
]

export default function AnomalyTable({ anomalies }) {
  return <Table columns={COLUMNS} rows={anomalies} getRowKey={(row) => row.id} />
}
