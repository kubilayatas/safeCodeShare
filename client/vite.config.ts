import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/collab': {
        target: 'ws://localhost:3000',
        ws: true
      }
    }
  },
  build: {
    outDir: '../server/public',
    emptyOutDir: true,
    sourcemap: false
  },
  optimizeDeps: {
    exclude: ['@kodsinif/shared']
  }
});