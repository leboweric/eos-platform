import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { useEffect } from 'react';

// Components
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Dashboard from './pages/Dashboard';
import VTOPage from './pages/VTOPage';
import RocksPage from './pages/RocksPage';
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
import EOSIDashboard from './pages/EOSIDashboard';

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
          <Route path="/accept-invitation" element={<AcceptInvitationPage />} />
          
          {/* Protected routes */}
          <Route path="/dashboard" element={user ? <Layout><Dashboard /></Layout> : <Navigate to="/login" />} />
          <Route path="/vto" element={user ? <Layout><VTOPage /></Layout> : <Navigate to="/login" />} />
          <Route path="/rocks" element={user ? <Layout><RocksPage /></Layout> : <Navigate to="/login" />} />
          <Route path="/scorecard" element={user ? <Layout><ScorecardPage /></Layout> : <Navigate to="/login" />} />
          <Route path="/meetings" element={user ? <Layout><MeetingsPage /></Layout> : <Navigate to="/login" />} />
          <Route path="/todos" element={user ? <Layout><TodosPage /></Layout> : <Navigate to="/login" />} />
          <Route path="/issues" element={user ? <Layout><IssuesPage /></Layout> : <Navigate to="/login" />} />
          <Route path="/departments" element={user ? <Layout><DepartmentsPage /></Layout> : <Navigate to="/login" />} />
          <Route path="/accountability" element={user ? <Layout><AccountabilityChart /></Layout> : <Navigate to="/login" />} />
          <Route path="/billing" element={user ? <Layout><BillingPage /></Layout> : <Navigate to="/login" />} />
          <Route path="/users" element={user ? <Layout><UsersPage /></Layout> : <Navigate to="/login" />} />
          <Route path="/eosi" element={user ? <Layout><EOSIDashboard /></Layout> : <Navigate to="/login" />} />
          
          {/* Catch all route */}
          <Route path="*" element={<Navigate to={user ? "/dashboard" : "/"} />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

