import { defineConfig } from 'vite'

// Vite lib-mode build for the remote config-page.
//
// The ONE critical setting: `external: ['vue']`. The bundle must NOT contain
// vue — the host injects its own Vue instance via the createComponent(Vue)
// factory. Bundling vue here would ship a second copy and silently break
// reactivity (the exact failure mode the old importmap hack worked around).
//
// This example uses plain JS with h() render functions, so it needs NO
// @vitejs/plugin-vue and NO compiler — the simplest possible remote. If you
// prefer an SFC (<template>), add @vitejs/plugin-vue to compile the template
// to render functions at build time (the host Vue is runtime-only).
export default defineConfig({
  build: {
    target: 'esnext',
    lib: {
      entry: './config-page.js',
      formats: ['es'],
      fileName: 'config-page',
    },
    rollupOptions: {
      external: ['vue'], // ← never bundle vue; the host provides it
    },
    outDir: './dist',
  },
})
