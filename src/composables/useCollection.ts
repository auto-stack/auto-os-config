// Collection editing composable: list entities, load one, save/delete/create.
//
// Mirrors useConfig but for a collection module (a directory of entity files).
// For atom entities (roles) the loaded body is the entity's AST projection +
// an optional text sidecar (soul.md). For frontmatter-md (skills) we expose a
// read-only { name, description, body }.

import { ref, type Ref } from 'vue'

export interface EntitySummary {
  name: string
  description: string
}

export interface UseCollection {
  list: Ref<EntitySummary[]>
  selectedName: Ref<string | null>
  /** atom: the entity body JSON; frontmatter-md: null (use fm fields) */
  body: Ref<Record<string, any> | null>
  /** atom: sidecar text (soul.md); frontmatter-md: null */
  sidecar: Ref<string>
  /** frontmatter-md fields (skills); atom: null */
  fm: Ref<{ name: string; description: string; body: string } | null>
  isReadOnly: Ref<boolean>
  listLoading: Ref<boolean>
  loading: Ref<boolean>
  saving: Ref<boolean>
  error: Ref<string>
  dirty: Ref<boolean>
  filter: Ref<string>
  reloadList: () => Promise<void>
  select: (name: string) => Promise<void>
  create: (name: string) => Promise<boolean>
  save: () => Promise<boolean>
  remove: (name: string) => Promise<boolean>
}

export function useCollection(moduleId: string): UseCollection {
  const list = ref<EntitySummary[]>([])
  const selectedName = ref<string | null>(null)
  const body = ref<Record<string, any> | null>(null)
  const sidecar = ref<string>('')
  const fm = ref<{ name: string; description: string; body: string } | null>(null)
  const isReadOnly = ref(false)
  const listLoading = ref(false)
  const loading = ref(false)
  const saving = ref(false)
  const error = ref('')
  const dirty = ref(false)
  const filter = ref('')

  async function reloadList() {
    listLoading.value = true
    try {
      const resp = await fetch(`/api/collection/${moduleId}`)
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      list.value = await resp.json()
    } catch (e: any) {
      error.value = e.message || String(e)
      list.value = []
    } finally {
      listLoading.value = false
    }
  }

  async function select(name: string) {
    selectedName.value = name
    loading.value = true
    error.value = ''
    body.value = null
    sidecar.value = ''
    fm.value = null
    dirty.value = false
    try {
      const resp = await fetch(`/api/collection/${moduleId}/${encodeURIComponent(name)}`)
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const data = await resp.json()
      if (data.value !== undefined) {
        // atom entity: body + sidecar
        body.value = data.value
        sidecar.value = data.sidecar || ''
        isReadOnly.value = false
      } else {
        // frontmatter-md (skill): read-only
        fm.value = { name: data.name, description: data.description, body: data.body }
        isReadOnly.value = true
      }
    } catch (e: any) {
      error.value = e.message || String(e)
    } finally {
      loading.value = false
    }
  }

  async function create(name: string): Promise<boolean> {
    saving.value = true
    error.value = ''
    try {
      const resp = await fetch(`/api/collection/${moduleId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (!resp.ok) {
        const j = await resp.json().catch(() => ({}))
        throw new Error(j.error || `HTTP ${resp.status}`)
      }
      await reloadList()
      await select(name)
      return true
    } catch (e: any) {
      error.value = e.message || String(e)
      return false
    } finally {
      saving.value = false
    }
  }

  async function save(): Promise<boolean> {
    if (!selectedName.value || !body.value) return false
    saving.value = true
    error.value = ''
    try {
      const resp = await fetch(
        `/api/collection/${moduleId}/${encodeURIComponent(selectedName.value)}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value: body.value, sidecar: sidecar.value }),
        },
      )
      if (!resp.ok) {
        const j = await resp.json().catch(() => ({}))
        throw new Error(j.error || `HTTP ${resp.status}`)
      }
      dirty.value = false
      await reloadList()
      return true
    } catch (e: any) {
      error.value = e.message || String(e)
      return false
    } finally {
      saving.value = false
    }
  }

  async function remove(name: string): Promise<boolean> {
    error.value = ''
    try {
      const resp = await fetch(
        `/api/collection/${moduleId}/${encodeURIComponent(name)}`,
        { method: 'DELETE' },
      )
      if (!resp.ok) {
        const j = await resp.json().catch(() => ({}))
        throw new Error(j.error || `HTTP ${resp.status}`)
      }
      if (selectedName.value === name) {
        selectedName.value = null
        body.value = null
      }
      await reloadList()
      return true
    } catch (e: any) {
      error.value = e.message || String(e)
      return false
    }
  }

  reloadList()

  return {
    list,
    selectedName,
    body,
    sidecar,
    fm,
    isReadOnly,
    listLoading,
    loading,
    saving,
    error,
    dirty,
    filter,
    reloadList,
    select,
    create,
    save,
    remove,
  }
}
