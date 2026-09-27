import { Link } from 'react-router-dom'
import { RefreshCw, TriangleAlert, ShieldCheck } from 'lucide-react'
import Card from '../../components/ui/Card.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import StatusBadge from '../../components/ui/StatusBadge.jsx'
import Button from '../../components/ui/Button.jsx'
import Table from '../../components/ui/Table.jsx'
import useAsyncData from '../../hooks/useAsyncData.js'
import useAuth from '../../hooks/useAuth.js'
import { getAnchoredRecords } from '../../services/blockchain.js'
import { formatTimestamp } from '../../utils/format.js'

const STATUS_TONES = {
  confirmed: 'success',
  pending: 'warning',
  failed: 'danger',
}

export default function AnchoredRecordsTable() {
  const { status, data, error, reload } = useAsyncData(getAnchoredRecords)
  const { permissions } = useAuth()

  const columns = [
    { key: 'id', header: 'Record ID', className: 'font-mono text-xs font-semibold text-slate-800' },
    { key: 'facilityId', header: 'Facility', className: 'text-xs text-slate-600' },
    {
      key: 'canonicalHash',
      header: 'Canonical Hash (SHA-256)',
      render: (row) => (
        <span
          title={row.canonicalHash}
          className="font-mono text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded max-w-[9rem] truncate block"
        >
          {row.canonicalHash ? `${row.canonicalHash.slice(0, 10)}…${row.canonicalHash.slice(-8)}` : '—'}
        </span>
      ),
    },
    {
      key: 'anchorTime',
      header: 'Anchor Time',
      render: (row) => formatTimestamp(row.anchorTime),
      className: 'text-xs text-slate-600',
    },
    {
      key: 'txRef',
      header: 'DLT Reference',
      render: (row) => (
        <Link
          to={`/blockchain/transactions/${row.txRef}`}
          title={row.txRef}
          className="block max-w-[10rem] truncate font-mono text-xs text-sky-700 underline-offset-2 hover:text-sky-800 hover:underline"
        >
          {row.txRef}
        </Link>
      ),
    },
    {
      key: 'status',
      header: 'Ledger Status',
      render: (row) => <StatusBadge tone={STATUS_TONES[row.status] ?? 'neutral'} label={row.status} />,
    },
    {
      key: 'actions',
      header: 'Verification',
      render: (row) => (
        <div className="flex items-center justify-end gap-2">
          <Link
            to={`/blockchain/verify?recordId=${row.id}`}
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-sky-700 ring-1 ring-inset ring-sky-200 transition-colors hover:bg-sky-50"
          >
            <ShieldCheck className="h-3 w-3" />
            Verify
          </Link>
          {permissions.canAuthorizeCorrection && (
            <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
              Audit
            </span>
          )}
        </div>
      ),
      className: 'text-right',
    },
  ]

  return (
    <Card
      title="Anchored Treatment Records"
      subtitle="Immutable cryptographic anchors on Hyperledger Fabric 2.5 channel (aquatrust-channel)"
      actions={
        <Button variant="ghost" size="sm" onClick={reload}>
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      }
    >
      {status === 'loading' && (
        <div className="py-10">
          <Spinner size="lg" label="Loading anchored records from ledger…" />
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
        <EmptyState title="No anchored records" description="No treatment records have been finalized or anchored yet." />
      )}

      {status === 'success' && data !== null && data.length > 0 && (
        <Table columns={columns} rows={data} getRowKey={(row) => row.id} />
      )}
    </Card>
  )
}
