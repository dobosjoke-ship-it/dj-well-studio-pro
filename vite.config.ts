import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  base: '/dj-well-studio-pro/',

  server: {
    port: 5173,
    host: '0.0.0.0'
  }
});