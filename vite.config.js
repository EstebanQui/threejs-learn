import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0, // Ne pas transformer les petits assets en base64
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
    },
  },
  publicDir: 'assets', // Dossier qui sera copié tel quel à la racine du répertoire de sortie
}); 