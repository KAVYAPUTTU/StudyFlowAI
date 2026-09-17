import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { api } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';
import MaterialsTab from '../components/MaterialsTab.jsx';
import TutorTab from '../components/TutorTab.jsx';

const TABS = ['Overview', 'Materials', 'Tutor', 'Quiz', 'Growth'];

export default function ProjectPage() {
    const { id } = useParams();
    const { token } = useAuth();
    const [project, setProject] = useState(null);
    const [error, setError] = useState('');
    const [tab, setTab] = useState('Overview');

    useEffect(() => {
        api(`/api/projects/${id}`, { token })
            .then((data) => setProject(data.project))
            .catch((err) => setError(err.message));
    }, [id, token]);

    if (error) return <p className="text-red-600">{error}</p>;
    if (!project) return <p className="text-slate-500">Loading…</p>;

    return (
        <div>
            <Link
                to={`/spaces/${project.space}`}
                className="text-sm text-indigo-600 hover:underline"
            >
                ← Back to space
            </Link>

            <h1 className="mt-2 text-2xl font-semibold">{project.name}</h1>
            <p className="mt-1 text-slate-600">🎯 {project.goal}</p>

            <div className="mt-6 flex gap-1 border-b border-slate-200">
                {TABS.map((name) => (
                    <button
                        key={name}
                        onClick={() => setTab(name)}
                        className={`px-4 py-2 text-sm ${tab === name
                                ? 'border-b-2 border-indigo-600 font-medium text-indigo-600'
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                    >
                        {name}
                    </button>
                ))}
            </div>

            <div className="mt-6 rounded-xl bg-white p-6 shadow-sm">
                {tab === 'Overview' ? (
                    <div className="space-y-2 text-sm text-slate-600">
                        <p>{project.description || 'No description yet.'}</p>
                        <p className="text-slate-400">
                            Materials upload, the AI Tutor and the Quiz are the next build steps — the tabs are
                            already in place for them.
                        </p>
                    </div>
                ) : tab === 'Materials' ? (
                    <MaterialsTab projectId={project._id} />
                ) : tab === 'Tutor' ? (
                    <TutorTab projectId={project._id} />
                ) : (
                    <p className="text-sm text-slate-400">
                        {tab} — coming in the next step.
                    </p>
                )}
            </div>
        </div>
    );
}


