import { useState, useEffect, useRef, useCallback } from 'react'
import { TAG_REGISTRY, QUALITY } from './registry.js'
import { scenarioController } from '../demo/scenarioController.js'
import { alarmManager } from '../alarms/alarmManager.js'

// Realistic baseline values for the Koramangala 60 MLD STP
const BASELINE_VALUES = {
  'FIT-101': 42.4, // MLD
  'LIT-101': 58.2, // %
  'DP-101': 16.5,  // L/h Alum
  'DP-102': 6.2,   // L/h Polymer
  'AIT-201': 2.45, // mg/L DO
  'AIT-202': 7.34, // pH
  'TIT-201': 26.8, // °C
  'LIT-301': 1.45, // m Sludge blanket
  'AIT-401': 1.15, // mg/L Free Chlorine
  'DP-401': 14.2,  // L/h NaOCl
  'FIT-501': 41.8, // MLD Outflow
  'AIT-501': 7.31, // Effluent pH
  'AIT-502': 7.8,  // mg/L BOD
  'AIT-503': 34.2, // mg/L COD
  'AIT-504': 11.4, // mg/L TSS
  'AIT-505': 2.8,  // NTU Turbidity
  'DP-201': 0.0,   // Acid
  'DP-202': 0.0,   // Alkali
}

const DEFAULT_ASSET_STATES = {
  'P-101': { status: 'Running', mode: 'Auto', speedPct: 82, currentAmps: 64.2, vibration: 1.8, runtimeHours: 4120, starts: 312, interlockOk: true },
  'P-102': { status: 'Stopped', mode: 'Auto', speedPct: 0, currentAmps: 0.0, vibration: 0.0, runtimeHours: 3890, starts: 298, interlockOk: true },
  'P-103': { status: 'Running', mode: 'Auto', speedPct: 65, currentAmps: 28.4, vibration: 1.2, runtimeHours: 2840, starts: 184, interlockOk: true },
  'P-104': { status: 'Running', mode: 'Auto', speedPct: 40, currentAmps: 18.2, vibration: 0.9, runtimeHours: 1450, starts: 110, interlockOk: true },
  'BLW-201': { status: 'Running', mode: 'Auto', speedPct: 78, currentAmps: 122.5, vibration: 2.1, runtimeHours: 5210, starts: 420, interlockOk: true },
  'BLW-202': { status: 'Stopped', mode: 'Auto', speedPct: 0, currentAmps: 0.0, vibration: 0.0, runtimeHours: 4980, starts: 395, interlockOk: true },
  'DP-101': { status: 'Running', mode: 'Auto', speedPct: 45, currentAmps: 2.8, vibration: 0.4, runtimeHours: 1980, starts: 145, interlockOk: true },
  'DP-102': { status: 'Running', mode: 'Auto', speedPct: 35, currentAmps: 1.9, vibration: 0.3, runtimeHours: 1850, starts: 130, interlockOk: true },
  'DP-401': { status: 'Running', mode: 'Auto', speedPct: 52, currentAmps: 3.1, vibration: 0.5, runtimeHours: 2140, starts: 160, interlockOk: true },
  'DP-201': { status: 'Stopped', mode: 'Auto', speedPct: 0, currentAmps: 0.0, vibration: 0.0, runtimeHours: 640, starts: 42, interlockOk: true },
  'DP-202': { status: 'Stopped', mode: 'Auto', speedPct: 0, currentAmps: 0.0, vibration: 0.0, runtimeHours: 590, starts: 38, interlockOk: true },
  'XV-101': { status: 'Closed', positionPct: 0, mode: 'Auto' },
  'XV-201': { status: 'Open', positionPct: 78, mode: 'Auto' },
  'XV-301': { status: 'Open', positionPct: 45, mode: 'Auto' },
  'XV-401': { status: 'Open', positionPct: 100, mode: 'Auto' },
  'XV-501': { status: 'Open', positionPct: 100, mode: 'Auto' },
}

export function useTagStream() {
  const [tagValues, setTagValues] = useState(() => {
    const initial = {}
    const now = Date.now()
    Object.entries(TAG_REGISTRY).forEach(([id, meta]) => {
      const val = BASELINE_VALUES[id] ?? 0
      initial[id] = {
        value: val,
        formatted: val.toFixed(meta.decimals ?? 1),
        quality: QUALITY.GOOD,
        timestamp: now,
        ageMs: 0,
        alarmState: 'NORMAL', // 'NORMAL' | 'WARNING' | 'CRITICAL'
      }
    })
    return initial
  })

  const [assetStates, setAssetStates] = useState(DEFAULT_ASSET_STATES)
  const [historyBuffer, setHistoryBuffer] = useState({}) // tagId -> array of { time, value }
  const stepRef = useRef(0)

  // Simulation tick (updates every 1000ms)
  useEffect(() => {
    const interval = setInterval(() => {
      stepRef.current += 1
      const step = stepRef.current
      const now = Date.now()
      const activeScen = scenarioController.getActiveScenario()
      const elapsed = activeScen ? now - activeScen.startTime : 0
      const { tagOverrides, assetOverrides } = scenarioController.getOverrides(elapsed)

      // Apply any scenario asset overrides (e.g. blower trip, pump fault)
      if (assetOverrides && Object.keys(assetOverrides).length > 0) {
        setAssetStates((prev) => ({
          ...prev,
          ...assetOverrides,
        }))
      }

      let latestValues = null

      setTagValues((prev) => {
        const next = { ...prev }

        Object.entries(TAG_REGISTRY).forEach(([id, meta]) => {
          if (meta.assetType === 'VALVE' || (meta.assetType === 'PUMP' && !meta.unit)) {
            return
          }

          const current = prev[id]
          const base = BASELINE_VALUES[id] ?? 20

          // Scale flow with pump run state: if P-101 is stopped, inlet flow drops
          let flowFactor = 1.0
          if (id === 'FIT-101' && assetStates['P-101']?.status === 'Stopped') {
            flowFactor = 0.05 // near zero
          }
          if (id === 'FIT-501' && assetStates['P-101']?.status === 'Stopped') {
            flowFactor = 0.1
          }

          // Gentle sinusoidal drift + subtle Gaussian noise
          const drift = Math.sin((step + (id.charCodeAt(0) % 10)) / 12) * (base * 0.03)
          const noise = (Math.random() - 0.5) * (base * 0.015)
          let rawVal = (base + drift + noise) * flowFactor

          // Check for scenario override on this tag
          let activeQuality = current?.quality ?? QUALITY.GOOD
          if (tagOverrides && tagOverrides[id]) {
            if (typeof tagOverrides[id].value === 'number') {
              rawVal = tagOverrides[id].value
            }
            if (tagOverrides[id].quality) {
              activeQuality = tagOverrides[id].quality
            }
          }

          // Clamp to range
          if (meta.range) {
            rawVal = Math.max(meta.range[0], Math.min(meta.range[1], rawVal))
          }

          // Determine Alarm State
          let alarmState = 'NORMAL'
          if (meta.alarmLimits) {
            const { LL, L, H, HH } = meta.alarmLimits
            if (rawVal <= LL || rawVal >= HH) {
              alarmState = 'CRITICAL'
            } else if (rawVal <= L || rawVal >= H) {
              alarmState = 'WARNING'
            }
          }

          next[id] = {
            value: rawVal,
            formatted: rawVal.toFixed(meta.decimals ?? 1),
            quality: activeQuality,
            timestamp: now,
            ageMs: 0,
            alarmState,
          }
        })

        latestValues = next
        return next
      })

      // Push telemetry tick to central ISA-18.2 alarm manager
      if (latestValues) {
        alarmManager.processTelemetry(latestValues)
      }

      // Update 1-hour trend history buffer
      setHistoryBuffer((prev) => {
        const next = { ...prev }
        const timeLabel = new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })

        Object.keys(BASELINE_VALUES).forEach((tagId) => {
          const arr = next[tagId] ? [...next[tagId]] : []
          const curVal = BASELINE_VALUES[tagId] + Math.sin(step / 10) * 0.5
          arr.push({ time: timeLabel, value: Number(curVal.toFixed(2)) })
          if (arr.length > 40) arr.shift() // keep last 40 ticks
          next[tagId] = arr
        })

        return next
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [assetStates])

  // Operator Advisory Action: Request Pump Start / Stop
  const togglePump = useCallback((pumpId) => {
    setAssetStates((prev) => {
      const current = prev[pumpId]
      if (!current) return prev
      const isRunning = current.status === 'Running'
      const newStatus = isRunning ? 'Stopped' : 'Running'
      const newSpeed = isRunning ? 0 : 80
      const newAmps = isRunning ? 0 : (pumpId === 'BLW-201' ? 120 : 62)

      return {
        ...prev,
        [pumpId]: {
          ...current,
          status: newStatus,
          speedPct: newSpeed,
          currentAmps: newAmps,
        },
      }
    })
  }, [])

  // Invalidate / Inject Bad Quality for testing
  const injectTagQuality = useCallback((tagId, quality) => {
    setTagValues((prev) => {
      const current = prev[tagId]
      if (!current) return prev
      return {
        ...prev,
        [tagId]: {
          ...current,
          quality,
        },
      }
    })
  }, [])

  return {
    tagValues,
    assetStates,
    historyBuffer,
    togglePump,
    injectTagQuality,
    isPumping: assetStates['P-101']?.status === 'Running',
    isAerating: assetStates['BLW-201']?.status === 'Running',
  }
}
