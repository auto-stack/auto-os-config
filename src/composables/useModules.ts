import { ref, shallowRef, type Component } from 'vue'

// Local (built-in) views for modules that the unified daemon serves directly.
// Plan 002: file-kind modules render via the generic ConfigEditor; ai-daemon
// has a custom DaemonView (ConfigEditor + test-connection). Modules not listed
// here fall back to the legacy remote `import()` path (until Phase 4 removes it).
//
// The key is the SIDEBAR module id (from useModules' module list). The value
// passed to ConfigEditor as `moduleId` is the BACKEND registry id (which names
// the config file); they differ for historical reasons and are unified in
// Phase 4. The `configId` field carries that mapping.
const LOCAL_VIEWS: Record<string, {
  load: () => Promise<{ default: Component }>
  configId: string
  /** For CollectionBrowser modules that are read-only (frontmatter-md). */
  readOnly?: boolean
}> = {
  'ai-daemon': { load: () => import('../components/DaemonView.vue'), configId: 'ai-daemon' },
  'ai-musk': { load: () => import('../components/ConfigEditor.vue'), configId: 'auto-musk' },
  'ai-roles': { load: () => import('../components/CollectionBrowser.vue'), configId: 'roles' },
  'ai-skills': { load: () => import('../components/CollectionBrowser.vue'), configId: 'skills', readOnly: true },
}

export interface ConfigModule {
  id: string
  name: string
  icon: string
  description: string
}

/** A group of related modules rendered as a collapsible section in the
 *  sidebar (Win11 "System > sub-items" style). Top-level modules (no group)
 *  render as standalone items. */
export interface ModuleGroup {
  id: string
  label: string
  /** module ids that belong to this group. */
  memberIds: string[]
}

const modules = ref<ConfigModule[]>([])
const groups = ref<ModuleGroup[]>([])
/** Which groups are expanded (collapsed by default except the one containing
 *  the active module). */
const expandedGroups = ref<Set<string>>(new Set(['harness']))
const activeModuleId = ref<string | null>(null)
const activeComponent = shallowRef<Component | null>(null)
/** Props passed to the active component (e.g. { moduleId } for ConfigEditor). */
const activeModuleProps = ref<Record<string, unknown>>({})
const loading = ref(false)
const error = ref('')

/** Load the module registry.
 *
 * Plan 002: every module is served by the unified daemon and rendered by a
 * local built-in component (see LOCAL_VIEWS). The "Agents" module was removed
 * in Phase 4 — it listed agent modes, which are built into the musk binary
 * (not file-backed config), so it doesn't belong in the config center. The
 * default mode for an app is chosen in that app's own config (Auto Musk).
 */
export async function loadModules() {
  loading.value = true
  error.value = ''
  try {
    modules.value = [
      {
        id: 'ai-daemon',
        name: 'AI Daemon',
        icon: '🔌',
        description: 'LLM providers, API keys, model tiers',
      },
      {
        id: 'ai-skills',
        name: 'Skills',
        icon: '🧩',
        description: 'Skill registry and prompts',
      },
      {
        id: 'ai-roles',
        name: 'Roles',
        icon: '🎭',
        description: 'Agent roles: soul, skills, tiers',
      },
      {
        id: 'ai-musk',
        name: 'Auto Musk',
        icon: '🦌',
        description: 'Musk app: daemon, defaults, harness',
      },
    ]
    groups.value = [
      {
        id: 'harness',
        label: 'Harness',
        memberIds: ['ai-skills', 'ai-roles'],
      },
    ]
  } catch (e) {
    error.value = `Failed to load modules: ${e}`
    modules.value = []
    groups.value = []
  } finally {
    loading.value = false
  }

  // Deep-link: if the URL has a hash like #ai-musk, auto-select that module.
  // This lets app web UIs (e.g. musk's ⚙️ Settings button) link directly to
  // their config page in auto-os-config.
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

/** Dynamically load a module's config page component.
 *
 * Resolution order:
 *  1. LOCAL_VIEWS — built-in component served by the unified daemon (Plan 002).
 *     These are passed `moduleId` as a prop so the generic editor knows which
 *     file to load.
 *  2. Legacy remote `import()` of the module's own ESM bundle (musk/aaid). This
 *     path is removed in Phase 4. */
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
    const local = LOCAL_VIEWS[moduleId]
    if (!local) {
      error.value = `Module "${mod.name}" has no built-in view registered.`
      return
    }
    const exposed = await local.load()
    activeComponent.value = exposed.default || exposed
    // Pass the BACKEND config id (the file's registry key) — distinct from the
    // sidebar id. DaemonView is internally keyed to ai-daemon, so this prop is
    // a no-op for it; ConfigEditor/CollectionBrowser use it to fetch/save.
    // `readOnly` lets CollectionBrowser hide New/Edit before a selection loads
    // (frontmatter-md modules like skills).
    activeModuleProps.value = { moduleId: local.configId, readOnly: local.readOnly ?? false }
  } catch (e: any) {
    error.value = `Failed to load "${mod.name}": ${e.message || e}`
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
