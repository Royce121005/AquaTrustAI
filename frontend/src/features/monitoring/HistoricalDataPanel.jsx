import { useCallback, useState } from 'react'
import { TriangleAlert } from 'lucide-react'
import Card from '../../components/ui/Card.jsx'
import ChartCard from '../../components/charts/ChartCard.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import Button from '../../components/ui/Button.jsx'
import StatusBadge from '../../components/ui/StatusBadge.jsx'
import useAsyncData from '../../hooks/useAsyncData.js'
import { getStpHistory, getStpOptions, getBangaloreDatasetInfo } from '../../services/monitoring.js'
import { defaultStpHistoryFilters, getStpParameter } from '../../constants/stpParameters.js'
import HistoricalFilters from './HistoricalFilters.jsx'
import ParameterLineChart from './ParameterLineChart.jsx'

export default function HistoricalDataPanel() {
  const [filters, setFilters] = useState(defaultStpHistoryFilters)
  const [requestSeq, setRequestSeq] = useState(0)
  const [loadedSeq, setLoadedSeq] = useState(0)

  const fetcher = useCallback(async () => {
    try {
      const options = await getStpOptions()
      const info = await getBangaloreDatasetInfo()
      const activeStpId =
        filters.stpId && options.some((option) => option.id === filters.stpId)
          ? filters.stpId
          : (options[0]?.id ?? null)
      if (!activeStpId) {
        throw new Error('No STPs were found in the Bangalore dataset.')
      }
      const result = await getStpHistory({
        stpId: activeStpId,
        parameterId: filters.parameterId,
        from: filters.from || undefined,
        to: filters.to || undefined,
      })
      setLoadedSeq(requestSeq)
      return { options, info, activeStpId, result }
    } catch (error) {
      setLoadedSeq(requestSeq)
      throw error
    }
  }, [filters, requestSeq])

  const { status, data, error, reload } = useAsyncData(fetcher)

  const applyingFilters = requestSeq !== loadedSeq
  const isLoading = status === 'loading' || (applyingFilters && status !== 'error')

  const applyFilters = (next) => {
    setFilters(next)
    setRequestSeq((seq) => seq + 1)
  }

  const parameter = getStpParameter(filters.parameterId)

  return (
    <div className="space-y-4">
      <HistoricalFilters
        applied={filters}
        options={data?.options}
        minDate={data?.info?.startDate?.slice(0, 10)}
        maxDate={data?.info?.endDate?.slice(0, 10)}
        onApply={applyFilters}
      />

      {isLoading && (
        <Card bodyClassName="py-16">
          <Spinner size="lg" label="Loading historical data…" />
        </Card>
      )}

      {!isLoading && status === 'error' && (
        <EmptyState
          icon={TriangleAlert}
          title="Could not load historical data"
          description={error?.message ?? 'Something went wrong while loading historical data.'}
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
          title={`${parameter.label} · ${data.activeStpId ? (data.options.find((o) => o.id === data.activeStpId)?.name ?? data.activeStpId) : ''}`}
          subtitle={`${data.result.pointCount} readings · ${data.result.from ? `${data.result.from.slice(0, 10)} \u2192 ${data.result.to.slice(0, 10)}` : 'no records in range'} · Unit: ${parameter.unit}`}
          actions={<StatusBadge tone="info" label="dataset-derived" dot={false} />}
        >
          <ParameterLineChart points={data.result.points} unit={parameter.unit} label={parameter.label} />
        </ChartCard>
      )}
    </div>
  )
}
