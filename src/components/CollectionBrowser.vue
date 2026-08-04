<script setup lang="ts">
// Master-detail browser for collection modules (roles, skills).
//
// Left: filterable list + "+ New" button. Right: the selected entity's editor.
//
// For atom entities (roles) the right pane renders the entity body via the same
// ScalarFields/TableField controls the file ConfigEditor uses, PLUS a sidecar
// textarea when the module declares one (roles → soul.md). For frontmatter-md
// entities (skills) the pane is read-only (name/description/markdown body) —
// v1 does not edit prompts through this UI.

import { computed, ref } from 'vue'
import { useCollection } from '../composables/useCollection'
import { humanize, inferField } from '../editor/types'
import ScalarFields from '../editor/controls/ScalarFields.vue'
import TableField from '../editor/controls/TableField.vue'

const props = defineProps<{
  moduleId: string
  /** Sidebar display name, for headings. */
  label?: string
  /** Module-level read-only (frontmatter-md collections like skills). Hides
   *  New/Edit before a selection loads. Per-entity isReadOnly confirms it. */
  readOnly?: boolean
}>()

const {
  list, selectedName, body, sidecar, fm, isReadOnly,
  listLoading, loading, saving, error, dirty, filter,
  reloadList, select, create, save, remove,
} = useCollection(props.moduleId)

// Module is editable only if not declared read-only at the module level AND the
// loaded entity isn't read-only. Used for the New button + editor visibility.
const canEdit = computed(() => !props.readOnly && !isReadOnly.value)

const creating = ref(false)
const newName = ref('')
const confirmDelete = ref<string | null>(null)

const filtered = computed(() => {
  const q = filter.value.trim().toLowerCase()
  if (!q) return list.value
  return list.value.filter(
    (e) => e.name.toLowerCase().includes(q) || e.description.toLowerCase().includes(q),
  )
})

async function doCreate() {
  const name = newName.value.trim()
  if (!name) return
  if (await create(name)) {
    creating.value = false
    newName.value = ''
  }
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}
function isObjectArray(v: unknown): v is Record<string, unknown>[] {
  return Array.isArray(v) && v.length > 0 && v.every((x) => typeof x === 'object' && x !== null)
}
function markDirty() {
  dirty.value = true
}
</script>

<template>
  <div class="collection">
    <!-- List pane -->
    <aside class="list-pane">
      <div class="list-head">
        <input v-model="filter" class="filter-input" placeholder="Filter…" />
        <button v-if="canEdit" class="btn icon" title="New" @click="creating = !creating">+</button>
      </div>
      <div v-if="creating" class="create-row">
        <input v-model="newName" class="name-input" placeholder="entity-name" @keydown.enter="doCreate" />
        <button class="btn small" :disabled="saving || !newName.trim()" @click="doCreate">Add</button>
        <button class="btn small" @click="creating = false; newName = ''">✕</button>
      </div>
      <div v-if="listLoading" class="list-msg">Loading…</div>
      <div v-else-if="filtered.length === 0" class="list-msg empty">
        <template v-if="list.length === 0">No entities.</template>
        <template v-else>No match.</template>
      </div>
      <ul v-else class="entity-list">
        <li
          v-for="e in filtered"
          :key="e.name"
          :class="{ active: selectedName === e.name }"
          @click="select(e.name)"
        >
          <span class="e-name">{{ e.name }}</span>
          <span v-if="e.description" class="e-desc">{{ e.description }}</span>
        </li>
      </ul>
    </aside>

    <!-- Detail pane -->
    <section class="detail-pane">
      <div v-if="error && !selectedName" class="state-msg error">✗ {{ error }}</div>
      <div v-else-if="!selectedName" class="state-msg">Select an entity from the left, or create a new one.</div>
      <div v-else-if="loading" class="state-msg">Loading…</div>

      <template v-else>
        <!-- toolbar -->
        <div class="toolbar">
          <div class="meta">
            <span class="mono">{{ selectedName }}</span>
            <span v-if="dirty" class="dirty">● unsaved</span>
            <span v-if="isReadOnly" class="ro-badge">read-only</span>
          </div>
          <div class="actions">
            <button v-if="canEdit" class="btn" :disabled="saving" @click="reloadList(); select(selectedName!)">Reload</button>
            <button v-if="canEdit" class="btn primary" :disabled="saving || !dirty" @click="save">
              {{ saving ? 'Saving…' : 'Save' }}
            </button>
            <button v-if="canEdit" class="btn danger" @click="confirmDelete = selectedName">Delete</button>
          </div>
        </div>
        <div v-if="error" class="state-msg error">✗ {{ error }}</div>

        <!-- atom entity: render body fields + sidecar -->
        <div v-if="body && canEdit" class="fields">
          <template v-for="(v, k) in body" :key="k">
            <div v-if="isObjectArray(v)" class="field-row">
              <label class="field-label">{{ humanize(k as string) }}</label>
              <TableField :model-value="v" :module-id="moduleId" @update:model-value=";(body[k as string] = $event), markDirty()" />
            </div>
            <ScalarFields
              v-else
              :spec="inferField(k as string, v, moduleId)"
              :model-value="v"
              @update:model-value=";(body[k as string] = $event), markDirty()"
            />
          </template>

          <!-- sidecar (soul.md for roles) -->
          <div v-if="sidecar !== undefined" class="field-row sidecar-row">
            <label class="field-label">Soul <span class="hint">(markdown sidecar)</span></label>
            <textarea
              v-model="sidecar"
              class="sidecar"
              placeholder="# Soul&#10;&#10;The role's system prompt / personality (markdown)."
              @input="markDirty"
            ></textarea>
          </div>
        </div>

        <!-- frontmatter-md (skill): read-only -->
        <div v-else-if="fm" class="fm-view">
          <div class="field-row">
            <label class="field-label">Name</label>
            <div class="readonly-val mono">{{ fm.name }}</div>
          </div>
          <div class="field-row">
            <label class="field-label">Description</label>
            <div class="readonly-val">{{ fm.description }}</div>
          </div>
          <pre class="skill-body">{{ fm.body }}</pre>
        </div>
      </template>
    </section>

    <!-- delete confirm -->
    <div v-if="confirmDelete" class="modal-backdrop" @click.self="confirmDelete = null">
      <div class="modal">
        <p>Delete <strong>{{ confirmDelete }}</strong>?</p>
        <p class="modal-hint">This removes the <code>.at</code> file and its sidecar. A <code>.bak</code> is kept.</p>
        <div class="modal-actions">
          <button class="btn" @click="confirmDelete = null">Cancel</button>
          <button class="btn danger" @click="remove(confirmDelete!); confirmDelete = null">Delete</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.collection {
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 16px;
  max-width: 960px;
}
/* list pane */
.list-pane {
  border: 1px solid var(--border);
  border-radius: var(--radius, 8px);
  background: var(--bg-card);
  height: fit-content;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
}
.list-head {
  display: flex;
  gap: 6px;
  padding: 8px;
  border-bottom: 1px solid var(--border);
}
.filter-input {
  flex: 1;
  padding: 5px 9px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm, 4px);
  font-size: var(--font-size-sm);
  background: var(--bg-input);
  outline: none;
}
.filter-input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px var(--ring);
}
.create-row {
  display: flex;
  gap: 4px;
  padding: 8px;
  border-bottom: 1px solid var(--border);
  background: var(--accent-lighter);
}
.name-input {
  flex: 1;
  padding: 4px 8px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm, 4px);
  font-size: var(--font-size-sm);
  background: var(--bg-input);
  outline: none;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
.entity-list {
  list-style: none;
  margin: 0;
  padding: 4px;
  overflow-y: auto;
}
.entity-list li {
  padding: 7px 10px;
  border-radius: var(--radius-sm, 4px);
  cursor: pointer;
  transition: background 0.12s;
}
.entity-list li:hover {
  background: var(--bg-hover);
}
.entity-list li.active {
  background: var(--accent-light);
}
.e-name {
  display: block;
  font-weight: 600;
  font-size: var(--font-size-sm);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  color: var(--text-primary);
}
.e-desc {
  display: block;
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 2px;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.list-msg {
  padding: 16px;
  text-align: center;
  color: var(--text-muted);
  font-size: var(--font-size-sm);
}
.list-msg.empty {
  font-style: italic;
}
/* detail pane */
.detail-pane {
  min-width: 0;
}
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 0 12px 0;
  border-bottom: 1px solid var(--border);
  margin-bottom: 8px;
}
.meta {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: var(--font-size-sm);
  color: var(--text-muted);
}
.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  color: var(--text-primary);
  font-weight: 600;
}
.dirty {
  color: var(--accent);
}
.ro-badge {
  background: var(--bg-hover);
  color: var(--text-secondary);
  padding: 1px 8px;
  border-radius: 10px;
  font-size: 11px;
}
.actions {
  display: flex;
  gap: 8px;
}
.btn {
  border: 1px solid var(--border);
  background: var(--bg-card);
  color: var(--text-primary);
  padding: 5px 14px;
  border-radius: var(--radius-sm, 4px);
  cursor: pointer;
  font-size: var(--font-size-sm);
  transition: all 0.15s;
}
.btn:hover:not(:disabled) {
  background: var(--bg-hover);
}
.btn.primary {
  background: var(--accent);
  color: var(--accent-foreground);
  border-color: var(--accent);
}
.btn.primary:hover:not(:disabled) {
  background: var(--accent-hover);
}
.btn.danger {
  color: var(--danger);
  border-color: var(--border);
}
.btn.danger:hover {
  background: rgba(196, 43, 28, 0.08);
  border-color: var(--danger);
}
.btn.icon {
  padding: 4px 10px;
  font-size: 16px;
  line-height: 1;
}
.btn.small {
  padding: 4px 10px;
}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.fields {
  display: flex;
  flex-direction: column;
}
.field-row {
  display: grid;
  grid-template-columns: 160px 1fr;
  gap: 12px;
  align-items: start;
  padding: 8px 0;
}
.field-label {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  padding-top: 6px;
  font-weight: 500;
}
.field-label .hint {
  font-weight: 400;
  color: var(--text-muted);
  font-size: 11px;
}
.sidecar {
  width: 100%;
  min-height: 160px;
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm, 4px);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: var(--font-size-sm);
  background: var(--bg-input);
  outline: none;
  resize: vertical;
  line-height: 1.5;
}
.sidecar:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px var(--ring);
}
/* read-only skill view */
.readonly-val {
  font-size: var(--font-size-sm);
  color: var(--text-primary);
  padding-top: 6px;
}
.skill-body {
  margin-top: 12px;
  padding: 12px 14px;
  background: var(--bg-hover);
  border-radius: var(--radius, 8px);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: var(--font-size-sm);
  line-height: 1.5;
  white-space: pre-wrap;
  max-height: 50vh;
  overflow-y: auto;
  color: var(--text-secondary);
}
.state-msg {
  padding: 14px;
  border-radius: var(--radius, 8px);
  background: var(--bg-hover);
  color: var(--text-secondary);
  font-size: var(--font-size-base);
}
.state-msg.error {
  background: rgba(196, 43, 28, 0.08);
  color: var(--danger);
}
/* modal */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}
.modal {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius, 8px);
  padding: 20px 24px;
  max-width: 380px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
}
.modal p {
  margin: 0 0 8px 0;
  font-size: var(--font-size-base);
}
.modal-hint {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
}
.modal-hint code {
  background: var(--bg-hover);
  padding: 1px 4px;
  border-radius: 3px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
.modal-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
