<script setup lang="ts">
// A table editor for arrays of homogeneous objects (e.g. tier_routing rows,
// provider models[]). Columns are inferred from the first row's keys; the
// daemon preserves insertion order, so adding/removing rows round-trips.

import { computed, ref, watch } from 'vue'
import { inferColumn, type FieldSpec } from '../types'
import { loadEnum } from '../useEnums'

const props = defineProps<{
  modelValue: Record<string, any>[]
  moduleId: string
}>()
const emit = defineEmits<{ (e: 'update:modelValue', v: Record<string, any>[]): void }>()

// Column keys: union of keys across all rows, in first-row order.
const columns = computed<string[]>(() => {
  const seen = new Set<string>()
  const cols: string[] = []
  for (const row of props.modelValue) {
    for (const k of Object.keys(row)) {
      if (!seen.has(k)) {
        seen.add(k)
        cols.push(k)
      }
    }
  }
  return cols
})

// Per-column control spec (inferred from the first row's value).
function colSpec(col: string): FieldSpec | null {
  const sample = props.modelValue.find((r) => col in r)?.[col]
  if (sample === undefined) return null
  return inferColumn(col, sample, props.moduleId)
}

// Cached enum options per column (for select columns like `tier`).
const colOptions = ref<Record<string, { value: string; label: string }[]>>({})
watch(
  columns,
  async (cols) => {
    const next: Record<string, { value: string; label: string }[]> = {}
    for (const c of cols) {
      const spec = colSpec(c)
      if (spec?.optionsFrom) next[c] = await loadEnum(spec.optionsFrom)
    }
    colOptions.value = next
  },
  { immediate: true },
)

function updateCell(rowIdx: number, col: string, val: any) {
  const next = props.modelValue.map((r) => ({ ...r }))
  next[rowIdx][col] = val
  emit('update:modelValue', next)
}
function addRow() {
  const blank: Record<string, any> = {}
  for (const c of columns.value) blank[c] = ''
  emit('update:modelValue', [...props.modelValue, blank])
}
function removeRow(idx: number) {
  emit('update:modelValue', props.modelValue.filter((_, i) => i !== idx))
}
</script>

<template>
  <div class="table-wrap">
    <table class="tbl">
      <thead>
        <tr>
          <th v-for="c in columns" :key="c">{{ c }}</th>
          <th class="row-act"></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, i) in modelValue" :key="i">
          <td v-for="c in columns" :key="c">
            <!-- select column (e.g. tier) -->
            <select
              v-if="colSpec(c)?.kind === 'select'"
              class="cell-select"
              :value="row[c]"
              @change="updateCell(i, c, ($event.target as HTMLSelectElement).value)"
            >
              <option v-for="o in colOptions[c] || []" :key="o.value" :value="o.value">{{ o.label }}</option>
              <option v-if="row[c] && !(colOptions[c] || []).some((o) => o.value === row[c])" :value="row[c]">
                {{ row[c] }}
              </option>
            </select>
            <!-- number column -->
            <input
              v-else-if="colSpec(c)?.kind === 'number'"
              class="cell-input"
              type="number"
              :value="row[c]"
              @input="updateCell(i, c, Number(($event.target as HTMLInputElement).value))"
            />
            <!-- text column (default) -->
            <input
              v-else
              class="cell-input"
              type="text"
              :value="row[c] ?? ''"
              @input="updateCell(i, c, ($event.target as HTMLInputElement).value)"
            />
          </td>
          <td class="row-act">
            <button type="button" class="del-row" title="Remove row" @click="removeRow(i)">×</button>
          </td>
        </tr>
        <tr v-if="modelValue.length === 0">
          <td :colspan="columns.length + 1" class="empty">(empty — click + Row)</td>
        </tr>
      </tbody>
    </table>
    <button type="button" class="add-row" @click="addRow">+ Row</button>
  </div>
</template>

<style scoped>
.table-wrap {
  border: 1px solid var(--border);
  border-radius: var(--radius-sm, 6px);
  overflow: hidden;
  max-width: 720px;
}
.tbl {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
}
th,
td {
  text-align: left;
  padding: 6px 10px;
  border-bottom: 1px solid var(--border);
  border-right: 1px solid var(--border);
}
th:last-child,
td:last-child {
  border-right: none;
}
th {
  background: var(--bg-hover);
  font-weight: 600;
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  text-transform: none;
}
tbody tr:last-child td {
  border-bottom: none;
}
.cell-input,
.cell-select {
  width: 100%;
  border: 1px solid transparent;
  background: transparent;
  font-size: var(--font-size-sm);
  padding: 3px 6px;
  border-radius: 3px;
  outline: none;
  font-family: inherit;
}
.cell-input:focus,
.cell-select:focus {
  border-color: var(--accent);
  background: var(--bg-input);
  box-shadow: 0 0 0 2px var(--ring);
}
.row-act {
  width: 32px;
  text-align: center;
}
.del-row {
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
}
.del-row:hover {
  color: var(--danger);
}
.empty {
  color: var(--text-muted);
  text-align: center;
  padding: 12px;
  font-style: italic;
}
.add-row {
  margin-top: 6px;
  border: 1px dashed var(--border);
  background: transparent;
  color: var(--text-secondary);
  padding: 4px 12px;
  border-radius: var(--radius-sm, 4px);
  cursor: pointer;
  font-size: var(--font-size-sm);
}
.add-row:hover {
  border-color: var(--accent);
  color: var(--accent);
}
</style>
