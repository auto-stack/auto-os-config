# auto-os-config

AutoOS unified settings center — one daemon, one generic editor, for **every**
config module. An Auto language frontend (generated to Vue 3 by `auto build`)
+ a small Rust backend that read/write any `.at` (auto-atom) config file
directly, with zero per-module code.

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
| **② Generic editor** | Renders a form from the `.at` data *shape* + a few key-name conventions. New module = zero frontend work. | `auto/src/front/config_editor.at` (→ `src/components/ConfigEditor.vue`) |
| **③ Module registry** | Declares each module's id + file/dir. | `backend/src/registry.rs`, `auto/src/front/modules_store.at` |

See [`docs/designs/config-plugin-architecture.md`](docs/designs/config-plugin-architecture.md) for
the architecture design, and [`docs/plans/archive/002-unified-config-daemon.md`](docs/plans/archive/002-unified-config-daemon.md)
for the implementation plan, decisions, and trade-offs.

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

## The frontend is Auto language source (Plan 006)

Everything under `src/components/` and `src/stores/auto/` is **generated** from
Auto (`.at`) sources in [`auto/src/front/`](auto/src/front/) — never edit the
generated files. The handwritten remainder is the bootstrap only:
`index.html`, `src/main.ts` (7-line mount), `src/styles.css` (CSS-variable
design system), `src/lib/api.ts` (fetch transport + projections),
`src/editor/types.ts` (the infer engine).

```sh
# edit auto/src/front/*.at, then:
bash auto/gen/regen.sh        # .at → gen/ → sed-rewrite → src/components/ + src/stores/auto/
npm run build                 # vue-tsc + vite (the typecheck gate)
./scripts/e2e.sh              # three Playwright suites
```

Never run `auto run` / `auto build` from the repo root (it overwrites real code
with placeholders). DSL gotchas and architecture conventions (descriptor-driven
forms, no deep mutation) are documented in [`auto/README.md`](auto/README.md).

### End-to-end tests (Playwright)

```sh
node test-generic-editor.mjs      # ai-daemon + auto-musk (Shape A)
node test-collection-editor.mjs   # roles + skills (Shape B)
node test-theme-switch.mjs        # accent propagation across surfaces
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

> **Removed in Plan 006.** The remote `createComponent(Vue)` protocol was
> retired with the frontend's Auto migration — declarative sources have no
> equivalent for dynamically loading third-party Vue bundles, and the protocol
> had no real users. `custom`-kind drop-ins now render a removal notice; the
> reference implementation is archived at [`archive/remote-module/`](archive/remote-module/).
> If a module needs bespoke UX, the path today is: extend the generic editor's
> conventions (infer engine) or add a builtin view like DaemonView.

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
