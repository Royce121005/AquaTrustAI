/**
 * AquaTrust AI — useAlarmState Hook
 * Bridges React components to the central ISA-18.2 alarm manager.
 */

import { useState, useEffect } from 'react'
import { alarmManager } from './alarmManager.js'

export function useAlarmState() {
  const [alarms, setAlarms] = useState(() => alarmManager.getAllAlarms())
  const [journal, setJournal] = useState(() => alarmManager.getAlarmJournal())
  const [isMuted, setIsMuted] = useState(() => alarmManager.isMuted())
  const [kpis, setKpis] = useState(() => alarmManager.getKpis())

  useEffect(() => {
    const unsubscribe = alarmManager.subscribe(() => {
      setAlarms(alarmManager.getAllAlarms())
      setJournal(alarmManager.getAlarmJournal())
      setIsMuted(alarmManager.isMuted())
      setKpis(alarmManager.getKpis())
    })
    return unsubscribe
  }, [])

  return {
    alarms,
    activeAlarms: Object.values(alarms).filter(
      (a) =>
        a.state === 'Unack-Active' ||
        a.state === 'Ack-Active' ||
        a.state === 'Unack-RTN'
    ),
    journal,
    isMuted,
    kpis,
    acknowledgeAlarm: (tagId, operator, reason) => alarmManager.acknowledge(tagId, operator, reason),
    acknowledgeAll: (priority, operator, reason) => alarmManager.acknowledgeAll(priority, operator, reason),
    shelveAlarm: (tagId, durationMin, reason, operator) =>
      alarmManager.shelve(tagId, durationMin, reason, operator),
    outOfServiceAlarm: (tagId, reason, operator) => alarmManager.outOfService(tagId, reason, operator),
    returnToService: (tagId, operator) => alarmManager.returnToService(tagId, operator),
    toggleMute: () => alarmManager.toggleMute(),
    processTelemetry: (tagValues) => alarmManager.processTelemetry(tagValues),
  }
}
