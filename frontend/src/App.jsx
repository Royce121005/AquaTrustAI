import { Link, Navigate, Route, Routes } from 'react-router-dom'
import { ScanSearch } from 'lucide-react'
import MainLayout from './layouts/MainLayout.jsx'
import EmptyState from './components/ui/EmptyState.jsx'
import DashboardPage from './pages/dashboard/DashboardPage.jsx'
import AuditorPage from './pages/auditor/AuditorPage.jsx'
import RegulatorPage from './pages/regulator/RegulatorPage.jsx'
import ProcessPage from './pages/process/ProcessPage.jsx'
import AlarmPage from './pages/alarms/AlarmPage.jsx'
import MonitoringPage from './pages/monitoring/MonitoringPage.jsx'
import SensorsPage from './pages/monitoring/SensorsPage.jsx'
import HistoryPage from './pages/monitoring/HistoryPage.jsx'
import InsightsPage from './pages/insights/InsightsPage.jsx'
import CompliancePage from './pages/compliance/CompliancePage.jsx'
import ComplianceReportDetailPage from './pages/compliance/ComplianceReportDetailPage.jsx'
import BlockchainPage from './pages/blockchain/BlockchainPage.jsx'
import BlockchainVerifyPage from './pages/blockchain/BlockchainVerifyPage.jsx'
import BlockchainTransactionDetailPage from './pages/blockchain/BlockchainTransactionDetailPage.jsx'
import SettingsPage from './pages/settings/SettingsPage.jsx'
import PublicVerifyPage from './pages/verify/PublicVerifyPage.jsx'
import { useAuth } from './context/authContext.js'

function RootRedirect() {
  const { homeRoute } = useAuth()
  return <Navigate to={homeRoute || '/dashboard'} replace />
}

export default function App() {
  return (
    <Routes>
      {/* Public Standalone Verification Routes (No RBAC / No Layout) */}
      <Route path="/verify" element={<PublicVerifyPage />} />
      <Route path="/verify/:eventId" element={<PublicVerifyPage />} />

      {/* Authenticated SCADA Workspace with MainLayout */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/auditor" element={<AuditorPage />} />
        <Route path="/regulator" element={<RegulatorPage />} />
        <Route path="/process" element={<ProcessPage />} />
        <Route path="/alarms" element={<AlarmPage />} />

        <Route path="/monitoring">
          <Route index element={<MonitoringPage />} />
          <Route path="sensors" element={<SensorsPage />} />
          <Route path="history" element={<HistoryPage />} />
        </Route>

        <Route path="/insights" element={<InsightsPage />} />

        <Route path="/compliance">
          <Route index element={<CompliancePage />} />
          <Route path="reports/:reportId" element={<ComplianceReportDetailPage />} />
        </Route>

        <Route path="/blockchain">
          <Route index element={<BlockchainPage />} />
          <Route path="verify" element={<BlockchainVerifyPage />} />
          <Route path="transactions/:txId" element={<BlockchainTransactionDetailPage />} />
        </Route>

        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

function NotFoundPage() {
  return (
    <EmptyState
      icon={ScanSearch}
      title="Page not found"
      description="The page you are looking for does not exist."
      action={
        <Link
          to="/dashboard"
          className="inline-flex items-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
        >
          Back to dashboard
        </Link>
      }
    />
  )
}
