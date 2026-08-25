import { useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, CircleCheck, CircleX, ScanSearch, TriangleAlert } from 'lucide-react'
import Card from '../../components/ui/Card.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import StatusBadge from '../../components/ui/StatusBadge.jsx'
import Button from '../../components/ui/Button.jsx'
import useAsyncData from '../../hooks/useAsyncData.js'
import { verifyRecord } from '../../services/blockchain.js'
import { formatTimestamp } from '../../utils/format.js'

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

function CheckRow({ label, passed }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <span className="text-sm text-slate-600">{label}</span>
      <span
        className={`inline-flex items-center gap-1.5 text-xs font-medium ${
          passed ? 'text-emerald-700' : 'text-red-600'
        }`}
      >
        {passed ? (
          <CircleCheck className="h-4 w-4" aria-hidden="true" />
        ) : (
          <CircleX className="h-4 w-4" aria-hidden="true" />
        )}
        {passed ? 'Passed' : 'Not passed'}
      </span>
    </div>
  )
}

export default function BlockchainVerifyPage() {
  const [searchParams] = useSearchParams()
  const recordId = searchParams.get('recordId')

  const fetcher = useCallback(
    () => (recordId ? verifyRecord(recordId) : Promise.resolve(null)),
    [recordId],
  )
  const { status, data, reload } = useAsyncData(fetcher)

  return (
    <div className="space-y-4">
      <BackLink />

      {status === 'loading' && (
        <Card bodyClassName="py-16">
          <Spinner size="lg" label="Running verification…" />
        </Card>
      )}

      {!recordId && status !== 'loading' && (
        <EmptyState
          icon={ScanSearch}
          title="No record selected"
          description='A record ID is required for verification. Use a link such as /blockchain/verify?recordId=REC-0001 or pick "Verify" on an anchored record.'
        />
      )}

      {recordId && status === 'error' && (
        <EmptyState
          icon={TriangleAlert}
          title="Could not run verification"
          description="Something went wrong while verifying this record."
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

      {recordId && data && status === 'success' && (
        <Card
          title={`Verification: ${data.recordId}`}
          subtitle="Verification results are currently based on provisional service data."
          actions={
            <StatusBadge tone={data.verified ? 'success' : 'danger'} label={data.verified ? 'Verified' : 'Not verified'} />
          }
        >
          <dl className="divide-y divide-slate-100">
            <CheckRow label="Record exists" passed={data.checks.recordExists} />
            <CheckRow label="Anchoring confirmed" passed={data.checks.anchoringConfirmed} />
          </dl>

          <p className="mt-4 rounded-lg bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-700">
            {data.message}
          </p>

          <p className="mt-3 text-xs text-slate-500">
            Checked: {formatTimestamp(data.checkedAt)} · Record:{' '}
            <span className="font-mono text-xs text-slate-700">{data.recordId}</span>
          </p>
        </Card>
      )}
    </div>
  )
}
