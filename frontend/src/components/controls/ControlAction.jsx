import { useState } from 'react'
import {
  ShieldAlert,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  X,
  Lock,
  UserCheck,
  ArrowRight,
  Sliders,
  Play,
  Square,
  RefreshCw,
} from 'lucide-react'
import useAuth from '../../hooks/useAuth.js'
import { getTag } from '../../lib/tags/registry.js'
import { addAuditEvent, AUDIT_ACTIONS } from '../../lib/audit/auditStore.js'

export default function ControlAction({
  tagId,
  actionType = AUDIT_ACTIONS.SETPOINT_CHANGE,
  currentValue,
  targetValue: initialTarget,
  onExecute,
  label = 'Request Change',
  variant = 'primary',
  icon: Icon,
  unit = '',
  title,
  disabled = false,
  className = '',
}) {
  const { currentRole, permissions } = useAuth()
  const isOperator = permissions?.isOperator ?? false

  const tag = getTag(tagId) || {
    id: tagId,
    name: tagId,
    unit,
    range: [0, 100],
    alarmLimits: { LL: 5, L: 15, H: 85, HH: 95 },
    critical: false,
    maxRateOfChange: 20,
  }

  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState(1) // 1: Input, 2: Reason, 3: Re-Auth, 4: Peer Approval (if critical)
  const [newValue, setNewValue] = useState(
    initialTarget !== undefined ? initialTarget : currentValue ?? 0
  )
  const [reason, setReason] = useState('')
  const [pin, setPin] = useState('')
  const [peerPin, setPeerPin] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [toastMsg, setToastMsg] = useState(null)

  const isCritical = tag.critical || actionType === AUDIT_ACTIONS.MODE_CHANGE

  const handleOpen = () => {
    if (!isOperator) return
    setNewValue(initialTarget !== undefined ? initialTarget : currentValue ?? 0)
    setReason('')
    setPin('')
    setPeerPin('')
    setErrorMsg('')
    setStep(1)
    setIsOpen(true)
  }

  const handleClose = () => {
    setIsOpen(false)
    setErrorMsg('')
  }

  // Step 1: Validate Value & Rate of change
  const handleValidateInput = () => {
    setErrorMsg('')
    if (actionType === AUDIT_ACTIONS.SETPOINT_CHANGE) {
      const num = Number(newValue)
      if (Number.isNaN(num)) {
        setErrorMsg('Please enter a valid numeric setpoint.')
        return
      }
      if (tag.range && (num < tag.range[0] || num > tag.range[1])) {
        setErrorMsg(`Setpoint must be between ${tag.range[0]} and ${tag.range[1]} ${tag.unit || ''}.`)
        return
      }
      if (tag.maxRateOfChange && typeof currentValue === 'number') {
        const delta = Math.abs(num - currentValue)
        if (delta > tag.maxRateOfChange) {
          setErrorMsg(
            `Rate of change violation: max allowed delta is ${tag.maxRateOfChange} ${tag.unit || ''} (requested ${delta.toFixed(1)}).`
          )
          return
        }
      }
    }
    setStep(2)
  }

  // Step 2: Validate Reason
  const handleValidateReason = () => {
    if (!reason.trim() || reason.trim().length < 6) {
      setErrorMsg('Mandatory audit reason must be at least 6 characters.')
      return
    }
    setErrorMsg('')
    setStep(3)
  }

  // Step 3: Validate Primary Operator PIN (Mock: 1234 or non-empty)
  const handlePrimaryAuth = () => {
    if (!pin.trim() || pin !== '1234') {
      setErrorMsg('Invalid operator authorization PIN. (Demo PIN: 1234)')
      return
    }
    setErrorMsg('')
    if (isCritical) {
      setStep(4) // Requires second approver
    } else {
      executeAction()
    }
  }

  // Step 4: Validate Peer / Supervisor Approval PIN (Mock: 9999)
  const handlePeerAuth = () => {
    if (!peerPin.trim() || peerPin !== '9999') {
      setErrorMsg('Invalid supervisor approval PIN. (Demo Supervisor PIN: 9999)')
      return
    }
    setErrorMsg('')
    executeAction()
  }

  const executeAction = () => {
    const advisoryReason = `Operator request (advisory): ${reason.trim()}`

    try {
      addAuditEvent({
        action: actionType,
        tagId,
        oldValue: currentValue != null ? String(currentValue) : null,
        newValue: String(newValue),
        reason: advisoryReason,
        userId: 'usr_op_current',
        userName: 'P. Operator',
        role: 'Plant Operator',
        signatureMeaning: isCritical ? 'Approved' : 'Reviewed',
      })

      if (onExecute) {
        onExecute({
          tagId,
          oldValue: currentValue,
          newValue,
          reason: advisoryReason,
        })
      }

      setIsOpen(false)
      showToast(`Operator request (advisory): ${tag.name || tagId} set to ${newValue} ${tag.unit || ''}`)
    } catch (err) {
      setErrorMsg(err.message || 'Execution failed.')
    }
  }

  const showToast = (msg) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 4000)
  }

  // RBAC: If not operator, disable button with descriptive tooltip
  if (!isOperator) {
    return (
      <div className="relative inline-block group" title="Read-only role — no control rights.">
        <button
          type="button"
          disabled
          className={`opacity-50 cursor-not-allowed inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-300 bg-slate-100 text-slate-400 ${className}`}
        >
          <Lock className="h-3.5 w-3.5" />
          <span>{label}</span>
        </button>
      </div>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        disabled={disabled}
        className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-xs ${
          variant === 'danger'
            ? 'bg-rose-600 hover:bg-rose-700 text-white'
            : variant === 'warning'
              ? 'bg-amber-600 hover:bg-amber-700 text-white'
              : variant === 'outline'
                ? 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300'
                : 'bg-sky-600 hover:bg-sky-700 text-white'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      >
        {Icon ? <Icon className="h-3.5 w-3.5" /> : <Sliders className="h-3.5 w-3.5" />}
        <span>{label}</span>
      </button>

      {/* Control Action Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div
                  className={`p-1.5 rounded-lg ${
                    isCritical ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'
                  }`}
                >
                  <ShieldAlert className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-800">
                    {title || `SCADA Control: ${tag.name || tagId}`}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Step {step} of {isCritical ? 4 : 3}:{' '}
                    {step === 1
                      ? 'Target Value'
                      : step === 2
                        ? 'Mandatory Reason'
                        : step === 3
                          ? 'Operator Re-Auth'
                          : 'Dual Supervisor Approval'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Stepper Progress */}
            <div className="h-1 w-full bg-slate-100">
              <div
                className="h-full bg-sky-600 transition-all duration-200"
                style={{ width: `${(step / (isCritical ? 4 : 3)) * 100}%` }}
              />
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              {errorMsg && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* STEP 1: Value Input */}
              {step === 1 && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                    <div>
                      <span className="text-slate-400 font-medium block">Current State</span>
                      <span className="text-sm font-bold font-mono text-slate-700">
                        {currentValue !== undefined && currentValue !== null
                          ? `${currentValue} ${tag.unit || ''}`
                          : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium block">Target State</span>
                      <span className="text-sm font-bold font-mono text-sky-700">
                        {newValue} {tag.unit || ''}
                      </span>
                    </div>
                  </div>

                  {actionType === AUDIT_ACTIONS.SETPOINT_CHANGE && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 block">
                        New Setpoint Value ({tag.unit || 'units'})
                      </label>
                      <input
                        type="number"
                        step={tag.decimals ? Math.pow(10, -tag.decimals) : 1}
                        value={newValue}
                        onChange={(e) => setNewValue(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 font-mono focus:ring-2 focus:ring-sky-500 focus:outline-none"
                      />
                      {tag.range && (
                        <p className="text-[11px] text-slate-400">
                          Operating limits: {tag.range[0]} – {tag.range[1]} {tag.unit || ''} (Max Δ:{' '}
                          {tag.maxRateOfChange || 'unrestricted'})
                        </p>
                      )}
                    </div>
                  )}

                  {actionType === AUDIT_ACTIONS.PUMP_COMMAND && (
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-2">
                      <p className="font-medium text-slate-700">
                        Confirm pump state transition to{' '}
                        <strong className="text-sky-700 font-mono">{newValue}</strong>
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Interlocks verified. Command will be transmitted to PLC duty sequencer.
                      </p>
                    </div>
                  )}

                  {actionType === AUDIT_ACTIONS.MODE_CHANGE && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 block">Select Control Mode</label>
                      <div className="grid grid-cols-2 gap-2">
                        {['Auto', 'Manual'].map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setNewValue(m)}
                            className={`py-2 px-3 rounded-lg text-xs font-bold border transition-colors ${
                              newValue === m
                                ? 'bg-sky-50 border-sky-500 text-sky-700 ring-2 ring-sky-300'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {isCritical && (
                    <div className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-200 text-[11px] text-amber-800 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                      <span>
                        <strong>Critical Tag:</strong> Modifying this parameter requires dual-operator
                        authorization and 21 CFR Part 11 compliant audit logging.
                      </span>
                    </div>
                  )}

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleValidateInput}
                      className="px-4 py-1.5 text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white rounded-lg inline-flex items-center gap-1.5"
                    >
                      <span>Continue to Reason</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: Reason */}
              {step === 2 && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 block">
                      Mandatory Operational Reason <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={3}
                      placeholder="e.g. Adjusting dosing rate in response to elevated influent COD lab test..."
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:outline-none resize-none"
                    />
                    <p className="text-[10px] text-slate-400">
                      This explanation is cryptographically hashed into the ledger audit trail.
                    </p>
                  </div>

                  <div className="pt-2 flex justify-between">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleValidateReason}
                      className="px-4 py-1.5 text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white rounded-lg inline-flex items-center gap-1.5"
                    >
                      <span>Proceed to Re-Auth</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: Re-Auth (PIN) */}
              {step === 3 && (
                <div className="space-y-3">
                  <div className="text-center py-2 space-y-1">
                    <div className="inline-flex p-3 rounded-full bg-sky-100 text-sky-700">
                      <KeyRound className="h-6 w-6" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-800">Operator Electronic Signature</h4>
                    <p className="text-[11px] text-slate-500">
                      Enter your 4-digit SCADA authorization PIN to confirm this advisory dispatch.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 block text-center">
                      Operator PIN (Demo: 1234)
                    </label>
                    <input
                      type="password"
                      maxLength={6}
                      autoFocus
                      placeholder="••••"
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      className="w-32 mx-auto block px-3 py-2 text-center text-lg tracking-widest font-mono rounded-lg border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    />
                  </div>

                  <div className="pt-2 flex justify-between">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handlePrimaryAuth}
                      className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg inline-flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>{isCritical ? 'Approve & Request Peer Sign' : 'Execute Command'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4: Dual Peer Approval (Critical Tags Only) */}
              {step === 4 && (
                <div className="space-y-3">
                  <div className="text-center py-2 space-y-1">
                    <div className="inline-flex p-3 rounded-full bg-amber-100 text-amber-700">
                      <UserCheck className="h-6 w-6" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-800">Dual Authorization Required</h4>
                    <p className="text-[11px] text-slate-500">
                      Second approval by Senior Process Engineer / Supervisor (Demo: 9999)
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1 font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Initiator:</span>
                      <span className="font-semibold text-slate-800">P. Operator (1234)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Action:</span>
                      <span className="font-semibold text-slate-800">{actionType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Target Value:</span>
                      <span className="font-semibold text-sky-700">{newValue} {tag.unit || ''}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 block text-center">
                      Supervisor PIN (Demo: 9999)
                    </label>
                    <input
                      type="password"
                      maxLength={6}
                      autoFocus
                      placeholder="••••"
                      value={peerPin}
                      onChange={(e) => setPeerPin(e.target.value)}
                      className="w-32 mx-auto block px-3 py-2 text-center text-lg tracking-widest font-mono rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div className="pt-2 flex justify-between">
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handlePeerAuth}
                      className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg inline-flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Authorize & Dispatch</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Non-intrusive Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-200">
          <div className="bg-slate-900 text-white text-xs px-4 py-3 rounded-lg shadow-xl border border-slate-700 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{toastMsg}</span>
          </div>
        </div>
      )}
    </>
  )
}
