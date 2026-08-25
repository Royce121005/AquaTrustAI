import Card from '../../components/ui/Card.jsx'
import Toggle from '../../components/ui/Toggle.jsx'
import { useSettings } from '../../hooks/useSettings.js'

const NOTIFICATION_ROWS = [
  { key: 'alerts', label: 'Alert notifications', description: 'Notify me when new alerts arrive' },
  { key: 'criticalAlerts', label: 'Critical alerts', description: 'Always surface critical-severity alerts' },
  { key: 'complianceReminders', label: 'Compliance reminders', description: 'Remind me about upcoming reporting duties' },
  { key: 'blockchainVerification', label: 'Blockchain verification updates', description: 'Notify me about verification outcomes' },
]

export default function NotificationPreferences() {
  const { settings, updateSettings } = useSettings()

  return (
    <Card
      title="Notifications"
      subtitle="Saved locally — they take effect once backend notifications are connected"
    >
      <div className="divide-y divide-slate-100">
        {NOTIFICATION_ROWS.map((row) => (
          <Toggle
            key={row.key}
            checked={settings.notifications[row.key]}
            onChange={(value) =>
              updateSettings((previous) => ({
                ...previous,
                notifications: { ...previous.notifications, [row.key]: value },
              }))
            }
            label={row.label}
            description={row.description}
          />
        ))}
      </div>
    </Card>
  )
}
