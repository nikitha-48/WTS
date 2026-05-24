import { useEffect } from 'react';
import { TOKEN_STORAGE_KEY } from '../api';

/**
 * Subscribe to a Django Channels endpoint.
 *
 * @param {string} url      Full ws:// URL.
 * @param {Function} onMessage  Called with parsed JSON payloads.
 * @param {Function} [onError]  Optional error callback.
 */
export const useWebSocket = (url, onMessage, onError) => {
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    const wsUrl = token ? `${url}?token=${encodeURIComponent(token)}` : url;

    let ws;
    try {
      ws = new WebSocket(wsUrl);
    } catch (err) {
      onError?.(err);
      return;
    }

    ws.onopen = () => {
      // Ask each consumer for an initial snapshot.
      // - files: get_files
      // - tasks: get_my_tasks
      const action = url.includes('/tasks') ? 'get_my_tasks' : 'get_files';
      try {
        ws.send(JSON.stringify({ action }));
      } catch {
        /* ignored — server may not be reachable yet */
      }
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (err) {
        console.error('Bad WS payload:', err);
      }
    };

    ws.onerror = (err) => {
      console.error('❌ WebSocket error:', err);
      onError?.(err);
    };

    return () => {
      try {
        ws.close();
      } catch {
        /* ignore */
      }
    };
  }, [url, onMessage, onError]);
};
