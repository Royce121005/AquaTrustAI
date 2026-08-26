import { useCallback, useEffect, useMemo, useState } from 'react'
import { SettingsContext } from './settingsContext.js'

const STORAGE_KEY = 'aquatrust-settings-v1'

const DEFAULT_SETTINGS = {
  reducedMotion: false,
  chartAnimations: true,
  // Must be one of constants/stpParameters.js ids (Monitoring trends view).
  defaultMonitoringParameter: 'cod',
  autoRefresh: 'off',
  notifications: {
    alerts: true,
    criticalAlerts: true,
    complianceReminders: false,
    blockchainVerification: false,
  },
}

function loadSettings() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_SETTINGS
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_SETTINGS
  }
}

function saveSettings(next) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    return false
  }
  return true
}

export default function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(loadSettings)

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', settings.reducedMotion)
  }, [settings.reducedMotion])

  useEffect(() => {
    saveSettings(settings)
  }, [settings])

  const updateSettings = useCallback((patch) => {
    setSettings((previous) =>
      typeof patch === 'function' ? patch(previous) : { ...previous, ...patch },
    )
  }, [])

  const value = useMemo(() => ({ settings, updateSettings }), [settings, updateSettings])

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}
