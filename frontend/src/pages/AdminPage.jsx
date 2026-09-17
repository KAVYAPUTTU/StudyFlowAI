import { useEffect, useState } from 'react';

import { api } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';

export default function AdminPage() {
  const { token, user } = useAuth();
  const [overview, setOverview] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.role !== 'admin') return;
    api('/api/admin/overview', { token })
      .then((data) => setOverview(data))
      .catch((err) => setError(err.message));
  }, [token, user]); // eslint-disable-line react-hooks/exhaustive-deps

  async function inspectUser(userId) {
    setSelectedUser(null);
    try {
      const data = await api(`/api/admin/users/${userId}`, { token });
      setSelectedUser(data);
    } catch (err) {
      setError(err.message);
    }
  }

  if (user?.role !== 'admin') {
    return <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-700">Admin access required. Ask the developer to set your email as ADMIN_EMAIL.</p>;
  }
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!overview) return <p className="text-slate-500">Loading admin overview…</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Admin dashboard</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          ['Users', overview.totals.users],
          ['Spaces', overview.totals.spaces],
          ['Projects', overview.totals.projects],
          ['Materials', overview.totals.materials],
          ['Quizzes done', overview.totals.quizzesCompleted],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg bg-white p-3 text-center shadow-sm">
            <p className="text-xl font-semibold text-indigo-600">{value}</p>
            <p className="text-xs text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <h2 className="font-medium">AI usage by feature</h2>
          <table className="mt-2 w-full text-left text-sm">
            <thead className="text-xs text-slate-400">
              <tr><th>Feature</th><th>Calls</th><th>Failures</th><th>Avg ms</th><th>Tokens in/out</th></tr>
            </thead>
            <tbody>
              {overview.aiUsage.length === 0 ? (
                <tr><td colSpan={5} className="py-2 text-slate-400">No AI calls yet.</td></tr>
              ) : (
                overview.aiUsage.map((row) => (
                  <tr key={row.feature} className="border-t border-slate-100">
                    <td className="py-1.5">{row.feature}</td>
                    <td>{row.calls}</td>
                    <td className={row.failures > 0 ? 'text-red-600' : ''}>{row.failures}</td>
                    <td>{row.avgLatencyMs}</td>
                    <td className="text-xs text-slate-500">{row.inputTokens}/{row.outputTokens}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="rounded-xl bg-white p-4 shadow-sm">
          <h2 className="font-medium">Failed background jobs</h2>
          {overview.failedJobs.length === 0 ? (
            <p className="mt-2 text-sm text-slate-400">None — all jobs healthy. ✓</p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm">
              {overview.failedJobs.map((job) => (
                <li key={job.id} className="rounded bg-red-50 p-2 text-xs">
                  <span className="font-medium">{job.type}</span> — {job.error} ({job.attempts} attempts)
                </li>
              ))}
            </ul>
          )}

          <h2 className="mt-4 font-medium">Activity by type</h2>
          <div className="mt-1 flex flex-wrap gap-1">
            {overview.eventCounts.slice(0, 8).map((row) => (
              <span key={row._id} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                {row._id}: {row.count}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <h2 className="font-medium">Recent users</h2>
          <ul className="mt-2 divide-y divide-slate-100 text-sm">
            {overview.recentUsers.map((row) => (
              <li key={row._id} className="flex items-center justify-between py-2">
                <span>
                  {row.name} <span className="text-xs text-slate-400">{row.email}</span>
                  {row.role === 'admin' && <span className="ml-1 rounded bg-indigo-50 px-1 text-xs text-indigo-600">admin</span>}
                </span>
                <button onClick={() => inspectUser(row._id)} className="text-xs text-indigo-600 hover:underline">
                  inspect →
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl bg-white p-4 shadow-sm">
          <h2 className="font-medium">User journey</h2>
          {!selectedUser ? (
            <p className="mt-2 text-sm text-slate-400">Click "inspect" on a user to see their projects, activity and AI usage.</p>
          ) : (
            <div className="mt-2 text-sm">
              <p className="font-medium">{selectedUser.user.name} <span className="text-xs text-slate-400">{selectedUser.user.email}</span></p>
              <p className="mt-1 text-xs text-slate-500">
                {selectedUser.projects.length} projects · {selectedUser.activity.eventCount} events · {selectedUser.activity.aiCalls} AI calls
              </p>
              <ul className="mt-2 space-y-1">
                {selectedUser.projects.map((project) => (
                  <li key={project.id} className="rounded bg-slate-50 px-2 py-1 text-xs">
                    {project.name} — 🎯 {project.goal}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs font-medium text-slate-500">Recent events</p>
              <ul className="mt-1 space-y-0.5 text-xs text-slate-500">
                {selectedUser.activity.recentEvents.slice(0, 5).map((event) => (
                  <li key={event._id}>{event.type} · {new Date(event.createdAt).toLocaleString()}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
