import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import LandingPage from './pages/LandingPage.jsx';
import RoleSelectPage from './pages/RoleSelectPage.jsx';
import SimulationPage from './pages/SimulationPage.jsx';
import ReportPage from './pages/ReportPage.jsx';
import { useSimStore } from './store/useSimStore.js';
import DashboardPage from './pages/DashboardPage.jsx';
import PortfolioPage from './pages/PortfolioPage.jsx';
import LeaderboardPage from './pages/LeaderboardPage.jsx';

function ProtectedSim() {
  const role = useSimStore(s => s.role);
  if (!role) return <Navigate to="/select" replace />;
  return <SimulationPage />;
}

function ProtectedReport() {
  const report = useSimStore(s => s.report);
  if (!report) return <Navigate to="/select" replace />;
  return <ReportPage />;
}

export default function App() {
  // Apply saved theme on mount — default dark
  useEffect(() => {
    const savedTheme = localStorage.getItem('wpod_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"            element={<LandingPage />} />
        <Route path="/select"      element={<RoleSelectPage />} />
        <Route path="/sim"         element={<ProtectedSim />} />
        <Route path="/report"      element={<ProtectedReport />} />
        <Route path="/dashboard"   element={<DashboardPage />} />
        <Route path="/portfolio"   element={<PortfolioPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="*"            element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
