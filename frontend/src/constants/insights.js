export const INSIGHT_VIEWS = [
  { key: 'predictions', label: 'Predictions' },
  { key: 'anomalies', label: 'Anomalies' },
  { key: 'recommendations', label: 'Recommendations' },
]

export const DEFAULT_INSIGHT_VIEW = 'predictions'

export function resolveInsightView(requested) {
  return INSIGHT_VIEWS.some((view) => view.key === requested) ? requested : DEFAULT_INSIGHT_VIEW
}
