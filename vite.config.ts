/**
 * @file Vite build/dev-server config (React plugin, fixed port 1430 for
 * Tauri) and Vitest settings.
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Tauri expects a fixed dev port and must not have the screen cleared.
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: { port: 1430, strictPort: true },
  envPrefix: ['VITE_', 'TAURI_'],
  test: { environment: 'node' },
});
