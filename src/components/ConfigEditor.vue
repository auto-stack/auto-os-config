<!-- ConfigEditor component - Auto-generated from Auto language -->
<script setup lang="ts">
import { ref } from 'vue'
import { addBlockText, bodyHasText, deleteBlockSafe, editField, editTagField, entriesCount, entryAt, fetchConfigSafe, metaFile, putConfigSafe, subAt, subCount } from '@/lib/api'

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
  Load: []
  Save: []
  ConfirmSaveYes: []
  ConfirmSaveNo: []
  Draft: [string]
  NameDraft: [string]
  Apply: [any]
  TagAdd: [any]
  Toggle: [any]
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

async function Apply(e: any): Promise<void> {
  if (draft.value != '') {body.value = await editField(body.value, e.key, draft.value);
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

  emit('Apply', e)
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

async function Toggle(e: any): Promise<void> {
  let nv: string = 'false';
  if (e.value == 'false' || e.value == '') {nv = 'true';
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

  emit('Toggle', e)
}

function ToggleAddBlock(): void {
  adding_block.value = adding_block.value == false;
  block_error.value = '';

  emit('ToggleAddBlock')
}


</script>

<template>
    <div class="flex flex-col gap-4 config-editor max-w-[820px] gap-2">
      <div class="flex flex-row gap-4 toolbar items-center gap-3 py-2 border-b border-[#e0e0e0]">
        <span class="mono text-xs text-[#8a8a8a]">{{ meta_file }}</span>
        <template v-if="dirty">
          <span class="dirty text-xs font-medium text-primary">● unsaved</span>
        </template>
        <template v-if="dirty == false">
          <template v-if="loaded_once">
            <span class="text-xs text-[#8a8a8a]">{{ status }}</span>
          </template>
        </template>
        <div class="flex-1" />
        <template v-if="block_error != ''">
          <span class="text-xs text-[#c42b1c]">{{ block_error }}</span>
        </template>
        <template v-if="adding_block">
          <input class="block-name w-[160px] px-2 py-1 text-xs border border-[#e0e0e0] rounded bg-white" :placeholder="'block name'" v-model="new_block_name" @input="NameDraft" />
          <button class="btn px-3 py-1 text-xs rounded border border-[#e0e0e0] bg-white" @click="AddBlock">Add</button>
          <button class="btn px-3 py-1 text-xs rounded border border-[#e0e0e0] bg-white" @click="CancelAddBlock">Cancel</button>
        </template>
        <template v-if="adding_block == false">
          <template v-if="loaded_once">
            <button class="btn px-3 py-1 text-xs rounded border border-[#e0e0e0] bg-white" @click="ToggleAddBlock">＋ Add block</button>
            <button class="btn px-3 py-1 text-xs rounded border border-[#e0e0e0] bg-white" @click="Load">Reload</button>
            <button class="px-4 py-1 text-xs rounded bg-primary border-primary text-white" @click="Save">Save</button>
          </template>
        </template>
        <template v-if="loaded_once == false">
          <button class="btn px-3 py-1 text-xs rounded border border-[#e0e0e0] bg-white" @click="Load">Load</button>
        </template>
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
      <template v-if="loading">
        <span class="state-msg px-4 py-3 rounded-lg bg-[#ededed] text-sm text-[#616161]">Loading…</span>
      </template>
      <template v-if="error != ''">
        <span class="state-msg error px-4 py-3 rounded-lg text-sm text-[#c42b1c]">{{ '✗ ' + error }}</span>
      </template>
      <div class="flex flex-col gap-4 fields gap-1">
        <div class="contents" :key="e.key" v-for="e in entries">
          <template v-if="e.kind == 'subform'">
            <div class="flex flex-row gap-4 subform-header items-center gap-2 px-3 py-2 mt-3 border border-[#e0e0e0] rounded-t-lg bg-[#ededed]">
              <span class="subform-title font-semibold text-sm text-[#1a1a1a]">{{ e.label }}</span>
              <div class="flex-1" />
              <button class="btn text-xs text-[#c42b1c] border border-[#c42b1c] rounded px-2 py-[2px] bg-white" @click="AskDelete(e.key)">🗑 delete</button>
            </div>
          </template>
          <template v-if="e.kind == 'table'">
            <div class="flex flex-col gap-4 field-row border rounded p-2 gap-1 bg-white">
              <span class="field-label text-sm font-medium text-[#616161]">{{ e.label }}</span>
              <span class="text-xs text-[#8a8a8a] font-mono">{{ e.frag }}</span>
            </div>
          </template>
          <template v-if="e.kind == 'toggle'">
            <div class="flex flex-row gap-4 field-row items-center gap-3 py-2">
              <template v-if="e.depth == 1">
                <div class="w-4 shrink-0 border-l-2 border-[#e0e0e0]" />
              </template>
              <span class="field-label text-sm font-medium text-[#616161] w-[160px] shrink-0">{{ e.label }}</span>
              <input type="checkbox" :checked="e.value == 'true'" :id="e.key" :label="''" @click="Toggle(e)" />
              <template v-if="e.value == 'true'">
                <span class="text-xs text-[#616161]">On</span>
              </template>
              <template v-if="e.value != 'true'">
                <span class="text-xs text-[#8a8a8a]">Off</span>
              </template>
            </div>
          </template>
          <template v-if="e.kind == 'number'">
            <div class="flex flex-row gap-4 field-row items-center gap-3 py-2">
              <template v-if="e.depth == 1">
                <div class="w-4 shrink-0 border-l-2 border-[#e0e0e0]" />
              </template>
              <span class="field-label text-sm font-medium text-[#616161] w-[160px] shrink-0">{{ e.label }}</span>
              <input class="input px-[10px] py-[6px] text-sm border border-[#e0e0e0] rounded bg-white w-[240px]" :placeholder="e.label" :type="'number'" :value="e.value" @input="Draft($event)" />
              <button class="btn px-3 py-1 text-xs rounded border border-[#e0e0e0] bg-white" @click="Apply(e)">Apply</button>
            </div>
          </template>
          <template v-if="e.kind == 'password'">
            <div class="flex flex-row gap-4 field-row items-center gap-3 py-2">
              <template v-if="e.depth == 1">
                <div class="w-4 shrink-0 border-l-2 border-[#e0e0e0]" />
              </template>
              <span class="field-label text-sm font-medium text-[#616161] w-[160px] shrink-0">{{ e.label }}</span>
              <template v-if="pw_show">
                <input class="input px-[10px] py-[6px] text-sm border border-[#e0e0e0] rounded bg-white w-[240px] font-mono" :placeholder="e.label" :value="e.value" @input="Draft($event)" />
              </template>
              <template v-if="pw_show == false">
                <input class="input px-[10px] py-[6px] text-sm border border-[#e0e0e0] rounded bg-white w-[240px] font-mono" :placeholder="e.label" :type="'password'" :value="e.value" @input="Draft($event)" />
              </template>
              <button class="btn px-2 py-1 text-xs rounded border border-[#e0e0e0] bg-white" @click="PwToggle(e)">👁</button>
              <button class="btn px-3 py-1 text-xs rounded border border-[#e0e0e0] bg-white" @click="Apply(e)">Apply</button>
            </div>
          </template>
          <template v-if="e.kind == 'text'">
            <div class="flex flex-row gap-4 field-row items-center gap-3 py-2">
              <template v-if="e.depth == 1">
                <div class="w-4 shrink-0 border-l-2 border-[#e0e0e0]" />
              </template>
              <span class="field-label text-sm font-medium text-[#616161] w-[160px] shrink-0">{{ e.label }}</span>
              <input class="input px-[10px] py-[6px] text-sm border border-[#e0e0e0] rounded bg-white w-[240px]" :placeholder="e.label" :value="e.value" @input="Draft($event)" />
              <button class="btn px-3 py-1 text-xs rounded border border-[#e0e0e0] bg-white" @click="Apply(e)">Apply</button>
            </div>
          </template>
          <template v-if="e.kind == 'select'">
            <div class="flex flex-col gap-4 field-row py-2 gap-1">
              <div class="flex flex-row gap-4 items-center gap-3">
                <template v-if="e.depth == 1">
                  <div class="w-4 shrink-0 border-l-2 border-[#e0e0e0]" />
                </template>
                <span class="field-label text-sm font-medium text-[#616161] w-[160px] shrink-0">{{ e.label }}</span>
                <input class="input px-[10px] py-[6px] text-sm border border-[#e0e0e0] rounded bg-white w-[240px]" :placeholder="e.label" :value="e.value" @input="Draft($event)" />
                <button class="btn px-3 py-1 text-xs rounded border border-[#e0e0e0] bg-white" @click="Apply(e)">Apply</button>
              </div>
              <template v-if="e.url != ''">
                <span class="text-xs text-[#8a8a8a]">(select — free text accepted)</span>
              </template>
            </div>
          </template>
          <template v-if="e.kind == 'tags'">
            <div class="flex flex-col gap-4 field-row py-2 gap-1">
              <div class="flex flex-row gap-4 items-center gap-3">
                <template v-if="e.depth == 1">
                  <div class="w-4 shrink-0 border-l-2 border-[#e0e0e0]" />
                </template>
                <span class="field-label text-sm font-medium text-[#616161] w-[160px] shrink-0">{{ e.label }}</span>
                <input class="input px-[10px] py-[6px] text-sm border border-[#e0e0e0] rounded bg-white w-[240px]" :placeholder="'add value'" @input="Draft($event)" />
                <button class="btn px-3 py-1 text-xs rounded border border-[#e0e0e0] bg-white" @click="TagAdd(e)">Add</button>
              </div>
              <span class="text-xs text-[#8a8a8a] font-mono">{{ e.value }}</span>
            </div>
          </template>
          <template v-if="e.kind == 'multiselect'">
            <div class="flex flex-col gap-4 field-row py-2 gap-1">
              <div class="flex flex-row gap-4 items-center gap-3">
                <template v-if="e.depth == 1">
                  <div class="w-4 shrink-0 border-l-2 border-[#e0e0e0]" />
                </template>
                <span class="field-label text-sm font-medium text-[#616161] w-[160px] shrink-0">{{ e.label }}</span>
                <input class="input px-[10px] py-[6px] text-sm border border-[#e0e0e0] rounded bg-white w-[240px]" :placeholder="'add value'" @input="Draft($event)" />
                <button class="btn px-3 py-1 text-xs rounded border border-[#e0e0e0] bg-white" @click="TagAdd(e)">Add</button>
              </div>
              <span class="text-xs text-[#8a8a8a] font-mono">{{ e.value }}</span>
            </div>
          </template>
        </div>
      </div>
    </div>

</template>

<style>
/* Component styles */

</style>
