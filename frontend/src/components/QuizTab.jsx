import { useEffect, useState } from 'react';

import { api } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';

export default function QuizTab({ projectId }) {
  const { token } = useAuth();
  const [quiz, setQuiz] = useState(undefined); // undefined = loading, null = none
  const [summary, setSummary] = useState(null);
  const [selected, setSelected] = useState(null);
  const [textAnswer, setTextAnswer] = useState('');
  const [lastResult, setLastResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api(`/api/projects/${projectId}/quiz/active`, { token })
      .then((data) => setQuiz(data.quiz))
      .catch((err) => setError(err.message));
  }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleStart() {
    setBusy(true);
    setError('');
    try {
      const data = await api(`/api/projects/${projectId}/quiz`, { method: 'POST', token });
      setQuiz(data.quiz);
      setLastResult(null);
      setSelected(null);
      setTextAnswer('');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit(question) {
    setBusy(true);
    setError('');
    try {
      const body = question.type === 'mcq' ? { questionId: question.id, selectedOption: selected } : { questionId: question.id, textAnswer };
      const data = await api(`/api/projects/${projectId}/quiz/${quiz.id}/answers`, { method: 'POST', token, body });
      setLastResult(data.question);
      setQuiz((current) => ({
        ...current,
        questions: current.questions.map((q) => (q.id === data.question.id ? { ...q, answeredAt: new Date().toISOString(), answer: data.question.answer, correctIndex: data.question.correctIndex } : q)),
      }));
      setSelected(null);
      setTextAnswer('');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleComplete() {
    setBusy(true);
    setError('');
    try {
      const data = await api(`/api/projects/${projectId}/quiz/${quiz.id}/complete`, { method: 'POST', token });
      setSummary(data);
      setQuiz(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (summary) {
    return (
      <div className="space-y-4">
        <h3 className="font-medium">Quiz complete — mastery updated</h3>
        <div className="space-y-2">
          {summary.results.map((result) => (
            <div key={result.concept} className="rounded-lg bg-white p-3 shadow-sm">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{result.concept}</span>
                <span className="text-slate-500">
                  quiz score {result.quizScore}% · mastery {result.oldLevel}% → <strong>{result.newLevel}%</strong>
                </span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-slate-100">
                <div className="h-2 rounded-full bg-indigo-500 transition-all" style={{ width: `${result.newLevel}%` }} />
              </div>
            </div>
          ))}
        </div>

        {summary.recommendation && (
          <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-4 text-sm">
            <p className="font-medium text-indigo-700">Recommended next step</p>
            <p className="mt-1 text-slate-700">{summary.recommendation.message}</p>
            <p className="mt-1 text-xs text-slate-500">Why: {summary.recommendation.reason}</p>
          </div>
        )}

        <button onClick={handleStart} disabled={busy} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
          {busy ? 'Generating…' : 'Take another quiz'}
        </button>
      </div>
    );
  }

  if (quiz === undefined) return <p className="text-sm text-slate-500">Loading…</p>;

  if (quiz === null) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-slate-600">
          An adaptive quiz built from your material. It targets your <strong>weakest concepts</strong> first,
          mixes multiple-choice and open-ended questions, and open answers are graded with feedback on what
          you understood and what you missed.
        </p>
        <button onClick={handleStart} disabled={busy} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
          {busy ? 'Generating questions… (may take ~15s)' : 'Start quiz'}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  const current = quiz.questions.find((q) => !q.answeredAt);
  const answeredCount = quiz.questions.filter((q) => q.answeredAt).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>
          Question {Math.min(answeredCount + 1, quiz.questions.length)} of {quiz.questions.length}
        </span>
        <span>Concepts: {quiz.targetConcepts.join(', ')}</span>
      </div>

      {lastResult && (
        <div className={`rounded-lg border p-4 text-sm ${lastResult.answer.score >= 50 ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
          <p className="font-medium">Score: {lastResult.answer.score}%</p>
          <p className="mt-1">{lastResult.answer.feedback}</p>
          {lastResult.answer.understood?.length > 0 && (
            <p className="mt-2 text-green-700">✓ Understood: {lastResult.answer.understood.join(', ')}</p>
          )}
          {lastResult.answer.missed?.length > 0 && (
            <p className="mt-1 text-amber-700">✗ Missed: {lastResult.answer.missed.join(', ')}</p>
          )}
          <button onClick={() => setLastResult(null)} className="mt-3 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700">
            {current ? 'Next question' : 'See results'}
          </button>
        </div>
      )}

      {!lastResult && current && (
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-400">
            {current.concept} · difficulty {current.difficulty}/5 · {current.type === 'mcq' ? 'Multiple choice' : 'Open-ended'}
          </p>
          <p className="mt-2 font-medium">{current.prompt}</p>

          {current.type === 'mcq' ? (
            <div className="mt-3 space-y-2">
              {current.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => setSelected(index)}
                  className={`block w-full rounded-md border px-3 py-2 text-left text-sm ${
                    selected === index ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {String.fromCharCode(65 + index)}. {option}
                </button>
              ))}
            </div>
          ) : (
            <textarea
              value={textAnswer}
              onChange={(event) => setTextAnswer(event.target.value)}
              rows={4}
              placeholder="Write your answer — the AI grades it against the key points."
              className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          )}

          <button
            onClick={() => handleSubmit(current)}
            disabled={busy || (current.type === 'mcq' ? selected === null : !textAnswer.trim())}
            className="mt-3 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {busy ? (current.type === 'mcq' ? 'Checking…' : 'Grading…') : 'Submit answer'}
          </button>
        </div>
      )}

      {!current && !lastResult && (
        <button onClick={handleComplete} disabled={busy} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
          {busy ? 'Updating mastery…' : 'Finish quiz & update mastery'}
        </button>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}