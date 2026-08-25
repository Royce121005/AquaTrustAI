import { TriangleAlert } from 'lucide-react'
import Card from '../../components/ui/Card.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import StatusBadge from '../../components/ui/StatusBadge.jsx'
import Button from '../../components/ui/Button.jsx'
import useAsyncData from '../../hooks/useAsyncData.js'
import { getComplianceSummary } from '../../services/compliance.js'
import { formatTimestamp } from '../../utils/format.js'

const STATUS_TONES = {
  compliant: 'success',
  'at-risk': 'warning',
  'action-required': 'danger',
  'non-compliant': 'danger',
}

export default function ComplianceSummary() {
  const { status, data, error, reload } = useAsyncData(getComplianceSummary)

  if (status === 'loading') {
    return (
      <Card bodyClassName="py-12">
        <Spinner size="lg" label="Loading compliance summary…" />
      </Card>
    )
  }

  if (status === 'error') {
    return (
      <EmptyState
        icon={TriangleAlert}
        title="Could not load compliance summary"
        description={error?.message ?? 'Something went wrong while loading the summary.'}
        action={<Button onClick={reload}>Try again</Button>}
      />
    )
  }

  if (!data) {
    return <EmptyState title="No compliance data" description="The service returned no summary." />
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Overall status</p>
          <div className="mt-3">
            <StatusBadge tone={STATUS_TONES[data.overallStatus] ?? 'neutral'} label={data.overallStatus} />
          </div>
          <p className="mt-3 text-xs text-slate-500">Last audit: {formatTimestamp(data.lastAuditAt)}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Compliance score</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-slate-800">
            {data.scorePct}%
          </p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Open findings</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-slate-800">
            {data.openFindings}
          </p>
        </Card>
      </div>

      <Card title="Breakdown by area" subtitle="Provisional assessment per compliance area">
        {data.breakdown.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-500">No areas reported.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.breakdown.map((area) => (
              <li key={area.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800">{area.area}</p>
                  <p className="text-xs text-slate-500">
                    Findings: <span className="tabular-nums">{area.findingsCount}</span>
                  </p>
                </div>
                <StatusBadge tone={STATUS_TONES[area.status] ?? 'neutral'} label={area.status} dot={false} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
