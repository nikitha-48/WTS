import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: '/',
  build: {
    outDir: 'docs',
  },
  server: {
    port: 5173,
  },
}));