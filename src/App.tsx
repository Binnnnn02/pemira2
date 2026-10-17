import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/auth/LoginPage';

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { CandidatesPage } from './pages/admin/CandidatesPage';
import { InterviewersPage } from './pages/admin/InterviewersPage';
import { AssignmentsPage } from './pages/admin/AssignmentsPage';
import { SchedulesPage } from './pages/admin/SchedulesPage';
import { RubricPage } from './pages/admin/RubricPage';
import { AssessmentsAdminPage } from './pages/admin/AssessmentsAdminPage';
import { ResultsRankingPage } from './pages/admin/ResultsRankingPage';
import { AuditLogsPage } from './pages/admin/AuditLogsPage';
import { SettingsPage } from './pages/admin/SettingsPage';

// Interviewer Pages
import { InterviewerDashboard } from './pages/interviewer/InterviewerDashboard';
import { AssignedCandidatesPage } from './pages/interviewer/AssignedCandidatesPage';
import { AssessmentWorkspacePage } from './pages/interviewer/AssessmentWorkspacePage';
import { InterviewerSchedulesPage } from './pages/interviewer/InterviewerSchedulesPage';

// Route Guard Components
const ProtectedRoute: React.FC<{ children: React.ReactNode; requiredRole?: 'admin' | 'interviewer' }> = ({
  children,
  requiredRole
}) => {
  const { isAuthenticated, role, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-300 text-xs font-semibold">
        Memuat sesi pengguna...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && (role as string) !== requiredRole && (role as string) !== 'admin') {
    // If user doesn't have required role, redirect to appropriate home
    return <Navigate to={role === 'admin' ? '/admin/dashboard' : '/interviewer/dashboard'} replace />;
  }

  return <>{children}</>;
};

const RootRedirect: React.FC = () => {
  const { isAuthenticated, role, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-300 text-xs font-semibold">
        Memuat sistem PEMIRA...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={role === 'admin' ? '/admin/dashboard' : '/interviewer/dashboard'} replace />;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            {/* Public Route */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected Routes inside AppLayout */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<RootRedirect />} />

              {/* Admin Routes */}
              <Route
                path="admin/dashboard"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/candidates"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <CandidatesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/interviewers"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <InterviewersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/assignments"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AssignmentsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/schedules"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <SchedulesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/rubric"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <RubricPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/assessments"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AssessmentsAdminPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/results"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <ResultsRankingPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/audit-logs"
                element={<ProtectedRoute requiredRole="admin"><AuditLogsPage /></ProtectedRoute>}
              />
              <Route path="admin/settings" element={<ProtectedRoute requiredRole="admin"><SettingsPage /></ProtectedRoute>} />

              {/* Interviewer Routes */}
              <Route
                path="interviewer/dashboard"
                element={
                  <ProtectedRoute>
                    <InterviewerDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="interviewer/candidates"
                element={
                  <ProtectedRoute>
                    <AssignedCandidatesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="interviewer/assessments/:assignmentId"
                element={
                  <ProtectedRoute>
                    <AssessmentWorkspacePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="interviewer/schedules"
                element={
                  <ProtectedRoute>
                    <InterviewerSchedulesPage />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
};

export default App;
