/**
 * AquaTrust AI — Scenario Injector Controller
 * Powers scripted demonstrations, fault injections, and tamper simulation.
 */

import { alarmManager } from '../alarms/alarmManager.js'
import { getAllAuditEvents } from '../audit/auditStore.js'

let activeScenario = null
let scenarioTimer = null
let walkthroughIndex = 0
let walkthroughTimer = null
let listeners = new Set()

export const SCENARIO_TYPES = {
  COD_SPIKE: 'COD_SPIKE',
  DO_DRIFT: 'DO_DRIFT',
  BLOWER_TRIP: 'BLOWER_TRIP',
  PUMP_FAULT: 'PUMP_FAULT',
  TAMPER_RECORD: 'TAMPER_RECORD',
}

function notify() {
  listeners.forEach((fn) => fn(activeScenario))
}

export const scenarioController = {
  subscribe(listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },

  getActiveScenario() {
    return activeScenario
  },

  /**
   * Returns live dynamic overrides applied to useTagStream
   */
  getOverrides(elapsedMs = 0) {
    if (!activeScenario) return { tagOverrides: {}, assetOverrides: {} }

    const tagOverrides = {}
    const assetOverrides = {}

    switch (activeScenario.id) {
      case SCENARIO_TYPES.COD_SPIKE: {
        // Ramps AIT-503 from 34.2 mg/L to 68.5 mg/L (well past H=45, HH=50) over 90s
        const progress = Math.min(1.0, elapsedMs / 90000)
        const codVal = 34.2 + progress * 35.0
        tagOverrides['AIT-503'] = { value: codVal, quality: 'GOOD' }
        break
      }

      case SCENARIO_TYPES.DO_DRIFT: {
        // AIT-201 optical DO sensor degrades to UNCERTAIN, drifts downwards from 2.45 to 1.10 (LL=1.2)
        const progress = Math.min(1.0, elapsedMs / 45000)
        const doVal = Math.max(0.95, 2.45 - progress * 1.45)
        tagOverrides['AIT-201'] = { value: doVal, quality: progress > 0.15 ? 'UNCERTAIN' : 'GOOD' }
        break
      }

      case SCENARIO_TYPES.BLOWER_TRIP: {
        // BLW-201 trips to Fault/Stopped, DO drops to 1.15 mg/L, vibration spikes
        assetOverrides['BLW-201'] = {
          status: 'Fault',
          mode: 'Manual',
          speedPct: 0,
          currentAmps: 0.0,
          vibration: 5.8,
        }
        tagOverrides['AIT-201'] = { value: 1.12, quality: 'GOOD' }
        break
      }

      case SCENARIO_TYPES.PUMP_FAULT: {
        // Raw Sewage Pump P-102 trips, duty P-101 picks up full load
        assetOverrides['P-102'] = {
          status: 'Fault',
          mode: 'Manual',
          speedPct: 0,
          currentAmps: 0.0,
          vibration: 6.2,
        }
        assetOverrides['P-101'] = {
          status: 'Running',
          mode: 'Auto',
          speedPct: 98,
          currentAmps: 76.5,
          vibration: 2.1,
        }
        // Equalization level rises slightly
        tagOverrides['LIT-101'] = { value: 86.4, quality: 'GOOD' }
        break
      }

      default:
        break
    }

    return { tagOverrides, assetOverrides }
  },

  startScenario(id, customDurationMs = null) {
    if (scenarioTimer) clearTimeout(scenarioTimer)

    const now = Date.now()
    let duration = customDurationMs || 90000
    let caption = ''

    if (id === SCENARIO_TYPES.COD_SPIKE) {
      caption = 'Injecting COD Spike on AIT-503 (ramping past CPCB limit of 50 mg/L)...'
    } else if (id === SCENARIO_TYPES.DO_DRIFT) {
      caption = 'Simulating DO Optical Sensor drift and calibration degradation...'
      duration = 60000
    } else if (id === SCENARIO_TYPES.BLOWER_TRIP) {
      caption = 'Tripping duty blower BLW-201 into Fault state; aeration flow halted...'
      duration = 60000
    } else if (id === SCENARIO_TYPES.PUMP_FAULT) {
      caption = 'Simulating lift pump P-102 trip; auto-failover to P-101...'
      duration = 60000
    } else if (id === SCENARIO_TYPES.TAMPER_RECORD) {
      this.tamperRecord()
      return
    }

    activeScenario = {
      id,
      startTime: now,
      durationMs: duration,
      caption,
    }

    notify()

    scenarioTimer = setTimeout(() => {
      this.stopScenario()
    }, duration)
  },

  stopScenario() {
    if (scenarioTimer) {
      clearTimeout(scenarioTimer)
      scenarioTimer = null
    }
    activeScenario = null
    notify()
  },

  /**
   * Tamper a Record: Mutates 1 byte of the most recent audit event in storage without recalculating hash
   */
  tamperRecord() {
    try {
      const STORAGE_KEY = 'aquatrust-audit-events-v1'
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return { success: false, message: 'No audit records to tamper' }

      const events = JSON.parse(raw)
      if (!events || events.length === 0) return { success: false, message: 'Empty audit log' }

      // Target the first record and mutate reason
      const target = events[0]
      const originalReason = target.reason
      target.reason = `${originalReason} [UNAUTHORIZED MUTATION @ 0x8F]`
      target._tamperedInDev = true

      localStorage.setItem(STORAGE_KEY, JSON.stringify(events))

      activeScenario = {
        id: SCENARIO_TYPES.TAMPER_RECORD,
        startTime: Date.now(),
        durationMs: 45000,
        caption: `Tampered payload of audit record ${target.id} in storage. Verifier will catch hash mismatch!`,
        tamperedId: target.id,
      }
      notify()

      console.warn(`[AquaTrust AI SCADA DevTools] Tampered Record: ${target.id}. SHA-256 hash will fail on verification.`)

      return { success: true, recordId: target.id }
    } catch (err) {
      console.error('Tamper scenario failed:', err)
      return { success: false, error: err.message }
    }
  },

  /**
   * Scripted 5-Minute Walkthrough:
   * Plays COD Spike -> Blower Trip -> DO Sensor Drift -> Tamper Record in sequence with captions
   */
  runWalkthrough(onCaptionChange = null) {
    const steps = [
      {
        id: SCENARIO_TYPES.COD_SPIKE,
        duration: 35000,
        caption: 'Step 1/4: Injecting Industrial COD Spike — AIT-503 ramps past 50 mg/L limit...',
      },
      {
        id: SCENARIO_TYPES.BLOWER_TRIP,
        duration: 35000,
        caption: 'Step 2/4: Air Blower BLW-201 Electrical Trip — Aeration halted, Critical Alarm fires...',
      },
      {
        id: SCENARIO_TYPES.DO_DRIFT,
        duration: 35000,
        caption: 'Step 3/4: DO Sensor AIT-201 Bio-fouling Drift — Quality degraded to UNCERTAIN...',
      },
      {
        id: SCENARIO_TYPES.TAMPER_RECORD,
        duration: 30000,
        caption: 'Step 4/4: Security Stress Test — Tampering audit event payload to test Verifier...',
      },
    ]

    let currentStep = 0

    const executeNext = () => {
      if (currentStep >= steps.length) {
        activeScenario = {
          id: 'WALKTHROUGH_COMPLETE',
          startTime: Date.now(),
          durationMs: 15000,
          caption: '5-Minute Scripted SCADA Walkthrough Completed Successfully!',
        }
        notify()
        setTimeout(() => this.stopScenario(), 15000)
        return
      }

      const step = steps[currentStep]
      this.startScenario(step.id, step.duration)
      if (activeScenario) {
        activeScenario.caption = step.caption
        notify()
      }

      currentStep += 1
      walkthroughTimer = setTimeout(executeNext, step.duration + 4000)
    }

    executeNext()
  },
}
