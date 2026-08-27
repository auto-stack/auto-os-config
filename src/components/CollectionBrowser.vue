<!-- CollectionBrowser component - Auto-generated from Auto language -->
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { setCellText, tableAddRowText, tableRemoveRowText } from '@/lib/api'

const creating = ref<boolean>(false)
const new_name = ref<string>('')
const confirm_open = ref<boolean>(false)
const draft = ref<string>('')
const sidecar_draft = ref<string>('')
const pw_show = ref<boolean>(false)

const props = defineProps<{
  module_id: string
  read_only: boolean
}>()

const emit = defineEmits<{
  Init: []
  Load: []
  SetFilter: [string]
  ToggleCreate: []
  NewName: [string]
  DoCreate: []
  CancelCreate: []
  Pick: [string]
  Reload: []
  Save: []
  AskDelete: []
  ConfirmDeleteYes: []
  ConfirmDeleteNo: []
  Draft: [string]
  SidecarDraft: [string]
  ApplyEntry: [number, string]
  TagAdd: [number]
  TagRemove: [number, string]
  MsToggle: [number, string, boolean]
  Toggle: [number, boolean]
  TableCell: [number, number, string, string]
  TableRowAdd: [number]
  TableRowRemove: [number, number]
  PwToggle: []
}>()

import { useCollectionStore } from '../stores/auto/useCollectionStore'
import { reactive } from 'vue'
const store = reactive(useCollectionStore())

function ApplyEntry(i: any, v: any): void {
  let k: string = '';
  let j: number = 0;
  for (const x of store.entry_keys) {if (j == i) {k = x;
  }j = j + 1;
  }
  if (k != '') {store.FieldEdited({ path: k, value: v });
  draft.value = '';
  }

  emit('ApplyEntry', i, v)
}

function AskDelete(): void {
  confirm_open.value = true;

  emit('AskDelete')
}

function CancelCreate(): void {
  creating.value = false;
  new_name.value = '';

  emit('CancelCreate')
}

function ConfirmDeleteNo(): void {
  confirm_open.value = false;

  emit('ConfirmDeleteNo')
}

function ConfirmDeleteYes(): void {
  confirm_open.value = false;
  store.DelEntity(store.selected_name);

  emit('ConfirmDeleteYes')
}

function DoCreate(): void {
  let name = new_name.value.trim();
  if (name != '') {store.NewEntity(name);
  creating.value = false;
  new_name.value = '';
  }

  emit('DoCreate')
}

function Draft(v: any): void {
  draft.value = v;

  emit('Draft', v)
}

function Load(): void {
  store.Open(props.module_id);

  emit('Load')
}

function MsToggle(i: any, v: any, on: any): void {
  let k: string = '';
  let j: number = 0;
  for (const x of store.entry_keys) {if (j == i) {k = x;
  }j = j + 1;
  }
  if (k != '') {if (on) {store.TagField(k, v);
  }if (on == false) {store.TagRemove(k, v);
  }}

  emit('MsToggle', i, v, on)
}

function NewName(v: any): void {
  new_name.value = v;

  emit('NewName', v)
}

function Pick(n: any): void {
  store.Pick(n);
  sidecar_draft.value = store.sidecar;
  draft.value = '';

  emit('Pick', n)
}

function PwToggle(i: any): void {
  pw_show.value = pw_show.value == false;

  emit('PwToggle')
}

function Reload(): void {
  store.Reload();

  emit('Reload')
}

function Save(): void {
  store.SetSidecar(sidecar_draft.value);
  store.SaveEntity();

  emit('Save')
}

function SetFilter(q: any): void {
  store.SetFilter(q);

  emit('SetFilter', q)
}

function SidecarDraft(v: any): void {
  sidecar_draft.value = v;

  emit('SidecarDraft', v)
}

async function TableCell(i: any, ri: any, col: any, v: any): Promise<void> {
  let k: string = '';
  let j: number = 0;
  for (const x of store.entry_keys) {if (j == i) {k = x;
  }j = j + 1;
  }
  if (k != '') {let nb = await setCellText(store.body_text, k, ri, col, v);
  store.SetBodyText(nb);
  }

  emit('TableCell', i, ri, col, v)
}

async function TableRowAdd(i: any): Promise<void> {
  let k: string = '';
  let j: number = 0;
  for (const x of store.entry_keys) {if (j == i) {k = x;
  }j = j + 1;
  }
  if (k != '') {let nb = await tableAddRowText(store.body_text, k);
  store.SetBodyText(nb);
  }

  emit('TableRowAdd', i)
}

async function TableRowRemove(i: any, ri: any): Promise<void> {
  let k: string = '';
  let j: number = 0;
  for (const x of store.entry_keys) {if (j == i) {k = x;
  }j = j + 1;
  }
  if (k != '') {let nb = await tableRemoveRowText(store.body_text, k, ri);
  store.SetBodyText(nb);
  }

  emit('TableRowRemove', i, ri)
}

function TagAdd(i: any): void {
  let k: string = '';
  let j: number = 0;
  for (const x of store.entry_keys) {if (j == i) {k = x;
  }j = j + 1;
  }
  if (draft.value != '' && k != '') {store.TagField(k, draft.value);
  draft.value = '';
  }

  emit('TagAdd', i)
}

function TagRemove(i: any, t: any): void {
  let k: string = '';
  let j: number = 0;
  for (const x of store.entry_keys) {if (j == i) {k = x;
  }j = j + 1;
  }
  if (k != '') {store.TagRemove(k, t);
  }

  emit('TagRemove', i, t)
}

function Toggle(i: any, on: any): void {
  let k: string = '';
  let j: number = 0;
  for (const x of store.entry_keys) {if (j == i) {k = x;
  }j = j + 1;
  }
  let nv: string = 'false';
  if (on) {nv = 'true';
  }
  if (k != '') {store.FieldEdited({ path: k, value: nv });
  }

  emit('Toggle', i, on)
}

function ToggleCreate(): void {
  creating.value = creating.value == false;

  emit('ToggleCreate')
}

onMounted(() => {
  store.Open(props.module_id);
})


</script>

<template>
    <div class="flex flex-row gap-4 collection gap-[16px] max-w-[960px]">
      <aside class="list-pane gap-[0px]">
        <div class="list-head gap-[6px]">
          <input class="filter-input" :placeholder="'Filter…'" :value="store.name_filter" @input="SetFilter(($event.target as HTMLInputElement).value)" />
          <template v-if="read_only == false">
            <button class="btn icon" @click="ToggleCreate">+</button>
          </template>
        </div>
        <template v-if="creating">
          <div class="create-row gap-[4px]">
            <input class="name-input" :placeholder="'entity-name'" v-model="new_name" @input="NewName(($event.target as HTMLInputElement).value)" @keydown.enter="DoCreate" />
            <button class="btn small" :disabled="store.saving || new_name.trim() == ''" @click="DoCreate">Add</button>
            <button class="btn small" @click="CancelCreate">✕</button>
          </div>
        </template>
        <template v-if="store.list_loading">
          <div class="list-msg">
            <span>Loading…</span>
          </div>
        </template>
        <template v-if="store.list_loading == false">
          <template v-if="store.view_entities.length == 0">
            <template v-if="store.names.length == 0">
              <div class="list-msg empty">
                <span>No entities.</span>
              </div>
            </template>
            <template v-if="store.names.length > 0">
              <div class="list-msg empty">
                <span>No match.</span>
              </div>
            </template>
            <template v-if="read_only == false">
              <button class="btn small list-load" @click="Load">Load</button>
            </template>
          </template>
          <template v-if="store.view_entities.length > 0">
            <div class="entity-list gap-[0px]">
              <div class="contents" :key="e.name" v-for="e in store.view_entities">
                <template v-if="store.selected_name == e.name">
                  <div class="e-row active" @click="Pick(e.name)">
                    <span class="e-name">{{ e.name }}</span>
                    <template v-if="e.description != ''">
                      <span class="e-desc">{{ e.description }}</span>
                    </template>
                  </div>
                </template>
                <template v-if="store.selected_name != e.name">
                  <div class="e-row" @click="Pick(e.name)">
                    <span class="e-name">{{ e.name }}</span>
                    <template v-if="e.description != ''">
                      <span class="e-desc">{{ e.description }}</span>
                    </template>
                  </div>
                </template>
              </div>
            </div>
          </template>
        </template>
      </aside>
      <section class="detail-pane gap-[0px]">
        <template v-if="store.selected_name == null">
          <template v-if="store.error != ''">
            <div class="state-msg error">
              <span>{{ '✗ ' + store.error }}</span>
            </div>
          </template>
          <template v-if="store.error == ''">
            <div class="state-msg">
              <span>Select an entity from the left, or create a new one.</span>
            </div>
          </template>
        </template>
        <template v-if="store.selected_name != null && store.loading">
          <div class="state-msg">
            <span>Loading…</span>
          </div>
        </template>
        <template v-if="store.selected_name != null && store.loading == false">
          <div class="toolbar gap-[0px]">
            <div class="meta gap-[0px]">
              <span class="mono">{{ store.selected_name }}</span>
              <template v-if="store.dirty">
                <span class="dirty">● unsaved</span>
              </template>
              <template v-if="store.is_read_only">
                <span class="ro-badge">read-only</span>
              </template>
            </div>
            <div class="actions gap-[0px]">
              <template v-if="read_only == false && store.is_read_only == false">
                <button class="btn" :disabled="store.saving" @click="Reload">Reload</button>
                <button class="btn primary" :disabled="store.saving || store.dirty == false" @click="Save">
                  <template v-if="store.saving">
                    <span>Saving…</span>
                  </template>
                  <template v-if="store.saving == false">
                    <span>Save</span>
                  </template>
                </button>
                <button class="btn danger" @click="AskDelete">Delete</button>
              </template>
            </div>
          </div>
          <template v-if="confirm_open">
            <div class="modal-backdrop gap-[0px]">
              <div class="modal gap-[0px]">
                <p>
                  <span>Delete </span>
                  <span class="strong">{{ store.selected_name }}</span>
                  <span>?</span>
                </p>
                <p class="modal-hint">
                  <span>This removes the </span>
                  <span class="inline-code">.at</span>
                  <span> file and its sidecar. A </span>
                  <span class="inline-code">.bak</span>
                  <span> is kept.</span>
                </p>
                <div class="modal-actions gap-[8px]">
                  <button class="btn" @click="ConfirmDeleteNo">Cancel</button>
                  <button class="btn danger" @click="ConfirmDeleteYes">Delete</button>
                </div>
              </div>
            </div>
          </template>
          <template v-if="store.error != ''">
            <div class="state-msg error">
              <span>{{ '✗ ' + store.error }}</span>
            </div>
          </template>
          <template v-if="store.is_read_only">
            <div class="flex flex-col gap-4 fm-view gap-[0px]">
              <div class="field-row">
                <label class="field-label">
                  <span>Name</span>
                </label>
                <div class="readonly-val mono">
                  <span>{{ store.fm_name }}</span>
                </div>
              </div>
              <div class="field-row">
                <label class="field-label">
                  <span>Description</span>
                </label>
                <div class="readonly-val">
                  <span>{{ store.fm_description }}</span>
                </div>
              </div>
              <div class="skill-body">{{ store.fm_body }}</div>
            </div>
          </template>
          <template v-if="store.is_read_only == false">
            <div class="fields gap-[0px]">
              <div class="contents" :key="e.key" v-for="(e, i) in store.entries">
                <template v-if="e.is_table">
                  <div class="field-row">
                    <label class="field-label">
                      <span>{{ e.label }}</span>
                    </label>
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
                                <select class="cell-select" :value="r[c.name]" @change="TableCell(i, ri, c.name, ($event.target as HTMLInputElement).value)">
                                  <option :value="o.value" v-for="o in c.options" :key="(((o as any)?.id ?? o))">{{ o.label }}</option>
                                  <option :value="r[c.name]">{{ r[c.name] }}</option>
                                </select>
                              </template>
                              <template v-if="c.kind == 'number'">
                                <input class="cell-input" :type="'number'" v-model="r[c.name]" @change="TableCell(i, ri, c.name, ($event.target as HTMLInputElement).value)" />
                              </template>
                              <template v-if="c.kind != 'select' && c.kind != 'number'">
                                <input class="cell-input" :type="'text'" v-model="r[c.name]" @change="TableCell(i, ri, c.name, ($event.target as HTMLInputElement).value)" />
                              </template>
                            </td>
                            <td class="row-act">
                              <button class="del-row" @click="TableRowRemove(i, ri)">×</button>
                            </td>
                          </tr>
                          <template v-if="e.t_rows.length == 0">
                            <tr>
                              <td class="empty">(empty — click + Row)</td>
                            </tr>
                          </template>
                        </tbody>
                      </table>
                      <button class="add-row" @click="TableRowAdd(i)">+ Row</button>
                    </div>
                  </div>
                </template>
                <template v-if="e.is_table == false && e.kind == 'toggle'">
                  <div class="field-row">
                    <label class="field-label">
                      <span>{{ e.label }}</span>
                    </label>
                    <label class="toggle gap-[0px]">
                      <input :checked="e.value == 'true'" :type="'checkbox'" @change="Toggle(i, ($event.target as HTMLInputElement).checked)" />
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
                  </div>
                </template>
                <template v-if="e.is_table == false && e.kind == 'number'">
                  <div class="field-row">
                    <label class="field-label">
                      <span>{{ e.label }}</span>
                    </label>
                    <input class="input" :type="'number'" :value="e.value" @change="ApplyEntry(i, ($event.target as HTMLInputElement).value)" @input="Draft(($event.target as HTMLInputElement).value)" />
                  </div>
                </template>
                <template v-if="e.is_table == false && e.kind == 'password'">
                  <div class="field-row">
                    <label class="field-label">
                      <span>{{ e.label }}</span>
                    </label>
                    <div class="secret gap-[0px]">
                      <template v-if="pw_show">
                        <input class="input pw" :placeholder="'(not set)'" :type="'text'" :value="e.value" @change="ApplyEntry(i, ($event.target as HTMLInputElement).value)" @input="Draft(($event.target as HTMLInputElement).value)" />
                      </template>
                      <template v-if="pw_show == false">
                        <input class="input pw" :placeholder="'(not set)'" :type="'password'" :value="e.value" @change="ApplyEntry(i, ($event.target as HTMLInputElement).value)" @input="Draft(($event.target as HTMLInputElement).value)" />
                      </template>
                      <button class="reveal" @click="PwToggle(i)">👁</button>
                    </div>
                  </div>
                </template>
                <template v-if="e.is_table == false && e.kind == 'text'">
                  <div class="field-row">
                    <label class="field-label">
                      <span>{{ e.label }}</span>
                    </label>
                    <input class="input" :placeholder="'(empty)'" :type="'text'" :value="e.value" @change="ApplyEntry(i, ($event.target as HTMLInputElement).value)" @input="Draft(($event.target as HTMLInputElement).value)" />
                  </div>
                </template>
                <template v-if="e.is_table == false && e.kind == 'select'">
                  <div class="field-row">
                    <label class="field-label">
                      <span>{{ e.label }}</span>
                    </label>
                    <template v-if="e.options.length > 0">
                      <select class="input" :value="e.value" @change="ApplyEntry(i, ($event.target as HTMLInputElement).value)">
                        <option :value="o.value" v-for="o in e.options" :key="(((o as any)?.id ?? o))">{{ o.label }}</option>
                        <template v-if="e.has_current">
                          <option :value="e.value">{{ e.value + ' (current)' }}</option>
                        </template>
                      </select>
                    </template>
                    <template v-if="e.options.length == 0">
                      <div class="fallback-text gap-[0px]">
                        <input class="input" :placeholder="'(not set)'" :type="'text'" :value="e.value" @change="ApplyEntry(i, ($event.target as HTMLInputElement).value)" @input="Draft(($event.target as HTMLInputElement).value)" />
                        <span class="fallback-hint">no options available (e.g. builtin-only) — type freely</span>
                      </div>
                    </template>
                  </div>
                </template>
                <template v-if="e.is_table == false && e.kind == 'tags'">
                  <div class="field-row">
                    <label class="field-label">
                      <span>{{ e.label }}</span>
                    </label>
                    <div class="tags">
                      <span class="tag" v-for="t in e.items" :key="(((t as any)?.id ?? t))">
                        <span>{{ t }}</span>
                        <button class="tag-x" @click="TagRemove(i, t)">×</button>
                      </span>
                      <input class="tag-input" :placeholder="'add…'" :type="'text'" :value="''" @input="Draft(($event.target as HTMLInputElement).value)" @keydown.enter="TagAdd(i)" />
                    </div>
                  </div>
                </template>
                <template v-if="e.is_table == false && e.kind == 'multiselect'">
                  <div class="field-row">
                    <label class="field-label">
                      <span>{{ e.label }}</span>
                    </label>
                    <div class="multiselect">
                      <label class="ms-item" v-for="(o, oi) in e.options" :key="(((o as any)?.id ?? o))">
                        <input :checked="e.ms_checked[oi]" :type="'checkbox'" @change="MsToggle(i, o.value, ($event.target as HTMLInputElement).checked)" />
                        <span>{{ o.label }}</span>
                      </label>
                      <template v-if="e.options.length == 0">
                        <p class="ms-empty">No options available (directory empty or missing).</p>
                      </template>
                    </div>
                  </div>
                </template>
                <template v-if="e.is_table == false && e.kind == 'subform'">
                  <div class="field-row">
                    <label class="field-label">
                      <span>{{ e.label }}</span>
                    </label>
                    <div class="table-readonly">
                      <span class="font-mono text-xs text-[#616161] whitespace-pre-wrap break-all">{{ e.frag }}</span>
                    </div>
                  </div>
                </template>
              </div>
              <div class="field-row sidecar-row">
                <label class="field-label">
                  <span>Soul </span>
                  <span class="hint">(markdown sidecar)</span>
                </label>
                <textarea class="sidecar" :placeholder="'# Soul — the role\'s system prompt / personality (markdown).'" v-model="sidecar_draft" @input="SidecarDraft(($event.target as HTMLInputElement).value)" />
              </div>
            </div>
          </template>
        </template>
      </section>
    </div>

</template>

<style>
/* Component styles */

</style>
