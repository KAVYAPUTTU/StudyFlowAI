import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { api } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';

export default function SpacePage() {
  const { id } = useParams();
  const { token } = useAuth();
  const [space, setSpace] = useState(null);
  const [projects, setProjects] = useState([]);
  const [form, setForm] = useState({ name: '', description: '', goal: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    api(`/api/spaces/${id}`, { token })
      .then((data) => {
        setSpace(data.space);
        setProjects(data.projects);
      })
      .catch((err) => setError(err.message));
  }, [id, token]);

  function update(field) {
    return (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  }

  async function handleCreate(event) {
    event.preventDefault();
    setError('');
    try {
      const data = await api(`/api/spaces/${id}/projects`, {
        method: 'POST',
        token,
        body: form,
      });
      setProjects((current) => [data.project, ...current]);
      setForm({ name: '', description: '', goal: '' });
    } catch (err) {
      setError(err.message);
    }
  }

  if (error && !space) return <p className="text-red-600">{error}</p>;
  if (!space) return <p className="text-slate-500">Loading…</p>;

  return (
    <div>
      <Link to="/" className="text-sm text-indigo-600 hover:underline">
        ← All spaces
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">{space.name}</h1>
      <p className="mt-1 text-slate-500">{space.description}</p>

      <form onSubmit={handleCreate} className="mt-6 rounded-xl bg-white p-4 shadow-sm">
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            required
            value={form.name}
            onChange={update('name')}
            placeholder="Project name (e.g. CNNs for my exam)"
            className="rounded-md border border-slate-300 px-3 py-2"
          />
          <input
            value={form.description}
            onChange={update('description')}
            placeholder="Short description"
            className="rounded-md border border-slate-300 px-3 py-2"
          />
        </div>
        <input
          required
          value={form.goal}
          onChange={update('goal')}
          placeholder="Learning goal — what do you want to master?"
          className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2"
        />
        <button className="mt-2 rounded-md bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700">
          Create project
        </button>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </form>

      {projects.length === 0 ? (
        <p className="mt-8 text-slate-500">No projects yet — create one above to start learning.</p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {projects.map((project) => (
            <Link
              key={project._id}
              to={`/projects/${project._id}`}
              className="rounded-xl bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              <h2 className="font-medium">{project.name}</h2>
              <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                {project.description || 'No description'}
              </p>
              <p className="mt-3 line-clamp-2 text-xs text-indigo-500">🎯 {project.goal}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}