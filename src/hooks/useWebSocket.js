import { useEffect, useCallback } from 'react';

export const useWebSocket = (url, onMessage, onError) => {
  useEffect(() => {
    const token = localStorage.getItem('token');
    const wsUrl = `${url}?token=${token}`;

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('✅ WebSocket connected');
      // Request initial data
      ws.send(JSON.stringify({ action: 'get_files' }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      onMessage(data);
    };

    ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
      onError?.(error);
    };

    ws.onclose = () => console.log('⚪ WebSocket disconnected');

    return () => ws.close();
  }, [url, onMessage, onError]);
};