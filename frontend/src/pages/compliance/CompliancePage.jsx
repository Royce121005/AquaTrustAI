import { useState } from 'react'
import PageHeader from '../../components/ui/PageHeader.jsx'
import ComplianceSummary from '../../features/compliance/ComplianceSummary.jsx'
import ExceedanceRegister from '../../features/compliance/ExceedanceRegister.jsx'
import ReportsTable from '../../features/compliance/ReportsTable.jsx'
import WaterQualityReference from '../../features/compliance/WaterQualityReference.jsx'

export default function CompliancePage() {
  const [activeTab, setActiveTab] = useState('exceedances')

  return (
    <div className="space-y-6">
      <PageHeader
        title="Compliance & OCEMS Enforcement"
        subtitle="CPCB/EPA regulatory compliance status, real-time exceedance register, and verified environmental statements"
      />

      <ComplianceSummary />

      {/* Compliance Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('exceedances')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === 'exceedances'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          CPCB Exceedance Register
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('reports')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === 'reports'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Statutory Reports & Certificates
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('standards')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === 'standards'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Water Quality Reference Standards
        </button>
      </div>

      {activeTab === 'exceedances' && <ExceedanceRegister />}
      {activeTab === 'reports' && <ReportsTable />}
      {activeTab === 'standards' && <WaterQualityReference />}
    </div>
  )
}
