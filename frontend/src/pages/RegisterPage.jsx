import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '../auth/AuthContext.jsx';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function update(field) {
    return (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await register(form.name, form.email, form.password);
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
        <h1 className="text-xl font-semibold">Create your account</h1>
        <p className="mb-4 mt-1 text-sm text-slate-500">Start your first learning space.</p>

        <label className="block text-sm font-medium">Name</label>
        <input
          required
          value={form.name}
          onChange={update('name')}
          className="mb-3 mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
        />

        <label className="block text-sm font-medium">Email</label>
        <input
          type="email"
          required
          value={form.email}
          onChange={update('email')}
          className="mb-3 mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
        />

        <label className="block text-sm font-medium">Password (min 8 characters)</label>
        <input
          type="password"
          required
          minLength={8}
          value={form.password}
          onChange={update('password')}
          className="mb-4 mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
        />

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        <button
          disabled={busy}
          className="w-full rounded-md bg-indigo-600 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {busy ? 'Creating account…' : 'Create account'}
        </button>

        <p className="mt-4 text-sm text-slate-500">
          Already registered?{' '}
          <Link to="/login" className="text-indigo-600 hover:underline">
            Log in
          </Link>
        </p>
      </form>
    </div>
  );
}