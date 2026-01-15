import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  envDir: path.resolve(__dirname, '..'),  // Load .env from parent directory
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
  build: {
    outDir: '../dist/public',
    emptyOutDir: true,
  },
  envPrefix: 'VITE_',
  // Add the 'test' configuration block here
  test: {
    // This will now be respected
    environment: 'jsdom',
    globals: true, // This avoids needing to import describe, it, etc.
    setupFiles: './src/setupTests.ts', // Correct path to your setup file
    include: ['src/**/*.test.{ts,tsx}'], // Scopes tests to the client folder
  },
});