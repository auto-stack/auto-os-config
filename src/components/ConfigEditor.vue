<script setup lang="ts">
// The generic, schema-free config editor.
//
// Given a module id, it loads the config body JSON from the daemon and renders
// a form by walking every top-level key and asking inferField() which control
// to use. Nested objects render as a SubForm block (one level of recursion —
// enough for tier_routing / provider blocks / harness); arrays of objects
// render as tables. There is NO per-module code here: any registered file
// module gets a working form for free.

import { computed, ref } from 'vue'
import { useConfig } from '../editor/useConfig'
import { humanize, inferField } from '../editor/types'
import ScalarFields from '../editor/controls/ScalarFields.vue'
import TableField from '../editor/controls/TableField.vue'

const props = defineProps<{ module_id: string }>()

const { body, meta, loading, saving, error, dirty, save, reload } = useConfig(props.module_id)

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}
function isObjectArray(v: unknown): v is Record<string, unknown>[] {
  return Array.isArray(v) && v.length > 0 && v.every((x) => typeof x === 'object' && x !== null)
}

// For default_model's select to list the selected provider's models, inferField
// needs the current provider — read it reactively from the body.
const selectedProvider = computed(() => (body.value?.default_provider as string) ?? '')

function markDirty() {
  dirty.value = true
}

// ── Block add/delete (Plan 005 §1.3) ────────────────────────────────────────
// The parity gap: the generic editor couldn't add/remove whole child blocks
// (providers). Add goes through the normal Save→PUT path (merge_node_body now
// creates a child block for a new object key); delete uses the structured
// DELETE /api/config/:id/blocks/:name endpoint then reloads.

const addingBlock = ref(false)
const newBlockName = ref('')
const blockError = ref('')

/// A child block is "provider-shaped" (gets a delete affordance) when it
/// carries a `kind` prop — same convention as the daemon's enum_self_providers
/// and auto-ai's parse_provider_blocks. Non-provider blocks (e.g. tier_routing,
/// musk's harness) are left alone.
function isProviderBlock(v: Record<string, unknown>): boolean {
  return 'kind' in v
}

function addBlock() {
  const name = newBlockName.value.trim()
  if (!name) return
  const b = body.value as Record<string, unknown> | null
  if (!b) return
  if (name in b) {
    blockError.value = `"${name}" already exists in this config`
    return
  }
  b[name] = { kind: 'openai', base_url: '', api_key: '', models: [] }
  newBlockName.value = ''
  addingBlock.value = false
  blockError.value = ''
  markDirty()
}

async function deleteBlock(name: string) {
  if (!confirm(`Delete block "${name}"? It is removed from the file (original preserved in .bak).`)) {
    return
  }
  blockError.value = ''
  try {
    const resp = await fetch(
      `/api/config/${props.module_id}/blocks/${encodeURIComponent(name)}`,
      { method: 'DELETE' },
    )
    if (!resp.ok) {
      const j = await resp.json().catch(() => null)
      blockError.value = `Delete failed: ${(j as { error?: string } | null)?.error ?? resp.status}`
      return
    }
    await reload() // the server rewrote the file; re-read it
  } catch (e: any) {
    blockError.value = `Delete failed: ${e.message || e}`
  }
}
</script>

<template>
  <div class="config-editor">
    <div v-if="loading" class="state-msg">Loading…</div>
    <div v-else-if="error" class="state-msg error">
      ✗ {{ error }}
      <span class="hint">Is the config daemon running on :17701?</span>
    </div>

    <template v-else-if="body">
      <div class="toolbar">
        <div class="meta">
          <span class="mono">{{ meta?.file }}</span>
          <span v-if="dirty" class="dirty">● unsaved</span>
        </div>
        <div class="actions">
          <span v-if="blockError" class="block-error">{{ blockError }}</span>
          <template v-if="addingBlock">
            <input
              v-model="newBlockName"
              class="block-name"
              placeholder="block name"
              @keyup.enter="addBlock"
            />
            <button class="btn" @click="addBlock">Add</button>
            <button class="btn" @click="addingBlock = false; newBlockName = ''; blockError = ''">Cancel</button>
          </template>
          <button v-else class="btn" @click="addingBlock = true">＋ Add block</button>
          <button class="btn" :disabled="saving" @click="reload">Reload</button>
          <button class="btn primary" :disabled="saving || !dirty" @click="save">
            {{ saving ? 'Saving…' : 'Save' }}
          </button>
        </div>
      </div>

      <div class="fields">
        <template v-for="(v, k) in body" :key="k">
          <!-- nested object → SubForm block -->
          <div v-if="isObject(v)" class="subform">
            <div class="subform-header">
              <span class="subform-title">{{ humanize(k as string) }}</span>
              <button
                v-if="isProviderBlock(v)"
                class="btn danger btn-sm"
                title="Delete this block from the file"
                @click="deleteBlock(k as string)"
              >🗑</button>
            </div>
            <div class="subform-body">
              <template v-for="(sv, sk) in v" :key="sk">
                <!-- table inside a sub-form (e.g. tier_routing.max) -->
                <div v-if="isObjectArray(sv)" class="field-row">
                  <label class="field-label">{{ humanize(sk as string) }}</label>
                  <TableField
                    :model-value="sv"
                    :module_id="module_id"
                    @update:model-value=";(body[k as string][sk as string] = $event), markDirty()"
                  />
                </div>
                <!-- scalar leaf -->
                <ScalarFields
                  v-else
                  :spec="inferField(sk as string, sv, module_id, selectedProvider)"
                  :model-value="sv"
                  @update:model-value=";(body[k as string][sk as string] = $event), markDirty()"
                />
              </template>
            </div>
          </div>

          <!-- top-level array of objects → table -->
          <div v-else-if="isObjectArray(v)" class="field-row">
            <label class="field-label">{{ humanize(k as string) }}</label>
            <TableField :model-value="v" :module_id="module_id" @update:model-value=";(body[k as string] = $event), markDirty()" />
          </div>

          <!-- top-level scalar leaf -->
          <ScalarFields
            v-else
            :spec="inferField(k as string, v, module_id, selectedProvider)"
            :model-value="v"
            @update:model-value=";(body[k as string] = $event), markDirty()"
          />
        </template>
      </div>

      <div class="toolbar bottom">
        <div class="actions">
          <button class="btn primary" :disabled="saving || !dirty" @click="save">
            {{ saving ? 'Saving…' : 'Save' }}
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.config-editor {
  max-width: 820px;
}
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0 16px 0;
  border-bottom: 1px solid var(--border);
  margin-bottom: 8px;
}
.toolbar.bottom {
  border-bottom: none;
  border-top: 1px solid var(--border);
  margin-top: 16px;
  padding-top: 16px;
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
}
.dirty {
  color: var(--accent);
  font-weight: 500;
}
.actions {
  display: flex;
  gap: 8px;
  margin-left: auto;
}
.btn {
  border: 1px solid var(--border);
  background: var(--bg-card);
  color: var(--text-primary);
  padding: 6px 16px;
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
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.fields {
  display: flex;
  flex-direction: column;
}
.subform {
  border: 1px solid var(--border);
  border-radius: var(--radius, 8px);
  margin: 12px 0;
  background: var(--bg-card);
}
.subform-header {
  padding: 8px 14px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-hover);
  border-radius: var(--radius, 8px) var(--radius, 8px) 0 0;
  font-weight: 600;
  font-size: var(--font-size-base);
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.btn.danger {
  border-color: var(--danger);
  color: var(--danger);
  background: transparent;
}
.btn.danger:hover:not(:disabled) {
  background: rgba(196, 43, 28, 0.08);
}
.btn-sm {
  padding: 2px 8px;
  font-size: var(--font-size-sm);
  line-height: 1.4;
}
.block-name {
  width: 160px;
  padding: 5px 8px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm, 4px);
  font-size: var(--font-size-sm);
  background: var(--bg-card);
  color: var(--text-primary);
}
.block-error {
  color: var(--danger);
  font-size: var(--font-size-sm);
}
.subform-body {
  padding: 8px 14px;
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
.state-msg.error .hint {
  display: block;
  margin-top: 6px;
  font-size: var(--font-size-sm);
  opacity: 0.85;
}
</style>
