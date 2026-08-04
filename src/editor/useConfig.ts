// Load + save a single-file config module's body via the daemon.
//
// Usage:
//   const { body, original, dirty, loading, error, save, reload } = useConfig('ai-daemon')
//   body.value.default_provider = 'deepseek'   // mutate freely
//   await save()                                 // PUTs the whole body back

import { ref, computed, type Ref } from 'vue'

export interface UseConfig {
  body: Ref<Record<string, any> | null>
  meta: Ref<{ file: string; root: string } | null>
  loading: Ref<boolean>
  saving: Ref<boolean>
  error: Ref<string>
  dirty: Ref<boolean>
  /** A diff string for showing what changed (best-effort, JSON). */
  save: () => Promise<boolean>
  reload: () => Promise<void>
}

const SAVED_ACK_KEY = 'autoos-config-saved-once'

export function useConfig(moduleId: string): UseConfig {
  const body = ref<Record<string, any> | null>(null)
  const meta = ref<{ file: string; root: string } | null>(null)
  const loading = ref(false)
  const saving = ref(false)
  const error = ref('')
  const dirty = ref(false)

  async function reload() {
    loading.value = true
    error.value = ''
    try {
      const resp = await fetch(`/api/config/${moduleId}`)
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const data = await resp.json()
      body.value = data.value
      meta.value = data.meta
      dirty.value = false
    } catch (e: any) {
      error.value = e.message || String(e)
      body.value = null
    } finally {
      loading.value = false
    }
  }

  async function save(): Promise<boolean> {
    if (!body.value) return false
    // First-ever save in this browser: confirm the user understands the AST
    // rewrite drops comments/formatting (see Plan 002 risk table).
    if (!localStorage.getItem(SAVED_ACK_KEY)) {
      const ok = confirm(
        'Saving rewrites the config file from its parsed AST.\n\n' +
          'This normalizes formatting (indent, quotes) and removes comments. ' +
          'A .bak backup is written next to the file.\n\n' +
          'Continue?',
      )
      if (!ok) return false
      localStorage.setItem(SAVED_ACK_KEY, '1')
    }
    saving.value = true
    error.value = ''
    try {
      const resp = await fetch(`/api/config/${moduleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: body.value }),
      })
      if (!resp.ok) {
        const j = await resp.json().catch(() => ({}))
        throw new Error(j.error || `HTTP ${resp.status}`)
      }
      dirty.value = false
      return true
    } catch (e: any) {
      error.value = e.message || String(e)
      return false
    } finally {
      saving.value = false
    }
  }

  // Kick off the initial load.
  reload()

  return { body, meta, loading, saving, error, dirty, save, reload }
}
