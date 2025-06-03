import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// Change this to your GitHub repo name if it’s not “3D_DinoGame”
const repoName = '3D_DinoGame';

export default defineConfig({
  // When building for production, Vite will prefix paths with `/3D_DinoGame/`
  // so GitHub Pages (which serves from https://<USER>.github.io/3D_DinoGame/) works correctly.
  base: process.env.NODE_ENV === 'production' ? `/${repoName}/` : '/',
  plugins: [vue()],
  build: {
    // Ensure assets go to dist/assets
    outDir: 'dist'
  }
});
