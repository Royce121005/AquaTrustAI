import PageHeader from '../../components/ui/PageHeader.jsx'
import ComplianceSummary from '../../features/compliance/ComplianceSummary.jsx'
import ReportsTable from '../../features/compliance/ReportsTable.jsx'
import WaterQualityReference from '../../features/compliance/WaterQualityReference.jsx'

export default function CompliancePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Compliance"
        subtitle="Compliance status, findings, generated reports, and reference water-quality data"
      />
      <ComplianceSummary />
      <ReportsTable />
      <WaterQualityReference />
    </div>
  )
}
