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

## Registering a new module

1. **Backend** — add a `[[module]]` block to the registry in
   `backend/src/registry.rs` (`DEFAULT_REGISTRY_TOML`):
   ```toml
   [[module]]
   kind = "file"            # or "collection"
   id = "my-module"
   file = "my-module.at"    # relative to ~/.config/autoos/
   root = "mymod"           # expected root node name
   ```
2. **Frontend** — add a sidebar entry in `src/composables/useModules.ts`
   (`loadModules()`) and a `LOCAL_VIEWS` mapping pointing at `ConfigEditor.vue`
   (single file) or `CollectionBrowser.vue` (a directory of entities):
   ```ts
   'my-module': { load: () => import('../components/ConfigEditor.vue'), configId: 'my-module' }
   ```
3. **Done.** The module gets a working, validated form (selects, multi-selects,
   password fields, tables…) rendered from its `.at` shape.

Write a custom `.vue` component only when you need special UX (an action button,
a non-form visualization) and point `load` at it instead.

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
