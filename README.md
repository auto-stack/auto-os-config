# auto-os-config

AutoOS unified settings center — a Vue3 SPA that provides a Win11-style
configuration interface for all AutoOS system modules (AI Daemon, AI Agent, …).

```
┌─────────────┬──────────────────────────────────────────┐
│  Sidebar    │  <component :is="activeComponent" />     │
│             │                                          │
│ 🔌 AI Daemon│  The selected module's config page,      │
│ 🤖 AI Agent │  loaded at runtime as a standalone ESM   │
│  …          │  bundle from the module's own server.    │
└─────────────┴──────────────────────────────────────────┘
   auto-os-config host (:17700)          aaid (:17654) / musk (:8080)
```

## How the plugin system works

Each module ships a **standalone ESM config-page bundle** (built with Vite *lib
mode*), served by the module's own HTTP server at `/config-page.js`. The host
loads it at runtime via dynamic `import()` — **no build-time dependency** on any
module.

```
selectModule(id) → import('http://<module-host>/config-page.js') → render default export
```

The one subtlety: **a single shared Vue runtime**. Each module's bundle
externalizes `vue` (emits a bare `import 'vue'`), and the host's
`<script type="importmap">` in `index.html` resolves that specifier to one
vendored copy of Vue (`public/vendor/vue.runtime.esm-browser.js`). The host's
own `resolve.alias` points `vue` at the *same* file/URL.

> ⚠️ Why this matters: if the host and a remote each load their own Vue, they
> get **two separate reactivity systems**. A remote component's `ref`/`onMounted`
> then updates correctly in its script but its template never re-renders — data
> fetches succeed yet the UI stays on "Loading…". Sharing one Vue instance is
> what makes remote component reactivity work.

## Quick start

```sh
npm install
npm run dev    # → http://localhost:17700
```

Then start the module servers the pages load from:

```sh
# AI Daemon (auto-ai)
cd ../auto-ai && cargo run -p auto-ai-daemon        # :17654

# AI Agent (auto-musk)
cd ../auto-musk/backend && cargo run -p musk -- serve # :8080
```

Open http://localhost:17700 — the sidebar lists **AI Daemon** and **AI Agent**.
Click either to load its config page.

### End-to-end test (Playwright)

```sh
node test-both-modules.mjs
```

Headless browser check that both modules load **reactive** data (provider cards
for aaid, mode/profession/skill cards for musk). Screenshots are written to
`screenshot-aaid.png` / `screenshot-musk.png`.

## Registering a new module

1. **Build a config-page bundle.** In the module's frontend, use Vite lib mode
   with `vue` externalized:

   ```ts
   // vite.config.ts
   export default defineConfig({
     plugins: [vue()],
     build: {
       target: 'esnext',
       lib: { entry: './src/config-page.vue', formats: ['es'], fileName: 'config-page' },
       rollupOptions: { external: ['vue'] },   // ← share the host's Vue
       outDir: './frontend-dist',
     },
   })
   ```

   The component reads its base URL from `import.meta.url` so `fetch()` hits the
   module's own server regardless of where the bundle is loaded from:

   ```ts
   const API_BASE = `${new URL(import.meta.url).origin}`
   ```

2. **Serve the bundle** from the module's HTTP server at `/config-page.js`,
   with permissive CORS (so the host can load it cross-origin).

3. **Register it** in `src/composables/useModules.ts` (the `modules` default
   list), or a future `~/.config/autoos/modules.json`:

   ```jsonc
   { "id": "my-module", "name": "My Module", "icon": "🔧",
     "description": "…",
     "remote": "http://127.0.0.1:XXXX/config-page.js" }
   ```

4. Reload auto-os-config — the module appears in the sidebar.

## Notes

- The vendored Vue (`public/vendor/vue.runtime.esm-browser.js`) is the
  **runtime-only** ESM build. Remote config pages are pre-compiled by Vite lib
  mode into render functions, so no compiler is needed in the browser.
- The import map URL must **exactly match** the URL the host's own `import
  'vue'` resolves to (via the Vite alias) — otherwise the browser loads two Vue
  copies and reactivity silently breaks. See the comments in `index.html` and
  `vite.config.ts`.
