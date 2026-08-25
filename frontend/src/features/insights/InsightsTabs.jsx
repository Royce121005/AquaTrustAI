import { useSearchParams } from 'react-router-dom'
import {
  DEFAULT_INSIGHT_VIEW,
  INSIGHT_VIEWS,
  resolveInsightView,
} from '../../constants/insights.js'

export default function InsightsTabs() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeView = resolveInsightView(searchParams.get('view'))

  const select = (key) => {
    setSearchParams(key === DEFAULT_INSIGHT_VIEW ? {} : { view: key })
  }

  return (
    <nav
      aria-label="AI Insights views"
      className="flex w-fit flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm"
    >
      {INSIGHT_VIEWS.map((view) => (
        <button
          key={view.key}
          type="button"
          onClick={() => select(view.key)}
          aria-current={activeView === view.key ? 'page' : undefined}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeView === view.key
              ? 'bg-sky-600 text-white'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
          }`}
        >
          {view.label}
        </button>
      ))}
    </nav>
  )
}
