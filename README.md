# auto-os-config

AutoOS unified settings center — a Vue3 SPA that provides a Win11-style
configuration interface for all AutoOS system modules.

## Architecture

```
auto-os-config (Host SPA, :17700)
  ├── 左侧导航: registered modules (from modules registry)
  └── 右侧内容: selected module's config page (federated remote component)

Plugin system: each module (aaid, musk, ...) exposes a ConfigPage Vue component
via Vite Module Federation. auto-os-config loads it at runtime — no build-time
dependency. Add a new module by registering it in the registry + adding
federation exposes in the module's Vite config.
```

## Quick start

```sh
npm install
npm run dev    # → http://127.0.0.1:17700
```

## Registering a new module

1. In the module's frontend, add `@originjs/vite-plugin-federation` and expose
   a `ConfigPage` component:
   ```ts
   federation({
     name: 'my-module',
     exposes: { ConfigPage: './src/config-page.vue' },
     shared: ['vue'],
   })
   ```

2. Build the module — it will produce `remoteEntry.js` + asset chunks.

3. Serve `remoteEntry.js` + assets from the module's HTTP server.

4. Add the module to the registry (in `useModules.ts` defaults, or a future
   `~/.config/autoos/modules.json`):
   ```json
   { "id": "my-module", "name": "My Module", "icon": "🔧",
     "remote": "http://127.0.0.1:XXXX/remoteEntry.js", "module": "./ConfigPage" }
   ```

5. Restart auto-os-config — the module appears in the sidebar.
