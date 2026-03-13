import { defineConfig } from 'vite';

export default defineConfig({
  base: '/Mariel-Game/',
  server: {
    port: 8080,
    open: true,
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
});
