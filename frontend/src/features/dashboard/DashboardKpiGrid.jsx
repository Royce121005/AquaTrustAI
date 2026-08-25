import { TriangleAlert } from 'lucide-react'
import Card from '../../components/ui/Card.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import StatusBadge from '../../components/ui/StatusBadge.jsx'
import Button from '../../components/ui/Button.jsx'
import useAsyncData from '../../hooks/useAsyncData.js'
import { getDashboardOverview } from '../../services/dashboard.js'

const STATUS_TONES = {
  success: 'success',
  warning: 'warning',
  danger: 'danger',
  info: 'info',
}

export default function DashboardKpiGrid() {
  const { status, data, error, reload } = useAsyncData(getDashboardOverview)

  if (status === 'loading') {
    return (
      <Card bodyClassName="py-12">
        <Spinner size="lg" label="Loading overview…" />
      </Card>
    )
  }

  if (status === 'error') {
    return (
      <EmptyState
        icon={TriangleAlert}
        title="Could not load system overview"
        description={error?.message ?? 'Something went wrong while loading the overview.'}
        action={<Button onClick={reload}>Try again</Button>}
      />
    )
  }

  if (!data || data.kpis.length === 0) {
    return <EmptyState title="No indicators available" description="The overview returned no KPIs." />
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {data.kpis.map((kpi) => (
        <Card key={kpi.id}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-2xl font-semibold tracking-tight text-slate-800">{kpi.value}</p>
              <p className="mt-1 truncate text-xs text-slate-500">{kpi.label}</p>
            </div>
            <StatusBadge tone={STATUS_TONES[kpi.status] ?? 'neutral'} label={kpi.status} dot={false} />
          </div>
        </Card>
      ))}
    </div>
  )
}
