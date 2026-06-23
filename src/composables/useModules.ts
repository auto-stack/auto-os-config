import { ref, shallowRef, type Component } from 'vue'

export interface ConfigModule {
  id: string
  name: string
  icon: string
  description: string
  /** URL to the module's remoteEntry.js (served by the module's HTTP server). */
  remote: string
  /** The exposed module name in the remote's federation config. */
  module: string
}

const modules = ref<ConfigModule[]>([])
const activeModuleId = ref<string | null>(null)
const activeComponent = shallowRef<Component | null>(null)
const loading = ref(false)
const error = ref('')

/** Load the module registry from ~/.config/autoos/modules.json.
 *
 * Falls back to a default registry if the file is missing (so the app works
 * out of the box with aaid + musk on their default ports).
 */
export async function loadModules() {
  loading.value = true
  error.value = ''

  try {
    // Try fetching from the local config server (or a static file).
    // For MVP, we use a hardcoded default + allow a fetch from a URL.
    const defaults: ConfigModule[] = [
      {
        id: 'ai-daemon',
        name: 'AI Daemon',
        icon: '🔌',
        description: 'LLM providers, API keys, model tiers',
        remote: 'http://127.0.0.1:17654/remoteEntry.js',
        module: './ConfigPage',
      },
      {
        id: 'ai-musk',
        name: 'AI Agent',
        icon: '🤖',
        description: 'Agent modes, professions, skills',
        remote: 'http://127.0.0.1:8080/remoteEntry.js',
        module: './ConfigPage',
      },
    ]

    // Try to load user overrides from a local file served by any module.
    // For now, use defaults. Future: fetch from a config endpoint.
    modules.value = defaults
  } catch (e) {
    error.value = `Failed to load modules: ${e}`
    modules.value = []
  } finally {
    loading.value = false
  }
}

/** Dynamically load a module's config page component via Module Federation.
 *
 * Uses dynamic import() to load the remoteEntry.js, then extracts the exposed
 * component. This is the core of the plugin system — no build-time dependency
 * on the remote module.
 */
export async function selectModule(moduleId: string) {
  const mod = modules.value.find((m) => m.id === moduleId)
  if (!mod) return

  activeModuleId.value = moduleId
  loading.value = true
  error.value = ''
  activeComponent.value = null

  try {
    // Dynamic import from the remote entry — this triggers Module Federation
    // to fetch and evaluate remoteEntry.js, then load the exposed module.
    const remote = await import(/* @vite-ignore */ mod.remote)
    const exposed = await remote[mod.module]()
    activeComponent.value = exposed.default || exposed
  } catch (e: any) {
    error.value = `Failed to load "${mod.name}": ${e.message || e}.
    Make sure the module is running and serving remoteEntry.js at ${mod.remote}.`
  } finally {
    loading.value = false
  }
}

export function useModules() {
  return {
    modules,
    activeModuleId,
    activeComponent,
    loading,
    error,
    loadModules,
    selectModule,
  }
}
