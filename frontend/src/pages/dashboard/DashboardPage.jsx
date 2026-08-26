import PageHeader from '../../components/ui/PageHeader.jsx'
import DashboardKpiGrid from '../../features/dashboard/DashboardKpiGrid.jsx'
import StpSnapshotCard from '../../features/dashboard/StpSnapshotCard.jsx'
import TreatmentStatusCard from '../../features/dashboard/TreatmentStatusCard.jsx'
import RecentAlerts from '../../features/dashboard/RecentAlerts.jsx'

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="Water treatment system overview and operational status"
      />
      <DashboardKpiGrid />
      <StpSnapshotCard />
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <TreatmentStatusCard />
        <RecentAlerts />
      </div>
    </div>
  )
}
