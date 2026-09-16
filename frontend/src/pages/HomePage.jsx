import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { api } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';

export default function HomePage() {
  const { token, user } = useAuth();
  const [spaces, setSpaces] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api('/api/spaces', { token })
      .then((data) => setSpaces(data.spaces))
      .catch((err) => setError(err.message));
  }, [token]);

  async function handleCreate(event) {
    event.preventDefault();
    if (!name.trim()) return;
    setError('');
    try {
      const data = await api('/api/spaces', {
        method: 'POST',
        token,
        body: { name, description },
      });
      setSpaces((current) => [data.space, ...(current ?? [])]);
      setName('');
      setDescription('');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Hi {user?.name?.split(' ')[0]} 👋</h1>
      <p className="mt-1 text-slate-500">Your learning spaces. Create one, then add a project inside it.</p>

      <form onSubmit={handleCreate} className="mt-6 flex flex-col gap-2 sm:flex-row">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="New space name (e.g. Machine Learning)"
          className="flex-1 rounded-md border border-slate-300 px-3 py-2"
        />
        <input
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="What is it about?"
          className="flex-1 rounded-md border border-slate-300 px-3 py-2"
        />
        <button className="rounded-md bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700">
          Create space
        </button>
      </form>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {spaces === null ? (
        <p className="mt-8 text-slate-500">Loading spaces…</p>
      ) : spaces.length === 0 ? (
        <p className="mt-8 text-slate-500">No spaces yet — create your first one above.</p>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {spaces.map((space) => (
            <Link
              key={space._id}
              to={`/spaces/${space._id}`}
              className="rounded-xl bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: space.color }} />
                <h2 className="font-medium">{space.name}</h2>
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                {space.description || 'No description'}
              </p>
              <p className="mt-3 text-xs text-slate-400">
                {space.projectCount} project{space.projectCount === 1 ? '' : 's'}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}