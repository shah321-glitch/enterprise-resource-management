import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, setAccessToken } from '../lib/api.js';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const checkAuth = async () => {
    try {
      setLoading(true);
      const res = await api.get('/auth/me');
      setUser(res.data.data.user);
      setError(null);
    } catch (err) {
      setUser(null);
      setAccessToken(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();

    const handleExpired = () => {
      setUser(null);
    };

    window.addEventListener('ersms:auth_expired', handleExpired);
    return () => window.removeEventListener('ersms:auth_expired', handleExpired);
  }, []);

  const login = async (email, password) => {
    setError(null);
    try {
      const res = await api.post('/auth/login', { email, password });
      setAccessToken(res.data.data.accessToken);
      setUser(res.data.data.user);
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Login failed';
      setError(msg);
      throw new Error(msg);
    }
  };

  const register = async (userData) => {
    setError(null);
    try {
      const res = await api.post('/auth/register', userData);
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Registration failed';
      setError(msg);
      throw new Error(msg);
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      // ignore logout network errors
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  };

  const hasRole = (roles = []) => {
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN') return true;
    return roles.includes(user.role);
  };

  const isAdmin = hasRole(['ADMIN', 'SUPER_ADMIN']);
  const isProjectManager = hasRole(['PROJECT_MANAGER', 'ADMIN', 'SUPER_ADMIN']);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        register,
        logout,
        hasRole,
        isAdmin,
        isProjectManager,
        refreshProfile: checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
