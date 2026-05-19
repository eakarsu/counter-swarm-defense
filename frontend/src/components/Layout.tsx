import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Shield, AlertTriangle, Crosshair, Zap, Radio, FileWarning, Map, Sparkles, LogOut, Search, Download, ScrollText, Database, LayoutDashboard, Fingerprint, Activity, Target, Package, Gavel, Layers } from 'lucide-react';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/threats', label: 'Threats', icon: AlertTriangle },
  { path: '/countermeasures', label: 'Countermeasures', icon: Crosshair },
  { path: '/deployments', label: 'Deployments', icon: Zap },
  { path: '/sensors', label: 'Sensors', icon: Radio },
  { path: '/incidents', label: 'Incidents', icon: FileWarning },
  { path: '/zones', label: 'Defense Zones', icon: Map },
];

const cuasItems = [
  { path: '/threat-signatures', label: 'Threat Signatures', icon: Fingerprint },
  { path: '/fusion-tracks', label: 'Fusion Tracks', icon: Activity },
  { path: '/engagements', label: 'Engagements (DITDEA)', icon: Target },
  { path: '/effector-magazines', label: 'Magazines & CPK', icon: Package },
  { path: '/roe', label: 'Rules of Engagement', icon: Gavel },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  function logout() {
    localStorage.removeItem('token'); localStorage.removeItem('user'); navigate('/login');
  }

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-700 flex items-center justify-center">
              <Shield size={22} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-white text-lg leading-none">SwarmShield</h1>
              <p className="text-xs text-red-400 mt-0.5">Defense Command</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Operations</p>
          {navItems.map(({ path, label, icon: Icon }) => (
            <Link key={path} to={path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === path ? 'bg-red-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}>
              <Icon size={18} />{label}
            </Link>
          ))}
          <div className="pt-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">C-UAS Stack</p>
            {cuasItems.map(({ path, label, icon: Icon }) => (
              <Link key={path} to={path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === path ? 'bg-violet-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}>
                <Icon size={18} />{label}
              </Link>
            ))}
          </div>
          <div className="pt-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Defense Views</p>
            <Link to="/custom-views"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === '/custom-views' ? 'bg-red-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}>
              <Layers size={18} />Defense Views
            </Link>
          </div>
          <div className="pt-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">AI Center</p>
            <Link to="/ai"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === '/ai' ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}>
              <Sparkles size={18} />AI Center
            </Link>
          </div>
          <div className="pt-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Utilities</p>
            <Link to="/search"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === '/search' ? 'bg-cyan-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}>
              <Search size={18} />Global Search
            </Link>
            <Link to="/export"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === '/export' ? 'bg-emerald-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}>
              <Download size={18} />CSV Export
            </Link>
            <Link to="/audit"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === '/audit' ? 'bg-yellow-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}>
              <ScrollText size={18} />Audit Log
            </Link>
            <Link to="/sample-data"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === '/sample-data' ? 'bg-emerald-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}>
              <Database size={18} />Sample Data
            </Link>
          </div>
        </nav>
        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center justify-between">
            <div><p className="text-sm font-medium text-white">{user.name}</p><p className="text-xs text-gray-400">{user.role}</p></div>
            <button onClick={logout} className="text-gray-400 hover:text-white"><LogOut size={18} /></button>
          </div>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
