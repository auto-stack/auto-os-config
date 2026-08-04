<script setup lang="ts">
// The generic, schema-free config editor.
//
// Given a module id, it loads the config body JSON from the daemon and renders
// a form by walking every top-level key and asking inferField() which control
// to use. Nested objects render as a SubForm block (one level of recursion —
// enough for tier_routing / provider blocks / harness); arrays of objects
// render as tables. There is NO per-module code here: any registered file
// module gets a working form for free.

import { computed } from 'vue'
import { useConfig } from '../editor/useConfig'
import { humanize, inferField } from '../editor/types'
import ScalarFields from '../editor/controls/ScalarFields.vue'
import TableField from '../editor/controls/TableField.vue'

const props = defineProps<{ moduleId: string }>()

const { body, meta, loading, saving, error, dirty, save, reload } = useConfig(props.moduleId)

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
            <div class="subform-header">{{ humanize(k as string) }}</div>
            <div class="subform-body">
              <template v-for="(sv, sk) in v" :key="sk">
                <!-- table inside a sub-form (e.g. tier_routing.max) -->
                <div v-if="isObjectArray(sv)" class="field-row">
                  <label class="field-label">{{ humanize(sk as string) }}</label>
                  <TableField
                    :model-value="sv"
                    :module-id="moduleId"
                    @update:model-value=";(body[k as string][sk as string] = $event), markDirty()"
                  />
                </div>
                <!-- scalar leaf -->
                <ScalarFields
                  v-else
                  :spec="inferField(sk as string, sv, moduleId, selectedProvider)"
                  :model-value="sv"
                  @update:model-value=";(body[k as string][sk as string] = $event), markDirty()"
                />
              </template>
            </div>
          </div>

          <!-- top-level array of objects → table -->
          <div v-else-if="isObjectArray(v)" class="field-row">
            <label class="field-label">{{ humanize(k as string) }}</label>
            <TableField :model-value="v" :module-id="moduleId" @update:model-value=";(body[k as string] = $event), markDirty()" />
          </div>

          <!-- top-level scalar leaf -->
          <ScalarFields
            v-else
            :spec="inferField(k as string, v, moduleId, selectedProvider)"
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
