import PageHeader from '../../components/ui/PageHeader.jsx'
import MonitoringTabs from '../../features/monitoring/MonitoringTabs.jsx'
import ParameterTrendPanel from '../../features/monitoring/ParameterTrendPanel.jsx'

export default function MonitoringPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Monitoring"
        subtitle="Water treatment parameter trends and sensor status"
      />
      <MonitoringTabs />
      <ParameterTrendPanel />
    </div>
  )
}
