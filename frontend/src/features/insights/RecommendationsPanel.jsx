import { Lightbulb, TriangleAlert } from 'lucide-react'
import Card from '../../components/ui/Card.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import Button from '../../components/ui/Button.jsx'
import useAsyncData from '../../hooks/useAsyncData.js'
import { getRecommendations } from '../../services/insights.js'
import RecommendationList from './RecommendationList.jsx'

export default function RecommendationsPanel() {
  const { status, data, error, reload } = useAsyncData(getRecommendations)

  return (
    <Card
      title="Operational recommendations"
      subtitle="Provisional suggestions pending live model integration"
      actions={
        <Button variant="ghost" size="sm" onClick={reload}>
          Refresh
        </Button>
      }
    >
      {status === 'loading' && (
        <div className="py-10">
          <Spinner size="lg" label="Loading recommendations…" />
        </div>
      )}

      {status === 'error' && (
        <EmptyState
          icon={TriangleAlert}
          title="Could not load recommendations"
          description={error?.message ?? 'Something went wrong while loading recommendations.'}
          action={<Button onClick={reload}>Try again</Button>}
        />
      )}

      {status === 'success' && (data === null || data.length === 0) && (
        <EmptyState icon={Lightbulb} title="No recommendations" description="There are no suggestions right now." />
      )}

      {status === 'success' && data !== null && data.length > 0 && <RecommendationList recommendations={data} />}
    </Card>
  )
}
