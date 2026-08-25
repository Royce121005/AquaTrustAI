import { Link } from 'react-router-dom'
import { RefreshCw, TriangleAlert } from 'lucide-react'
import Card from '../../components/ui/Card.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import StatusBadge from '../../components/ui/StatusBadge.jsx'
import Button from '../../components/ui/Button.jsx'
import Table from '../../components/ui/Table.jsx'
import useAsyncData from '../../hooks/useAsyncData.js'
import { getAnchoredRecords } from '../../services/blockchain.js'
import { formatTimestamp } from '../../utils/format.js'

const STATUS_TONES = {
  confirmed: 'success',
  pending: 'warning',
  failed: 'danger',
}

const COLUMNS = [
  { key: 'id', header: 'Record ID', className: 'font-mono text-xs text-slate-700' },
  { key: 'recordType', header: 'Type', className: 'text-slate-600' },
  {
    key: 'anchorTime',
    header: 'Anchor time',
    render: (row) => formatTimestamp(row.anchorTime),
    className: 'text-slate-600',
  },
  {
    key: 'txRef',
    header: 'Transaction reference',
    render: (row) => (
      <Link
        to={`/blockchain/transactions/${row.txRef}`}
        title={row.txRef}
        className="block max-w-[11rem] truncate font-mono text-xs text-sky-700 underline-offset-2 hover:text-sky-800 hover:underline"
      >
        {row.txRef}
      </Link>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    render: (row) => <StatusBadge tone={STATUS_TONES[row.status] ?? 'neutral'} label={row.status} />,
  },
  { key: 'network', header: 'Network', className: 'text-slate-600' },
  {
    key: 'actions',
    header: '',
    headerClassName: 'sr-only',
    render: (row) => (
      <Link
        to={`/blockchain/verify?recordId=${row.id}`}
        className="inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-medium text-sky-700 ring-1 ring-inset ring-sky-200 transition-colors hover:bg-sky-50"
      >
        Verify
      </Link>
    ),
    className: 'text-right',
  },
]

export default function AnchoredRecordsTable() {
  const { status, data, error, reload } = useAsyncData(getAnchoredRecords)

  return (
    <Card
      title="Anchored records"
      subtitle="Provisional ledger records"
      actions={
        <Button variant="ghost" size="sm" onClick={reload}>
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      }
    >
      {status === 'loading' && (
        <div className="py-10">
          <Spinner size="lg" label="Loading anchored records…" />
        </div>
      )}

      {status === 'error' && (
        <EmptyState
          icon={TriangleAlert}
          title="Could not load anchored records"
          description={error?.message ?? 'Something went wrong while loading anchored records.'}
          action={<Button onClick={reload}>Try again</Button>}
        />
      )}

      {status === 'success' && (data === null || data.length === 0) && (
        <EmptyState title="No anchored records" description="Nothing has been anchored yet." />
      )}

      {status === 'success' && data !== null && data.length > 0 && (
        <Table columns={COLUMNS} rows={data} getRowKey={(row) => row.id} />
      )}
    </Card>
  )
}
