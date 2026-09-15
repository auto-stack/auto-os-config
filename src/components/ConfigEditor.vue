<!-- ConfigEditor component - Auto-generated from Auto language -->
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import WallpaperPicker from '@/components/WallpaperPicker.vue'

import { addBlockText, bodyHasText, cfgField, deleteBlockSafe, editField, editTagField, entriesCount, entryAtW, fetchConfigSafe, metaFile, putConfigSafe, setCellText, subAt, subCount, tableAddRowText, tableRemoveRowText, warmEnumsText } from '@/lib/api'

const props = defineProps<{
  module_id: string
  widgets: string
}>()

const wallpapers_dir = ref<string>('')
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
  Toggle: [any, string]
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
  }es.push(await entryAtW(body.value, i, props.module_id, props.widgets));
  if (await entryAtW(body.value, i, props.module_id, props.widgets).kind == 'subform') {let sc = await subCount(await entryAtW(body.value, i, props.module_id, props.widgets).frag);
  let j: number = 0;
  while (true) {
  if (j >= sc) {break;
  }es.push(await subAt(body.value, await entryAtW(body.value, i, props.module_id, props.widgets).key, j, props.module_id));
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
  }es.push(await entryAtW(body.value, i, props.module_id, props.widgets));
  if (await entryAtW(body.value, i, props.module_id, props.widgets).kind == 'subform') {let sc = await subCount(await entryAtW(body.value, i, props.module_id, props.widgets).frag);
  let j: number = 0;
  while (true) {
  if (j >= sc) {break;
  }es.push(await subAt(body.value, await entryAtW(body.value, i, props.module_id, props.widgets).key, j, props.module_id));
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
  }es.push(await entryAtW(body.value, i, props.module_id, props.widgets));
  if (await entryAtW(body.value, i, props.module_id, props.widgets).kind == 'subform') {let sc = await subCount(await entryAtW(body.value, i, props.module_id, props.widgets).frag);
  let j: number = 0;
  while (true) {
  if (j >= sc) {break;
  }es.push(await subAt(body.value, await entryAtW(body.value, i, props.module_id, props.widgets).key, j, props.module_id));
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
  wallpapers_dir.value = await cfgField(body.value, 'cfg_wallpapers_dir');
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
  }es.push(await entryAtW(body.value, i, props.module_id, props.widgets));
  if (await entryAtW(body.value, i, props.module_id, props.widgets).kind == 'subform') {let sc = await subCount(await entryAtW(body.value, i, props.module_id, props.widgets).frag);
  let j: number = 0;
  while (true) {
  if (j >= sc) {break;
  }es.push(await subAt(body.value, await entryAtW(body.value, i, props.module_id, props.widgets).key, j, props.module_id));
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
  }es.push(await entryAtW(body.value, i, props.module_id, props.widgets));
  if (await entryAtW(body.value, i, props.module_id, props.widgets).kind == 'subform') {let sc = await subCount(await entryAtW(body.value, i, props.module_id, props.widgets).frag);
  let j: number = 0;
  while (true) {
  if (j >= sc) {break;
  }es.push(await subAt(body.value, await entryAtW(body.value, i, props.module_id, props.widgets).key, j, props.module_id));
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
  }es.push(await entryAtW(body.value, i, props.module_id, props.widgets));
  if (await entryAtW(body.value, i, props.module_id, props.widgets).kind == 'subform') {let sc = await subCount(await entryAtW(body.value, i, props.module_id, props.widgets).frag);
  let j: number = 0;
  while (true) {
  if (j >= sc) {break;
  }es.push(await subAt(body.value, await entryAtW(body.value, i, props.module_id, props.widgets).key, j, props.module_id));
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
  }es.push(await entryAtW(body.value, i, props.module_id, props.widgets));
  if (await entryAtW(body.value, i, props.module_id, props.widgets).kind == 'subform') {let sc = await subCount(await entryAtW(body.value, i, props.module_id, props.widgets).frag);
  let j: number = 0;
  while (true) {
  if (j >= sc) {break;
  }es.push(await subAt(body.value, await entryAtW(body.value, i, props.module_id, props.widgets).key, j, props.module_id));
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
  }es.push(await entryAtW(body.value, i, props.module_id, props.widgets));
  if (await entryAtW(body.value, i, props.module_id, props.widgets).kind == 'subform') {let sc = await subCount(await entryAtW(body.value, i, props.module_id, props.widgets).frag);
  let j: number = 0;
  while (true) {
  if (j >= sc) {break;
  }es.push(await subAt(body.value, await entryAtW(body.value, i, props.module_id, props.widgets).key, j, props.module_id));
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
  }es.push(await entryAtW(body.value, i, props.module_id, props.widgets));
  if (await entryAtW(body.value, i, props.module_id, props.widgets).kind == 'subform') {let sc = await subCount(await entryAtW(body.value, i, props.module_id, props.widgets).frag);
  let j: number = 0;
  while (true) {
  if (j >= sc) {break;
  }es.push(await subAt(body.value, await entryAtW(body.value, i, props.module_id, props.widgets).key, j, props.module_id));
  j = j + 1;
  }
  }i = i + 1;
  }
  entries.value = es;
  draft.value = '';

  emit('TagRemove', e, t)
}

async function Toggle(e: any, v: any): Promise<void> {
  body.value = await editField(body.value, e.key, v);
  dirty.value = true;
  let es = [];
  let n = await entriesCount(body.value);
  let i: number = 0;
  while (true) {
  if (i >= n) {break;
  }es.push(await entryAtW(body.value, i, props.module_id, props.widgets));
  if (await entryAtW(body.value, i, props.module_id, props.widgets).kind == 'subform') {let sc = await subCount(await entryAtW(body.value, i, props.module_id, props.widgets).frag);
  let j: number = 0;
  while (true) {
  if (j >= sc) {break;
  }es.push(await subAt(body.value, await entryAtW(body.value, i, props.module_id, props.widgets).key, j, props.module_id));
  j = j + 1;
  }
  }i = i + 1;
  }
  entries.value = es;
  draft.value = '';

  emit('Toggle', e, v)
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
  wallpapers_dir.value = await cfgField(body.value, 'cfg_wallpapers_dir');
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
  }es.push(await entryAtW(body.value, i, props.module_id, props.widgets));
  if (await entryAtW(body.value, i, props.module_id, props.widgets).kind == 'subform') {let sc = await subCount(await entryAtW(body.value, i, props.module_id, props.widgets).frag);
  let j: number = 0;
  while (true) {
  if (j >= sc) {break;
  }es.push(await subAt(body.value, await entryAtW(body.value, i, props.module_id, props.widgets).key, j, props.module_id));
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
    <div class="config-editor flex-1 flex flex-col max-w-[820px] gap-[16px]">
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
      <div class="flex flex-row toolbar items-center gap-[8px]">
        <div class="meta flex flex-row items-center gap-[8px] flex-1 min-w-0">
          <span class="mono text-xs text-muted-foreground bg-muted rounded-md px-2 py-1">{{ meta_file }}</span>
          <template v-if="dirty">
            <span class="dirty text-xs text-warning">● unsaved</span>
          </template>
        </div>
        <div class="actions flex flex-row items-center gap-[8px]">
          <template v-if="block_error != ''">
            <span class="block-error text-xs text-destructive">{{ block_error }}</span>
          </template>
          <template v-if="adding_block">
            <input class="block-name w-[180px] h-7 text-xs text-foreground bg-background border border-border rounded-md px-2" :placeholder="'block name'" v-model="new_block_name" @input="NameDraft(($event.target as HTMLInputElement).value)" @keydown.enter="AddBlock" />
            <button class="h-7 px-3 text-xs rounded-md bg-primary text-primary-foreground border-0" @click="AddBlock">Add</button>
            <button class="h-7 px-3 text-xs rounded-md bg-muted text-muted-foreground border-0" @click="CancelAddBlock">Cancel</button>
          </template>
          <template v-if="adding_block == false">
            <template v-if="loaded_once">
              <button class="h-7 px-3 text-xs rounded-md bg-muted text-muted-foreground border-0" @click="ToggleAddBlock">＋ Add block</button>
            </template>
          </template>
          <template v-if="loaded_once">
            <button class="h-7 px-3 text-xs rounded-md bg-muted text-muted-foreground border-0" :disabled="saving" @click="Load">Reload</button>
          </template>
          <button class="h-8 px-4 text-xs font-medium rounded-md bg-primary text-primary-foreground border-0" :disabled="saving || dirty == false" @click="Save">
            <template v-if="saving">
              <span>Saving…</span>
            </template>
            <template v-if="saving == false">
              <span>Save</span>
            </template>
          </button>
        </div>
      </div>
      <template v-if="confirm_save">
        <div class="flex flex-row items-center gap-3 px-3 py-2 border border-border rounded bg-secondary">
          <span class="text-sm text-foreground">Save changes to disk? (.bak backup kept)</span>
          <div class="flex-1" />
          <button class="btn px-3 py-1 text-xs rounded bg-primary border-primary text-white" @click="ConfirmSaveYes">Yes, save</button>
          <button class="btn px-3 py-1 text-xs rounded border border-border bg-background" @click="ConfirmSaveNo">Cancel</button>
        </div>
      </template>
      <template v-if="confirm_del != ''">
        <div class="flex flex-row items-center gap-3 px-3 py-2 border border-[#c42b1c] rounded bg-secondary">
          <span class="text-sm text-[#c42b1c]">{{ 'Delete block ' + confirm_del + '? (.bak kept)' }}</span>
          <div class="flex-1" />
          <button class="btn px-3 py-1 text-xs rounded bg-[#c42b1c] border-[#c42b1c] text-white" @click="ConfirmDeleteYes">Yes, delete</button>
          <button class="btn px-3 py-1 text-xs rounded border border-border bg-background" @click="ConfirmDeleteNo">Cancel</button>
        </div>
      </template>
      <template v-if="body != ''">
        <div class="fields flex flex-col p-4 bg-card rounded-xl border border-border">
          <div class="contents" :key="e.key" v-for="e in entries">
            <template v-if="e.kind == 'subform'">
              <div class="subform-header flex flex-row items-center gap-[8px] px-1 pt-[14px] pb-[6px] border-b border-border">
                <span class="subform-title text-sm font-medium text-foreground">{{ e.label }}</span>
                <div class="flex-1" />
                <template v-if="e.is_provider">
                  <button class="btn h-7 w-7 p-1 border-0 rounded-md bg-transparent text-muted-foreground hover:text-[#c42b1c] hover:bg-[#c42b1c]/10 flex items-center justify-center" @click="AskDelete(e.key)">
                    <svg class="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                      <path d="M3 6h18" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" />
                      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" />
                      <line stroke="currentColor" stroke-linecap="round" stroke-width="2" x1="10" x2="10" y1="11" y2="17" />
                      <line stroke="currentColor" stroke-linecap="round" stroke-width="2" x1="14" x2="14" y1="11" y2="17" />
                    </svg>
                  </button>
                </template>
              </div>
            </template>
            <template v-if="e.kind == 'wallpaper_picker'">
              <div class="field-row flex flex-row items-center gap-[12px] py-[6px] px-1">
                <label class="field-label w-[220px] shrink-0 text-xs text-muted-foreground font-medium">
                  <span>{{ e.label }}</span>
                </label>
                <WallpaperPicker :current="e.value" :dir="wallpapers_dir" :field="e.key" :module_id="module_id" :key="'WallpaperPicker-1-' + (((e as any)?.id ?? e))" />
              </div>
            </template>
            <template v-if="e.kind != 'subform' && e.kind != 'wallpaper_picker'">
              <div class="field-row flex flex-row items-center gap-[12px] py-[6px] px-1">
                <label class="field-label w-[220px] shrink-0 text-xs text-muted-foreground font-medium">
                  <span>{{ e.label }}</span>
                </label>
                <template v-if="e.kind == 'toggle'">
                  <div class="flex flex-row toggle items-center rounded-lg bg-muted p-[3px] gap-[3px] w-fit">
                    <template v-if="e.is_on">
                      <button class="toggle-on h-7 px-3 text-xs font-medium rounded-md bg-primary text-primary-foreground border-0" @click="Toggle(e, 'true')">开</button>
                      <button class="toggle-off h-7 px-3 text-xs rounded-md text-muted-foreground border-0" @click="Toggle(e, 'false')">关</button>
                    </template>
                    <template v-if="e.is_on == false">
                      <button class="toggle-on h-7 px-3 text-xs rounded-md text-muted-foreground border-0" @click="Toggle(e, 'true')">开</button>
                      <button class="toggle-off h-7 px-3 text-xs font-medium rounded-md bg-primary text-primary-foreground border-0" @click="Toggle(e, 'false')">关</button>
                    </template>
                  </div>
                </template>
                <template v-if="e.kind == 'number'">
                  <input class="input flex-1 h-8 px-2 text-sm text-foreground bg-background border border-border rounded-md" :type="'number'" :value="e.value" @change="Apply(e, ($event.target as HTMLInputElement).value)" @input="Draft(($event.target as HTMLInputElement).value)" />
                </template>
                <template v-if="e.kind == 'password'">
                  <div class="secret flex flex-row items-center gap-[8px] flex-1">
                    <template v-if="pw_show">
                      <input class="input pw flex-1 h-8 px-2 text-sm text-foreground bg-background border border-border rounded-md" :placeholder="'(not set)'" :type="'text'" :value="e.value" @change="Apply(e, ($event.target as HTMLInputElement).value)" @input="Draft(($event.target as HTMLInputElement).value)" />
                    </template>
                    <template v-if="pw_show == false">
                      <input class="input pw flex-1 h-8 px-2 text-sm text-foreground bg-background border border-border rounded-md" :placeholder="'(not set)'" :type="'password'" :value="e.value" @change="Apply(e, ($event.target as HTMLInputElement).value)" @input="Draft(($event.target as HTMLInputElement).value)" />
                    </template>
                    <button class="reveal h-8 px-2 text-xs rounded-md bg-muted text-muted-foreground border-0" @click="PwToggle(e)">👁</button>
                  </div>
                </template>
                <template v-if="e.kind == 'text'">
                  <input class="input flex-1 h-8 px-2 text-sm text-foreground bg-background border border-border rounded-md" :placeholder="'(empty)'" :type="'text'" :value="e.value" @change="Apply(e, ($event.target as HTMLInputElement).value)" @input="Draft(($event.target as HTMLInputElement).value)" />
                </template>
                <template v-if="e.kind == 'select'">
                  <div class="fallback-text flex flex-col gap-[4px] flex-1">
                    <input class="input flex-1 h-8 px-2 text-sm text-foreground bg-background border border-border rounded-md" :placeholder="'(not set)'" :type="'text'" :value="e.value" @change="Apply(e, ($event.target as HTMLInputElement).value)" @input="Draft(($event.target as HTMLInputElement).value)" />
                    <span class="fallback-hint text-xs text-muted-foreground">free text — accepted values depend on the daemon's provider registry</span>
                  </div>
                  <template v-if="e.options.length == 0">
                    <div class="fallback-text flex flex-col gap-[4px] flex-1">
                      <input class="input flex-1 h-8 px-2 text-sm text-foreground bg-background border border-border rounded-md" :placeholder="'(not set)'" :type="'text'" :value="e.value" @change="Apply(e, ($event.target as HTMLInputElement).value)" @input="Draft(($event.target as HTMLInputElement).value)" />
                      <span class="fallback-hint text-xs text-muted-foreground">no options available (e.g. builtin-only) — type freely</span>
                    </div>
                  </template>
                </template>
                <template v-if="e.kind == 'tags'">
                  <div class="tags flex flex-row items-center gap-[6px] flex-1">
                    <span class="tag" v-for="t in e.items" :key="(((t as any)?.id ?? t))">
                      <span>{{ t }}</span>
                      <button class="tag-x" @click="TagRemove(e, t)">×</button>
                    </span>
                    <input class="tag-input flex-1 h-7 px-2 text-xs text-foreground bg-background border border-border rounded-md" :placeholder="'add…'" :type="'text'" :value="''" @input="Draft(($event.target as HTMLInputElement).value)" @keydown.enter="TagAdd(e)" />
                  </div>
                </template>
                <template v-if="e.kind == 'multiselect'">
                  <div class="multiselect flex flex-row items-center gap-[6px] flex-1">
                    <template v-if="e.options.length == 0">
                      <p class="ms-empty">No options available (directory empty or missing).</p>
                    </template>
                  </div>
                </template>
                <template v-if="e.kind == 'table'">
                  <div class="flex flex-col table-wrap gap-[6px] flex-1">
                    <div class="flex flex-row gap-[8px]">
                      <span class="w-40 text-xs font-medium text-muted-foreground" v-for="c in e.t_cols" :key="(((c as any)?.id ?? c))">{{ c.name }}</span>
                    </div>
                    <div class="flex flex-row gap-[8px] items-center" v-for="(r, ri) in e.t_rows" :key="(((r as any)?.id ?? r))">
                      <input class="w-40 h-8 px-2 text-xs text-foreground bg-background border border-border rounded-md" :type="'text'" v-model="r[c.name]" @change="TableCell(e, ri, c.name, ($event.target as HTMLInputElement).value)"  v-for="c in e.t_cols" :key="(((c as any)?.id ?? c))"/>
                      <button class="h-7 px-2 text-xs rounded-md bg-muted text-muted-foreground border-0" @click="TableRowRemove(e, ri)">×</button>
                    </div>
                    <template v-if="e.t_rows.length == 0">
                      <span class="text-xs text-muted-foreground">(empty — click + Row)</span>
                    </template>
                    <div class="flex flex-row gap-4">
                      <button class="add-row h-7 px-3 text-xs rounded-md bg-muted text-muted-foreground border-0" @click="TableRowAdd(e)">+ Row</button>
                    </div>
                  </div>
                </template>
              </div>
            </template>
          </div>
        </div>
      </template>
    </div>

</template>

<style>
/* Component styles */

</style>
