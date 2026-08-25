import { Link } from 'react-router-dom'
import { RefreshCw, TriangleAlert } from 'lucide-react'
import Card from '../../components/ui/Card.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import StatusBadge from '../../components/ui/StatusBadge.jsx'
import Button from '../../components/ui/Button.jsx'
import Table from '../../components/ui/Table.jsx'
import useAsyncData from '../../hooks/useAsyncData.js'
import { getReports } from '../../services/compliance.js'
import { formatDate } from '../../utils/format.js'

const STATUS_TONES = {
  final: 'success',
  submitted: 'info',
  draft: 'neutral',
}

const COLUMNS = [
  { key: 'title', header: 'Report', className: 'font-medium text-slate-800' },
  {
    key: 'period',
    header: 'Period',
    render: (row) => `${row.periodStart} \u2192 ${row.periodEnd}`,
    className: 'text-slate-600',
  },
  {
    key: 'status',
    header: 'Status',
    render: (row) => <StatusBadge tone={STATUS_TONES[row.status] ?? 'neutral'} label={row.status} />,
  },
  {
    key: 'createdAt',
    header: 'Created',
    render: (row) => formatDate(row.createdAt),
    className: 'text-slate-600',
  },
  {
    key: 'actions',
    header: '',
    headerClassName: 'sr-only',
    render: (row) => (
      <Link
        to={`/compliance/reports/${row.id}`}
        className="inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-medium text-sky-700 ring-1 ring-inset ring-sky-200 transition-colors hover:bg-sky-50"
      >
        View report
      </Link>
    ),
    className: 'text-right',
  },
]

export default function ReportsTable() {
  const { status, data, error, reload } = useAsyncData(getReports)

  return (
    <Card
      title="Generated reports"
      subtitle="Provisional report records"
      actions={
        <Button variant="ghost" size="sm" onClick={reload}>
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      }
    >
      {status === 'loading' && (
        <div className="py-10">
          <Spinner size="lg" label="Loading reports…" />
        </div>
      )}

      {status === 'error' && (
        <EmptyState
          icon={TriangleAlert}
          title="Could not load reports"
          description={error?.message ?? 'Something went wrong while loading reports.'}
          action={<Button onClick={reload}>Try again</Button>}
        />
      )}

      {status === 'success' && (data === null || data.length === 0) && (
        <EmptyState title="No reports yet" description="Generated reports will appear here." />
      )}

      {status === 'success' && data !== null && data.length > 0 && (
        <Table columns={COLUMNS} rows={data} getRowKey={(row) => row.id} />
      )}
    </Card>
  )
}
