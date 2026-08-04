# Example remote config-page module

A minimal, buildable reference for the **`createComponent(Vue)` factory
protocol** (Plan 003 §2) — how a third-party module ships a custom config-page
component to auto-os-config without editing its source.

## What it demonstrates

- A remote component that **does not import `vue`** — it receives the host's
  single Vue instance via `createComponent(Vue)`. This is what guarantees one
  shared reactivity system (no second Vue copy, no importmap, no vendored
  runtime).
- A reactivity check (an incrementing counter) that proves the template
  re-renders — the exact thing that silently broke under the old two-Vue
  regime.
- Reading config data through the **unified daemon** (`/api/config/:id`), so the
  data layer stays consistent with the generic editor.

## Build & serve

```sh
npm install
npm run build     # → dist/config-page.js  (vue externalized, ~1.5 KB)
npm run serve     # → http://127.0.0.1:17720  (serves dist/)
```

## Register it

Drop a TOML into `~/.config/autoos/modules.d/`:
```toml
[[module]]
kind = "custom"
id = "example-remote"
remote = "http://127.0.0.1:17720/config-page.js"
name = "Example Remote"
icon = "🧪"
description = "Plan 003 remote-component protocol demo"
```
Restart the auto-os-config daemon. "Example Remote" appears in the sidebar.

## The two hard rules

1. **Pre-compile.** The host Vue is runtime-only (no compiler). This example
   uses `h()` render functions (no `<template>`), so it needs no compiler. If
   you prefer an SFC, add `@vitejs/plugin-vue` to compile the template at build
   time — do not ship a template string.
2. **Externalize `vue`, never import it.** `vite.config.js` sets
   `external: ['vue']`. Export `createComponent(Vue)` and take `Vue` from the
   argument. The host passes its own instance:
   `factory(Vue)` in `useModules.ts`.

## Test it

```sh
node ../../test-remote-module.mjs   # from the repo root
```
