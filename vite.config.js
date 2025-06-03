import { defineConfig } from 'vite';
import { resolve } from 'path';
import { readFileSync } from 'fs';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false, // Disable sourcemaps for production
    emptyOutDir: true,
    chunkSizeWarningLimit: 1000, // Increase chunk size limit
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html')
      },
      output: {
        manualChunks: {
          three: ['three'],
          howler: ['howler']
        },
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1].toLowerCase();
          if (['glb', 'gltf'].includes(ext)) {
            return 'assets/models/[name][extname]';
          }
          if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) {
            return 'assets/textures/[name][extname]';
          }
          if (['ogg', 'mp3', 'wav'].includes(ext)) {
            return 'assets/sounds/[name][extname]';
          }
          return 'assets/[name][extname]';
        }
      }
    }
  },
  server: {
    port: 5173,
    host: true,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp'
    }
  },
  preview: {
    port: 4173,
    host: true,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Content-Type': 'application/octet-stream',
      'Access-Control-Allow-Origin': '*'
    }
  },
  publicDir: 'public',
  plugins: [
    {
      name: 'glb-loader',
      transform(code, id) {
        if (id.endsWith('.glb')) {
          return `export default '${id}'`;
        }
      }
    }
  ]
});