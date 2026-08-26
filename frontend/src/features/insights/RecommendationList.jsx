import { CircleAlert, Info, TriangleAlert } from 'lucide-react'
import StatusBadge from '../../components/ui/StatusBadge.jsx'
import { getParameterLabel } from '../../constants/monitoring.js'
import { getStpParameter } from '../../constants/stpParameters.js'

const PRIORITY_ICONS = {
  high: TriangleAlert,
  medium: CircleAlert,
  low: Info,
}

const PRIORITY_STYLES = {
  high: 'bg-red-50 text-red-600',
  medium: 'bg-amber-50 text-amber-600',
  low: 'bg-sky-50 text-sky-600',
}

const PRIORITY_TONES = {
  high: 'danger',
  medium: 'warning',
  low: 'info',
}

function resolveParameterLabel(parameterId) {
  return getStpParameter(parameterId)?.label ?? getParameterLabel(parameterId)
}

export default function RecommendationList({ recommendations }) {
  return (
    <ul className="divide-y divide-slate-100">
      {recommendations.map((recommendation) => {
        const Icon = PRIORITY_ICONS[recommendation.priority] ?? Info
        const relatedLabel = recommendation.relatedParameterId
          ? resolveParameterLabel(recommendation.relatedParameterId)
          : null
        return (
          <li key={recommendation.id} className="flex items-start gap-3 py-4 first:pt-0 last:pb-0">
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                PRIORITY_STYLES[recommendation.priority] ?? 'bg-slate-100 text-slate-500'
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tone={PRIORITY_TONES[recommendation.priority] ?? 'neutral'} label={`${recommendation.priority} priority`} />
                {relatedLabel && <StatusBadge tone="neutral" label={relatedLabel} dot={false} />}
              </div>
              <p className="text-sm leading-relaxed text-slate-700">{recommendation.message}</p>
              {(recommendation.reason || recommendation.suggestedAction) && (
                <p className="text-xs leading-relaxed text-slate-400">
                  {recommendation.reason && <span className="block">Reason: {recommendation.reason}</span>}
                  {recommendation.suggestedAction && (
                    <span className="block">Suggested action: {recommendation.suggestedAction}</span>
                  )}
                </p>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
