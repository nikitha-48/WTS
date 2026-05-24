// src/context/TasksContext.jsx
//
// Backend-backed task store. Same surface the dashboards consume:
//   { tasks, addTask, updateTaskStatus, refreshTasks }

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { api, absoluteUrl } from '../api';
import { useAuth } from './AuthContext';

const TasksContext = createContext(null);

// Map a Django Task → frontend-friendly shape.
const normalizeTask = (raw) => {
  if (!raw) return null;

  const assignedTo = raw.assigned_to_user || {};
  const assignedToName =
    raw.assignedToName ||
    assignedTo.name ||
    `${assignedTo.first_name || ''} ${assignedTo.last_name || ''}`.trim() ||
    assignedTo.username ||
    raw.assigned_to_email ||
    raw.assignedToEmail ||
    '';

  let adminFile = raw.admin_file ?? raw.adminFile ?? null;
  if (typeof adminFile === 'string') adminFile = absoluteUrl(adminFile);

  return {
    id: raw.id,
    title: raw.title,
    description: raw.description || '',
    assignedToEmail: raw.assignedToEmail ?? raw.assigned_to_email ?? '',
    assignedToName,
    status: raw.status || 'pending',
    adminFile,
    dueDate: raw.dueDate ?? raw.due_date ?? null,
    createdAt: raw.createdAt ?? raw.created_at,
  };
};

export const TasksProvider = ({ children }) => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);

  const refreshTasks = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get('/tasks/');
      const list = (res.data?.results || res.data || []).map(normalizeTask);
      setTasks(list);
    } catch (err) {
      console.error('Failed to load tasks:', err?.message || err);
    }
  }, [user]);

  useEffect(() => {
    if (user) refreshTasks();
    else setTasks([]);
  }, [user, refreshTasks]);

  // ── Create task (admin only — backend enforces auth) ───────────────────
  const addTask = useCallback(
    async ({ title, description, assignedToEmail, adminFile }) => {
      const formData = new FormData();
      formData.append('title', title);
      if (description) formData.append('description', description);
      formData.append('assigned_to_email', assignedToEmail);
      if (adminFile instanceof File) formData.append('admin_file', adminFile);

      const res = await api.post('/tasks/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const created = normalizeTask(res.data);
      setTasks((prev) => [created, ...prev]);
      return created;
    },
    []
  );

  // ── Update task status ─────────────────────────────────────────────────
  const updateTaskStatus = useCallback(async (taskId, status) => {
    const res = await api.patch(`/tasks/${taskId}/update_status/`, { status });
    const updated = normalizeTask(res.data);
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, ...updated } : t))
    );
    return updated;
  }, []);

  const value = { tasks, addTask, updateTaskStatus, refreshTasks };

  return (
    <TasksContext.Provider value={value}>{children}</TasksContext.Provider>
  );
};

export const useTasks = () => useContext(TasksContext);
