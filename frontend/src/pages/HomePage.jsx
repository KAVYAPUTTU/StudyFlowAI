import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { api } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';

export default function HomePage() {
  const { token, user } = useAuth();
  const [spaces, setSpaces] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [globalStats, setGlobalStats] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api('/api/spaces', { token }).then((data) => setSpaces(data.spaces)).catch((err) => setError(err.message));
    api('/api/home', { token }).then((data) => setDashboard(data)).catch(() => {});
    api('/api/analytics/global', { token }).then((data) => setGlobalStats(data)).catch(() => {});
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCreate(event) {
    event.preventDefault();
    if (!name.trim()) return;
    setError('');
    try {
      const data = await api('/api/spaces', { method: 'POST', token, body: { name, description } });
      setSpaces((current) => [data.space, ...(current ?? [])]);
      setName('');
      setDescription('');
    } catch (err) {
      setError(err.message);
    }
  }

  const maxDaily = Math.max(1, ...(globalStats?.dailyActivity?.map((d) => d.count) ?? [1]));

  return (
    <div>
      <h1 className="text-2xl font-semibold">Hi {user?.name?.split(' ')[0]} 👋</h1>
      <p className="mt-1 text-slate-500">Where you were, how you're doing, and what to do next.</p>

      {dashboard && (
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">Average mastery</p>
            <p className="text-2xl font-semibold text-indigo-600">{dashboard.averageMastery}%</p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm sm:col-span-2">
            <p className="text-xs text-slate-500">Areas needing attention</p>
            {dashboard.attentionAreas.length === 0 ? (
              <p className="mt-1 text-sm text-slate-500">Nothing critical — keep learning! 🎉</p>
            ) : (
              <div className="mt-1 flex flex-wrap gap-2">
                {dashboard.attentionAreas.map((area) => (
                  <span key={area.concept} className="rounded-full bg-red-50 px-2 py-1 text-xs text-red-600">
                    {area.concept} · {area.level}%
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {dashboard?.recommendations?.length > 0 && (
        <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50 p-4">
          <p className="text-sm font-medium text-indigo-700">Recommended next action</p>
          {dashboard.recommendations.slice(0, 2).map((rec) => (
            <p key={rec.id} className="mt-1 text-sm text-slate-700">
              • {rec.message} <span className="text-xs text-slate-500">({rec.reason})</span>
            </p>
          ))}
        </div>
      )}

      {dashboard?.recentProjects?.length > 0 && (
        <div className="mt-3 rounded-xl bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Continue learning</p>
          <div className="mt-1 flex flex-wrap gap-2">
            {dashboard.recentProjects.map((project) => (
              <Link
                key={project.id}
                to={`/projects/${project.id}`}
                className="rounded-full bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
              >
                {project.name} →
              </Link>
            ))}
          </div>
        </div>
      )}

      {globalStats && (
        <div className="mt-3 rounded-xl bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">Last 7 days activity</p>
            <p className="text-xs text-slate-400">
              {globalStats.totals.spaces} spaces · {globalStats.totals.projects} projects · {globalStats.totals.completedQuizzes} quizzes
            </p>
          </div>
          <div className="mt-2 flex h-16 items-end gap-1">
            {globalStats.dailyActivity.length === 0 ? (
              <p className="text-sm text-slate-400">No activity yet — start learning above.</p>
            ) : (
              globalStats.dailyActivity.map((day) => (
                <div key={day._id} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t bg-indigo-300"
                    style={{ height: `${(day.count / maxDaily) * 100}%` }}
                    title={`${day._id}: ${day.count} events`}
                  />
                  <span className="text-[10px] text-slate-400">{day._id.slice(5)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

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
              <p className="mt-1 line-clamp-2 text-sm text-slate-500">{space.description || 'No description'}</p>
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
