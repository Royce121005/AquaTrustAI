import PageHeader from '../../components/ui/PageHeader.jsx'
import ComplianceSummary from '../../features/compliance/ComplianceSummary.jsx'
import ReportsTable from '../../features/compliance/ReportsTable.jsx'

export default function CompliancePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Compliance"
        subtitle="Compliance status, findings, and generated reports"
      />
      <ComplianceSummary />
      <ReportsTable />
    </div>
  )
}
