import { useEffect, useRef, useState } from 'react';

import { api } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';

export default function TutorTab({ projectId }) {
  const { token } = useAuth();
  const [messages, setMessages] = useState(null);
  const [question, setQuestion] = useState('');
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    api(`/api/projects/${projectId}/tutor/messages`, { token })
      .then((data) => setMessages(data.messages))
      .catch((err) => setError(err.message));
  }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages?.length, thinking]);

  async function handleAsk(event) {
    event.preventDefault();
    const text = question.trim();
    if (!text || thinking) return;

    setQuestion('');
    setError('');
    setThinking(true);
    // Show the user's message immediately; the tutor reply arrives with it.
    setMessages((current) => [...(current ?? []), { role: 'user', content: text, _id: `local-${Date.now()}` }]);

    try {
      const data = await api(`/api/projects/${projectId}/tutor`, { method: 'POST', token, body: { question: text } });
      setMessages((current) => [...(current ?? []), data.tutorMessage]);
    } catch (err) {
      setError(err.message);
    } finally {
      setThinking(false);
    }
  }

  return (
    <div className="flex h-[28rem] flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50/60 p-4">
        {messages === null ? (
          <p className="text-sm text-slate-500">Loading conversation…</p>
        ) : messages.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-500">
            Ask anything about your uploaded material — every answer cites its source page.
            <br />
            Questions outside your material get an honest "not enough evidence".
          </div>
        ) : (
          messages.map((message) => (
            <div key={message._id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                  message.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 shadow-sm'
                }`}
              >
                {message.insufficientEvidence && (
                  <p className="mb-1 text-xs font-medium text-amber-600">⚠️ Not enough evidence in your material</p>
                )}
                <p className="whitespace-pre-wrap">{message.content}</p>

                {message.citations?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {message.citations.map((citation, index) => (
                      <span
                        key={index}
                        title={citation.snippet}
                        className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700"
                      >
                        📄 {citation.materialName} — p.{citation.page}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        {thinking && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-white px-4 py-2 text-sm text-slate-400 shadow-sm">Thinking…</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <form onSubmit={handleAsk} className="mt-3 flex gap-2">
        <input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Ask about your material…"
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          disabled={thinking}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          Ask
        </button>
      </form>
    </div>
  );
}