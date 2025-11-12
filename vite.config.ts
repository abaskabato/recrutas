/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src'),
    },
  },
  // Add the 'test' configuration block here
  test: {
    // This will now be respected
    environment: 'jsdom',
    globals: true, // This avoids needing to import describe, it, etc.
    setupFiles: './client/src/setupTests.ts', // Correct path to your setup file
    include: ['client/src/**/*.test.{ts,tsx}'], // Scopes tests to the client folder
  },
});