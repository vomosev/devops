'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import * as api from './api';

const AuthContext = createContext({
  user: null,
  loading: true,
  error: null,
  refreshUser: async () => null,
  login: async () => null,
  signup: async () => null,
  logout: async () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refreshUser = useCallback(async () => {
    if (mountedRef.current) setLoading(true);
    try {
      const data = await api.getMe();
      const nextUser = data && data.user ? data.user : data || null;
      if (mountedRef.current) {
        setUser(nextUser);
        setError(null);
      }
      return nextUser;
    } catch (err) {
      // 401 simply means nobody is signed in; network failures must not break the UI.
      if (mountedRef.current) {
        setUser(null);
        if (err && err.status && err.status !== 401) {
          setError(err.message || 'Unable to reach the training API.');
        } else {
          setError(null);
        }
      }
      return null;
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = useCallback(async (credentials) => {
    setError(null);
    const data = await api.login(credentials);
    const nextUser = data && data.user ? data.user : data || null;
    if (mountedRef.current) {
      setUser(nextUser);
      setLoading(false);
    }
    return nextUser;
  }, []);

  const signup = useCallback(async (values) => {
    setError(null);
    const data = await api.signup(values);
    const nextUser = data && data.user ? data.user : data || null;
    if (mountedRef.current) {
      setUser(nextUser);
      setLoading(false);
    }
    return nextUser;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch (err) {
      // Even if the API call fails we clear local state so the UI reflects sign-out.
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.warn('Logout request failed:', err && err.message);
      }
    } finally {
      if (mountedRef.current) {
        setUser(null);
        setError(null);
        setLoading(false);
      }
    }
  }, []);

  const value = useMemo(
    () => ({ user, loading, error, refreshUser, login, signup, logout }),
    [user, loading, error, refreshUser, login, signup, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

export default AuthContext;