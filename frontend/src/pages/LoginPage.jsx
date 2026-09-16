import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '../auth/AuthContext.jsx';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-xl bg-white p-6 shadow">
        <h1 className="text-xl font-semibold">Welcome back</h1>
        <p className="mb-4 mt-1 text-sm text-slate-500">Log in to continue learning.</p>

        <label className="block text-sm font-medium">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mb-3 mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
        />

        <label className="block text-sm font-medium">Password</label>
        <input
          type="password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mb-4 mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
        />

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        <button
          disabled={busy}
          className="w-full rounded-md bg-indigo-600 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {busy ? 'Logging in…' : 'Log in'}
        </button>

        <p className="mt-4 text-sm text-slate-500">
          No account?{' '}
          <Link to="/register" className="text-indigo-600 hover:underline">
            Create one
          </Link>
        </p>
      </form>
    </div>
  );
}