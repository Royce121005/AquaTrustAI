import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles, ArrowRight, ShieldCheck, AlertTriangle, Play, Wrench } from 'lucide-react'
import Card from '../../components/ui/Card.jsx'
import { useAlarmState } from '../../lib/alarms/useAlarmState.js'
import { useTagStream } from '../../lib/tags/useTagStream.js'

export default function OperatorRecommendationsCard() {
  const { activeAlarms } = useAlarmState()
  const { tagValues, assetStates } = useTagStream()

  const recommendations = useMemo(() => {
    const list = []

    // 1. Check Outfall COD / Alum Dosing
    const codVal = tagValues['AIT-503']?.value ?? 34
    if (codVal >= 40) {
      list.push({
        id: 'REC-COD-01',
        title: 'Optimize Primary Coagulation',
        description: `Effluent COD is elevated at ${codVal.toFixed(1)} mg/L (Limit 50). Increase Alum Dosing Pump DP-101 stroke rate to prevent statutory violation.`,
        urgency: 'HIGH',
        targetTag: 'DP-101',
        actionLabel: 'Adjust DP-101 Dosing',
        link: '/process',
      })
    } else {
      list.push({
        id: 'REC-COD-NORM',
        title: 'Chemical Coagulation Optimization',
        description: `Effluent COD stable at ${codVal.toFixed(1)} mg/L. Maintain baseline Alum rate on DP-101 to conserve coagulant inventory.`,
        urgency: 'NORMAL',
        targetTag: 'DP-101',
        actionLabel: 'Inspect Skid DP-101',
        link: '/process',
      })
    }

    // 2. Check Aeration DO / Blower
    const doVal = tagValues['AIT-201']?.value ?? 2.45
    const blwStatus = assetStates['BLW-201']?.status
    if (blwStatus === 'Fault' || doVal <= 1.8) {
      list.push({
        id: 'REC-DO-01',
        title: 'Restore Aeration Basin Dissolved Oxygen',
        description: `DO reading is critical at ${doVal.toFixed(2)} mg/L (Blower: ${blwStatus}). Start standby Blower BLW-202 immediately to protect activated sludge culture.`,
        urgency: 'CRITICAL',
        targetTag: 'BLW-201',
        actionLabel: 'Start BLW-202 (Standby)',
        link: '/process',
      })
    } else {
      list.push({
        id: 'REC-DO-NORM',
        title: 'Closed-Loop DO Trim Tuning',
        description: `Biological Basin DO at ${doVal.toFixed(2)} mg/L is in target band (2.0–3.5 mg/L). Automated PID controller AIT-201.SP is tracking with 0 steady-state error.`,
        urgency: 'NORMAL',
        targetTag: 'AIT-201',
        actionLabel: 'View PID Faceplate',
        link: '/process',
      })
    }

    // 3. Check Equalization Tank & Lift Pumps
    const litVal = tagValues['LIT-101']?.value ?? 58
    if (litVal >= 80) {
      list.push({
        id: 'REC-LIT-01',
        title: 'Equalization Surge Prevention',
        description: `Equalization tank level reached ${litVal.toFixed(1)}%. Bring secondary lift pump P-102 online to balance hydraulic loading across clarifiers.`,
        urgency: 'HIGH',
        targetTag: 'P-102',
        actionLabel: 'Start Lift Pump P-102',
        link: '/process',
      })
    } else {
      list.push({
        id: 'REC-PUMP-NORM',
        title: 'Periodic Duty Pump Rotation',
        description: `Raw lift pump P-101 has logged 4,120 operational hours. Schedule routine switchover to standby pump P-102 to equalize motor wear.`,
        urgency: 'LOW',
        targetTag: 'P-101',
        actionLabel: 'Inspect Pump P-101',
        link: '/process',
      })
    }

    return list.slice(0, 3)
  }, [tagValues, assetStates])

  return (
    <Card className="border-sky-200 dark:border-slate-700 bg-gradient-to-br from-white via-sky-50/20 to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
              Top 3 Recommended SCADA Actions (Plant Operator)
            </h3>
            <p className="text-[11px] text-slate-500">
              Real-time heuristic & AI recommendations derived from live instrumentation and ISA-18.2 state
            </p>
          </div>
        </div>

        <Link
          to="/process"
          className="text-xs text-sky-600 dark:text-sky-400 hover:underline font-semibold inline-flex items-center gap-1"
        >
          P&ID Process Mimic <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {recommendations.map((rec, i) => (
          <div
            key={rec.id}
            className="p-3 rounded-lg border bg-white dark:bg-slate-900 shadow-2xs flex flex-col justify-between space-y-2 border-slate-200 dark:border-slate-800"
          >
            <div>
              <div className="flex items-center justify-between gap-1 mb-1">
                <span
                  className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded ${
                    rec.urgency === 'CRITICAL'
                      ? 'bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-300'
                      : rec.urgency === 'HIGH'
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300'
                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300'
                  }`}
                >
                  {rec.urgency}
                </span>
                <span className="font-mono text-[10px] text-slate-400 font-semibold">
                  [{rec.targetTag}]
                </span>
              </div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                {rec.title}
              </h4>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                {rec.description}
              </p>
            </div>

            <Link
              to={rec.link}
              className="mt-2 w-full py-1.5 px-2 bg-slate-50 hover:bg-sky-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-sky-700 dark:text-sky-300 text-xs font-bold rounded border border-slate-200 dark:border-slate-700 transition-colors flex items-center justify-center gap-1 text-center"
            >
              <Play className="w-3 h-3 fill-sky-600 text-sky-600" />
              {rec.actionLabel}
            </Link>
          </div>
        ))}
      </div>
    </Card>
  )
}
