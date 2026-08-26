import { useCallback, useState } from 'react'
import { TriangleAlert } from 'lucide-react'
import Card from '../../components/ui/Card.jsx'
import ChartCard from '../../components/charts/ChartCard.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import Button from '../../components/ui/Button.jsx'
import StatusBadge from '../../components/ui/StatusBadge.jsx'
import useAsyncData from '../../hooks/useAsyncData.js'
import { useSettings } from '../../hooks/useSettings.js'
import { getStpOptions, getStpTrend } from '../../services/monitoring.js'
import {
  DEFAULT_STP_PARAMETER,
  STP_PARAMETER_OPTIONS,
  getStpParameter,
  isStpParameter,
} from '../../constants/stpParameters.js'
import { formatUtcDate } from '../../utils/format.js'
import StpSelector from './StpSelector.jsx'
import ParameterLineChart from './ParameterLineChart.jsx'

function resolveDefaultParameter(candidate) {
  return isStpParameter(candidate) ? candidate : DEFAULT_STP_PARAMETER
}

export default function ParameterTrendPanel() {
  const { settings } = useSettings()
  const [parameterId, setParameterId] = useState(() => resolveDefaultParameter(settings.defaultMonitoringParameter))
  const [stpId, setStpId] = useState('')
  const [requestSeq, setRequestSeq] = useState(0)
  const [loadedSeq, setLoadedSeq] = useState(0)

  const fetcher = useCallback(async () => {
    try {
      const options = await getStpOptions()
      const activeStpId =
        stpId && options.some((option) => option.id === stpId) ? stpId : (options[0]?.id ?? null)
      if (!activeStpId) {
        throw new Error('No STPs were found in the Bangalore dataset.')
      }
      const trend = await getStpTrend(activeStpId, parameterId)
      setLoadedSeq(requestSeq)
      return { options, trend }
    } catch (error) {
      setLoadedSeq(requestSeq)
      throw error
    }
  }, [stpId, parameterId, requestSeq])

  const { status, data, error, reload } = useAsyncData(fetcher)

  // A selection change bumps requestSeq before the refetch lands.
  const isSwitching = requestSeq !== loadedSeq
  const isLoading = status === 'loading' || (isSwitching && status !== 'error')

  const changeStp = (nextStpId) => {
    if (nextStpId === stpId) return
    setStpId(nextStpId)
    setRequestSeq((seq) => seq + 1)
  }

  const changeParameter = (nextParameterId) => {
    if (nextParameterId === parameterId) return
    setParameterId(nextParameterId)
    setRequestSeq((seq) => seq + 1)
  }

  const parameter = getStpParameter(parameterId)
  const pointsWithValues = data?.trend?.points?.filter((point) => point.value !== null) ?? []

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500">
            Select an STP and parameter to view its historical readings.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <StpSelector
              options={data?.options}
              value={data?.trend?.stp?.id ?? ''}
              onChange={changeStp}
              disabled={isLoading}
            />
            <select
              aria-label="Parameter"
              value={parameterId}
              disabled={isLoading}
              onChange={(event) => changeParameter(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-50 sm:w-auto sm:min-w-44"
            >
              {STP_PARAMETER_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {isLoading && (
        <Card bodyClassName="py-16">
          <Spinner size="lg" label="Loading historical readings…" />
        </Card>
      )}

      {!isLoading && status === 'error' && (
        <EmptyState
          icon={TriangleAlert}
          title="Could not load trend data"
          description={error?.message ?? 'Something went wrong while loading the STP trend.'}
          action={
            <Button
              onClick={() => {
                setRequestSeq((seq) => seq + 1)
                reload()
              }}
            >
              Try again
            </Button>
          }
        />
      )}

      {!isLoading && status === 'success' && data && (
        <ChartCard
          title={`${data.trend.stp.name} · ${parameter.label}`}
          subtitle={`${formatUtcDate(data.trend.points[0]?.timestamp)} \u2192 ${formatUtcDate(
            data.trend.points[data.trend.points.length - 1]?.timestamp,
          )} · ${pointsWithValues.length} readings · Unit: ${parameter.unit}`}
          actions={<StatusBadge tone="info" label="dataset-derived" dot={false} />}
        >
          <ParameterLineChart
            points={data.trend.points}
            unit={parameter.unit}
            label={parameter.label}
          />
        </ChartCard>
      )}
    </div>
  )
}
