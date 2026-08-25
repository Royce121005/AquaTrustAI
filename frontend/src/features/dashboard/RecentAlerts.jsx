import { BellRing, CircleAlert, Clock, Info, RefreshCw, Server, TriangleAlert } from 'lucide-react'
import Card from '../../components/ui/Card.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import StatusBadge from '../../components/ui/StatusBadge.jsx'
import Button from '../../components/ui/Button.jsx'
import useAsyncData from '../../hooks/useAsyncData.js'
import { getRecentAlerts } from '../../services/dashboard.js'
import { formatTimestamp } from '../../utils/format.js'

const SEVERITY_ICONS = {
  critical: TriangleAlert,
  warning: CircleAlert,
  info: Info,
}

const SEVERITY_TONES = {
  critical: 'danger',
  warning: 'warning',
  info: 'info',
}

export default function RecentAlerts() {
  const { status, data, error, reload } = useAsyncData(getRecentAlerts)

  return (
    <Card
      title="Recent Alerts"
      subtitle="Latest operational notifications"
      actions={
        <Button variant="ghost" size="sm" onClick={reload}>
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      }
    >
      {status === 'loading' && (
        <div className="py-10">
          <Spinner size="lg" label="Loading alerts…" />
        </div>
      )}

      {status === 'error' && (
        <EmptyState
          icon={TriangleAlert}
          title="Could not load alerts"
          description={error?.message ?? 'Something went wrong while loading recent alerts.'}
          action={<Button onClick={reload}>Try again</Button>}
        />
      )}

      {status === 'success' && (data === null || data.length === 0) && (
        <EmptyState icon={BellRing} title="No recent alerts" description="Nothing needs attention right now." />
      )}

      {status === 'success' && data !== null && data.length > 0 && (
        <ul className="divide-y divide-slate-100">
          {data.map((alert) => {
            const SeverityIcon = SEVERITY_ICONS[alert.severity] ?? CircleAlert
            return (
              <li key={alert.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
                  <SeverityIcon className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge tone={SEVERITY_TONES[alert.severity] ?? 'neutral'} label={alert.severity} />
                    {!alert.acknowledged && <StatusBadge tone="neutral" label="unacknowledged" dot={false} />}
                  </div>
                  <p className="text-sm text-slate-700">{alert.description}</p>
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" aria-hidden="true" />
                      {formatTimestamp(alert.timestamp)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Server className="h-3 w-3" aria-hidden="true" />
                      {alert.source}
                    </span>
                    <span>{alert.acknowledged ? 'Acknowledged' : 'Awaiting acknowledgement'}</span>
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
