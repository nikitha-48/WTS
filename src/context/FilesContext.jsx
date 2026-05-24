// src/context/FilesContext.jsx
//
// Backend-backed file store. Exposes the same shape the dashboards consume:
//   { files, addFile, updateFileStatus, toggleShared, refreshFiles }
//
// Files are normalised into the camelCase shape the React components expect:
//   id, originalName, userName, userEmail, userId, mimeType, size, url,
//   description, status, adminNote, createdAt

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { api, absoluteUrl } from '../api';
import { useAuth } from './AuthContext';

const FilesContext = createContext(null);

// Map a Django File object → frontend-friendly shape.
const normalizeFile = (raw) => {
  if (!raw) return null;

  // Two possible inputs:
  //   1) REST: snake_case + nested user object
  //   2) WS:   camelCase already
  const u = raw.user || {};
  const userName =
    raw.userName ||
    u.name ||
    `${u.first_name || ''} ${u.last_name || ''}`.trim() ||
    u.username ||
    '';

  return {
    id: raw.id,
    originalName: raw.originalName ?? raw.original_name,
    fileName: raw.fileName ?? raw.file_name,
    mimeType: raw.mimeType ?? raw.mime_type,
    size: raw.size,
    url: absoluteUrl(raw.url),
    description: raw.description || '',
    status: raw.status || 'pending',
    adminNote: raw.adminNote ?? raw.admin_note ?? '',
    shared: raw.shared ?? false,
    createdAt: raw.createdAt ?? raw.created_at,
    reviewedAt: raw.reviewedAt ?? raw.reviewed_at ?? null,
    userId: raw.userId ?? u.id ?? null,
    userName,
    userEmail: raw.userEmail ?? u.email ?? '',
  };
};

export const FilesProvider = ({ children }) => {
  const { user } = useAuth();
  const [files, setFiles] = useState([]);

  const refreshFiles = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get('/files/');
      const list = (res.data?.results || res.data || []).map(normalizeFile);
      setFiles(list);
    } catch (err) {
      // Leave existing list intact; the dashboards already handle empty states.
      console.error('Failed to load files:', err?.message || err);
    }
  }, [user]);

  // Refresh whenever the signed-in user changes.
  useEffect(() => {
    if (user) refreshFiles();
    else setFiles([]);
  }, [user, refreshFiles]);

  // ── Upload a new file (multipart) ───────────────────────────────────────
  const addFile = useCallback(async ({ file, description }) => {
    if (!file) return null;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('original_name', file.name);
    if (description) formData.append('description', description);

    const res = await api.post('/files/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const created = normalizeFile(res.data);
    setFiles((prev) => [created, ...prev]);
    return created;
  }, []);

  // ── Update status (admin review) ────────────────────────────────────────
  const updateFileStatus = useCallback(async (fileId, status, adminNote = '') => {
    const res = await api.patch(`/files/${fileId}/update_status/`, {
      status,
      adminNote,
    });
    const updated = normalizeFile(res.data);
    setFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, ...updated } : f))
    );
    return updated;
  }, []);

  // ── Toggle shared flag (PATCH on the resource) ─────────────────────────
  const toggleShared = useCallback(async (fileId, value) => {
    try {
      const res = await api.patch(`/files/${fileId}/`, { shared: !!value });
      const updated = normalizeFile(res.data);
      setFiles((prev) =>
        prev.map((f) => (f.id === fileId ? { ...f, ...updated } : f))
      );
    } catch (err) {
      console.error('toggleShared failed:', err?.message || err);
    }
  }, []);

  const value = { files, addFile, updateFileStatus, toggleShared, refreshFiles };

  return (
    <FilesContext.Provider value={value}>{children}</FilesContext.Provider>
  );
};

export const useFiles = () => useContext(FilesContext);
