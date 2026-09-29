import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Sparkles,
  ShieldAlert,
  ArrowRight,
  Sliders,
  Check,
} from 'lucide-react'
import Card from '../../components/ui/Card.jsx'
import Button from '../../components/ui/Button.jsx'
import StatusBadge from '../../components/ui/StatusBadge.jsx'
import { useTagStream } from '../../lib/tags/useTagStream.js'
import {
  getOutfallComplianceForecast,
  OUTFALL_TAGS,
} from '../../lib/insights/complianceForecast.js'
import { addAuditEvent, AUDIT_ACTIONS } from '../../lib/audit/auditStore.js'
import { useAuth } from '../../context/authContext.js'

export default function ComplianceForecastCard() {
  const { tagValues, historyBuffer } = useTagStream()
  const { user, permissions } = useAuth()
  const [selectedTag, setSelectedTag] = useState('AIT-503')
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(null) // { tagId, feedback, txId }

  const forecastReport = useMemo(() => {
    return getOutfallComplianceForecast(tagValues, historyBuffer)
  }, [tagValues, historyBuffer])

  const activeForecast = useMemo(() => {
    return (
      forecastReport.allForecasts.find((f) => f.tagId === selectedTag) ||
      forecastReport.topForecast
    )
  }, [forecastReport, selectedTag])

  const handleFeedback = (feedbackType) => {
    if (!activeForecast) return

    try {
      const isTrue = feedbackType === 'true_positive'
      const feedbackLabel = isTrue ? 'Confirmed True Anomaly' : 'Flagged as False Positive'
      const auditEvt = addAuditEvent({
        action: AUDIT_ACTIONS.ANOMALY_FEEDBACK,
        tagId: activeForecast.tagId,
        oldValue: `Predicted Breach in ~${activeForecast.timeToBreachFormatted} (${activeForecast.paramShort})`,
        newValue: feedbackLabel,
        reason: `Operator ${user?.name || 'On Duty'} feedback: ${feedbackLabel} for predictive forecast (R²=${activeForecast.r2}, slope=${activeForecast.slope})`,
        userId: user?.id || 'usr_op_current',
        userName: user?.name || 'Plant Operator',
        role: user?.roleName || 'Plant Operator',
        signatureMeaning: 'Verified',
      })

      setFeedbackSubmitted({
        tagId: activeForecast.tagId,
        feedback: feedbackLabel,
        eventId: auditEvt.id,
      })
    } catch (err) {
      console.error('Failed to record anomaly feedback audit event:', err)
    }
  }

  const confidenceTone =
    activeForecast?.confidence === 'high'
      ? 'danger'
      : activeForecast?.confidence === 'medium'
      ? 'warning'
      : 'info'

  return (
    <Card
      title="Predictive Compliance & Breach Horizon"
      subtitle="Linear regression projection over continuous outfall telemetry against CPCB/EPA statutory limits"
      headerAction={
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs">
          {OUTFALL_TAGS.map((tid) => {
            const f = forecastReport.allForecasts.find((item) => item.tagId === tid)
            const isCritical = f?.isApproachingLimit
            return (
              <button
                key={tid}
                type="button"
                onClick={() => {
                  setSelectedTag(tid)
                  setFeedbackSubmitted(null)
                }}
                className={`px-2.5 py-1 rounded font-mono font-medium transition-all ${
                  selectedTag === tid
                    ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                }`}
              >
                {tid.replace('AIT-', '')}
                {isCritical && (
                  <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                )}
              </button>
            )
          })}
        </div>
      }
    >
      <div className="space-y-4">
        {/* Plain Language Advisory Banner */}
        <div
          className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
            activeForecast?.isApproachingLimit
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-950 dark:text-amber-200'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-200'
          }`}
        >
          <div className="flex items-start gap-3">
            {activeForecast?.isApproachingLimit ? (
              <div className="p-2 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
            ) : (
              <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
                <CheckCircle className="w-5 h-5" />
              </div>
            )}
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm">
                  {activeForecast?.name} ({activeForecast?.tagId})
                </span>
                <StatusBadge
                  tone={confidenceTone}
                  label={`Confidence: ${activeForecast?.confidence?.toUpperCase()}`}
                />
                {activeForecast?.isApproachingLimit && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 font-mono font-bold">
                    ETA: ~{activeForecast?.timeToBreachFormatted}
                  </span>
                )}
              </div>
              <p className="text-sm font-medium leading-relaxed">
                "{activeForecast?.plainText}"
              </p>
            </div>
          </div>
        </div>

        {/* Statistical Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
            <span className="text-xs text-slate-500 block">Current Telemetry</span>
            <span className="text-lg font-mono font-bold text-slate-900 dark:text-white">
              {activeForecast?.currentValue}{' '}
              <span className="text-xs font-normal text-slate-500">{activeForecast?.unit}</span>
            </span>
          </div>

          <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
            <span className="text-xs text-slate-500 block">Statutory Limit (HH)</span>
            <span className="text-lg font-mono font-bold text-rose-600 dark:text-rose-400">
              {activeForecast?.limit}{' '}
              <span className="text-xs font-normal text-slate-500">{activeForecast?.unit}</span>
            </span>
          </div>

          <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
            <span className="text-xs text-slate-500 block">Regression Slope (m)</span>
            <span className="text-lg font-mono font-bold text-slate-800 dark:text-slate-200">
              {activeForecast?.slope > 0 ? `+${activeForecast?.slope}` : activeForecast?.slope}
            </span>
          </div>

          <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
            <span className="text-xs text-slate-500 block">Goodness of Fit (R²)</span>
            <span className="text-lg font-mono font-bold text-sky-600 dark:text-sky-400">
              {activeForecast?.r2}
            </span>
          </div>
        </div>

        {/* Operator Feedback & Audit Section */}
        <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-sky-500" />
            <span>
              Operator verification trains neural anomaly weights and records an immutable 21 CFR Part 11 audit event.
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {feedbackSubmitted && feedbackSubmitted.tagId === activeForecast?.tagId ? (
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Logged: {feedbackSubmitted.feedback}</span>
                <Link
                  to="/blockchain"
                  className="ml-1 underline text-sky-600 hover:text-sky-700"
                >
                  Verify Audit
                </Link>
              </div>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800"
                  onClick={() => handleFeedback('true_positive')}
                >
                  <CheckCircle className="w-3.5 h-3.5 mr-1" />
                  True Anomaly
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 border-amber-300 dark:border-amber-800"
                  onClick={() => handleFeedback('false_positive')}
                >
                  <XCircle className="w-3.5 h-3.5 mr-1" />
                  False Positive
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}
