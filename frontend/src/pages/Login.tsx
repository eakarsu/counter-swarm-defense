import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, LogIn } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate('/threats');
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  }

  function demoLogin() {
    setEmail('admin@demo.com'); setPassword('demo123');
    setTimeout(() => document.getElementById('lf')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })), 100);
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-700 mb-4">
            <Shield size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">SwarmShield</h1>
          <p className="text-gray-400 mt-2">Counter-drone defense command center</p>
        </div>
        <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800">
          <form id="lf" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500" required />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2">
              <LogIn size={18} /> {loading ? 'Signing in...' : 'Sign In'}
            </button>
            <button type="button" onClick={demoLogin}
              className="w-full bg-gray-700 hover:bg-gray-600 text-gray-200 font-semibold py-3 rounded-lg">
              Demo Login
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
