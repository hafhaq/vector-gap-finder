import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  worker: {
    format: 'es',
  },
  build: {
    target: 'es2022',
    sourcemap: false,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        manual: resolve(__dirname, 'manual.html'),
      },
    },
  },
});
