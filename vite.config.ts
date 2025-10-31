import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import react from "@vitejs/plugin-react";
import path from "path";


export default {
  plugins: [
    react(),
    runtimeErrorOverlay(),
    
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      external: ['@supabase/auth-ui-react'],
    },
  },
  server: {
    port: 3000,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
    proxy: {
      '/api': {
        target: 'https://5000-cs-269820720335-default.cs-us-west1-ijlt.cloudshell.dev',
        changeOrigin: true,
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('Proxying request:', req.method, req.url);
          });
        },
      },
      '/ws': {
        target: 'wss://5000-cs-269820720335-default.cs-us-west1-ijlt.cloudshell.dev',
        ws: true,
      },
    },
  },
};