import { useSearchParams } from 'react-router-dom'
import PageHeader from '../../components/ui/PageHeader.jsx'
import { resolveInsightView } from '../../constants/insights.js'
import InsightsTabs from '../../features/insights/InsightsTabs.jsx'
import PredictionPanel from '../../features/insights/PredictionPanel.jsx'
import AnomalyPanel from '../../features/insights/AnomalyPanel.jsx'
import RecommendationsPanel from '../../features/insights/RecommendationsPanel.jsx'

const PANELS = {
  predictions: PredictionPanel,
  anomalies: AnomalyPanel,
  recommendations: RecommendationsPanel,
}

export default function InsightsPage() {
  const [searchParams] = useSearchParams()
  const activeView = resolveInsightView(searchParams.get('view'))
  const ActivePanel = PANELS[activeView]

  return (
    <div className="space-y-4">
      <PageHeader
        title="AI Insights"
        subtitle="Predictions, anomaly detection, and operational recommendations"
      />
      <InsightsTabs />
      <ActivePanel />
    </div>
  )
}
