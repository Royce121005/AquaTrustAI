import { TriangleAlert } from 'lucide-react'
import Card from '../../components/ui/Card.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import Button from '../../components/ui/Button.jsx'
import useAsyncData from '../../hooks/useAsyncData.js'
import { getAnomalies } from '../../services/insights.js'
import AnomalyTable from './AnomalyTable.jsx'

export default function AnomalyPanel() {
  const { status, data, error, reload } = useAsyncData(getAnomalies)

  return (
    <Card
      title="Detected anomalies"
      subtitle="Provisional detection stand-in results"
      actions={
        <Button variant="ghost" size="sm" onClick={reload}>
          Refresh
        </Button>
      }
    >
      {status === 'loading' && (
        <div className="py-10">
          <Spinner size="lg" label="Loading anomalies…" />
        </div>
      )}

      {status === 'error' && (
        <EmptyState
          icon={TriangleAlert}
          title="Could not load anomalies"
          description={error?.message ?? 'Something went wrong while loading anomalies.'}
          action={<Button onClick={reload}>Try again</Button>}
        />
      )}

      {status === 'success' && (data === null || data.length === 0) && (
        <EmptyState title="No anomalies detected" description="Nothing was flagged in the current window." />
      )}

      {status === 'success' && data !== null && data.length > 0 && <AnomalyTable anomalies={data} />}
    </Card>
  )
}
