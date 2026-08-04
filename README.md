# auto-os-config

AutoOS unified settings center — one daemon, one generic editor, for **every**
config module. A Vue 3 SPA + a small Rust backend that read/write any `.at`
(auto-atom) config file directly, with zero per-module code.

```
┌─────────────┬──────────────────────────────────────────┐
│  Sidebar    │  <ConfigEditor :module-id="…" />         │
│             │     or <CollectionBrowser />             │
│ 🔌 AI Daemon│     or <DaemonView />  (the one custom)  │
│ ▼ Harness   │                                          │
│    🧩 Skills│  A form auto-rendered from the config    │
│    🎭 Roles │  file's shape — no hand-written page.    │
│ 🦌 Auto Musk│                                          │
└─────────────┴──────────────────────────────────────────┘
   vite (:17700)  ──/api──▶  auto-os-config-daemon (:17701)
                                  reads/writes ~/.config/autoos/*.at
```

The whole point: **different config modules are registered separately, but their
implementation is unified** — as if they lived in one project. A new module with
a new `.at` shape gets a working, validated editor for free; only genuinely
custom UX (e.g. "test the daemon connection") needs a hand-written component.

## Architecture (Plan 002)

Three pillars:

| Pillar | Role | Location |
|---|---|---|
| **① Unified daemon** | The only config read/write service. URL → file path by convention (`~/.config/autoos/`). Replaces each module shipping its own config API. | `backend/` |
| **② Generic editor** | Renders a form from the `.at` data *shape* + a few key-name conventions. New module = zero frontend work. | `src/components/ConfigEditor.vue`, `src/editor/` |
| **③ Module registry** | Declares each module's id + file/dir (+ optional custom component). | `backend/src/registry.rs`, `src/composables/useModules.ts` |

See [`plans/002-unified-config-daemon.md`](plans/002-unified-config-daemon.md) for
the full design, decisions, and trade-offs.

### How the generic editor decides which control to use

No per-file schema. `inferField(key, value)` maps the value's shape + a few
key-name conventions to a control:

| auto-atom shape | convention | control |
|---|---|---|
| `bool` | — | toggle |
| number | — | number input |
| string + key matches `/_key$|api_key|secret|token|password/i` | secret | **password** (masked) |
| `[roles\|skills\|modes]` | harness trio | **multi-select** (options from the dir scan) |
| other scalar array | — | tag input |
| `tier` / `model_tier` | closed enum | **select** (min/lite/mid/pro/max) |
| `default_provider` | self-referential | select (providers defined in the same file) |
| `default_mode` | dir enum (empty if builtin) | select, falls back to free text + hint |
| `[{obj, obj}]` | homogeneous objects | **table** (add/remove rows) |
| nested object | — | collapsible subform (recursive) |

## Quick start

```sh
# 1. Backend daemon (axum, :17701) — reads/writes ~/.config/autoos/*.at
cd backend && cargo run                 # → http://127.0.0.1:17701

# 2. Frontend (vite, :17700) — proxies /api → :17701
cd .. && npm install && npm run dev     # → http://localhost:17700
```

Open http://localhost:17700. The sidebar lists the modules; click one to edit.
**Only the AI Daemon's "Test connection" button needs another service online**
(aaid :17654, to actually call the LLM) — everything else works offline against
the config files.

### End-to-end tests (Playwright)

```sh
node test-generic-editor.mjs      # ai-daemon + auto-musk (Shape A)
node test-collection-editor.mjs   # roles + skills (Shape B)
```

Each does a full create → edit → save → verify-file round-trip headlessly.

## Registering a new module (zero edits to auto-os-config)

A third-party module registers itself by dropping **one `.at` file** into
`~/.config/autoos/modules.d/`. The daemon scans that directory at startup and
merges it with the built-in registry; the frontend fetches the result from
`/api/modules`. No edits to auto-os-config's source. The declaration uses the
**auto-atom** format — the same `.at` format as every other config under
`~/.config/autoos/`, so the whole config tree is consistent and drop-in files
are themselves editable by the generic editor.

### Generic editor module (the common case)

Create `~/.config/autoos/modules.d/my-module.at`:
```text
module {
    kind : file               # or collection for a directory of entities
    id : "my-module"
    file : "my-module.at"     # relative to ~/.config/autoos/
    root : "mymod"            # expected root node name
    name : "My Module"        # sidebar display (optional; falls back to id)
    icon : "🔧"               # emoji or short string
    description : "What it configures"
    group : ""                # optional; non-empty clusters into a section
}
```
Restart the daemon. The module appears in the sidebar and renders a working,
validated form (selects, multi-selects, password fields, tables) from its `.at`
shape — **no frontend code at all**.

### Custom-UX module (when you need bespoke UI)

If the generic editor isn't enough, ship a remote component via the
`createComponent(Vue)` factory protocol:

1. **Build a remote bundle** that exports `createComponent(Vue)` and does NOT
   import `vue` (externalize it — the host injects its own single Vue instance).
   See [`examples/remote-module/`](examples/remote-module/) for a complete,
   buildable reference (vite lib mode, `external: ['vue']`, `h()` render fns).
2. **Serve** the built `dist/config-page.js` from your module's HTTP server
   (with permissive CORS, since the host loads it cross-origin).
3. **Declare** it as `kind : "custom"` in a drop-in `.at`:
   ```text
   module {
       kind : "custom"
       id : "my-module"
       remote : "http://127.0.0.1:9000/config-page.js"
       name : "My Module"
       icon : "🔧"
   }
   ```

The remote component receives `{ moduleId }` as a prop and reads/writes its
config through the same daemon endpoints (`/api/config/:id`) as the generic
editor — the data layer stays unified; only the view is custom.

> **Why `createComponent(Vue)` instead of an importmap?** The old architecture
> used a page-global importmap + a vendored 383 KB Vue file, and silently broke
> reactivity if the host's and remote's `vue` URLs didn't match byte-for-byte
> (two Vue instances → template never re-renders). The factory protocol makes
> the remote **never import vue at all** — it gets the host's instance as an
> argument — eliminating the failure mode entirely. No importmap, no vendored
> file, no `vite.config.ts` changes. See [`plans/003`](plans/003-module-self-registration.md)
> §2 for the full rationale.

## Notes & limitations

- **Write-back reformatting.** Saving rewrites the file from its parsed AST: it
  normalizes indentation, re-quotes bare identifiers (`zhipu` → `"zhipu"`,
  semantically identical), and **drops comments**. A `.bak` backup is written
  next to every file before each save; the first save in a browser asks for
  confirmation. Field order is preserved (insertion-ordered).
- **No new top-level blocks via the editor (v1).** The merge updates existing
  fields/rows; adding a brand-new named block (e.g. a whole new provider in
  `ai-daemon.at`) isn't supported — edit the file by hand for that.
- **Config root** is `~/.config/autoos/` (resolved via `dirs::home_dir()`),
  matching the convention used across auto-ai / auto-musk. On Windows this is
  `C:\Users\<user>\.config\autoos\`.
- **Skills are read-only** in v1 (they're Markdown prompts, not settings).
