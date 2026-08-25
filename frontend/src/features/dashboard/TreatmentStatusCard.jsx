import { TriangleAlert } from 'lucide-react'
import Card from '../../components/ui/Card.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import StatusBadge from '../../components/ui/StatusBadge.jsx'
import Button from '../../components/ui/Button.jsx'
import useAsyncData from '../../hooks/useAsyncData.js'
import { getTreatmentStatus } from '../../services/dashboard.js'

const STATUS_TONES = {
  running: 'success',
  idle: 'info',
  maintenance: 'warning',
  offline: 'danger',
}

const PROGRESS_COLORS = {
  running: 'bg-sky-600',
  idle: 'bg-slate-300',
  maintenance: 'bg-amber-400',
  offline: 'bg-red-400',
}

export default function TreatmentStatusCard() {
  const { status, data, error, reload } = useAsyncData(getTreatmentStatus)

  return (
    <Card
      title="Treatment Status"
      subtitle="Current stage and progress of each treatment unit"
    >
      {status === 'loading' && (
        <div className="py-10">
          <Spinner size="lg" label="Loading treatment status…" />
        </div>
      )}

      {status === 'error' && (
        <EmptyState
          icon={TriangleAlert}
          title="Could not load treatment status"
          description={error?.message ?? 'Something went wrong while loading treatment units.'}
          action={<Button onClick={reload}>Try again</Button>}
        />
      )}

      {status === 'success' && (data === null || data.length === 0) && (
        <EmptyState title="No treatment units reported" description="No stages were returned for this system." />
      )}

      {status === 'success' && data !== null && data.length > 0 && (
        <ul className="space-y-5">
          {data.map((unit) => (
            <li key={unit.id} className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800">{unit.name}</p>
                  <p className="text-xs text-slate-500">Stage: {unit.stage}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-xs font-medium tabular-nums text-slate-500">{unit.progressPct}%</span>
                  <StatusBadge tone={STATUS_TONES[unit.status] ?? 'neutral'} label={unit.status} />
                </div>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100" role="presentation">
                <div
                  className={`h-full rounded-full transition-all ${PROGRESS_COLORS[unit.status] ?? 'bg-slate-300'}`}
                  style={{ width: `${Math.min(Math.max(unit.progressPct, 0), 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
