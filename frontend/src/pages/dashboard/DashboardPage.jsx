import { useState } from 'react'
import PageHeader from '../../components/ui/PageHeader.jsx'
import DashboardKpiGrid from '../../features/dashboard/DashboardKpiGrid.jsx'
import AllStpGrid from '../../features/dashboard/AllStpGrid.jsx'
import StpSnapshotCard from '../../features/dashboard/StpSnapshotCard.jsx'
import TreatmentStatusCard from '../../features/dashboard/TreatmentStatusCard.jsx'
import RecentAlerts from '../../features/dashboard/RecentAlerts.jsx'

export default function DashboardPage() {
  const [selectedStpId, setSelectedStpId] = useState('hebbal-stp')

  return (
    <div className="space-y-6">
      <PageHeader
        title="Supervisory Dashboard"
        subtitle="Regional wastewater treatment network intelligence, multi-facility CPCB compliance & SCADA telemetry"
      />
      <DashboardKpiGrid />
      <AllStpGrid onSelectStp={setSelectedStpId} selectedStpId={selectedStpId} />
      <StpSnapshotCard selectedStpId={selectedStpId} onSelectStp={setSelectedStpId} />
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <TreatmentStatusCard />
        <RecentAlerts />
      </div>
    </div>
  )
}
