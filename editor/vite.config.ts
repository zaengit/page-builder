import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { resolve } from 'node:path';

const root = import.meta.dirname;

export default defineConfig({
  base: './',
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      '@': resolve(root, './src'),
    },
  },
  build: {
    outDir: resolve(root, './dist'),
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: {
        'page-builder': resolve(root, 'src/main.tsx'),
        index: resolve(root, 'src/index.ts'),
        'go-editor': resolve(root, 'go.html'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: asset => asset.name?.endsWith('.css') ? 'page-builder.css' : 'assets/[name]-[hash][extname]',
      },
    },
  },
  server: {
    port: 5173,
    cors: true,
    proxy: {
      '/api': 'http://127.0.0.1:8000',
      '/page-builder': 'http://127.0.0.1:8000',
      '/block-assets': 'http://127.0.0.1:8000',
    },
  },
});
