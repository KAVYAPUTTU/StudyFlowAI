import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Accept connections from outside the local machine (preview hosts).
    host: true,
    // Allow preview proxy hosts to reach the dev server (dev only).
    allowedHosts: true,
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
});