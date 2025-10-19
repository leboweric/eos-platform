import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { useEffect, useState, Suspense } from 'react';
import { lazy } from './utils/lazyWithRetry';
import { TeamProvider } from './contexts/TeamContext';
import { DepartmentProvider } from './contexts/DepartmentContext';
import { SelectedTodosProvider } from './contexts/SelectedTodosContext';
import { TerminologyProvider } from './contexts/TerminologyContext';
import { DarkModeProvider } from './contexts/DarkModeContext';
import ForcedLegalAgreementModal from './components/legal/ForcedLegalAgreementModal';
import { useApolloTracking } from './hooks/useApolloTracking';
import ErrorBoundary from './components/ErrorBoundary';

// Critical components (loaded immediately)
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import LandingPage from './pages/LandingPage';

// Lazy-loaded page components for better performance
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const Dashboard = lazy(() => import('./pages/DashboardClean'));
const DashboardOriginal = lazy(() => import('./pages/DashboardOriginal'));
const DashboardRedesigned = lazy(() => import('./pages/DashboardRedesigned'));
const BusinessBlueprintPage = lazy(() => import('./pages/BusinessBlueprintPage'));
const QuarterlyPrioritiesPage = lazy(() => import('./pages/QuarterlyPrioritiesPageClean'));
const QuarterlyPrioritiesPageOriginal = lazy(() => import('./pages/QuarterlyPrioritiesPageOriginal'));
const QuarterlyPrioritiesPageRedesigned = lazy(() => import('./pages/QuarterlyPrioritiesPageRedesigned'));
const ComparisonPage = lazy(() => import('./pages/ComparisonPage'));
const DashboardComparison = lazy(() => import('./pages/DashboardComparison'));
const ScorecardComparison = lazy(() => import('./pages/ScorecardComparison'));
const ScorecardPage = lazy(() => import('./pages/ScorecardPageClean'));
const ScorecardPageOriginal = lazy(() => import('./pages/ScorecardPageOriginal'));
const ScorecardPageRedesigned = lazy(() => import('./pages/ScorecardPageRedesigned'));
const MeetingsPage = lazy(() => import('./pages/MeetingsPage'));
const TodosPage = lazy(() => import('./pages/TodosPage'));
const IssuesPage = lazy(() => import('./pages/IssuesPageClean'));
const IssuesPageOriginal = lazy(() => import('./pages/IssuesPageOriginal'));
const LandingPageOld = lazy(() => import('./pages/LandingPageOld'));
const ProcessDocumentationPage = lazy(() => import('./pages/ProcessDocumentationPage'));
const DepartmentsPage = lazy(() => import('./pages/DepartmentsPage'));
const AccountabilityChart = lazy(() => import('./pages/AccountabilityChart'));
const BillingPage = lazy(() => import('./pages/BillingPageV2'));
const UsersPage = lazy(() => import('./pages/UsersPage'));
const AcceptInvitationPage = lazy(() => import('./pages/AcceptInvitationPage'));
const ConsultantDashboard = lazy(() => import('./pages/ConsultantDashboard'));
const ConsultantRegisterPage = lazy(() => import('./pages/ConsultantRegisterPage'));
const OrganizationSettings = lazy(() => import('./pages/OrganizationSettings'));
const UserSettings = lazy(() => import('./pages/UserSettings'));
const OrganizationalChartPage = lazy(() => import('./pages/OrganizationalChartPage'));
const WeeklyAccountabilityMeetingPage = lazy(() => import('./pages/WeeklyAccountabilityMeetingPage'));
const WeeklyAccountabilityMeetingPageOriginal = lazy(() => import('./pages/WeeklyAccountabilityMeetingPageOriginal'));
const QuarterlyPlanningMeetingPage = lazy(() => import('./pages/QuarterlyPlanningMeetingPage'));
const DocumentRepositoryPage = lazy(() => import('./pages/DocumentRepositoryPage'));
const HeadlinesPage = lazy(() => import('./pages/HeadlinesPage'));
const NotFound = lazy(() => import('./pages/NotFound'));
const SmartRockAssistant = lazy(() => import('./pages/SmartRockAssistant'));
const ScorecardDebug = lazy(() => import('./pages/ScorecardDebug'));
const OAuthCallback = lazy(() => import('./pages/OAuthCallback'));
const TerminologySettingsPage = lazy(() => import('./pages/TerminologySettingsPage'));
const StorageConfigPage = lazy(() => import('./pages/StorageConfigPage'));
const BulkUserImport = lazy(() => import('./pages/BulkUserImport'));
const AdminToolsPage = lazy(() => import('./pages/AdminToolsPage'));
const ScorecardImportPage = lazy(() => import('./pages/ScorecardImportPage'));

// Department Components
const DepartmentLayout = lazy(() => import('./components/DepartmentLayout'));
const DepartmentPrioritiesPage = lazy(() => import('./pages/department/DepartmentPrioritiesPage'));
const DepartmentScorecardPage = lazy(() => import('./pages/department/DepartmentScorecardPage'));
const DepartmentMeetingsPage = lazy(() => import('./pages/department/DepartmentMeetingsPage'));
const DepartmentTodosPage = lazy(() => import('./pages/department/DepartmentTodosPage'));
const DepartmentIssuesPage = lazy(() => import('./pages/department/DepartmentIssuesPage'));
import { initTokenRefresh } from './utils/tokenRefresh';

import './App.css';

function App() {
  const { user, isLoading, checkAuth, checkLegalAgreements } = useAuthStore();
  const [needsLegalAcceptance, setNeedsLegalAcceptance] = useState(false);
  const [checkingAgreements, setCheckingAgreements] = useState(false);

  // Add global error handler
  useEffect(() => {
    const handleError = (event) => {
      console.error('Global error caught:', event.error);
      console.error('Error message:', event.message);
      console.error('Error stack:', event.error?.stack);
      console.error('Error location:', event.filename, 'Line:', event.lineno, 'Column:', event.colno);
    };
    
    const handleUnhandledRejection = (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      console.error('Promise:', event.promise);
    };
    
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // Check if we're on a client-specific subdomain
  const getDefaultRoute = () => {
    const hostname = window.location.hostname;
    // Check for subdomains like myboyum.axplatform.app
    if (hostname.includes('.axplatform.app') && !hostname.startsWith('www.') && !hostname.startsWith('axplatform.app')) {
      return '/login'; // Client subdomains go to login
    }
    return '/'; // Main domain goes to landing page
  };

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);
  
  useEffect(() => {
    // Initialize automatic token refresh when user logs in
    if (user) {
      initTokenRefresh();
      // Check if user has accepted legal agreements
      checkUserLegalStatus();
    }
  }, [user]);

  const checkUserLegalStatus = async () => {
    if (!user) return;
    
    setCheckingAgreements(true);
    try {
      const result = await checkLegalAgreements();
      if (result.needsAcceptance) {
        setNeedsLegalAcceptance(true);
      }
    } catch (error) {
      console.error('Failed to check legal agreement status:', error);
      // Assume needs acceptance on error for safety
      setNeedsLegalAcceptance(true);
    } finally {
      setCheckingAgreements(false);
    }
  };

  const handleLegalAcceptance = () => {
    setNeedsLegalAcceptance(false);
    // Optionally refresh the page to ensure clean state
    window.location.reload();
  };

  if (isLoading || checkingAgreements) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Router>
      <ErrorBoundary>
        <DarkModeProvider>
          <TerminologyProvider>
            <TeamProvider>
              <DepartmentProvider>
                <SelectedTodosProvider>
                <div className="min-h-screen bg-background dark:bg-dark-bg transition-colors">
                {/* Forced Legal Agreement Modal for existing users */}
                {user && needsLegalAcceptance && (
                  <ForcedLegalAgreementModal 
                    isOpen={true}
                    onAccept={handleLegalAcceptance}
                  />
                )}
          <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          }>
            <Routes>
            {/* Secret standalone prospects page */}
            
            {/* Public routes */}
          <Route path="/" element={!user ? (getDefaultRoute() === '/login' ? <Navigate to="/login" /> : <LandingPage />) : <Navigate to="/dashboard" />} />
          <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/dashboard" />} />
          <Route path="/register" element={!user ? <RegisterPage /> : <Navigate to="/dashboard" />} />
          <Route path="/consultant-register" element={!user ? <ConsultantRegisterPage /> : <Navigate to="/dashboard" />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/forgot-password" element={!user ? <ForgotPasswordPage /> : <Navigate to="/dashboard" />} />
          <Route path="/reset-password" element={!user ? <ResetPasswordPage /> : <Navigate to="/dashboard" />} />
          <Route path="/accept-invitation" element={<AcceptInvitationPage />} />
          <Route path="/auth/success" element={<OAuthCallback />} />
          <Route path="/auth/callback" element={<OAuthCallback />} />
          <Route path="/login/auth/callback" element={<OAuthCallback />} />
          
          {/* Protected routes */}
          <Route path="/dashboard" element={user ? <Layout><Dashboard /></Layout> : <Navigate to="/login" />} />
          <Route path="/dashboard-redesigned" element={user ? <Layout><DashboardRedesigned /></Layout> : <Navigate to="/login" />} />
          <Route path="/dashboard-original" element={user ? <Layout><DashboardOriginal /></Layout> : <Navigate to="/login" />} />
          <Route path="/business-blueprint" element={user ? <Layout><BusinessBlueprintPage /></Layout> : <Navigate to="/login" />} />
          <Route path="/quarterly-priorities" element={user ? <Layout><QuarterlyPrioritiesPage /></Layout> : <Navigate to="/login" />} />
          <Route path="/quarterly-priorities-original" element={user ? <Layout><QuarterlyPrioritiesPageOriginal /></Layout> : <Navigate to="/login" />} />
          <Route path="/quarterly-priorities-redesigned" element={user ? <Layout><QuarterlyPrioritiesPageRedesigned /></Layout> : <Navigate to="/login" />} />
          <Route path="/comparison" element={<ComparisonPage />} />
          <Route path="/dashboard-comparison" element={<DashboardComparison />} />
          <Route path="/scorecard-comparison" element={<ScorecardComparison />} />
          <Route path="/organizations/:orgId/smart-rock-assistant" element={user ? <Layout><SmartRockAssistant /></Layout> : <Navigate to="/login" />} />
          <Route path="/scorecard" element={user ? <Layout><ScorecardPage /></Layout> : <Navigate to="/login" />} />
          <Route path="/scorecard-original" element={user ? <Layout><ScorecardPageOriginal /></Layout> : <Navigate to="/login" />} />
          <Route path="/scorecard-redesigned" element={user ? <Layout><ScorecardPageRedesigned /></Layout> : <Navigate to="/login" />} />
          <Route path="/scorecard-debug" element={user ? <Layout><ScorecardDebug /></Layout> : <Navigate to="/login" />} />
          <Route path="/meetings" element={user ? <Layout><MeetingsPage /></Layout> : <Navigate to="/login" />} />
          <Route path="/meetings/weekly-accountability/:teamId" element={user ? <Layout><WeeklyAccountabilityMeetingPage /></Layout> : <Navigate to="/login" />} />
          <Route path="/meetings/weekly-accountability-original/:teamId" element={user ? <Layout><WeeklyAccountabilityMeetingPageOriginal /></Layout> : <Navigate to="/login" />} />
          <Route path="/meetings/quarterly-planning/:teamId" element={user ? <Layout><QuarterlyPlanningMeetingPage /></Layout> : <Navigate to="/login" />} />
          <Route path="/todos" element={user ? <Layout><TodosPage /></Layout> : <Navigate to="/login" />} />
          <Route path="/headlines" element={user ? <Layout><HeadlinesPage /></Layout> : <Navigate to="/login" />} />
          <Route path="/issues" element={user ? <Layout><IssuesPage /></Layout> : <Navigate to="/login" />} />
          <Route path="/issues-original" element={user ? <Layout><IssuesPageOriginal /></Layout> : <Navigate to="/login" />} />
          <Route path="/processes" element={user ? <Layout><ProcessDocumentationPage /></Layout> : <Navigate to="/login" />} />
          <Route path="/departments" element={user ? <Layout><DepartmentsPage /></Layout> : <Navigate to="/login" />} />
          
          {/* Department-specific routes */}
          <Route path="/departments/:departmentId" element={user ? <Layout><DepartmentLayout /></Layout> : <Navigate to="/login" />}>
            <Route path="priorities" element={<DepartmentPrioritiesPage />} />
            <Route path="scorecard" element={<DepartmentScorecardPage />} />
            <Route path="meetings" element={<DepartmentMeetingsPage />} />
            <Route path="todos" element={<DepartmentTodosPage />} />
            <Route path="issues" element={<DepartmentIssuesPage />} />
          </Route>
          
          <Route path="/accountability" element={user ? <Layout><AccountabilityChart /></Layout> : <Navigate to="/login" />} />
          <Route path="/billing" element={user ? <Layout><BillingPage /></Layout> : <Navigate to="/login" />} />
          <Route path="/users" element={user ? <Layout><UsersPage /></Layout> : <Navigate to="/login" />} />
          <Route path="/admin/bulk-import" element={user && user.role === 'admin' ? <Layout><BulkUserImport /></Layout> : <Navigate to="/dashboard" />} />
          <Route path="/admin/tools" element={user && user.role === 'admin' ? <Layout><AdminToolsPage /></Layout> : <Navigate to="/dashboard" />} />
          <Route path="/admin/import-scorecard" element={user && user.role === 'admin' ? <Layout><ScorecardImportPage /></Layout> : <Navigate to="/dashboard" />} />
          <Route path="/consultant" element={user ? <Layout><ConsultantDashboard /></Layout> : <Navigate to="/login" />} />
          <Route path="/organization-settings" element={user ? <Layout><OrganizationSettings /></Layout> : <Navigate to="/login" />} />
          <Route path="/organization-settings/storage" element={user && user.role === 'admin' ? <Layout><StorageConfigPage /></Layout> : <Navigate to="/dashboard" />} />
          <Route path="/user-settings" element={user ? <Layout><UserSettings /></Layout> : <Navigate to="/login" />} />
          <Route path="/terminology-settings" element={user ? <Layout><TerminologySettingsPage /></Layout> : <Navigate to="/login" />} />
          <Route path="/organizational-chart" element={user ? <Layout><OrganizationalChartPage /></Layout> : <Navigate to="/login" />} />
          <Route path="/documents" element={user ? <Layout><DocumentRepositoryPage /></Layout> : <Navigate to="/login" />} />
          
          {/* Legacy route redirects */}
          <Route path="/vto" element={<Navigate to="/business-blueprint" />} />
          <Route path="/rocks" element={<Navigate to="/quarterly-priorities" />} />
          
          {/* Catch all route - 404 page */}
          <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          </div>
            </SelectedTodosProvider>
              </DepartmentProvider>
            </TeamProvider>
          </TerminologyProvider>
        </DarkModeProvider>
      </ErrorBoundary>
    </Router>
  );
}

export default App;

