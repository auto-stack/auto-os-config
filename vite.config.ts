import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// Plan 002: the host renders ALL config modules itself via local built-in
// components (ConfigEditor / CollectionBrowser / DaemonView), backed by the
// unified daemon. There are no remote ESM bundles and no shared-Vue hack any
// more — standard Vite resolves `vue` from node_modules like any other app.
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'esnext',
    minify: true,
  },
  server: {
    port: 17700,
    open: false, // don't auto-open (headless testing)
    // Proxy API calls to the unified config daemon (backend/, axum :17701).
    // Phase 1 of Plan 002: the front-end talks same-origin /api/* and Vite
    // forwards to the daemon. (Plan 001 Phase 1 originally proposed this.)
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:17701',
        changeOrigin: true,
      },
    },
  },
})
