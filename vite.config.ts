import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import federation from '@originjs/vite-plugin-federation'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    vue(),
    federation({
      name: 'auto-os-config',
      // Host: no exposes, but remotes are loaded dynamically at runtime
      // via useModules.ts (import() from remote URLs).
      // We don't declare remotes here because the remote URLs come from
      // ~/.config/autoos/modules.json at runtime, not build time.
      shared: ['vue', 'vue-router'],
    }),
  ],
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
    open: true,
  },
})
