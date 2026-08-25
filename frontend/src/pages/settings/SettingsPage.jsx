import PageHeader from '../../components/ui/PageHeader.jsx'
import DisplayPreferences from '../../features/settings/DisplayPreferences.jsx'
import NotificationPreferences from '../../features/settings/NotificationPreferences.jsx'
import DataPreferences from '../../features/settings/DataPreferences.jsx'
import SystemInformation from '../../features/settings/SystemInformation.jsx'

export default function SettingsPage() {
  return (
    <div className="space-y-4">
      <PageHeader title="Settings" subtitle="Local preferences and system information" />
      <p className="text-sm text-slate-500">
        These preferences are stored locally in this browser. Nothing is sent to a server.
      </p>
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <DisplayPreferences />
        <NotificationPreferences />
        <DataPreferences />
        <SystemInformation />
      </div>
    </div>
  )
}
