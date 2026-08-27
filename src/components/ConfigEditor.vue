<!-- ConfigEditor component - Auto-generated from Auto language -->
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { addBlockText, bodyHasText, deleteBlockSafe, editField, editTagField, entriesCount, entryAt, fetchConfigSafe, metaFile, putConfigSafe, setCellText, subAt, subCount, tableAddRowText, tableRemoveRowText, warmEnumsText } from '@/lib/api'

const body = ref<string>('')
const entries = ref<any[]>([])
const loading = ref<boolean>(false)
const error = ref<string>('')
const dirty = ref<boolean>(false)
const saving = ref<boolean>(false)
const status = ref<string>('')
const loaded_once = ref<boolean>(false)
const draft = ref<string>('')
const pw_show = ref<boolean>(false)
const meta_file = ref<string>('')
const adding_block = ref<boolean>(false)
const new_block_name = ref<string>('')
const block_error = ref<string>('')
const confirm_save = ref<boolean>(false)
const save_acked = ref<boolean>(false)
const confirm_del = ref<string>('')

const props = defineProps<{
  module_id: string
}>()

const emit = defineEmits<{
  Init: []
  Load: []
  Save: []
  ConfirmSaveYes: []
  ConfirmSaveNo: []
  Draft: [string]
  NameDraft: [string]
  Apply: [any, string]
  TagAdd: [any]
  TagRemove: [any, string]
  Toggle: [any, boolean]
  TableCell: [any, number, string, string]
  TableRowAdd: [any]
  TableRowRemove: [any, number]
  PwToggle: []
  ToggleAddBlock: []
  AddBlock: []
  CancelAddBlock: []
  AskDelete: [string]
  ConfirmDeleteYes: []
  ConfirmDeleteNo: []
}>()

async function AddBlock(): Promise<void> {
  let name = new_block_name.value.trim();
  if (name != '') {if (await bodyHasText(body.value, name)) {block_error.value = '"' + name + '" already exists in this config';
  }if (await bodyHasText(body.value, name) == false) {body.value = await addBlockText(body.value, name);
  dirty.value = true;
  new_block_name.value = '';
  adding_block.value = false;
  block_error.value = '';
  let es = [];
  let n = await entriesCount(body.value);
  let i: number = 0;
  while (true) {
  if (i >= n) {break;
  }es.push(await entryAt(body.value, i, props.module_id));
  if (await entryAt(body.value, i, props.module_id).kind == 'subform') {let sc = await subCount(await entryAt(body.value, i, props.module_id).frag);
  let j: number = 0;
  while (true) {
  if (j >= sc) {break;
  }es.push(await subAt(body.value, await entryAt(body.value, i, props.module_id).key, j, props.module_id));
  j = j + 1;
  }
  }i = i + 1;
  }
  entries.value = es;
  draft.value = '';
  }}

  emit('AddBlock')
}

async function Apply(e: any, v: any): Promise<void> {
  body.value = await editField(body.value, e.key, v);
  dirty.value = true;
  let es = [];
  let n = await entriesCount(body.value);
  let i: number = 0;
  while (true) {
  if (i >= n) {break;
  }es.push(await entryAt(body.value, i, props.module_id));
  if (await entryAt(body.value, i, props.module_id).kind == 'subform') {let sc = await subCount(await entryAt(body.value, i, props.module_id).frag);
  let j: number = 0;
  while (true) {
  if (j >= sc) {break;
  }es.push(await subAt(body.value, await entryAt(body.value, i, props.module_id).key, j, props.module_id));
  j = j + 1;
  }
  }i = i + 1;
  }
  entries.value = es;
  draft.value = '';

  emit('Apply', e, v)
}

function AskDelete(name: any): void {
  confirm_del.value = name;

  emit('AskDelete', name)
}

function CancelAddBlock(): void {
  adding_block.value = false;
  new_block_name.value = '';
  block_error.value = '';

  emit('CancelAddBlock')
}

function ConfirmDeleteNo(): void {
  confirm_del.value = '';

  emit('ConfirmDeleteNo')
}

async function ConfirmDeleteYes(): Promise<void> {
  let r = await deleteBlockSafe(props.module_id, confirm_del.value);
  confirm_del.value = '';
  if (r.ok) {block_error.value = '';
  let q = await fetchConfigSafe(props.module_id);
  if (q.ok) {body.value = q.value;
  meta_file.value = await metaFile(q.meta);
  dirty.value = false;
  let es = [];
  let n = await entriesCount(body.value);
  let i: number = 0;
  while (true) {
  if (i >= n) {break;
  }es.push(await entryAt(body.value, i, props.module_id));
  if (await entryAt(body.value, i, props.module_id).kind == 'subform') {let sc = await subCount(await entryAt(body.value, i, props.module_id).frag);
  let j: number = 0;
  while (true) {
  if (j >= sc) {break;
  }es.push(await subAt(body.value, await entryAt(body.value, i, props.module_id).key, j, props.module_id));
  j = j + 1;
  }
  }i = i + 1;
  }
  entries.value = es;
  draft.value = '';
  }if (q.ok == false) {error.value = q.error;
  }}
  if (r.ok == false) {block_error.value = 'Delete failed';
  }

  emit('ConfirmDeleteYes')
}

function ConfirmSaveNo(): void {
  confirm_save.value = false;

  emit('ConfirmSaveNo')
}

async function ConfirmSaveYes(): Promise<void> {
  confirm_save.value = false;
  save_acked.value = true;
  saving.value = true;
  status.value = 'saving…';
  let r = await putConfigSafe(props.module_id, body.value);
  if (r.ok) {dirty.value = false;
  status.value = 'saved ✓';
  }
  if (r.ok == false) {status.value = 'save failed';
  error.value = r.error;
  }
  saving.value = false;

  emit('ConfirmSaveYes')
}

function Draft(v: any): void {
  draft.value = v;

  emit('Draft', v)
}

async function Load(): Promise<void> {
  loading.value = true;
  error.value = '';
  let r = await fetchConfigSafe(props.module_id);
  if (r.ok) {body.value = r.value;
  meta_file.value = await metaFile(r.meta);
  dirty.value = false;
  loaded_once.value = true;
  status.value = 'loaded';
  let w = await warmEnumsText(body.value, props.module_id);
  let es = [];
  let n = await entriesCount(body.value);
  let i: number = 0;
  while (true) {
  if (i >= n) {break;
  }es.push(await entryAt(body.value, i, props.module_id));
  if (await entryAt(body.value, i, props.module_id).kind == 'subform') {let sc = await subCount(await entryAt(body.value, i, props.module_id).frag);
  let j: number = 0;
  while (true) {
  if (j >= sc) {break;
  }es.push(await subAt(body.value, await entryAt(body.value, i, props.module_id).key, j, props.module_id));
  j = j + 1;
  }
  }i = i + 1;
  }
  entries.value = es;
  draft.value = '';
  }
  if (r.ok == false) {error.value = 'Failed to load config';
  }
  loading.value = false;

  emit('Load')
}

function NameDraft(v: any): void {
  new_block_name.value = v;

  emit('NameDraft', v)
}

function PwToggle(e: any): void {
  pw_show.value = pw_show.value == false;

  emit('PwToggle')
}

async function Save(): Promise<void> {
  if (dirty.value && body.value != '') {if (save_acked.value) {saving.value = true;
  status.value = 'saving…';
  let r = await putConfigSafe(props.module_id, body.value);
  if (r.ok) {dirty.value = false;
  status.value = 'saved ✓';
  }if (r.ok == false) {status.value = 'save failed';
  error.value = r.error;
  }saving.value = false;
  }if (save_acked.value == false) {confirm_save.value = true;
  }}

  emit('Save')
}

async function TableCell(e: any, ri: any, col: any, v: any): Promise<void> {
  body.value = await setCellText(body.value, e.key, ri, col, v);
  dirty.value = true;
  let es = [];
  let n = await entriesCount(body.value);
  let i: number = 0;
  while (true) {
  if (i >= n) {break;
  }es.push(await entryAt(body.value, i, props.module_id));
  if (await entryAt(body.value, i, props.module_id).kind == 'subform') {let sc = await subCount(await entryAt(body.value, i, props.module_id).frag);
  let j: number = 0;
  while (true) {
  if (j >= sc) {break;
  }es.push(await subAt(body.value, await entryAt(body.value, i, props.module_id).key, j, props.module_id));
  j = j + 1;
  }
  }i = i + 1;
  }
  entries.value = es;
  draft.value = '';

  emit('TableCell', e, ri, col, v)
}

async function TableRowAdd(e: any): Promise<void> {
  body.value = await tableAddRowText(body.value, e.key);
  dirty.value = true;
  let es = [];
  let n = await entriesCount(body.value);
  let i: number = 0;
  while (true) {
  if (i >= n) {break;
  }es.push(await entryAt(body.value, i, props.module_id));
  if (await entryAt(body.value, i, props.module_id).kind == 'subform') {let sc = await subCount(await entryAt(body.value, i, props.module_id).frag);
  let j: number = 0;
  while (true) {
  if (j >= sc) {break;
  }es.push(await subAt(body.value, await entryAt(body.value, i, props.module_id).key, j, props.module_id));
  j = j + 1;
  }
  }i = i + 1;
  }
  entries.value = es;
  draft.value = '';

  emit('TableRowAdd', e)
}

async function TableRowRemove(e: any, ri: any): Promise<void> {
  body.value = await tableRemoveRowText(body.value, e.key, ri);
  dirty.value = true;
  let es = [];
  let n = await entriesCount(body.value);
  let i: number = 0;
  while (true) {
  if (i >= n) {break;
  }es.push(await entryAt(body.value, i, props.module_id));
  if (await entryAt(body.value, i, props.module_id).kind == 'subform') {let sc = await subCount(await entryAt(body.value, i, props.module_id).frag);
  let j: number = 0;
  while (true) {
  if (j >= sc) {break;
  }es.push(await subAt(body.value, await entryAt(body.value, i, props.module_id).key, j, props.module_id));
  j = j + 1;
  }
  }i = i + 1;
  }
  entries.value = es;
  draft.value = '';

  emit('TableRowRemove', e, ri)
}

async function TagAdd(e: any): Promise<void> {
  if (draft.value != '') {body.value = await editTagField(body.value, e.key, draft.value, '');
  dirty.value = true;
  let es = [];
  let n = await entriesCount(body.value);
  let i: number = 0;
  while (true) {
  if (i >= n) {break;
  }es.push(await entryAt(body.value, i, props.module_id));
  if (await entryAt(body.value, i, props.module_id).kind == 'subform') {let sc = await subCount(await entryAt(body.value, i, props.module_id).frag);
  let j: number = 0;
  while (true) {
  if (j >= sc) {break;
  }es.push(await subAt(body.value, await entryAt(body.value, i, props.module_id).key, j, props.module_id));
  j = j + 1;
  }
  }i = i + 1;
  }
  entries.value = es;
  draft.value = '';
  }

  emit('TagAdd', e)
}

async function TagRemove(e: any, t: any): Promise<void> {
  body.value = await editTagField(body.value, e.key, '', t);
  dirty.value = true;
  let es = [];
  let n = await entriesCount(body.value);
  let i: number = 0;
  while (true) {
  if (i >= n) {break;
  }es.push(await entryAt(body.value, i, props.module_id));
  if (await entryAt(body.value, i, props.module_id).kind == 'subform') {let sc = await subCount(await entryAt(body.value, i, props.module_id).frag);
  let j: number = 0;
  while (true) {
  if (j >= sc) {break;
  }es.push(await subAt(body.value, await entryAt(body.value, i, props.module_id).key, j, props.module_id));
  j = j + 1;
  }
  }i = i + 1;
  }
  entries.value = es;
  draft.value = '';

  emit('TagRemove', e, t)
}

async function Toggle(e: any, on: any): Promise<void> {
  let nv: string = 'false';
  if (on) {nv = 'true';
  }
  body.value = await editField(body.value, e.key, nv);
  dirty.value = true;
  let es = [];
  let n = await entriesCount(body.value);
  let i: number = 0;
  while (true) {
  if (i >= n) {break;
  }es.push(await entryAt(body.value, i, props.module_id));
  if (await entryAt(body.value, i, props.module_id).kind == 'subform') {let sc = await subCount(await entryAt(body.value, i, props.module_id).frag);
  let j: number = 0;
  while (true) {
  if (j >= sc) {break;
  }es.push(await subAt(body.value, await entryAt(body.value, i, props.module_id).key, j, props.module_id));
  j = j + 1;
  }
  }i = i + 1;
  }
  entries.value = es;
  draft.value = '';

  emit('Toggle', e, on)
}

function ToggleAddBlock(): void {
  adding_block.value = adding_block.value == false;
  block_error.value = '';

  emit('ToggleAddBlock')
}

onMounted(async () => {
  loading.value = true;
  error.value = '';
  let r = await fetchConfigSafe(props.module_id);
  if (r.ok) {body.value = r.value;
  meta_file.value = await metaFile(r.meta);
  dirty.value = false;
  loaded_once.value = true;
  status.value = 'loaded';
  let w = await warmEnumsText(body.value, props.module_id);
  let es = [];
  let n = await entriesCount(body.value);
  let i: number = 0;
  while (true) {
  if (i >= n) {break;
  }es.push(await entryAt(body.value, i, props.module_id));
  if (await entryAt(body.value, i, props.module_id).kind == 'subform') {let sc = await subCount(await entryAt(body.value, i, props.module_id).frag);
  let j: number = 0;
  while (true) {
  if (j >= sc) {break;
  }es.push(await subAt(body.value, await entryAt(body.value, i, props.module_id).key, j, props.module_id));
  j = j + 1;
  }
  }i = i + 1;
  }
  entries.value = es;
  draft.value = '';
  }
  if (r.ok == false) {error.value = 'Failed to load config';
  }
  loading.value = false;
})


</script>

<template>
    <div class="config-editor max-w-[820px] gap-[0px]">
      <template v-if="loading">
        <div class="state-msg">
          <span>Loading…</span>
        </div>
      </template>
      <template v-if="loading == false && error != '' && body == ''">
        <div class="state-msg error">
          <span>{{ '✗ ' + error }}</span>
          <span class="hint">
            <span>Is the config daemon running on :17701?</span>
          </span>
        </div>
      </template>
      <div class="toolbar gap-[0px]">
        <div class="meta gap-[0px]">
          <span class="mono">{{ meta_file }}</span>
          <template v-if="dirty">
            <span class="dirty">● unsaved</span>
          </template>
        </div>
        <div class="actions gap-[0px]">
          <template v-if="block_error != ''">
            <span class="block-error">{{ block_error }}</span>
          </template>
          <template v-if="adding_block">
            <input class="block-name" :placeholder="'block name'" v-model="new_block_name" @input="NameDraft(($event.target as HTMLInputElement).value)" @keydown.enter="AddBlock" />
            <button class="btn" @click="AddBlock">Add</button>
            <button class="btn" @click="CancelAddBlock">Cancel</button>
          </template>
          <template v-if="adding_block == false">
            <template v-if="loaded_once">
              <button class="btn" @click="ToggleAddBlock">＋ Add block</button>
            </template>
          </template>
          <template v-if="loaded_once">
            <button class="btn" :disabled="saving" @click="Load">Reload</button>
            <button class="btn primary" :disabled="saving || dirty == false" @click="Save">
              <template v-if="saving">
                <span>Saving…</span>
              </template>
              <template v-if="saving == false">
                <span>Save</span>
              </template>
            </button>
          </template>
          <template v-if="loaded_once == false">
            <button class="btn" @click="Load">Load</button>
          </template>
        </div>
      </div>
      <template v-if="confirm_save">
        <div class="flex flex-row gap-4 items-center gap-3 px-3 py-2 border border-[#e0e0e0] rounded bg-[#ededed]">
          <span class="text-sm text-[#1a1a1a]">Save changes to disk? (.bak backup kept)</span>
          <div class="flex-1" />
          <button class="btn px-3 py-1 text-xs rounded bg-primary border-primary text-white" @click="ConfirmSaveYes">Yes, save</button>
          <button class="btn px-3 py-1 text-xs rounded border border-[#e0e0e0] bg-white" @click="ConfirmSaveNo">Cancel</button>
        </div>
      </template>
      <template v-if="confirm_del != ''">
        <div class="flex flex-row gap-4 items-center gap-3 px-3 py-2 border border-[#c42b1c] rounded bg-[#ededed]">
          <span class="text-sm text-[#c42b1c]">{{ 'Delete block ' + confirm_del + '? (.bak kept)' }}</span>
          <div class="flex-1" />
          <button class="btn px-3 py-1 text-xs rounded bg-[#c42b1c] border-[#c42b1c] text-white" @click="ConfirmDeleteYes">Yes, delete</button>
          <button class="btn px-3 py-1 text-xs rounded border border-[#e0e0e0] bg-white" @click="ConfirmDeleteNo">Cancel</button>
        </div>
      </template>
      <template v-if="body != ''">
        <div class="fields gap-[0px]">
          <div class="contents" :key="e.key" v-for="e in entries">
            <template v-if="e.kind == 'subform'">
              <div class="subform-header gap-[0px]">
                <span class="subform-title">{{ e.label }}</span>
                <template v-if="e.is_provider">
                  <button class="btn danger btn-sm" @click="AskDelete(e.key)">🗑</button>
                </template>
              </div>
            </template>
            <template v-if="e.kind != 'subform'">
              <div :class="e.box_class">
                <label class="field-label">
                  <span>{{ e.label }}</span>
                </label>
                <template v-if="e.kind == 'toggle'">
                  <label class="toggle gap-[0px]">
                    <input :checked="e.is_on" :type="'checkbox'" @change="Toggle(e, ($event.target as HTMLInputElement).checked)" />
                    <span class="toggle-track">
                      <span class="toggle-thumb" />
                    </span>
                    <span class="toggle-text">
                      <template v-if="e.value == 'true'">
                        <span>On</span>
                      </template>
                      <template v-if="e.value != 'true'">
                        <span>Off</span>
                      </template>
                    </span>
                  </label>
                </template>
                <template v-if="e.kind == 'number'">
                  <input class="input" :type="'number'" :value="e.value" @change="Apply(e, ($event.target as HTMLInputElement).value)" @input="Draft(($event.target as HTMLInputElement).value)" />
                </template>
                <template v-if="e.kind == 'password'">
                  <div class="secret gap-[0px]">
                    <template v-if="pw_show">
                      <input class="input pw" :placeholder="'(not set)'" :type="'text'" :value="e.value" @change="Apply(e, ($event.target as HTMLInputElement).value)" @input="Draft(($event.target as HTMLInputElement).value)" />
                    </template>
                    <template v-if="pw_show == false">
                      <input class="input pw" :placeholder="'(not set)'" :type="'password'" :value="e.value" @change="Apply(e, ($event.target as HTMLInputElement).value)" @input="Draft(($event.target as HTMLInputElement).value)" />
                    </template>
                    <button class="reveal" @click="PwToggle(e)">👁</button>
                  </div>
                </template>
                <template v-if="e.kind == 'text'">
                  <input class="input" :placeholder="'(empty)'" :type="'text'" :value="e.value" @change="Apply(e, ($event.target as HTMLInputElement).value)" @input="Draft(($event.target as HTMLInputElement).value)" />
                </template>
                <template v-if="e.kind == 'select'">
                  <template v-if="e.options.length > 0">
                    <select class="input" :value="e.value" @change="Apply(e, ($event.target as HTMLInputElement).value)">
                      <option :value="o.value" v-for="o in e.options" :key="(((o as any)?.id ?? o))">{{ o.label }}</option>
                      <template v-if="e.has_current">
                        <option :value="e.value">{{ e.value + ' (current)' }}</option>
                      </template>
                    </select>
                  </template>
                  <template v-if="e.options.length == 0">
                    <div class="fallback-text gap-[0px]">
                      <input class="input" :placeholder="'(not set)'" :type="'text'" :value="e.value" @change="Apply(e, ($event.target as HTMLInputElement).value)" @input="Draft(($event.target as HTMLInputElement).value)" />
                      <span class="fallback-hint">no options available (e.g. builtin-only) — type freely</span>
                    </div>
                  </template>
                </template>
                <template v-if="e.kind == 'tags'">
                  <div class="tags">
                    <span class="tag" v-for="t in e.items" :key="(((t as any)?.id ?? t))">
                      <span>{{ t }}</span>
                      <button class="tag-x" @click="TagRemove(e, t)">×</button>
                    </span>
                    <input class="tag-input" :placeholder="'add…'" :type="'text'" :value="''" @input="Draft(($event.target as HTMLInputElement).value)" @keydown.enter="TagAdd(e)" />
                  </div>
                </template>
                <template v-if="e.kind == 'multiselect'">
                  <div class="multiselect">
                    <template v-if="e.options.length == 0">
                      <p class="ms-empty">No options available (directory empty or missing).</p>
                    </template>
                  </div>
                </template>
                <template v-if="e.kind == 'table'">
                  <div class="table-wrap gap-[0px]">
                    <table class="tbl">
                      <thead>
                        <tr>
                          <th v-for="c in e.t_cols" :key="(((c as any)?.id ?? c))">{{ c.name }}</th>
                          <th class="row-act" />
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="(r, ri) in e.t_rows" :key="(((r as any)?.id ?? r))">
                          <td v-for="c in e.t_cols" :key="(((c as any)?.id ?? c))">
                            <template v-if="c.kind == 'select'">
                              <select class="cell-select" :value="r[c.name]" @change="TableCell(e, ri, c.name, ($event.target as HTMLInputElement).value)">
                                <option :value="o.value" v-for="o in c.options" :key="(((o as any)?.id ?? o))">{{ o.label }}</option>
                                <option :value="r[c.name]">{{ r[c.name] }}</option>
                              </select>
                            </template>
                            <template v-if="c.kind == 'number'">
                              <input class="cell-input" :type="'number'" v-model="r[c.name]" @change="TableCell(e, ri, c.name, ($event.target as HTMLInputElement).value)" />
                            </template>
                            <template v-if="c.kind != 'select' && c.kind != 'number'">
                              <input class="cell-input" :type="'text'" v-model="r[c.name]" @change="TableCell(e, ri, c.name, ($event.target as HTMLInputElement).value)" />
                            </template>
                          </td>
                          <td class="row-act">
                            <button class="del-row" @click="TableRowRemove(e, ri)">×</button>
                          </td>
                        </tr>
                        <template v-if="e.t_rows.length == 0">
                          <tr>
                            <td class="empty">(empty — click + Row)</td>
                          </tr>
                        </template>
                      </tbody>
                    </table>
                    <button class="add-row" @click="TableRowAdd(e)">+ Row</button>
                  </div>
                </template>
              </div>
            </template>
          </div>
        </div>
        <div class="toolbar bottom gap-[0px]">
          <div class="actions gap-[0px]">
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
