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

const modules = ref<ConfigModule[]>([])
const activeModuleId = ref<string | null>(null)
const activeComponent = shallowRef<Component | null>(null)
const loading = ref(false)
const error = ref('')

/** Load the module registry.
 *
 * For MVP we ship a hardcoded default registry (aaid + musk on their standard
 * ports). A future enhancement can fetch this from a config endpoint so other
 * AutoOS modules register themselves.
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
        id: 'ai-musk',
        name: 'AI Agent',
        icon: '🤖',
        description: 'Agent modes, professions, skills',
        remote: 'http://127.0.0.1:8080/config-page.js',
      },
    ]
  } catch (e) {
    error.value = `Failed to load modules: ${e}`
    modules.value = []
  } finally {
    loading.value = false
  }
}

/** Dynamically load a module's config page component via `import()`.
 *
 * This is the core of the plugin system: each module is a standalone ESM
 * bundle (built with vite lib mode, `vue` externalized) served by the module's
 * own HTTP server. The host loads it at runtime — no build-time dependency on
 * the remote. The bundle's bare `import 'vue'` is resolved by the import map in
 * index.html to the host's single shared Vue copy, so the component's
 * reactivity (ref/onMounted/v-if) works inside the host.
 */
export async function selectModule(moduleId: string) {
  const mod = modules.value.find((m) => m.id === moduleId)
  if (!mod) return

  activeModuleId.value = moduleId
  loading.value = true
  error.value = ''
  activeComponent.value = null

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
    activeModuleId,
    activeComponent,
    loading,
    error,
    loadModules,
    selectModule,
  }
}
