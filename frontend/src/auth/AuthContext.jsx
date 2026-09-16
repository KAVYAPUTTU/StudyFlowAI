import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { api } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(Boolean(token));

  // Restore the session on page refresh: validate the stored token.
  useEffect(() => {
    if (!token) return;
    api('/api/auth/me', { token })
      .then((data) => setUser(data.user))
      .catch(() => {
        localStorage.removeItem('token');
        setToken(null);
      })
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = useCallback(async (email, password) => {
    const data = await api('/api/auth/login', { method: 'POST', body: { email, password } });
    localStorage.setItem('token', data.token);
    setToken(data.token);
    setUser(data.user);
  }, []);

  const register = useCallback(async (name, email, password) => {
    const data = await api('/api/auth/register', { method: 'POST', body: { name, email, password } });
    localStorage.setItem('token', data.token);
    setToken(data.token);
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, token, loading, login, register, logout }),
    [user, token, loading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}