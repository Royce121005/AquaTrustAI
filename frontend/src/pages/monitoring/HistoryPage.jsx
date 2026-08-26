import PageHeader from '../../components/ui/PageHeader.jsx'
import MonitoringTabs from '../../features/monitoring/MonitoringTabs.jsx'
import HistoricalDataPanel from '../../features/monitoring/HistoricalDataPanel.jsx'

export default function HistoryPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Historical Data"
        subtitle="Explore historical STP readings from the Bangalore dataset"
      />
      <MonitoringTabs />
      <HistoricalDataPanel />
    </div>
  )
}
