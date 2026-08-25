import { useCallback, useState } from 'react'
import { TriangleAlert } from 'lucide-react'
import Card from '../../components/ui/Card.jsx'
import ChartCard from '../../components/charts/ChartCard.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import Button from '../../components/ui/Button.jsx'
import useAsyncData from '../../hooks/useAsyncData.js'
import { useSettings } from '../../hooks/useSettings.js'
import { getParameterTrend } from '../../services/monitoring.js'
import ParameterSelector from './ParameterSelector.jsx'
import ParameterLineChart from './ParameterLineChart.jsx'

export default function ParameterTrendPanel() {
  const { settings } = useSettings()
  const [parameterId, setParameterId] = useState(settings.defaultMonitoringParameter)

  const fetcher = useCallback(() => getParameterTrend(parameterId), [parameterId])
  const { status, data, error, reload } = useAsyncData(fetcher)

  const switching = status === 'success' && data !== null && data.parameter.id !== parameterId
  const isLoading = status === 'loading' || switching

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500">
            Select a parameter to view its provisional trend.
          </p>
          <ParameterSelector value={parameterId} onChange={setParameterId} disabled={isLoading} />
        </div>
      </Card>

      {isLoading && (
        <Card bodyClassName="py-16">
          <Spinner size="lg" label="Loading trend data…" />
        </Card>
      )}

      {!isLoading && status === 'error' && (
        <EmptyState
          icon={TriangleAlert}
          title="Could not load trend data"
          description={error?.message ?? 'Something went wrong while loading the parameter trend.'}
          action={<Button onClick={reload}>Try again</Button>}
        />
      )}

      {!isLoading && status === 'success' && data && (
        <ChartCard
          title={data.parameter.label}
          subtitle={`Provisional demo readings · Unit: ${data.parameter.unit}`}
        >
          <ParameterLineChart points={data.points} unit={data.parameter.unit} label={data.parameter.label} />
        </ChartCard>
      )}
    </div>
  )
}
