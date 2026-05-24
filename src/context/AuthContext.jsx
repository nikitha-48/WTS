// src/context/AuthContext.jsx
//
// Real backend-backed auth. Talks to the Django API.
// Keeps the same hook surface the dashboards already consume:
//   { user, login, signup, logout, loading, isAuthenticated, isAdmin,
//     getAllEmployees, getPendingEmployees,
//     approveEmployee, deactivateEmployee, reactivateEmployee }
//
// `getAllEmployees` / `getPendingEmployees` are sync to keep the existing
// dashboards working. They return the most recently fetched list and trigger
// a background refresh from the API.

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';

import { api, apiErrorMessage, TOKEN_STORAGE_KEY } from '../api';

const AuthContext = createContext(null);

const USER_STORAGE_KEY = 'user';

// Shape the API user the same way the old localStorage code did.
const normalizeUser = (raw) => {
  if (!raw) return null;
  return {
    id: raw.id,
    email: raw.email,
    name:
      raw.name ||
      `${raw.first_name || ''} ${raw.last_name || ''}`.trim() ||
      raw.username,
    role: raw.role,
    department: raw.department || 'General',
    isApproved: raw.isApproved ?? raw.is_approved ?? false,
    isActive: raw.isActive ?? raw.is_active ?? false,
    createdAt: raw.createdAt || raw.created_at || null,
  };
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Cache of employees for sync getters used by AdminDashboard.
  const [employees, setEmployees] = useState([]);
  const employeesLoadedRef = useRef(false);

  // ── Bootstrap session from stored token ────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    const cached = localStorage.getItem(USER_STORAGE_KEY);

    if (cached) {
      try {
        setUser(normalizeUser(JSON.parse(cached)));
      } catch {
        localStorage.removeItem(USER_STORAGE_KEY);
      }
    }

    if (!token) {
      setLoading(false);
      return;
    }

    // Verify token by hitting /auth/me — if it fails we drop the session.
    api
      .get('/auth/me/')
      .then((res) => {
        const u = normalizeUser(res.data);
        setUser(u);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(u));
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        localStorage.removeItem(USER_STORAGE_KEY);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  // ── Login ──────────────────────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    try {
      const res = await api.post('/auth/login/', { email, password });
      const token = res.data?.token;
      const safe = normalizeUser(res.data?.user);
      if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
      if (safe) localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(safe));
      setUser(safe);
      return { success: true, user: safe };
    } catch (err) {
      const data = err?.response?.data;
      if (data?.status === 'pending_approval') {
        return {
          success: false,
          pendingApproval: true,
          error: data.message || 'Account pending admin approval.',
        };
      }
      return { success: false, error: apiErrorMessage(err, 'Invalid credentials') };
    }
  }, []);

  // ── Signup (employees only — backend marks them inactive/unapproved) ──
  const signup = useCallback(async ({ email, password, name, department }) => {
    if (!email || !password || !name) {
      return { success: false, error: 'All fields are required' };
    }
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail.endsWith('@sskatt.com')) {
      return { success: false, error: 'Only company emails (@sskatt.com) are allowed.' };
    }
    try {
      await api.post('/auth/register/', {
        email: normalizedEmail,
        password,
        name,
        department: department || 'General',
      });
      return { success: true, pendingApproval: true };
    } catch (err) {
      return { success: false, error: apiErrorMessage(err, 'Registration failed') };
    }
  }, []);

  // ── Logout ─────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    setUser(null);
    setEmployees([]);
    employeesLoadedRef.current = false;
  }, []);

  // ── Employee directory (sync getters + background refresh) ─────────────
  const refreshEmployees = useCallback(async () => {
    try {
      const res = await api.get('/auth/');
      const list = (res.data?.results || res.data || []).map(normalizeUser);
      setEmployees(list);
      employeesLoadedRef.current = true;
      return list;
    } catch {
      return employees;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-load employees once the user is an admin.
  useEffect(() => {
    if (user?.role === 'admin' && !employeesLoadedRef.current) {
      refreshEmployees();
    }
  }, [user, refreshEmployees]);

  const getAllEmployees = useCallback(() => {
    // Trigger a background refresh, but return the cached list immediately.
    if (user?.role === 'admin') refreshEmployees();
    return employees;
  }, [employees, refreshEmployees, user]);

  const getPendingEmployees = useCallback(() => {
    return employees.filter((e) => !e.isApproved);
  }, [employees]);

  // ── Admin actions (PATCH endpoints + cache update) ─────────────────────
  const approveEmployee = useCallback(async (userId) => {
    try {
      const res = await api.patch(`/auth/${userId}/approve_user/`);
      const updated = normalizeUser(res.data?.user);
      if (updated) {
        setEmployees((prev) =>
          prev.map((e) => (e.id === updated.id ? updated : e))
        );
      }
      return true;
    } catch {
      return false;
    }
  }, []);

  const deactivateEmployee = useCallback(async (userId) => {
    try {
      await api.patch(`/auth/${userId}/deactivate_user/`);
      setEmployees((prev) =>
        prev.map((e) =>
          e.id === userId ? { ...e, isActive: false, isApproved: false } : e
        )
      );
      return true;
    } catch {
      return false;
    }
  }, []);

  const reactivateEmployee = useCallback(async (userId) => {
    try {
      await api.patch(`/auth/${userId}/activate_user/`);
      setEmployees((prev) =>
        prev.map((e) =>
          e.id === userId ? { ...e, isActive: true, isApproved: true } : e
        )
      );
      return true;
    } catch {
      return false;
    }
  }, []);

  const value = {
    user,
    login,
    signup,
    logout,
    loading,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    // employee management
    getAllEmployees,
    getPendingEmployees,
    approveEmployee,
    deactivateEmployee,
    reactivateEmployee,
    refreshEmployees,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
