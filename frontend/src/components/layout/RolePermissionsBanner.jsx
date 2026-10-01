import { useState, useEffect } from 'react'
import { Shield, Check, Lock, X, AlertCircle } from 'lucide-react'
import useAuth from '../../hooks/useAuth.js'

export default function RolePermissionsBanner() {
  const { currentRole, permissions, roleMetadata } = useAuth()
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    try {
      const isDismissed = sessionStorage.getItem(`aquatrust-perm-banner-dismissed-${currentRole}`)
      setDismissed(isDismissed === 'true')
    } catch {
      setDismissed(false)
    }
  }, [currentRole])

  const handleDismiss = () => {
    setDismissed(true)
    try {
      sessionStorage.setItem(`aquatrust-perm-banner-dismissed-${currentRole}`, 'true')
    } catch {}
  }

  if (dismissed) return null

  const meta = roleMetadata[currentRole] || {}

  let allowed = []
  let restricted = []

  if (permissions.isAdmin) {
    allowed = [
      'Full administrative access to manage users, roles, and facilities',
      'Override system setpoints, calibrations, and operational modes',
      'Execute and verify DLT anchor batches and Merkle inclusion proofs',
      'Configure security policies, audit retention, and API keys',
    ]
    restricted = [
      'All critical interventions are permanently audited to the immutable ledger',
    ]
  } else if (permissions.isOperator) {
    allowed = [
      'Execute advisory pump & valve control actions',
      'Tune PID loop setpoints (AIT-201 DO)',
      'Shelve and acknowledge ISA-18.2 process alarms',
      'Perform sensor calibrations and place into HOLD',
    ]
    restricted = [
      'Cannot reconcile or modify ledger anchor batches',
      'Cannot sign regulatory CPCB Form V compliance returns',
    ]
  } else if (permissions.isAuditor) {
    allowed = [
      'Reconstruct historical plant state via Time-Travel',
      'Inspect sensor completeness and data availability',
      'Reconcile RFC 8785 SHA-256 hashes against Hyperledger Fabric',
      'Generate & export signed evidence pack ZIPs',
    ]
    restricted = [
      'Read-only role: physical actuators and setpoint writes are locked',
    ]
  } else {
    // Regulator
    allowed = [
      'Cross-plant regional fleet oversight & sorting',
      'Monitor statutory CPCB/SPCB exceedance registers',
      'Review and audit official Form V environmental returns',
      'Verify Merkle inclusion proofs and X.509 cert chains',
    ]
    restricted = [
      'Read-only role: plant floor control actions disabled',
    ]
  }

  return (
    <div className="mb-4 rounded-xl border border-sky-200 bg-gradient-to-r from-sky-50 via-white to-indigo-50 p-4 shadow-xs dark:border-sky-900/60 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-950/40">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-lg bg-sky-600/10 p-2 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300">
            <Shield className="h-4 w-4" />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-900 dark:text-sky-300">
                Active Role Scope: {meta.label}
              </span>
              <span className="rounded-full bg-sky-100 px-2 py-0.2 text-[10px] font-semibold text-sky-800 dark:bg-sky-900/50 dark:text-sky-300">
                {meta.scope}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {meta.description}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 text-[11px]">
              {/* Allowed Capabilities */}
              <div className="space-y-1">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Authorized Capabilities:</span>
                {allowed.map((item, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                    <Check className="h-3 w-3 text-emerald-600 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              {/* Restrictions */}
              <div className="space-y-1">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Role Constraints:</span>
                {restricted.map((item, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                    <Lock className="h-3 w-3 text-amber-600 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          title="Dismiss for this session"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
