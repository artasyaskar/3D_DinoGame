import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// For GitHub Pages deployment, set the correct base path
const repoName = '3D_DinoGame';

export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? `/${repoName}/` : '/',
  plugins: [vue()],
  build: {
    outDir: 'dist'
  }
});
