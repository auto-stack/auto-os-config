<script setup lang="ts">
// All the leaf controls for the generic editor, in one file (each is tiny).
// A single FieldRow wrapper gives consistent label/value layout + theming.

import { computed, ref, watch } from 'vue'
import type { FieldSpec } from '../types'
import { loadEnum } from '../useEnums'

const props = defineProps<{
  spec: FieldSpec
  modelValue: any
}>()
const emit = defineEmits<{ (e: 'update:modelValue', v: any): void }>()

function set(v: any) {
  emit('update:modelValue', v)
}

// ---- select / multiselect options ----
const options = ref<{ value: string; label: string }[]>([])
watch(
  () => props.spec.optionsFrom,
  async (src) => {
    if (src) options.value = await loadEnum(src)
    else options.value = []
  },
  { immediate: true },
)

// ---- password reveal (separate from options) ----
const revealSecret = ref(false)

// ---- tags (free-form string array) ----
const tagInput = ref('')
function addTag() {
  const v = tagInput.value.trim()
  if (!v) return
  const arr = Array.isArray(props.modelValue) ? [...props.modelValue] : []
  if (!arr.includes(v)) arr.push(v)
  set(arr)
  tagInput.value = ''
}
function removeTag(t: string) {
  set(Array.isArray(props.modelValue) ? props.modelValue.filter((x: any) => x !== t) : [])
}
</script>

<template>
  <div class="field-row">
    <label class="field-label">{{ spec.label }}</label>

    <div class="field-control">
      <!-- toggle -->
      <label v-if="spec.kind === 'toggle'" class="toggle">
        <input type="checkbox" :checked="!!modelValue" @change="set(($event.target as HTMLInputElement).checked)" />
        <span class="toggle-track"><span class="toggle-thumb" /></span>
        <span class="toggle-text">{{ modelValue ? 'On' : 'Off' }}</span>
      </label>

      <!-- number -->
      <input
        v-else-if="spec.kind === 'number'"
        class="input"
        type="number"
        :value="modelValue"
        @input="set(Number(($event.target as HTMLInputElement).value))"
      />

      <!-- password -->
      <div v-else-if="spec.kind === 'password'" class="secret">
        <input
          class="input"
          :type="revealSecret ? 'text' : 'password'"
          :value="modelValue ?? ''"
          @input="set(($event.target as HTMLInputElement).value)"
          placeholder="(not set)"
          autocomplete="off"
        />
        <button class="reveal" type="button" @click="revealSecret = !revealSecret">
          {{ revealSecret ? '🙈' : '👁' }}
        </button>
      </div>

      <!-- select (single) — falls back to text input + hint when no options -->
      <template v-else-if="spec.kind === 'select'">
        <select
          v-if="options.length > 0"
          class="input"
          :value="modelValue"
          @change="set(($event.target as HTMLSelectElement).value)"
        >
          <option v-for="o in options" :key="o.value" :value="o.value">{{ o.label }}</option>
          <option v-if="modelValue && !options.some((o) => o.value === modelValue)" :value="modelValue">
            {{ modelValue }} (current)
          </option>
        </select>
        <!-- empty options (e.g. modes are builtin, no disk dir) → free text -->
        <div v-else class="fallback-text">
          <input
            class="input"
            type="text"
            :value="modelValue ?? ''"
            @input="set(($event.target as HTMLInputElement).value)"
            placeholder="(not set)"
          />
          <span class="fallback-hint">no options available (e.g. builtin-only) — type freely</span>
        </div>
      </template>

      <!-- multiselect (checkbox list) -->
      <div v-else-if="spec.kind === 'multiselect'" class="multiselect">
        <label v-for="o in options" :key="o.value" class="ms-item">
          <input
            type="checkbox"
            :checked="Array.isArray(modelValue) && modelValue.includes(o.value)"
            @change="
              (() => {
                const arr: string[] = Array.isArray(modelValue) ? [...modelValue] : []
                const i = arr.indexOf(o.value)
                if (i >= 0) arr.splice(i, 1)
                else arr.push(o.value)
                set(arr)
              })()
            "
          />
          <span>{{ o.label }}</span>
        </label>
        <p v-if="options.length === 0" class="ms-empty">
          No options available (directory empty or missing). Current value: {{ JSON.stringify(modelValue) }}
        </p>
      </div>

      <!-- tags (free-form string array) -->
      <div v-else-if="spec.kind === 'tags'" class="tags">
        <span v-for="t in modelValue || []" :key="t" class="tag">
          {{ t }}
          <button type="button" class="tag-x" @click="removeTag(t)">×</button>
        </span>
        <input
          class="tag-input"
          v-model="tagInput"
          @keydown.enter.prevent="addTag"
          placeholder="add…"
        />
      </div>

      <!-- plain text (default) -->
      <input
        v-else
        class="input"
        type="text"
        :value="modelValue ?? ''"
        @input="set(($event.target as HTMLInputElement).value)"
        placeholder="(empty)"
      />
    </div>
  </div>
</template>

<style scoped>
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
.field-control {
  min-width: 0;
}
.input {
  width: 100%;
  max-width: 420px;
  padding: 6px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm, 4px);
  font-size: var(--font-size-base);
  background: var(--bg-input);
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
  font-family: inherit;
}
.input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--ring);
}

/* toggle */
.toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
}
.toggle input {
  display: none;
}
.toggle-track {
  width: 36px;
  height: 20px;
  border-radius: 10px;
  background: var(--bg-hover);
  border: 1px solid var(--border);
  position: relative;
  transition: background 0.15s;
}
.toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #fff;
  transition: transform 0.15s;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}
.toggle input:checked + .toggle-track {
  background: var(--accent);
  border-color: var(--accent);
}
.toggle input:checked + .toggle-track .toggle-thumb {
  transform: translateX(16px);
}
.toggle-text {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

/* password */
.secret {
  display: flex;
  gap: 6px;
  align-items: center;
  max-width: 420px;
}
.secret .input {
  flex: 1;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: var(--font-size-sm);
}
.reveal {
  border: 1px solid var(--border);
  background: var(--bg-card);
  border-radius: var(--radius-sm, 4px);
  padding: 4px 8px;
  cursor: pointer;
  font-size: 14px;
}

/* select fallback to text (empty options, e.g. builtin-only modes) */
.fallback-text {
  display: flex;
  flex-direction: column;
  gap: 3px;
  max-width: 420px;
}
.fallback-hint {
  font-size: 11px;
  color: var(--text-muted);
  font-style: italic;
}

/* multiselect */
.multiselect {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 16px;
  max-width: 560px;
}
.ms-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: var(--font-size-sm);
  cursor: pointer;
}
.ms-empty {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
  font-style: italic;
}

/* tags */
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  max-width: 560px;
}
.tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 4px 2px 8px;
  background: var(--accent-light);
  border: 1px solid var(--accent-light);
  border-radius: 10px;
  font-size: var(--font-size-sm);
  color: var(--accent);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
.tag-x {
  border: none;
  background: transparent;
  color: var(--accent);
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  padding: 0 2px;
}
.tag-x:hover {
  color: var(--danger);
}
.tag-input {
  border: none;
  outline: none;
  background: transparent;
  font-size: var(--font-size-sm);
  color: var(--text-primary);
  width: 90px;
}
</style>
