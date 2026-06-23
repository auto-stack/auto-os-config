import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// NOTE: We deliberately do NOT use Module Federation. Remote config-page bundles
// (aaid, musk) are standalone ESM libs built with vite lib mode, loaded via
// dynamic import(). They externalize `vue`, and the import map in index.html
// resolves `vue` to a single vendored copy under /vendor/.
//
// For that to work in DEV mode, the host must ALSO resolve `vue` to that exact
// same file/URL — otherwise the host uses Vite's pre-bundled copy and remotes
// use the vendored copy, yielding TWO Vue instances and silently broken
// reactivity (component script runs, but its template never re-renders).
//
// `resolve.dedupe: ['vue']` + the alias forces the host's own `import 'vue'`
// to the vendored file. Vite serves it (as a resolved module) and the import
// map serves it to remotes — same underlying module instance.
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      // Resolve the host's `import 'vue'` to the vendored ESM build. Using the
      // filesystem path (not a URL) lets Vite resolve & serve it. The import
      // map in index.html points remotes at the same file via the public URL.
      vue: resolve(__dirname, './public/vendor/vue.runtime.esm-browser.js'),
    },
    dedupe: ['vue'],
  },
  // Don't pre-bundle vue into .vite/deps — we want the vendored file used as-is.
  optimizeDeps: {
    exclude: ['vue'],
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
