// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

// ─── Demo users (always approved) ────────────────────────────────────────────
const DEMO_USERS = [
  {
    id: 'admin-1',
    email: 'admin@company.com',
    password: 'admin123',
    name: 'Admin User',
    role: 'admin',
    department: 'IT',
    isApproved: true,
    isActive: true,
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'emp-1',
    email: 'john@company.com',
    password: 'john123',
    name: 'John Doe',
    role: 'employee',
    department: 'Engineering',
    isApproved: true,
    isActive: true,
    createdAt: '2024-01-05T00:00:00.000Z',
  },
  {
    id: 'emp-2',
    email: 'sarah@company.com',
    password: 'sarah123',
    name: 'Sarah Wilson',
    role: 'employee',
    department: 'Marketing',
    isApproved: true,
    isActive: true,
    createdAt: '2024-01-10T00:00:00.000Z',
  },
  {
    id: 'emp-3',
    email: 'mike@company.com',
    password: 'mike123',
    name: 'Mike Johnson',
    role: 'employee',
    department: 'Sales',
    isApproved: true,
    isActive: true,
    createdAt: '2024-01-15T00:00:00.000Z',
  },
];

// ─── Local-storage helpers ────────────────────────────────────────────────────
const loadRegisteredUsers = () => {
  try {
    const stored = localStorage.getItem('registeredUsers');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveRegisteredUsers = (users) => {
  localStorage.setItem('registeredUsers', JSON.stringify(users));
};

// ─── Provider ─────────────────────────────────────────────────────────────────
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  // ── login ──────────────────────────────────────────────────────────────────
  const login = (email, password) => {
    // Check demo users first
    const demoUser = DEMO_USERS.find(
      (u) => u.email === email && u.password === password
    );
    if (demoUser) {
      const { password: _, ...safe } = demoUser;
      setUser(safe);
      localStorage.setItem('user', JSON.stringify(safe));
      return { success: true, user: safe };
    }

    // Check registered users in localStorage
    const registered = loadRegisteredUsers();
    const found = registered.find(
      (u) => u.email === email && u.password === password
    );

    if (found) {
      // Account exists but not yet approved
      if (!found.isApproved) {
        return {
          success: false,
          pendingApproval: true,
          error: 'Your account is pending admin approval. Please wait until an admin activates your account.',
        };
      }
      // Account was deactivated by admin
      if (!found.isActive) {
        return {
          success: false,
          error: 'Your account has been deactivated. Please contact your admin.',
        };
      }

      const { password: _, ...safe } = found;
      setUser(safe);
      localStorage.setItem('user', JSON.stringify(safe));
      return { success: true, user: safe };
    }

    return { success: false, error: 'Invalid email or password' };
  };

  // ── signup ─────────────────────────────────────────────────────────────────
  const signup = ({ email, password, name, department }) => {
    if (!email || !password || !name) {
      return { success: false, error: 'All fields are required' };
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail.endsWith('@sskatt.com')) {
      return { success: false, error: 'Only company emails (@sskatt.com) are allowed.' };
    }

    // Duplicate check against demo users
    if (DEMO_USERS.some((u) => u.email === normalizedEmail)) {
      return { success: false, error: 'Email already in use' };
    }

    // Duplicate check against registered users
    const registered = loadRegisteredUsers();
    if (registered.some((u) => u.email === normalizedEmail)) {
      return { success: false, error: 'Email already in use' };
    }

    // Create pending employee — NOT approved yet
    const newUser = {
      id: `emp-${Date.now()}`,
      email: normalizedEmail,
      password,
      name,
      role: 'employee',
      department: department || 'General',
      isApproved: false,   // must be approved by admin
      isActive: false,
      createdAt: new Date().toISOString(),
    };

    registered.push(newUser);
    saveRegisteredUsers(registered);

    // Do NOT log them in — return pending status
    return { success: true, pendingApproval: true };
  };

  // ── logout ─────────────────────────────────────────────────────────────────
  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  // ── Admin helpers ──────────────────────────────────────────────────────────

  /** Returns all registered employees (demo + localStorage), any status. */
  const getAllEmployees = useCallback(() => {
    const demoEmployees = DEMO_USERS.filter((u) => u.role === 'employee').map(
      ({ password: _, ...u }) => u
    );
    const localEmployees = loadRegisteredUsers().filter((u) => u.role === 'employee').map(
      ({ password: _, ...u }) => u
    );
    return [...demoEmployees, ...localEmployees];
  }, []);

  /** Returns only employees still awaiting approval. */
  const getPendingEmployees = useCallback(() =>
    loadRegisteredUsers().filter((u) => u.role === 'employee' && !u.isApproved)
  , []);

  /** Admin approves a pending employee — sets isApproved + isActive. */
  const approveEmployee = useCallback((userId) => {
    const registered = loadRegisteredUsers();
    const idx = registered.findIndex((u) => u.id === userId);
    if (idx === -1) return false;

    const userEmail = registered[idx].email?.trim().toLowerCase();
    if (!userEmail?.endsWith('@sskatt.com')) {
      return false;
    }

    registered[idx].isApproved = true;
    registered[idx].isActive = true;
    saveRegisteredUsers(registered);
    return true;
  }, []);

  /** Admin deactivates an active employee. */
  const deactivateEmployee = useCallback((userId) => {
    const registered = loadRegisteredUsers();
    const idx = registered.findIndex((u) => u.id === userId);
    if (idx === -1) return false;
    registered[idx].isActive = false;
    registered[idx].isApproved = false;
    saveRegisteredUsers(registered);
    return true;
  }, []);

  /** Admin re-activates a deactivated employee. */
  const reactivateEmployee = useCallback((userId) => {
    const registered = loadRegisteredUsers();
    const idx = registered.findIndex((u) => u.id === userId);
    if (idx === -1) return false;
    registered[idx].isActive = true;
    registered[idx].isApproved = true;
    saveRegisteredUsers(registered);
    return true;
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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};