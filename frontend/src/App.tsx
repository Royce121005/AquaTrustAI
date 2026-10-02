import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { RoleGuard } from './components/common/RoleGuard';
import { MainLayout } from './layouts/MainLayout';

import { LoginPage } from './pages/LoginPage';
import { OperatorDashboard } from './pages/OperatorDashboard';
import { AuditorWorkspace } from './pages/AuditorWorkspace';
import { RegulatorConsole } from './pages/RegulatorConsole';
import { AdminOverview } from './pages/AdminOverview';
import { PublicVerifyPage } from './pages/PublicVerifyPage';
import { MonitoringSensorsPage } from './pages/MonitoringSensorsPage';
import { AiInsightsPage } from './pages/AiInsightsPage';
import { SettingsPage } from './pages/SettingsPage';
import { AuditTrailPage } from './pages/AuditTrailPage';
import { ProcessMimic } from './components/operator/ProcessMimic';
import { AlarmAnnunciatorBar, CalibrationWizard } from './components/operator/AlarmAndCalibration';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Authentication & Verification Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/verify" element={<PublicVerifyPage />} />
          <Route path="/verify/:certificateId" element={<PublicVerifyPage />} />

          {/* Protected Role-Based Application Shell */}
          <Route element={<MainLayout />}>
            {/* Operator Specific Routes */}
            <Route
              path="/dashboard"
              element={
                <RoleGuard allowedRoles={['operator', 'admin']}>
                  <OperatorDashboard />
                </RoleGuard>
              }
            />
            <Route
              path="/process"
              element={
                <RoleGuard allowedRoles={['operator', 'admin']}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <AlarmAnnunciatorBar />
                    <ProcessMimic interactive={true} />
                  </div>
                </RoleGuard>
              }
            />
            <Route
              path="/alarms"
              element={
                <RoleGuard allowedRoles={['operator', 'admin']}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <AlarmAnnunciatorBar />
                    <CalibrationWizard />
                  </div>
                </RoleGuard>
              }
            />
            <Route
              path="/monitoring"
              element={
                <RoleGuard allowedRoles={['operator', 'admin']}>
                  <MonitoringSensorsPage />
                </RoleGuard>
              }
            />
            <Route
              path="/insights"
              element={
                <RoleGuard allowedRoles={['operator', 'admin']}>
                  <AiInsightsPage />
                </RoleGuard>
              }
            />
            <Route
              path="/compliance"
              element={
                <RoleGuard allowedRoles={['operator', 'admin', 'auditor']}>
                  <AuditorWorkspace />
                </RoleGuard>
              }
            />

            {/* Auditor Specific Routes */}
            <Route
              path="/auditor"
              element={
                <RoleGuard allowedRoles={['auditor', 'admin']}>
                  <AuditorWorkspace />
                </RoleGuard>
              }
            />
            <Route
              path="/blockchain"
              element={
                <RoleGuard allowedRoles={['auditor', 'regulator', 'regulatory_stakeholder', 'admin']}>
                  <AuditorWorkspace />
                </RoleGuard>
              }
            />
            <Route
              path="/blockchain/verify"
              element={
                <RoleGuard allowedRoles={['auditor', 'regulator', 'regulatory_stakeholder', 'admin']}>
                  <AuditorWorkspace />
                </RoleGuard>
              }
            />
            <Route
              path="/audit"
              element={
                <RoleGuard allowedRoles={['auditor', 'admin']}>
                  <AuditTrailPage />
                </RoleGuard>
              }
            />

            {/* Regulator Specific Routes */}
            <Route
              path="/regulator"
              element={
                <RoleGuard allowedRoles={['regulator', 'regulatory_stakeholder', 'admin']}>
                  <RegulatorConsole />
                </RoleGuard>
              }
            />
            <Route
              path="/compliance/reports"
              element={
                <RoleGuard allowedRoles={['regulator', 'regulatory_stakeholder', 'auditor', 'admin']}>
                  <RegulatorConsole />
                </RoleGuard>
              }
            />

            {/* Admin Specific Routes */}
            <Route
              path="/admin"
              element={
                <RoleGuard allowedRoles={['admin']}>
                  <AdminOverview />
                </RoleGuard>
              }
            />

            {/* Common Settings Route */}
            <Route
              path="/settings"
              element={
                <RoleGuard allowedRoles={['operator', 'auditor', 'regulator', 'regulatory_stakeholder', 'admin']}>
                  <SettingsPage />
                </RoleGuard>
              }
            />
          </Route>

          {/* Root Fallback Redirect */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
