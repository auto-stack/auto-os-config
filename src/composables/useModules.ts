import { ref, shallowRef, type Component } from 'vue'

export interface ConfigModule {
  id: string
  name: string
  icon: string
  description: string
  /** URL of the module's standalone ESM config-page bundle (served by the
   * module's own HTTP server, e.g. http://127.0.0.1:17654/config-page.js). */
  remote: string
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
const loading = ref(false)
const error = ref('')

/** Load the module registry.
 *
 * For MVP we ship a hardcoded default registry. A future enhancement can fetch
 * this from a config endpoint so other AutoOS modules register themselves.
 *
 * Navigation is two-level: standalone modules + collapsible groups (the
 * "Harness" group contains Agents/Skills/Roles — per the unified-Harness
 * design, these are the OS-level capability registries).
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
        remote: 'http://127.0.0.1:17654/config-page.js',
      },
      {
        id: 'ai-agents',
        name: 'Agents',
        icon: '🤖',
        description: 'Agent modes and professions',
        remote: 'http://127.0.0.1:8080/config-page.js',
      },
      {
        id: 'ai-skills',
        name: 'Skills',
        icon: '🧩',
        description: 'Skill registry and prompts',
        remote: 'http://127.0.0.1:8080/skills-config-page.js',
      },
      {
        id: 'ai-roles',
        name: 'Roles',
        icon: '🎭',
        description: 'Agent roles: soul, skills, tiers',
        remote: 'http://127.0.0.1:8080/roles-config-page.js',
      },
      {
        id: 'ai-musk',
        name: 'Auto Musk',
        icon: '🦌',
        description: 'Musk app: daemon, defaults, harness',
        remote: 'http://127.0.0.1:8080/app-config-page.js',
      },
    ]
    groups.value = [
      {
        id: 'harness',
        label: 'Harness',
        memberIds: ['ai-agents', 'ai-skills', 'ai-roles'],
      },
    ]
  } catch (e) {
    error.value = `Failed to load modules: ${e}`
    modules.value = []
    groups.value = []
  } finally {
    loading.value = false
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

/** Dynamically load a module's config page component via `import()`. */
export async function selectModule(moduleId: string) {
  const mod = modules.value.find((m) => m.id === moduleId)
  if (!mod) return

  activeModuleId.value = moduleId
  loading.value = true
  error.value = ''
  activeComponent.value = null

  // Expand the group containing this module (so the active item is visible).
  for (const g of groups.value) {
    if (g.memberIds.includes(moduleId)) expandedGroups.value.add(g.id)
  }

  try {
    const exposed = await import(/* @vite-ignore */ mod.remote)
    activeComponent.value = exposed.default || exposed
  } catch (e: any) {
    error.value = `Failed to load "${mod.name}": ${e.message || e}.
    Make sure the module is running and serving config-page.js at ${mod.remote}.`
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
    loading,
    error,
    loadModules,
    selectModule,
    standaloneModules,
    groupMembers,
    toggleGroup,
  }
}
