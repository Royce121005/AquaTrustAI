import PageHeader from '../../components/ui/PageHeader.jsx'
import AlarmSummary from '../../features/alarms/AlarmSummary.jsx'

export default function AlarmPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="ISA-18.2 Process Alarm Console"
        subtitle="EEMUA 191 alarm lifecycle management, rationalization benchmarks, and Part 11 audited operator shelving"
      />
      <AlarmSummary />
    </div>
  )
}
