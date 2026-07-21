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
import ThreatSignaturesPage from './pages/ThreatSignaturesPage';
import FusionTracksPage from './pages/FusionTracksPage';
import EngagementsPage from './pages/EngagementsPage';
import EffectorMagazinesPage from './pages/EffectorMagazinesPage';
import RoePage from './pages/RoePage';
import CustomViewsPage from './pages/CustomViewsPage';
import HighCapacityInterceptorsPage from './pages/HighCapacityInterceptorsPage';
import NonKineticEffectorsPage from './pages/NonKineticEffectorsPage';
import AutonomyAttackVectorsPage from './pages/AutonomyAttackVectorsPage';
import CostAdvantagePage from './pages/CostAdvantagePage';
import SecurityOperationsPage from './pages/SecurityOperationsPage';

import CodexCustomVizFeature from './pages/CodexCustomVizFeature';
import CodexOperationsFeature from './pages/CodexOperationsFeature';

import TimelineView from './pages/TimelineView';

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
                <Route path="/threat-signatures" element={<ThreatSignaturesPage />} />
                <Route path="/fusion-tracks" element={<FusionTracksPage />} />
                <Route path="/engagements" element={<EngagementsPage />} />
                <Route path="/effector-magazines" element={<EffectorMagazinesPage />} />
                <Route path="/roe" element={<RoePage />} />
                <Route path="/custom-views" element={<CustomViewsPage />} />
                <Route path="/high-capacity-interceptors" element={<HighCapacityInterceptorsPage />} />
                <Route path="/non-kinetic-effectors" element={<NonKineticEffectorsPage />} />
                <Route path="/autonomy-attack-vectors" element={<AutonomyAttackVectorsPage />} />
                <Route path="/cost-advantage" element={<CostAdvantagePage />} />
                <Route path="/ai" element={<AICenter />} />
                <Route path="/ai-extras" element={<Navigate to="/ai" replace />} />
                <Route path="/export" element={<ExportPage />} />
                <Route path="/audit" element={<AuditLogPage />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/sample-data" element={<SampleDataPage />} />
                <Route path="/security-operations" element={<SecurityOperationsPage />} />
                <Route path="/insights/timeline" element={<TimelineView />} />
                <Route path="/codex/custom-viz" element={<CodexCustomVizFeature />} />
                <Route path="/codex/operations" element={<CodexOperationsFeature />} />
              </Routes>
            </Layout>
          </PrivateRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}
