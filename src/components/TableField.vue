<!-- TableField component - Auto-generated from Auto language -->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { tableInfo, setCell, loadColumnOptions, blankRow, mergeCols, removeRowAt } from '../../auto/src/front/utils/controls_ext'


const col_options = ref<any>({})

const info = computed<any>(() => tableInfo(props.modelValue, props.module_id))
const view_cols = computed<any>(() => mergeCols(info.value, col_options.value))

const props = defineProps<{
  modelValue: any
  module_id: string
  path: string
}>()

const emit = defineEmits<{
  Value: [any]
  Init: []
  SetCell: [any]
  AddRow: []
  RemoveRow: [number]
}>()

function AddRow(): void {
  emit('Value', { path: props.path, value: props.modelValue.concat([blankRow(info.value.cols)]) });
}

function RemoveRow(i: any): void {
  if (props.modelValue != null) {emit('Value', { path: props.path, value: removeRowAt(props.modelValue, i) });
  }
}

function SetCell(args: any): void {
  let v = args.e.target.value;
  if (args.num) {v = parseInt(args.e.target.value);
  }
  emit('Value', { path: props.path, value: setCell(props.modelValue, args.i, args.c, v) });
}

onMounted(() => {
  let p = loadColumnOptions(info.value.enumUrls);
  p.then((opts: any) => { col_options.value = opts;
   });
})


</script>

<template>
    <div class="table-wrap">
      <table class="tbl">
        <thead>
          <tr>
            <th :key="c" v-for="c in info.cols">
              <span>{{ c }}</span>
            </th>
            <th class="row-act" />
          </tr>
        </thead>
        <tbody>
          <tr :key="i" v-for="(row, i) in modelValue">
            <td :key="c.name" v-for="c in view_cols">
              <template v-if="c.kind == 'select'">
                <select class="cell-select" :value="row[c.name]" @change="SetCell({ i: i, c: c.name, e: $event, sel: true })">
                  <option :key="o.value" :value="o.value" v-for="o in c.options">
                    <span>{{ o.label }}</span>
                  </option>
                  <option :value="row[c.name]">
                    <span>{{ row[c.name] }}</span>
                  </option>
                </select>
              </template>
              <template v-else-if="c.kind == 'number'">
                <input class="cell-input" :type="'number'" v-model="row[c.name]" @input="SetCell({ i: i, c: c.name, e: $event, num: true })" />
              </template>
              <template v-else>
                <input class="cell-input" :type="'text'" v-model="row[c.name]" @input="SetCell({ i: i, c: c.name, e: $event })" />
              </template>
            </td>
            <td class="row-act">
              <button class="del-row" :title="'Remove row'" @click="RemoveRow(i)">
                <span>×</span>
              </button>
            </td>
          </tr>
          <template v-if="modelValue.length == 0">
            <tr>
              <td class="empty">
                <span>(empty — click + Row)</span>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
      <button class="add-row" @click="AddRow">
        <span>+ Row</span>
      </button>
    </div>

</template>

<style>
/* Component styles */

</style>

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
        .tbl th,
        .tbl td {
            text-align: left;
            padding: 6px 10px;
            border-bottom: 1px solid var(--border);
            border-right: 1px solid var(--border);
        }
        .tbl th:last-child,
        .tbl td:last-child {
            border-right: none;
        }
        .tbl th {
            background: var(--bg-hover);
            font-weight: 600;
            font-size: var(--font-size-sm);
            color: var(--text-secondary);
            text-transform: none;
        }
        .tbl tbody tr:last-child td {
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
