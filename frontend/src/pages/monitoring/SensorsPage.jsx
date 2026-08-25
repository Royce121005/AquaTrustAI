import PageHeader from '../../components/ui/PageHeader.jsx'
import MonitoringTabs from '../../features/monitoring/MonitoringTabs.jsx'
import SensorTable from '../../features/monitoring/SensorTable.jsx'

export default function SensorsPage() {
  return (
    <div className="space-y-4">
      <PageHeader title="Sensors" subtitle="Current status of connected monitoring sensors" />
      <MonitoringTabs />
      <SensorTable />
    </div>
  )
}
