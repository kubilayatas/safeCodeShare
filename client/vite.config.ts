import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Kök klasördeki .env dosyasını oku (yalnızca VITE_ ile başlayan değişkenler istemciye geçer).
  envDir: '..',
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
    exclude: ['@safecodeshare/shared']
  }
});