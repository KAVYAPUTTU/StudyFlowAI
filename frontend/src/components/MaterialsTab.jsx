import { useEffect, useRef, useState } from 'react';

import { api } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';

const STATUS_STYLES = {
  queued: 'bg-amber-100 text-amber-700',
  processing: 'bg-blue-100 text-blue-700',
  ready: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
};

const POLL_MS = 3000;

export default function MaterialsTab({ projectId }) {
  const { token } = useAuth();
  const [materials, setMaterials] = useState(null);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  async function loadMaterials() {
    try {
      const data = await api(`/api/projects/${projectId}/materials`, { token });
      setMaterials(data.materials);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadMaterials();
  }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Poll while any material is queued/processing so the status badge
  // updates without a manual refresh. Background work finishes server-side
  // even if the user closes the tab.
  const hasPending = materials?.some((m) => ['queued', 'processing'].includes(m.status));
  useEffect(() => {
    if (!hasPending) return;
    const timer = setInterval(loadMaterials, POLL_MS);
    return () => clearInterval(timer);
  }, [hasPending, materials?.length]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleUpload(event) {
    event.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError('Choose a PDF first.');
      return;
    }

    setUploading(true);
    setError('');
    try {
      const form = new FormData();
      form.append('file', file);
      await api(`/api/projects/${projectId}/materials`, { method: 'POST', form, token });
      if (fileInputRef.current) fileInputRef.current.value = '';
      await loadMaterials();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(materialId) {
    try {
      await api(`/api/materials/${materialId}`, { method: 'DELETE', token });
      setMaterials((current) => current.filter((m) => m._id !== materialId));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleUpload} className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-indigo-50 file:px-3 file:py-1 file:text-indigo-700"
        />
        <button
          disabled={uploading}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {uploading ? 'Uploading…' : 'Upload PDF'}
        </button>
      </form>
      <p className="text-xs text-slate-400">
        PDFs are processed in the background: text is extracted, chunked and embedded so the Tutor
        can cite them. Watch the status change — you can leave this page.
      </p>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {materials === null ? (
        <p className="text-sm text-slate-500">Loading materials…</p>
      ) : materials.length === 0 ? (
        <p className="text-sm text-slate-500">No materials yet — upload your first PDF above.</p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100">
          {materials.map((material) => (
            <li key={material._id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{material.filename}</p>
                <p className="text-xs text-slate-400">
                  {material.status === 'ready' && `${material.pageCount} pages`}
                  {material.status === 'failed' && material.error}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    STATUS_STYLES[material.status] ?? 'bg-slate-100'
                  }`}
                >
                  {material.status}
                </span>
                <button
                  onClick={() => handleDelete(material._id)}
                  className="text-xs text-slate-400 hover:text-red-600"
                >
                  delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}