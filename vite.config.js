import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
    },
  },
  publicDir: 'assets',
  server: {
    fs: {
      allow: ['..']
    }
  },
  resolve: {
    alias: {
      '@assets': resolve(__dirname, 'assets')
    }
  }
}); 