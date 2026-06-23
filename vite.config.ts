import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import federation from '@originjs/vite-plugin-federation'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    vue(),
    federation({
      name: 'auto-os-config',
      remotes: {
        'aaid-config': 'http://127.0.0.1:17654/remoteEntry.js',
      },
      // Don't share Vue — each app loads its own. More reliable for MVP.
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
    open: false, // don't auto-open (headless testing)
  },
})
