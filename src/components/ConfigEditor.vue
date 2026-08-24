<!-- ConfigEditor component - Auto-generated from Auto language -->
<script setup lang="ts">
import { onMounted } from 'vue'
import { ScalarFields } from '../../auto/src/front/utils/controls_ext'
import { TableField } from '../../auto/src/front/utils/controls_ext'
import { fetchConfigSafe, putConfigSafe, deleteBlockSafe, configEntries, setCfgEntry, addBlockBody, confirmDeleteBlock, confirmSaveOnce, bodyHas } from '../../auto/src/front/utils/controls_ext'


const loading = defineModel<boolean>("loading", { default: false })
const saving = defineModel<boolean>("saving", { default: false })
const error = defineModel<string>("error", { default: '' })
const dirty = defineModel<boolean>("dirty", { default: false })
const meta_file = defineModel<string>("meta_file", { default: '' })
const entries = defineModel<any[]>("entries", { default: [] })
const body = defineModel<any>("body", { default: null })
const adding_block = defineModel<boolean>("adding_block", { default: false })
const new_block_name = defineModel<string>("new_block_name", { default: '' })
const block_error = defineModel<string>("block_error", { default: '' })

const props = defineProps<{
  module_id: string
}>()

const emit = defineEmits<{
  Init: []
  FieldEdited: [any]
  Save: []
  Reload: []
  ToggleAddBlock: []
  NewBlockNameChanged: []
  AddBlock: []
  CancelAddBlock: []
  DeleteBlock: [string]
}>()

function AddBlock(): void {
  let name = new_block_name.value.trim();
  if (name != '') {if (body.value != null) {if (bodyHas(body.value, name)) {block_error.value = `"${name}" already exists in this config`;
  }if (bodyHas(body.value, name) == false) {body.value = addBlockBody(body.value, name);
  entries.value = configEntries(body.value, props.module_id);
  new_block_name.value = '';
  adding_block.value = false;
  block_error.value = '';
  dirty.value = true;
  }}}

  emit('AddBlock')
}

function CancelAddBlock(): void {
  adding_block.value = false;
  new_block_name.value = '';
  block_error.value = '';

  emit('CancelAddBlock')
}

function DeleteBlock(name: any): void {
  if (confirmDeleteBlock(name)) {block_error.value = '';
  let p = deleteBlockSafe(props.module_id, name);
  p.then((r: any) => { if (r.ok) {let q = fetchConfigSafe(props.module_id);
  q.then((rr: any) => { if (rr.ok) {body.value = rr.value;
  entries.value = configEntries(rr.value, props.module_id);
  meta_file.value = rr.meta.file;
  dirty.value = false;
  }if (rr.ok == false) {error.value = rr.error;
  } });
  }if (r.ok == false) {block_error.value = `Delete failed: ${r.error}`;
  } });
  }

  emit('DeleteBlock', name)
}

function FieldEdited(args: any): void {
  let r = setCfgEntry(entries.value, args.path, args.value, body.value, props.module_id);
  entries.value = r.entries;
  body.value = r.body;
  dirty.value = true;

  emit('FieldEdited', args)
}

function NewBlockNameChanged(): void {
  new_block_name.value = new_block_name.value;

  emit('NewBlockNameChanged')
}

function Reload(): void {
  loading.value = true;
  error.value = '';
  let p = fetchConfigSafe(props.module_id);
  p.then((r: any) => { if (r.ok) {body.value = r.value;
  entries.value = configEntries(r.value, props.module_id);
  meta_file.value = r.meta.file;
  dirty.value = false;
  }if (r.ok == false) {error.value = r.error;
  }loading.value = false;
   });

  emit('Reload')
}

function Save(): void {
  if (dirty.value && body.value != null) {if (confirmSaveOnce()) {saving.value = true;
  error.value = '';
  let p = putConfigSafe(props.module_id, body.value);
  p.then((r: any) => { if (r.ok) {dirty.value = false;
  }if (r.ok == false) {error.value = r.error;
  }saving.value = false;
   });
  }}

  emit('Save')
}

function ToggleAddBlock(): void {
  adding_block.value = !adding_block.value;

  emit('ToggleAddBlock')
}

onMounted(() => {
  loading.value = true;
  error.value = '';
  let p = fetchConfigSafe(props.module_id);
  p.then((r: any) => { if (r.ok) {body.value = r.value;
  entries.value = configEntries(r.value, props.module_id);
  meta_file.value = r.meta.file;
  dirty.value = false;
  }if (r.ok == false) {error.value = r.error;
  body.value = null;
  }loading.value = false;
   });
})


</script>

<template>
    <div class="config-editor">
      <template v-if="loading">
        <div class="state-msg">
          <span>Loading…</span>
        </div>
      </template>
      <template v-if="loading == false && error != '' && body == null">
        <div class="state-msg error">
          <span>✗ {{ error }}</span>
          <span class="hint">
            <span>Is the config daemon running on :17701?</span>
          </span>
        </div>
      </template>
      <template v-if="body != null">
        <div class="toolbar">
          <div class="meta">
            <span class="mono">
              <span>{{ meta_file }}</span>
            </span>
            <template v-if="dirty">
              <span class="dirty">
                <span>● unsaved</span>
              </span>
            </template>
          </div>
          <div class="actions">
            <template v-if="block_error != ''">
              <span class="block-error">
                <span>{{ block_error }}</span>
              </span>
            </template>
            <template v-if="adding_block">
              <input class="block-name" :placeholder="'block name'" v-model="new_block_name" @input="NewBlockNameChanged" @keydown.enter="AddBlock" @keyup="NewBlockNameChanged" />
              <button class="btn" @click="AddBlock">
                <span>Add</span>
              </button>
              <button class="btn" @click="CancelAddBlock">
                <span>Cancel</span>
              </button>
            </template>
            <template v-if="adding_block == false">
              <button class="btn" @click="ToggleAddBlock">
                <span>＋ Add block</span>
              </button>
            </template>
            <button class="btn" :disabled="saving" @click="Reload">
              <span>Reload</span>
            </button>
            <button class="btn primary" :disabled="saving || dirty == false" @click="Save">
              <template v-if="saving">
                <span>Saving…</span>
              </template>
              <template v-if="saving == false">
                <span>Save</span>
              </template>
            </button>
          </div>
        </div>
        <div class="fields">
          <div class="entry" :key="e.path" v-for="e in entries">
            <template v-if="e.kind == 'subform'">
              <div class="subform">
                <div class="subform-header">
                  <span class="subform-title">
                    <span>{{ e.spec.label }}</span>
                  </span>
                  <template v-if="e.is_provider">
                    <button class="btn danger btn-sm" :title="'Delete this block from the file'" @click="DeleteBlock(e.key)">
                      <span>🗑</span>
                    </button>
                  </template>
                </div>
                <div class="subform-body">
                  <div class="entry" :key="s.path" v-for="s in e.sub">
                    <template v-if="s.is_table">
                      <div class="field-row">
                        <label class="field-label">
                          <span>{{ s.spec.label }}</span>
                        </label>
                        <TableField :modelValue="s.value" :module_id="module_id" :path="s.path" :key="'TableField-1-' + (((s as any)?.id ?? s))" @Value="FieldEdited($event)" />
                      </div>
                    </template>
                    <template v-if="s.is_table == false">
                      <ScalarFields :modelValue="s.value" :path="s.path" :spec="s.spec" :key="'ScalarFields-2-' + (((s as any)?.id ?? s))" @Value="FieldEdited($event)" />
                    </template>
                  </div>
                </div>
              </div>
            </template>
            <template v-if="e.kind == 'table'">
              <div class="field-row">
                <label class="field-label">
                  <span>{{ e.spec.label }}</span>
                </label>
                <TableField :modelValue="e.value" :module_id="module_id" :path="e.path" :key="'TableField-3-' + (((e as any)?.id ?? e))" @Value="FieldEdited($event)" />
              </div>
            </template>
            <template v-if="e.kind == 'scalar'">
              <ScalarFields :modelValue="e.value" :path="e.path" :spec="e.spec" :key="'ScalarFields-4-' + (((e as any)?.id ?? e))" @Value="FieldEdited($event)" />
            </template>
          </div>
        </div>
        <div class="toolbar bottom">
          <div class="actions">
            <button class="btn primary" :disabled="saving || dirty == false" @click="Save">
              <template v-if="saving">
                <span>Saving…</span>
              </template>
              <template v-if="saving == false">
                <span>Save</span>
              </template>
            </button>
          </div>
        </div>
      </template>
    </div>

</template>

<style>
/* Component styles */

</style>

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
