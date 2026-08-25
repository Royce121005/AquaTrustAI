import { useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, FileQuestion, TriangleAlert } from 'lucide-react'
import Card from '../../components/ui/Card.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import StatusBadge from '../../components/ui/StatusBadge.jsx'
import Button from '../../components/ui/Button.jsx'
import useAsyncData from '../../hooks/useAsyncData.js'
import { getTransactionById } from '../../services/blockchain.js'
import { formatTimestamp } from '../../utils/format.js'

const STATUS_TONES = {
  confirmed: 'success',
  pending: 'warning',
  failed: 'danger',
}

function BackLink() {
  return (
    <Link
      to="/blockchain"
      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-800"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      Back to blockchain
    </Link>
  )
}

export default function BlockchainTransactionDetailPage() {
  const { txId } = useParams()

  const fetcher = useCallback(() => getTransactionById(txId), [txId])
  const { status, data, error, reload } = useAsyncData(fetcher)

  if (status === 'loading') {
    return (
      <div className="space-y-4">
        <BackLink />
        <Card bodyClassName="py-16">
          <Spinner size="lg" label="Loading transaction…" />
        </Card>
      </div>
    )
  }

  if (status === 'error') {
    const isNotFound = /not found/i.test(error?.message ?? '')

    return (
      <div className="space-y-4">
        <BackLink />
        {isNotFound ? (
          <EmptyState
            icon={FileQuestion}
            title="Transaction not found"
            description={`No transaction exists for "${txId}". The reference may be incorrect.`}
          />
        ) : (
          <EmptyState
            icon={TriangleAlert}
            title="Could not load the transaction"
            description="Something went wrong while loading this transaction."
            action={
              <div className="flex items-center gap-2">
                <Button onClick={reload}>Try again</Button>
                <Link
                  to="/blockchain"
                  className="inline-flex items-center rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-700 ring-1 ring-inset ring-slate-300 transition-colors hover:bg-slate-50"
                >
                  Back to blockchain
                </Link>
              </div>
            }
          />
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Transaction detail"
        subtitle="Provisional ledger record — not a live blockchain network"
        actions={<StatusBadge tone={STATUS_TONES[data.status] ?? 'neutral'} label={data.status} />}
      />

      <Card title="Transaction details">
        <dl className="space-y-3 text-sm">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <dt className="shrink-0 text-slate-500">Hash</dt>
            <dd className="min-w-0 break-all font-mono text-xs text-slate-700">{data.hash}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-slate-500">Network</dt>
            <dd className="text-slate-700">{data.network}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-slate-500">Block number</dt>
            <dd className="tabular-nums text-slate-700">{data.blockNumber ?? '\u2014'}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-slate-500">Anchored at</dt>
            <dd className="text-slate-700">{formatTimestamp(data.anchoredAt)}</dd>
          </div>
        </dl>
      </Card>

      <Card title={`Anchored records (${data.recordIds.length})`}>
        {data.recordIds.length === 0 ? (
          <p className="py-2 text-center text-sm text-slate-500">No records reference this transaction.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.recordIds.map((recordId) => (
              <li key={recordId} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <span className="font-mono text-xs text-slate-700">{recordId}</span>
                <Link
                  to={`/blockchain/verify?recordId=${recordId}`}
                  className="inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-medium text-sky-700 ring-1 ring-inset ring-sky-200 transition-colors hover:bg-sky-50"
                >
                  Verify record
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="pt-1">
        <BackLink />
      </div>
    </div>
  )
}
