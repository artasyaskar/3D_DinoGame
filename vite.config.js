import { defineConfig } from 'vite';

export default defineConfig({
  base: '/',
  server: {
    port: 5173,
    open: true,
    strictPort: true,
  },
  preview: {
    port: 5173,
    strictPort: true,
  },
});
