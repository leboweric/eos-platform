import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { useEffect } from 'react';

// Components
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Dashboard from './pages/Dashboard';
import BusinessBlueprintPage from './pages/BusinessBlueprintPage';
import QuarterlyPrioritiesPage from './pages/QuarterlyPrioritiesPage';
import ScorecardPage from './pages/ScorecardPage';
import MeetingsPage from './pages/MeetingsPage';
import TodosPage from './pages/TodosPage';
import IssuesPage from './pages/IssuesPage';
import LandingPage from './pages/LandingPage';
import DepartmentsPage from './pages/DepartmentsPage';
import AccountabilityChart from './pages/AccountabilityChart';
import BillingPage from './pages/BillingPage';
import UsersPage from './pages/UsersPage';
import AcceptInvitationPage from './pages/AcceptInvitationPage';
import ConsultantDashboard from './pages/ConsultantDashboard';
import ConsultantRegisterPage from './pages/ConsultantRegisterPage';
import OrganizationSettings from './pages/OrganizationSettings';
import OrganizationalChartPage from './pages/OrganizationalChartPage';

import './App.css';

function App() {
  const { user, isLoading, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-background">
        <Routes>
          {/* Public routes */}
          <Route path="/" element={!user ? <LandingPage /> : <Navigate to="/dashboard" />} />
          <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/dashboard" />} />
          <Route path="/register" element={!user ? <RegisterPage /> : <Navigate to="/dashboard" />} />
          <Route path="/consultant-register" element={!user ? <ConsultantRegisterPage /> : <Navigate to="/dashboard" />} />
          <Route path="/accept-invitation" element={<AcceptInvitationPage />} />
          
          {/* Protected routes */}
          <Route path="/dashboard" element={user ? <Layout><Dashboard /></Layout> : <Navigate to="/login" />} />
          <Route path="/business-blueprint" element={user ? <Layout><BusinessBlueprintPage /></Layout> : <Navigate to="/login" />} />
          <Route path="/quarterly-priorities" element={user ? <Layout><QuarterlyPrioritiesPage /></Layout> : <Navigate to="/login" />} />
          <Route path="/scorecard" element={user ? <Layout><ScorecardPage /></Layout> : <Navigate to="/login" />} />
          <Route path="/meetings" element={user ? <Layout><MeetingsPage /></Layout> : <Navigate to="/login" />} />
          <Route path="/todos" element={user ? <Layout><TodosPage /></Layout> : <Navigate to="/login" />} />
          <Route path="/issues" element={user ? <Layout><IssuesPage /></Layout> : <Navigate to="/login" />} />
          <Route path="/departments" element={user ? <Layout><DepartmentsPage /></Layout> : <Navigate to="/login" />} />
          <Route path="/accountability" element={user ? <Layout><AccountabilityChart /></Layout> : <Navigate to="/login" />} />
          <Route path="/billing" element={user ? <Layout><BillingPage /></Layout> : <Navigate to="/login" />} />
          <Route path="/users" element={user ? <Layout><UsersPage /></Layout> : <Navigate to="/login" />} />
          <Route path="/consultant" element={user ? <Layout><ConsultantDashboard /></Layout> : <Navigate to="/login" />} />
          <Route path="/organization-settings" element={user ? <Layout><OrganizationSettings /></Layout> : <Navigate to="/login" />} />
          <Route path="/organizational-chart" element={user ? <Layout><OrganizationalChartPage /></Layout> : <Navigate to="/login" />} />
          
          {/* Legacy route redirects */}
          <Route path="/vto" element={<Navigate to="/business-blueprint" />} />
          <Route path="/rocks" element={<Navigate to="/quarterly-priorities" />} />
          
          {/* Catch all route */}
          <Route path="*" element={<Navigate to={user ? "/dashboard" : "/"} />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

