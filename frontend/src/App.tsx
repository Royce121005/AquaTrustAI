import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute, RoleGuard } from './components/common/RouteGuard';
import { AppShell } from './components/layout/AppShell';

// Pages
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { FacilitiesPage } from './pages/FacilitiesPage';
import { FacilityDetailPage } from './pages/FacilityDetailPage';
import { FacilityCreatePage } from './pages/FacilityCreatePage';
import { TelemetryPage } from './pages/TelemetryPage';
import { ReadingDetailPage } from './pages/ReadingDetailPage';
import { ValidationPage } from './pages/ValidationPage';
import { AnomaliesPage } from './pages/AnomaliesPage';
import { CompliancePage } from './pages/CompliancePage';
import { TreatmentRecordsPage } from './pages/TreatmentRecordsPage';
import { TreatmentRecordDetailPage } from './pages/TreatmentRecordDetailPage';
import { FinalizationPage } from './pages/FinalizationPage';
import { CertificatesPage } from './pages/CertificatesPage';
import { CertificateDetailPage } from './pages/CertificateDetailPage';
import { VerificationPage } from './pages/VerificationPage';
import { PublicVerificationPage } from './pages/PublicVerificationPage';
import { CorrectionsPage } from './pages/CorrectionsPage';
import { CorrectionChainPage } from './pages/CorrectionChainPage';
import { BlockchainPage } from './pages/BlockchainPage';
import { TransactionDetailPage } from './pages/TransactionDetailPage';
import { MerkleBatchPage } from './pages/MerkleBatchPage';
import { AuditPage } from './pages/AuditPage';
import { SimulatorPage } from './pages/SimulatorPage';
import { SystemStatusPage } from './pages/SystemStatusPage';
import { UserRegistrationPage } from './pages/UserRegistrationPage';
import { NotFoundState } from './components/common/States';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Unauthenticated Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/verify/:recordId" element={<PublicVerificationPage mode="record" />} />
            <Route
              path="/public/verify/certificate/:certificateId"
              element={<PublicVerificationPage mode="certificate" />}
            />

            {/* Protected Operational Shell */}
            <Route
              element={
                <ProtectedRoute>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />

              {/* Facilities */}
              <Route path="/facilities" element={<FacilitiesPage />} />
              <Route path="/facilities/:facilityId" element={<FacilityDetailPage />} />

              {/* Telemetry & Validation */}
              <Route
                path="/readings"
                element={
                  <RoleGuard allowedRoles={['operator', 'auditor', 'admin']}>
                    <TelemetryPage />
                  </RoleGuard>
                }
              />
              <Route path="/readings/:readingId" element={<ReadingDetailPage />} />
              <Route
                path="/validation"
                element={
                  <RoleGuard allowedRoles={['operator', 'admin']}>
                    <ValidationPage />
                  </RoleGuard>
                }
              />

              {/* AI Anomalies */}
              <Route
                path="/anomalies"
                element={
                  <RoleGuard allowedRoles={['operator', 'auditor', 'admin']}>
                    <AnomaliesPage />
                  </RoleGuard>
                }
              />
              <Route path="/anomalies/:readingId" element={<ReadingDetailPage />} />

              {/* Environmental Compliance */}
              <Route path="/compliance" element={<CompliancePage />} />

              {/* Treatment Records & Finalization */}
              <Route path="/treatment-records" element={<TreatmentRecordsPage />} />
              <Route path="/treatment-records/:recordId" element={<TreatmentRecordDetailPage />} />
              <Route
                path="/finalization"
                element={
                  <RoleGuard allowedRoles={['operator', 'admin']}>
                    <FinalizationPage />
                  </RoleGuard>
                }
              />

              {/* Digital Certificates */}
              <Route
                path="/certificates"
                element={
                  <RoleGuard allowedRoles={['auditor', 'regulatory_stakeholder', 'admin']}>
                    <CertificatesPage />
                  </RoleGuard>
                }
              />
              <Route path="/certificates/:certificateId" element={<CertificateDetailPage />} />

              {/* Cryptographic Verification */}
              <Route path="/verification" element={<VerificationPage />} />

              {/* Append-Only Lineage & Corrections */}
              <Route path="/corrections" element={<CorrectionsPage />} />
              <Route path="/corrections/:recordId" element={<CorrectionChainPage />} />

              {/* DLT Ledger & Merkle Batches */}
              <Route
                path="/blockchain"
                element={
                  <RoleGuard allowedRoles={['auditor', 'regulatory_stakeholder', 'admin']}>
                    <BlockchainPage />
                  </RoleGuard>
                }
              />
              <Route path="/blockchain/transactions/:txId" element={<TransactionDetailPage />} />
              <Route
                path="/blockchain/merkle"
                element={
                  <RoleGuard allowedRoles={['operator', 'admin']}>
                    <MerkleBatchPage />
                  </RoleGuard>
                }
              />

              {/* Forensic Audit Log (Auditor, Regulator, Admin) */}
              <Route
                path="/audit"
                element={
                  <RoleGuard allowedRoles={['auditor', 'regulatory_stakeholder', 'admin']}>
                    <AuditPage />
                  </RoleGuard>
                }
              />

              {/* Telemetry Simulator (Operator, Admin) */}
              <Route
                path="/simulator"
                element={
                  <RoleGuard allowedRoles={['operator', 'admin']}>
                    <SimulatorPage />
                  </RoleGuard>
                }
              />

              {/* System Infrastructure Status (Admin Only) */}
              <Route
                path="/system-status"
                element={
                  <RoleGuard allowedRoles={['admin']}>
                    <SystemStatusPage />
                  </RoleGuard>
                }
              />

              {/* Admin Management (Admin Only) */}
              <Route
                path="/admin"
                element={
                  <RoleGuard allowedRoles={['admin']}>
                    <SystemStatusPage />
                  </RoleGuard>
                }
              />
              <Route
                path="/admin/users/new"
                element={
                  <RoleGuard allowedRoles={['admin']}>
                    <UserRegistrationPage />
                  </RoleGuard>
                }
              />
              <Route
                path="/admin/facilities/new"
                element={
                  <RoleGuard allowedRoles={['admin']}>
                    <FacilityCreatePage />
                  </RoleGuard>
                }
              />

              {/* Fallback inside shell */}
              <Route
                path="*"
                element={
                  <NotFoundState
                    title="404 - View Not Found"
                    message="The requested operational route does not exist in the AquaTrust AI system."
                  />
                }
              />
            </Route>

            {/* Fallback global */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};
export default App;
