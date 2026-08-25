import { CircleAlert, Info, TriangleAlert } from 'lucide-react'
import StatusBadge from '../../components/ui/StatusBadge.jsx'

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

export default function RecommendationList({ recommendations }) {
  return (
    <ul className="divide-y divide-slate-100">
      {recommendations.map((recommendation) => {
        const Icon = PRIORITY_ICONS[recommendation.priority] ?? Info
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
              </div>
              <p className="text-sm leading-relaxed text-slate-700">{recommendation.message}</p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
