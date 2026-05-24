import axios from 'axios';

// Single source of truth for the API base URL.
// Override locally with: VITE_API_URL=http://localhost:8000/api in a .env.local
const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Single source of truth for the JWT storage key.
export const TOKEN_STORAGE_KEY = 'authToken';

export const api = axios.create({
  baseURL: API_BASE_URL,
});

// Attach Authorization header when a token is available.
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Helpful: bubble up the most useful error message for UI.
export const apiErrorMessage = (err, fallback = 'Something went wrong') => {
  const data = err?.response?.data;
  if (typeof data === 'string') return data;
  if (data?.message) return data.message;
  if (data?.detail) return data.detail;

  // DRF field errors → first one
  if (data && typeof data === 'object') {
    const firstKey = Object.keys(data)[0];
    if (firstKey) {
      const val = data[firstKey];
      if (Array.isArray(val) && val[0]) return `${firstKey}: ${val[0]}`;
      if (typeof val === 'string') return `${firstKey}: ${val}`;
    }
  }

  return err?.message || fallback;
};

// Build an absolute URL for paths returned by the API (e.g. /media/...).
const ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');
export const absoluteUrl = (path) => {
  if (!path) return path;
  if (/^https?:\/\//i.test(path)) return path;
  return `${ORIGIN}${path.startsWith('/') ? '' : '/'}${path}`;
};
