import { useCallback, useState } from 'react'
import { TriangleAlert } from 'lucide-react'
import Card from '../../components/ui/Card.jsx'
import ChartCard from '../../components/charts/ChartCard.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import Button from '../../components/ui/Button.jsx'
import useAsyncData from '../../hooks/useAsyncData.js'
import { getHistoricalData } from '../../services/monitoring.js'
import HistoricalFilters from './HistoricalFilters.jsx'
import { defaultHistoryFilters } from '../../constants/monitoring.js'
import ParameterLineChart from './ParameterLineChart.jsx'

export default function HistoricalDataPanel() {
  const [filters, setFilters] = useState(defaultHistoryFilters)
  const [requestSeq, setRequestSeq] = useState(0)
  const [loadedSeq, setLoadedSeq] = useState(0)

  const fetcher = useCallback(async () => {
    try {
      const result = await getHistoricalData(filters)
      setLoadedSeq(requestSeq)
      return result
    } catch (err) {
      setLoadedSeq(requestSeq)
      throw err
    }
  }, [filters, requestSeq])

  const { status, data, error, reload } = useAsyncData(fetcher)

  const applyingFilters = requestSeq !== loadedSeq
  const isLoading = status === 'loading' || (applyingFilters && status !== 'error')

  const applyFilters = (next) => {
    setFilters(next)
    setRequestSeq((seq) => seq + 1)
  }

  return (
    <div className="space-y-4">
      <HistoricalFilters applied={filters} onApply={applyFilters} />

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
          action={<Button onClick={reload}>Try again</Button>}
        />
      )}

      {!isLoading && status === 'success' && data && (
        <ChartCard
          title={data.parameter.label}
          subtitle={`${data.pointCount} provisional points · ${data.intervalMinutes}-min interval · Unit: ${data.parameter.unit}`}
        >
          <ParameterLineChart points={data.points} unit={data.parameter.unit} label={data.parameter.label} />
        </ChartCard>
      )}
    </div>
  )
}
