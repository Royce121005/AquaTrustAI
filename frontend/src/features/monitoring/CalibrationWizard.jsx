import { useState, useMemo } from 'react'
import {
  Wrench,
  CheckCircle2,
  AlertTriangle,
  X,
  FileCheck2,
  Download,
  KeyRound,
  ShieldAlert,
  ArrowRight,
  RotateCcw,
  Sparkles,
} from 'lucide-react'
import {
  CALIBRATION_METHODS,
  CALIBRATION_STATUS,
  computeMultiPointCalibration,
  computeZeroSpanCalibration,
  getSensorCalibration,
  setSensorHold,
  recordCalibration,
} from '../../lib/calibration/calibrationStore.js'
import { formatTimestamp, formatDate } from '../../utils/format.js'

export default function CalibrationWizard({ sensor, onClose, onComplete }) {
  const sensorId = sensor?.id || 'AIT-201'
  const sensorName = sensor?.name || sensorId
  const unit = sensor?.unit || 'mg/L'

  const currentCal = getSensorCalibration(sensorId)

  // Wizard state
  const [step, setStep] = useState(1) // 1: Hold, 2: Method, 3: Readings, 4: Results, 5: E-Sign, 6: History
  const [method, setMethod] = useState(
    sensorId.includes('pH') || unit === 'pH'
      ? CALIBRATION_METHODS.MULTI_POINT
      : CALIBRATION_METHODS.ZERO_SPAN
  )

  // Zero/Span Inputs
  const [zeroExp, setZeroExp] = useState(0.0)
  const [zeroMeas, setZeroMeas] = useState(0.02)
  const [spanExp, setSpanExp] = useState(sensorId === 'AIT-201' ? 8.25 : 50.0)
  const [spanMeas, setSpanMeas] = useState(sensorId === 'AIT-201' ? 8.32 : 49.5)

  // Multi-point inputs
  const [points, setPoints] = useState([
    { expected: 4.01, measured: 4.04 },
    { expected: 7.0, measured: 7.02 },
    { expected: 10.01, measured: 9.98 },
  ])

  // Technician / Lot inputs
  const [technician, setTechnician] = useState(currentCal.technician || 'V. Nair')
  const [lotNumber, setLotNumber] = useState(currentCal.lotNumber || 'NIST-CAL-BATCH-2026')
  const [lotExpiry, setLotExpiry] = useState('2027-12-31')
  const [authPin, setAuthPin] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  // Compute live calibration results
  const calResult = useMemo(() => {
    try {
      if (method === CALIBRATION_METHODS.ZERO_SPAN) {
        return computeZeroSpanCalibration({
          zeroExpected: zeroExp,
          zeroMeasured: zeroMeas,
          spanExpected: spanExp,
          spanMeasured: spanMeas,
          tolerancePct: 5.0,
        })
      }
      return computeMultiPointCalibration(points, 5.0)
    } catch (e) {
      return { slope: 1, offset: 0, slopeErrorPct: 0, passed: false, error: e.message }
    }
  }, [method, zeroExp, zeroMeas, spanExp, spanMeas, points])

  // Step 1: Engage Hold
  const handleEngageHold = () => {
    setSensorHold(sensorId, true)
    setStep(2)
  }

  // Step 5: Finalize & E-Signature
  const handleSignAndFinalize = () => {
    if (!authPin || authPin !== '1234') {
      setErrorMsg('Invalid technician PIN. (Demo PIN: 1234)')
      return
    }

    recordCalibration({
      sensorId,
      method,
      slope: calResult.slope,
      offset: calResult.offset,
      slopeErrorPct: calResult.slopeErrorPct,
      passed: calResult.passed,
      technician,
      lotNumber,
      lotExpiry,
      signatureMeaning: 'Calibrated',
    })

    if (onComplete) onComplete()
    setStep(6)
  }

  const exportHistoryCsv = () => {
    const rows = [
      ['Date', 'Method', 'Result', 'Slope', 'Offset', 'Technician', 'Lot Number'],
      ...(currentCal.history || []).map((h) => [
        h.date,
        h.method,
        h.result,
        h.slope,
        h.offset,
        h.technician,
        h.lotNumber,
      ]),
    ]
    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n')
    const link = document.createElement('a')
    link.setAttribute('href', encodeURI(csvContent))
    link.setAttribute('download', `${sensorId}_calibration_history.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 select-none">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-sky-100 text-sky-700">
              <Wrench className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-sky-700 bg-white px-2 py-0.5 rounded border border-sky-200">
                  {sensorId}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  ISO/IEC 17025 Wizard
                </span>
              </div>
              <h3 className="font-bold text-sm text-slate-800">{sensorName} Calibration</h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Stepper Bar */}
        <div className="bg-slate-100 px-5 py-2 flex items-center justify-between text-[11px] font-medium text-slate-500 border-b border-slate-200">
          <span className={step === 1 ? 'font-bold text-sky-700' : ''}>1. HOLD</span>
          <span>→</span>
          <span className={step === 2 ? 'font-bold text-sky-700' : ''}>2. Method</span>
          <span>→</span>
          <span className={step === 3 ? 'font-bold text-sky-700' : ''}>3. Readings</span>
          <span>→</span>
          <span className={step === 4 ? 'font-bold text-sky-700' : ''}>4. Results</span>
          <span>→</span>
          <span className={step === 5 ? 'font-bold text-sky-700' : ''}>5. E-Sign</span>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* STEP 1: Place in HOLD */}
          {step === 1 && (
            <div className="space-y-4 text-center py-2">
              <div className="inline-flex p-3 rounded-full bg-amber-100 text-amber-700">
                <ShieldAlert className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-800">Place Sensor into Calibration HOLD</h4>
                <p className="text-slate-500 max-w-sm mx-auto">
                  Engaging HOLD forces tag quality to <strong>UNCERTAIN</strong> and displays{' '}
                  <strong className="text-amber-700">UNDER CALIBRATION</strong>. Telemetry is temporarily{' '}
                  <strong className="text-rose-600">EXCLUDED FROM COMPLIANCE SCORE</strong> to prevent false alarms.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-left font-mono space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Sensor Tag:</span>
                  <span className="font-semibold text-slate-700">{sensorId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Last Calibrated:</span>
                  <span className="font-semibold text-slate-700">
                    {currentCal.lastCalibrated ? formatTimestamp(currentCal.lastCalibrated) : 'Never'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleEngageHold}
                className="w-full py-2.5 px-4 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold inline-flex items-center justify-center gap-2"
              >
                <span>Engage HOLD & Proceed</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* STEP 2: Choose Method */}
          {step === 2 && (
            <div className="space-y-4">
              <h4 className="font-bold text-slate-800">Select Calibration Protocol</h4>
              <div className="grid grid-cols-2 gap-3">
                {Object.values(CALIBRATION_METHODS).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMethod(m)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      method === m
                        ? 'border-sky-500 bg-sky-50/50 ring-2 ring-sky-300'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <span className="font-bold text-xs text-slate-800 block">{m}</span>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      {m.includes('Zero') ? '2-point zero & span reference' : '3-point DIN buffer curve'}
                    </span>
                  </button>
                ))}
              </div>

              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-3 py-1.5 text-slate-500 hover:bg-slate-100 rounded-lg"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-4 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-lg"
                >
                  Continue to Readings
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Capture Readings */}
          {step === 3 && (
            <div className="space-y-4">
              <h4 className="font-bold text-slate-800">Capture Calibration Reference Points</h4>

              {method === CALIBRATION_METHODS.ZERO_SPAN ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-600 block">Zero Expected</label>
                      <input
                        type="number"
                        step="0.01"
                        value={zeroExp}
                        onChange={(e) => setZeroExp(+e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded border border-slate-300 font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-600 block">Zero Measured</label>
                      <input
                        type="number"
                        step="0.01"
                        value={zeroMeas}
                        onChange={(e) => setZeroMeas(+e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded border border-slate-300 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-600 block">Span Expected</label>
                      <input
                        type="number"
                        step="0.01"
                        value={spanExp}
                        onChange={(e) => setSpanExp(+e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded border border-slate-300 font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-600 block">Span Measured</label>
                      <input
                        type="number"
                        step="0.01"
                        value={spanMeas}
                        onChange={(e) => setSpanMeas(+e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded border border-slate-300 font-mono"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {points.map((pt, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded bg-slate-50 border border-slate-200">
                      <span className="w-16 font-mono font-bold text-slate-700">Point {i + 1}</span>
                      <input
                        type="number"
                        step="0.01"
                        value={pt.expected}
                        onChange={(e) => {
                          const next = [...points]
                          next[i].expected = +e.target.value
                          setPoints(next)
                        }}
                        className="w-24 px-2 py-1 rounded border border-slate-300 font-mono"
                        placeholder="Expected"
                      />
                      <span className="text-slate-400">→</span>
                      <input
                        type="number"
                        step="0.01"
                        value={pt.measured}
                        onChange={(e) => {
                          const next = [...points]
                          next[i].measured = +e.target.value
                          setPoints(next)
                        }}
                        className="w-24 px-2 py-1 rounded border border-slate-300 font-mono"
                        placeholder="Measured"
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-3 py-1.5 text-slate-500 hover:bg-slate-100 rounded-lg"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="px-4 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-lg"
                >
                  Evaluate Curve
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Metrology Results & Pass/Fail */}
          {step === 4 && (
            <div className="space-y-4">
              <div
                className={`p-4 rounded-xl border text-center space-y-1 ${
                  calResult.passed
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  {calResult.passed ? (
                    <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="h-6 w-6 text-rose-600" />
                  )}
                  <h4 className="text-base font-bold">
                    Calibration Verdict: {calResult.passed ? 'PASS' : 'FAIL'}
                  </h4>
                </div>
                <p className="text-xs">
                  {calResult.passed
                    ? 'Slope and offset are within ISO 17025 tolerance (±5.0%). Sensor is ready for release.'
                    : 'Slope deviation exceeds 5.0% tolerance. Sensor must remain EXCLUDED or be replaced.'}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center font-mono">
                <div className="p-2 rounded bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">Slope</span>
                  <span className="text-sm font-bold text-slate-800">{calResult.slope}</span>
                </div>
                <div className="p-2 rounded bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">Offset</span>
                  <span className="text-sm font-bold text-slate-800">{calResult.offset}</span>
                </div>
                <div className="p-2 rounded bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">Error %</span>
                  <span
                    className={`text-sm font-bold ${
                      calResult.slopeErrorPct <= 5.0 ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {calResult.slopeErrorPct}%
                  </span>
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-3 py-1.5 text-slate-500 hover:bg-slate-100 rounded-lg"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(5)}
                  className="px-4 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-lg"
                >
                  Proceed to E-Signature
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: E-Signature */}
          {step === 5 && (
            <div className="space-y-3">
              <h4 className="font-bold text-slate-800">Technician Electronic Signature</h4>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 block">Technician Name</label>
                  <input
                    type="text"
                    value={technician}
                    onChange={(e) => setTechnician(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 block">Standard Lot #</label>
                  <input
                    type="text"
                    value={lotNumber}
                    onChange={(e) => setLotNumber(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1 pt-2">
                <label className="text-[11px] font-semibold text-slate-600 block text-center">
                  Technician SCADA PIN (Demo: 1234)
                </label>
                <input
                  type="password"
                  placeholder="••••"
                  value={authPin}
                  onChange={(e) => setAuthPin(e.target.value)}
                  className="w-32 mx-auto block px-3 py-2 text-center text-lg tracking-widest font-mono rounded-lg border border-slate-300 focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="flex justify-between pt-3">
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="px-3 py-1.5 text-slate-500 hover:bg-slate-100 rounded-lg"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleSignAndFinalize}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg inline-flex items-center gap-1.5"
                >
                  <FileCheck2 className="h-4 w-4" />
                  <span>Release HOLD & Certify</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 6: History Table & CSV Export */}
          {step === 6 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-800">Calibration Certified & Anchored</h4>
                <button
                  type="button"
                  onClick={exportHistoryCsv}
                  className="px-2.5 py-1 text-xs border border-slate-300 hover:bg-slate-50 rounded inline-flex items-center gap-1 font-medium"
                >
                  <Download className="h-3 w-3" />
                  <span>Export CSV</span>
                </button>
              </div>

              <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200">
                <table className="w-full text-left font-mono text-[11px]">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="p-2">Date</th>
                      <th className="p-2">Method</th>
                      <th className="p-2">Slope</th>
                      <th className="p-2">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(currentCal.history || []).map((h, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2">{formatDate(h.date)}</td>
                        <td className="p-2">{h.method}</td>
                        <td className="p-2">{h.slope}</td>
                        <td className="p-2 font-bold text-emerald-700">{h.result}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-lg"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
