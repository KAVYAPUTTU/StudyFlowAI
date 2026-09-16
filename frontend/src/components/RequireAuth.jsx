import { Navigate } from 'react-router-dom';

import { useAuth } from '../auth/AuthContext.jsx';

// Wraps protected routes: renders them only for a logged-in user.
export default function RequireAuth({ children }) {
  const { token, loading } = useAuth();

  if (loading) {
    return <p className="p-8 text-slate-500">Loading…</p>;
  }
  return token ? children : <Navigate to="/login" replace />;
}