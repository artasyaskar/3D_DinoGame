import { defineConfig } from 'vite';

export default defineConfig({
  base: '/',
  server: {
    host: true,        // bind to all interfaces
    port: 5189,        // fixed new port to avoid stale 5173 tabs
    open: true,
    strictPort: true   // enforce this port so URL is deterministic
  },
  preview: {
    host: true,
    port: 5189,        // match dev port for consistency
    strictPort: true,
  },
});
