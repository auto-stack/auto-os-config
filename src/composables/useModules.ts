import { ref, shallowRef, type Component } from 'vue'
import * as Vue from 'vue'

// The generic, built-in editor components. A `file`-kind module renders via
// ConfigEditor; a `collection`-kind module renders via CollectionBrowser.
// A `custom`-kind module serves its own component via the createComponent(Vue)
// factory protocol (Plan 003 §2). Importing these statically keeps them in the
// host bundle; only `custom` modules hit the network.
import ConfigEditor from '../components/ConfigEditor.vue'
import CollectionBrowser from '../components/CollectionBrowser.vue'
import DaemonView from '../components/DaemonView.vue'

/** File-kind modules that ship a bespoke in-house view INSTEAD of the generic
 *  ConfigEditor. These are first-party components (statically imported, in the
 *  host bundle) — distinct from third-party `custom`-kind modules, which load a
 *  remote bundle via the createComponent(Vue) factory. Today only ai-daemon
 *  needs custom UX (the test-connection button); every other file module uses
 *  the generic editor. */
const BUILTIN_FILE_VIEWS: Record<string, Component> = {
  'ai-daemon': DaemonView,
}

/** A module as advertised by `GET /api/modules` (the single source of truth). */
export interface ConfigModule {
  id: string
  /** "file" | "collection" | "custom" — drives which view renders. */
  kind: string
  name: string
  icon: string
  description: string
  /** Sidebar group label; empty string = top-level standalone item. */
  group: string
  /** Present only for `custom` modules: the remote bundle URL. */
  remote?: string
}

/** A group of related modules rendered as a collapsible sidebar section. */
export interface ModuleGroup {
  id: string
  label: string
  memberIds: string[]
}

const modules = ref<ConfigModule[]>([])
const groups = ref<ModuleGroup[]>([])
/** Which groups are expanded (collapsed by default except the one containing
 *  the active module). */
const expandedGroups = ref<Set<string>>(new Set())
const activeModuleId = ref<string | null>(null)
const activeComponent = shallowRef<Component | null>(null)
/** Props passed to the active component (e.g. { moduleId } for ConfigEditor). */
const activeModuleProps = ref<Record<string, unknown>>({})
const loading = ref(false)
const error = ref('')

/** Load the module registry from the daemon.
 *
 * Plan 003: the sidebar is no longer hardcoded. The backend merges built-in
 * modules with drop-in declarations from `~/.config/autoos/modules.d/` and
 * exposes them at `/api/modules`. Groups are derived from each module's
 * `group` field (modules sharing a non-empty group cluster into one section,
 * preserving first-seen order). */
export async function loadModules() {
  loading.value = true
  error.value = ''
  try {
    const resp = await fetch('/api/modules')
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    const list = (await resp.json()) as ConfigModule[]
    modules.value = list
    // Derive groups from the `group` field, in first-seen order.
    const seen = new Map<string, string[]>()
    for (const m of list) {
      if (!m.group) continue
      if (!seen.has(m.group)) seen.set(m.group, [])
      seen.get(m.group)!.push(m.id)
    }
    groups.value = [...seen.entries()].map(([label, memberIds]) => ({
      // Stable id derived from the label (lowercased) — used as the expand key.
      id: label.toLowerCase().replace(/\s+/g, '-'),
      label,
      memberIds,
    }))
    // Re-seed expanded groups so the (newly-derived) harness group stays open
    // by default, matching the previous UX.
    if (groups.value.length && expandedGroups.value.size === 0) {
      expandedGroups.value = new Set([groups.value[0].id])
    }
  } catch (e: any) {
    error.value = `Failed to load modules: ${e.message || e}`
    modules.value = []
    groups.value = []
  } finally {
    loading.value = false
  }

  // Deep-link: if the URL has a hash like #auto-musk, auto-select that module.
  const hash = window.location.hash.slice(1)
  if (hash && modules.value.some((m) => m.id === hash)) {
    await selectModule(hash)
  }
}

/** Modules NOT in any group — rendered standalone at the top level. */
export function standaloneModules(): ConfigModule[] {
  const grouped = new Set(groups.value.flatMap((g) => g.memberIds))
  return modules.value.filter((m) => !grouped.has(m.id))
}

/** Get the modules that belong to a group, in registry order. */
export function groupMembers(groupId: string): ConfigModule[] {
  const group = groups.value.find((g) => g.id === groupId)
  if (!group) return []
  return group.memberIds
    .map((id) => modules.value.find((m) => m.id === id))
    .filter((m): m is ConfigModule => !!m)
}

function toggleGroup(groupId: string) {
  if (expandedGroups.value.has(groupId)) {
    expandedGroups.value.delete(groupId)
  } else {
    expandedGroups.value.add(groupId)
  }
  // trigger reactivity (Set mutation isn't reactive on its own)
  expandedGroups.value = new Set(expandedGroups.value)
}

/** Load and activate a module's view, dispatched by `kind`.
 *
 *  - `file`       → ConfigEditor (generic; the module's id IS the config id)
 *  - `collection` → CollectionBrowser (generic; skills is read-only via a
 *                   daemon-side convention — detected here by the frontmatter
 *                   format, which the list endpoint doesn't expose directly, so
 *                   we treat `skills`-style read-only-ness heuristically: any
 *                   collection whose id is `skills`. TODO: surface format.)
 *  - `custom`     → dynamically import the remote bundle and call its
 *                   `createComponent(Vue)` factory (Plan 003 §2). The remote
 *                   never imports vue — it receives the host's single instance,
 *                   which is what keeps reactivity working without an importmap.
 */
export async function selectModule(moduleId: string) {
  const mod = modules.value.find((m) => m.id === moduleId)
  if (!mod) return

  activeModuleId.value = moduleId
  loading.value = true
  error.value = ''
  activeComponent.value = null
  activeModuleProps.value = {}

  // Expand the group containing this module (so the active item is visible).
  for (const g of groups.value) {
    if (g.memberIds.includes(moduleId)) expandedGroups.value.add(g.id)
  }

  try {
    if (mod.kind === 'file') {
      // An in-house bespoke view (e.g. ai-daemon's test-connection wrapper)
      // takes precedence over the generic ConfigEditor for the modules that
      // declare one. Third-party modules never land here — they're `custom`.
      activeComponent.value = BUILTIN_FILE_VIEWS[mod.id] ?? ConfigEditor
      // The module id IS the backend config id now (Plan 003 unified them).
      activeModuleProps.value = { moduleId: mod.id }
    } else if (mod.kind === 'collection') {
      activeComponent.value = CollectionBrowser
      // skills is the only frontmatter-md (read-only) collection today. The
      // backend list endpoint doesn't expose `format`, so we key off the id;
      // a future endpoint can make this declarative. See Plan 003 §4.2 note.
      const readOnly = mod.id === 'skills'
      activeModuleProps.value = { moduleId: mod.id, readOnly }
    } else if (mod.kind === 'custom') {
      if (!mod.remote) {
        throw new Error(`custom module "${mod.name}" has no remote URL`)
      }
      // Plan 003 §2: the remote exports createComponent(Vue). Passing the
      // host's Vue module guarantees one shared reactivity system — the remote
      // never imports vue, so there's no second-instance failure mode.
      const exposed = await import(/* @vite-ignore */ mod.remote)
      const factory = exposed.createComponent
      if (typeof factory !== 'function') {
        throw new Error(
          `remote ${mod.remote} did not export a createComponent(Vue) factory`,
        )
      }
      activeComponent.value = factory(Vue)
      activeModuleProps.value = { moduleId: mod.id }
    } else {
      throw new Error(`unknown module kind "${mod.kind}" for "${mod.name}"`)
    }
  } catch (e: any) {
    if (mod.kind === 'custom') {
      error.value = `Failed to load "${mod.name}": ${e.message || e}. ` +
        `Make sure the module is running and serving its bundle at ${mod.remote}.`
    } else {
      error.value = `Failed to load "${mod.name}": ${e.message || e}`
    }
  } finally {
    loading.value = false
  }
}

export function useModules() {
  return {
    modules,
    groups,
    expandedGroups,
    activeModuleId,
    activeComponent,
    activeModuleProps,
    loading,
    error,
    loadModules,
    selectModule,
    standaloneModules,
    groupMembers,
    toggleGroup,
  }
}
