import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ThreatsPage from './pages/ThreatsPage';
import CountermeasuresPage from './pages/CountermeasuresPage';
import DeploymentsPage from './pages/DeploymentsPage';
import SensorsPage from './pages/SensorsPage';
import IncidentsPage from './pages/IncidentsPage';
import ZonesPage from './pages/ZonesPage';
import AICenter from './components/AICenter';
import ExportPage from './pages/ExportPage';
import AuditLogPage from './pages/AuditLogPage';
import SearchPage from './pages/SearchPage';
import SampleDataPage from './pages/SampleDataPage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  return localStorage.getItem('token') ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/*" element={
          <PrivateRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/threats" element={<ThreatsPage />} />
                <Route path="/countermeasures" element={<CountermeasuresPage />} />
                <Route path="/deployments" element={<DeploymentsPage />} />
                <Route path="/sensors" element={<SensorsPage />} />
                <Route path="/incidents" element={<IncidentsPage />} />
                <Route path="/zones" element={<ZonesPage />} />
                <Route path="/ai" element={<AICenter />} />
                <Route path="/ai-extras" element={<Navigate to="/ai" replace />} />
                <Route path="/export" element={<ExportPage />} />
                <Route path="/audit" element={<AuditLogPage />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/sample-data" element={<SampleDataPage />} />
              </Routes>
            </Layout>
          </PrivateRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}
