import { useEffect, useState } from 'react';

import { api } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';

const TREND_STYLES = {
    improving: 'bg-green-100 text-green-700',
    stable: 'bg-slate-100 text-slate-600',
    'needs attention': 'bg-red-100 text-red-700',
};

const EVENT_LABELS = {
    space_created: 'Space created', project_created: 'Project created', material_uploaded: 'Material uploaded',
    material_ready: 'Material processed', material_failed: 'Material failed', tutor_message: 'Tutor question',
    quiz_started: 'Quiz started', quiz_completed: 'Quiz completed', mastery_updated: 'Mastery updated',
    recommendation_created: 'Recommendation',
};

export default function GrowthTab({ projectId }) {
    const { token } = useAuth();
    const [growth, setGrowth] = useState(null);
    const [analytics, setAnalytics] = useState(null);
    const [recommendations, setRecommendations] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        Promise.all([
            api(`/api/projects/${projectId}/growth`, { token }),
            api(`/api/projects/${projectId}/analytics`, { token }),
            api(`/api/projects/${projectId}/recommendations`, { token }),
        ])
            .then(([growthData, analyticsData, recData]) => {
                // api() resolves to the parsed body directly, e.g. { recommendations: [] }.
                setGrowth(growthData);
                setAnalytics(analyticsData);
                setRecommendations(recData.recommendations ?? []);
            })
            .catch((err) => setError(err.message));
    }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps

    if (error) return <p className="text-sm text-red-600">{error}</p>;
    if (!growth || !analytics) return <p className="text-sm text-slate-500">Loading…</p>;

    return (
        <div className="space-y-6">
            {recommendations?.length > 0 && (
                <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
                    <p className="text-sm font-medium text-indigo-700">Recommended next step</p>
                    {recommendations.map((rec) => (
                        <div key={rec._id} className="mt-2 text-sm">
                            <p className="text-slate-700">{rec.message}</p>
                            <p className="mt-0.5 text-xs text-slate-500">Why: {rec.reason}</p>
                        </div>
                    ))}
                </div>
            )}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                {[
                    ['Materials', analytics.totals.materials],
                    ['Processed', analytics.totals.readyMaterials],
                    ['Knowledge chunks', analytics.totals.chunks],
                    ['Concepts', analytics.totals.concepts],
                    ['Quizzes done', analytics.totals.quizzesCompleted],
                ].map(([label, value]) => (
                    <div key={label} className="rounded-lg bg-white p-3 text-center shadow-sm">
                        <p className="text-lg font-semibold text-indigo-600">{value}</p>
                        <p className="text-xs text-slate-500">{label}</p>
                    </div>
                ))}
            </div>

            <div>
                <div className="flex items-baseline justify-between">
                    <h3 className="font-medium">Concept mastery (estimate)</h3>
                    <span className="text-sm text-slate-500">Average: {growth.averageLevel}%</span>
                </div>
                {growth.concepts.length === 0 ? (
                    <p className="mt-2 text-sm text-slate-500">No concepts yet — upload material first.</p>
                ) : (
                    <div className="mt-3 space-y-3">
                        {growth.concepts.map((concept) => (
                            <div key={concept.concept} className="rounded-lg bg-white p-3 shadow-sm">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="font-medium">{concept.concept}</span>
                                    <div className="flex items-center gap-2">
                                        <span className={`rounded-full px-2 py-0.5 text-xs ${TREND_STYLES[concept.trend.label]}`}>
                                            {concept.trend.label} ({concept.trend.delta >= 0 ? '+' : ''}{concept.trend.delta})
                                        </span>
                                        <span className="font-medium">{concept.level}%</span>
                                    </div>
                                </div>
                                <div className="mt-2 h-2 rounded-full bg-slate-100">
                                    <div
                                        className={`h-2 rounded-full ${concept.level < 50 ? 'bg-red-400' : 'bg-indigo-500'}`}
                                        style={{ width: `${concept.level}%` }}
                                    />
                                </div>
                                <p className="mt-1 text-xs text-slate-400">
                                    history: {concept.history.map((point) => point.level).join(' → ')}%
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div>
                <h3 className="font-medium">Recent activity</h3>
                <ul className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-100 bg-white">
                    {analytics.recentEvents.map((event) => (
                        <li key={event.id} className="flex justify-between px-4 py-2 text-sm">
                            <span>{EVENT_LABELS[event.type] ?? event.type}</span>
                            <span className="text-xs text-slate-400">{new Date(event.at).toLocaleString()}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
