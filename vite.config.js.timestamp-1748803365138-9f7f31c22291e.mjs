// vite.config.js
import { defineConfig } from "file:///C:/Users/Khuram%20Gill/Downloads/3D_DinoGame-main/node_modules/vite/dist/node/index.js";
var vite_config_default = defineConfig({
  base: "./",
  // Use relative paths for deployment
  build: {
    outDir: "dist",
    assetsDir: "assets",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ["three"],
          howler: ["howler"]
        }
      }
    }
  },
  server: {
    port: 5173,
    host: true
  },
  preview: {
    port: 4173,
    host: true
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxLaHVyYW0gR2lsbFxcXFxEb3dubG9hZHNcXFxcM0RfRGlub0dhbWUtbWFpblwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcS2h1cmFtIEdpbGxcXFxcRG93bmxvYWRzXFxcXDNEX0Rpbm9HYW1lLW1haW5cXFxcdml0ZS5jb25maWcuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL0todXJhbSUyMEdpbGwvRG93bmxvYWRzLzNEX0Rpbm9HYW1lLW1haW4vdml0ZS5jb25maWcuanNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XHJcbiAgYmFzZTogJy4vJywgLy8gVXNlIHJlbGF0aXZlIHBhdGhzIGZvciBkZXBsb3ltZW50XHJcbiAgYnVpbGQ6IHtcclxuICAgIG91dERpcjogJ2Rpc3QnLFxyXG4gICAgYXNzZXRzRGlyOiAnYXNzZXRzJyxcclxuICAgIHNvdXJjZW1hcDogZmFsc2UsXHJcbiAgICByb2xsdXBPcHRpb25zOiB7XHJcbiAgICAgIG91dHB1dDoge1xyXG4gICAgICAgIG1hbnVhbENodW5rczoge1xyXG4gICAgICAgICAgdGhyZWU6IFsndGhyZWUnXSxcclxuICAgICAgICAgIGhvd2xlcjogWydob3dsZXInXVxyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH0sXHJcbiAgc2VydmVyOiB7XHJcbiAgICBwb3J0OiA1MTczLFxyXG4gICAgaG9zdDogdHJ1ZVxyXG4gIH0sXHJcbiAgcHJldmlldzoge1xyXG4gICAgcG9ydDogNDE3MyxcclxuICAgIGhvc3Q6IHRydWVcclxuICB9XHJcbn0pOyJdLAogICJtYXBwaW5ncyI6ICI7QUFBMlUsU0FBUyxvQkFBb0I7QUFFeFcsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsTUFBTTtBQUFBO0FBQUEsRUFDTixPQUFPO0FBQUEsSUFDTCxRQUFRO0FBQUEsSUFDUixXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxlQUFlO0FBQUEsTUFDYixRQUFRO0FBQUEsUUFDTixjQUFjO0FBQUEsVUFDWixPQUFPLENBQUMsT0FBTztBQUFBLFVBQ2YsUUFBUSxDQUFDLFFBQVE7QUFBQSxRQUNuQjtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUFBLEVBQ0EsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sTUFBTTtBQUFBLEVBQ1I7QUFBQSxFQUNBLFNBQVM7QUFBQSxJQUNQLE1BQU07QUFBQSxJQUNOLE1BQU07QUFBQSxFQUNSO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
