import { BrainCircuit, Clock, TriangleAlert, Waves } from 'lucide-react'
import Card from '../../components/ui/Card.jsx'
import ChartCard from '../../components/charts/ChartCard.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import StatusBadge from '../../components/ui/StatusBadge.jsx'
import Button from '../../components/ui/Button.jsx'
import useAsyncData from '../../hooks/useAsyncData.js'
import { getPredictions } from '../../services/insights.js'
import { getParameterLabel } from '../../constants/monitoring.js'
import { formatTimestamp } from '../../utils/format.js'
import PredictionChart from './PredictionChart.jsx'

export default function PredictionPanel() {
  const { status, data, error, reload } = useAsyncData(getPredictions)

  if (status === 'loading') {
    return (
      <Card bodyClassName="py-16">
        <Spinner size="lg" label="Loading predictions…" />
      </Card>
    )
  }

  if (status === 'error') {
    return (
      <EmptyState
        icon={TriangleAlert}
        title="Could not load predictions"
        description={error?.message ?? 'Something went wrong while loading predictions.'}
        action={<Button onClick={reload}>Try again</Button>}
      />
    )
  }

  if (!data || data.points.length === 0) {
    return (
      <EmptyState title="No predictions available" description="The service returned no prediction points." />
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <BrainCircuit className="h-3.5 w-3.5" aria-hidden="true" />
            Model version: <span className="font-medium text-slate-700">{data.modelVersion}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            Horizon: <span className="font-medium text-slate-700">{data.horizonHours} h</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Waves className="h-3.5 w-3.5" aria-hidden="true" />
            Parameter: <span className="font-medium text-slate-700">{getParameterLabel(data.parameterId)}</span>
          </span>
          <span>Generated: {formatTimestamp(data.generatedAt)}</span>
          <StatusBadge tone="warning" label="provisional output — not a live model" dot={false} />
        </div>
      </Card>

      <ChartCard
        title={`${data.horizonHours}-hour prediction`}
        subtitle="Predicted values with the service-provided interval bounds"
      >
        <PredictionChart points={data.points} />
      </ChartCard>
    </div>
  )
}
