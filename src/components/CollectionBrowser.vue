<!-- CollectionBrowser component - Auto-generated from Auto language -->
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { fieldDisplayOf } from '@/lib/api'

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
  ApplyEntry: [string]
  TagAdd: [string]
  Toggle: [string]
  PwToggle: []
}>()

import { useCollectionStore } from '../stores/auto/useCollectionStore'
import { reactive } from 'vue'
const store = reactive(useCollectionStore())

function ApplyEntry(i: any): void {
  let k: string = '';
  let j: number = 0;
  for (const x of store.entry_keys) {if (j == i) {k = x;
  }j = j + 1;
  }
  if (draft.value != '' && k != '') {store.FieldEdited({ path: k, value: draft.value });
  draft.value = '';
  }

  emit('ApplyEntry', i)
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

async function Toggle(i: any): Promise<void> {
  let k: string = '';
  let j: number = 0;
  for (const x of store.entry_keys) {if (j == i) {k = x;
  }j = j + 1;
  }
  let nv: string = 'false';
  if (k != '') {let cur = await fieldDisplayOf(store.body_text, k);
  if (cur == 'false' || cur == '') {nv = 'true';
  }}
  store.FieldEdited({ path: k, value: nv });

  emit('Toggle', i)
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
    <div class="flex flex-row gap-4 collection max-w-[960px]">
      <div class="flex flex-col gap-4 list-pane w-[260px] shrink-0 border border-[#e0e0e0] rounded-lg bg-white">
        <div class="flex flex-row gap-4 list-head gap-2 p-2 border-b border-[#e0e0e0]">
          <input class="filter-input flex-1 px-2 py-1 text-xs border border-[#e0e0e0] rounded bg-[#f0f0f0]" :placeholder="'Filter…'" :value="store.name_filter" @input="SetFilter(($event.target as HTMLInputElement).value)" />
          <template v-if="read_only == false">
            <button class="px-2 py-1 text-sm rounded border border-[#e0e0e0] bg-white" @click="ToggleCreate">＋</button>
          </template>
        </div>
        <template v-if="creating">
          <div class="flex flex-row gap-4 create-row gap-2 p-2 border-b border-[#e0e0e0] bg-[#ededed]">
            <input class="name-input flex-1 px-2 py-1 text-xs border border-[#e0e0e0] rounded bg-white font-mono" :placeholder="'entity-name'" v-model="new_name" @input="NewName(($event.target as HTMLInputElement).value)" />
            <button class="px-2 py-1 text-xs rounded border border-[#e0e0e0] bg-white" @click="DoCreate">Add</button>
            <button class="px-2 py-1 text-xs rounded border border-[#e0e0e0] bg-white" @click="CancelCreate">✕</button>
          </div>
        </template>
        <template v-if="store.list_loading">
          <span class="list-msg p-4 text-center text-xs text-[#8a8a8a]">Loading…</span>
        </template>
        <template v-if="store.list_loading == false">
          <template v-if="store.view_names.length == 0">
            <span class="list-msg p-4 text-center text-xs text-[#8a8a8a]">No entities.</span>
          </template>
          <template v-if="store.names.length == 0">
            <template v-if="read_only == false">
              <button class="mx-2 px-3 py-1 text-xs rounded border border-[#e0e0e0] bg-white" @click="Load">Load</button>
            </template>
          </template>
          <template v-if="store.names.length > 0">
            <template v-if="store.view_names.length == 0">
              <span class="list-msg p-2 text-center text-xs text-[#8a8a8a]">No match.</span>
            </template>
          </template>
          <div class="overflow-auto max-h-[70vh] p-1">
            <div class="flex flex-col gap-4 entity-list gap-[2px]">
              <div class="contents" :key="n" v-for="n in store.view_names">
                <template v-if="store.selected_name == n">
                  <button class="e-item e-name active w-full text-left px-[10px] py-[7px] rounded font-mono text-sm bg-primary/10 text-primary font-semibold" @click="Pick(n)">{{ n }}</button>
                </template>
                <template v-if="store.selected_name != n">
                  <button class="e-item e-name w-full text-left px-[10px] py-[7px] rounded font-mono text-sm text-[#1a1a1a]" @click="Pick(n)">{{ n }}</button>
                </template>
              </div>
            </div>
          </div>
        </template>
      </div>
      <div class="flex flex-col gap-4 detail-pane flex-1">
        <template v-if="store.selected_name == null">
          <template v-if="store.error != ''">
            <span class="state-msg error px-4 py-3 rounded-lg text-sm text-[#c42b1c]">{{ '✗ ' + store.error }}</span>
          </template>
          <template v-if="store.error == ''">
            <span class="state-msg px-4 py-3 rounded-lg bg-[#ededed] text-sm text-[#616161]">Select an entity from the left, or create a new one.</span>
          </template>
        </template>
        <template v-if="store.selected_name != null && store.loading">
          <span class="state-msg px-4 py-3 rounded-lg bg-[#ededed] text-sm text-[#616161]">Loading…</span>
        </template>
        <template v-if="store.selected_name != null && store.loading == false">
          <div class="flex flex-row gap-4 toolbar items-center gap-3 py-2 border-b border-[#e0e0e0]">
            <span class="mono font-mono text-sm font-semibold text-[#1a1a1a]">{{ store.selected_name }}</span>
            <template v-if="store.dirty">
              <span class="dirty text-xs font-medium text-primary">● unsaved</span>
            </template>
            <template v-if="store.is_read_only">
              <span class="ro-badge text-[11px] px-2 rounded-full bg-[#ededed] text-[#616161]">read-only</span>
            </template>
            <div class="flex-1" />
            <template v-if="read_only == false && store.is_read_only == false">
              <button class="px-3 py-1 text-xs rounded border border-[#e0e0e0] bg-white" @click="Reload">Reload</button>
              <button class="px-4 py-1 text-xs rounded bg-primary border-primary text-white" @click="Save">Save</button>
              <button class="px-3 py-1 text-xs rounded border border-[#c42b1c] text-[#c42b1c] bg-white" @click="AskDelete">Delete</button>
            </template>
          </div>
          <template v-if="confirm_open">
            <div class="flex flex-row gap-4 items-center gap-3 px-3 py-2 border border-[#c42b1c] rounded bg-[#ededed]">
              <span class="text-sm text-[#c42b1c]">Delete this entity? (.at + sidecar removed, .bak kept)</span>
              <div class="flex-1" />
              <button class="px-3 py-1 text-xs rounded bg-[#c42b1c] border-[#c42b1c] text-white" @click="ConfirmDeleteYes">Yes, delete</button>
              <button class="px-3 py-1 text-xs rounded border border-[#e0e0e0] bg-white" @click="ConfirmDeleteNo">Cancel</button>
            </div>
          </template>
          <template v-if="store.error != ''">
            <span class="state-msg error px-4 py-3 rounded-lg text-sm text-[#c42b1c]">{{ '✗ ' + store.error }}</span>
          </template>
          <template v-if="store.is_read_only">
            <div class="flex flex-col gap-4 fm-view gap-2">
              <span class="text-lg font-bold text-[#1a1a1a]">{{ store.fm_name }}</span>
              <span class="text-sm text-[#616161]">{{ store.fm_description }}</span>
              <span class="skill-body fm-body p-3 rounded-lg bg-[#ededed] font-mono text-xs text-[#616161]">{{ store.fm_body }}</span>
            </div>
          </template>
          <template v-if="store.is_read_only == false">
            <div class="overflow-auto flex-1">
              <div class="flex flex-col gap-4 fields gap-1">
                <div class="contents" :key="e.key" v-for="(e, i) in store.entries">
                  <template v-if="e.is_table">
                    <div class="flex flex-col gap-4 field-row border rounded p-2 gap-1 bg-white">
                      <span class="field-label text-sm font-medium text-[#616161]">{{ e.label }}</span>
                      <span class="text-xs text-[#8a8a8a] font-mono">{{ e.frag }}</span>
                    </div>
                  </template>
                  <template v-if="e.kind == 'toggle'">
                    <div class="flex flex-row gap-4 field-row items-center gap-3 py-2">
                      <span class="field-label text-sm font-medium text-[#616161] w-[160px] shrink-0">{{ e.label }}</span>
                      <input type="checkbox" :checked="e.value" :id="e.key" @click="Toggle(i)" />
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
                      <span class="field-label text-sm font-medium text-[#616161] w-[160px] shrink-0">{{ e.label }}</span>
                      <input class="input px-[10px] py-[6px] text-sm border border-[#e0e0e0] rounded bg-white w-[240px]" :placeholder="e.label" :type="'number'" :value="e.value" @input="Draft(($event.target as HTMLInputElement).value)" />
                      <button class="btn px-3 py-1 text-xs rounded border border-[#e0e0e0] bg-white" @click="ApplyEntry(i)">Apply</button>
                    </div>
                  </template>
                  <template v-if="e.kind == 'password'">
                    <div class="flex flex-row gap-4 field-row items-center gap-3 py-2">
                      <span class="field-label text-sm font-medium text-[#616161] w-[160px] shrink-0">{{ e.label }}</span>
                      <template v-if="pw_show">
                        <input class="input px-[10px] py-[6px] text-sm border border-[#e0e0e0] rounded bg-white w-[240px]" :placeholder="e.label" :value="e.value" @input="Draft(($event.target as HTMLInputElement).value)" />
                      </template>
                      <template v-if="pw_show == false">
                        <input class="input px-[10px] py-[6px] text-sm border border-[#e0e0e0] rounded bg-white w-[240px]" :placeholder="e.label" :type="'password'" :value="e.value" @input="Draft(($event.target as HTMLInputElement).value)" />
                      </template>
                      <button class="btn px-2 py-1 text-xs rounded border border-[#e0e0e0] bg-white" @click="PwToggle(i)">👁</button>
                      <button class="btn px-3 py-1 text-xs rounded border border-[#e0e0e0] bg-white" @click="ApplyEntry(i)">Apply</button>
                    </div>
                  </template>
                  <template v-if="e.kind == 'text'">
                    <div class="flex flex-row gap-4 field-row items-center gap-3 py-2">
                      <span class="field-label text-sm font-medium text-[#616161] w-[160px] shrink-0">{{ e.label }}</span>
                      <input class="input px-[10px] py-[6px] text-sm border border-[#e0e0e0] rounded bg-white w-[240px]" :placeholder="e.label" :value="e.value" @input="Draft(($event.target as HTMLInputElement).value)" />
                      <button class="btn px-3 py-1 text-xs rounded border border-[#e0e0e0] bg-white" @click="ApplyEntry(i)">Apply</button>
                    </div>
                  </template>
                  <template v-if="e.kind == 'select'">
                    <div class="flex flex-col gap-4 field-row py-2 gap-1">
                      <div class="flex flex-row gap-4 items-center gap-3">
                        <span class="field-label text-sm font-medium text-[#616161] w-[160px] shrink-0">{{ e.label }}</span>
                        <input class="input px-[10px] py-[6px] text-sm border border-[#e0e0e0] rounded bg-white w-[240px]" :placeholder="e.label" :value="e.value" @input="Draft(($event.target as HTMLInputElement).value)" />
                        <button class="btn px-3 py-1 text-xs rounded border border-[#e0e0e0] bg-white" @click="ApplyEntry(i)">Apply</button>
                      </div>
                      <template v-if="e.url != ''">
                        <span class="text-xs text-[#8a8a8a]">(select — free text accepted)</span>
                      </template>
                    </div>
                  </template>
                  <template v-if="e.kind == 'tags'">
                    <div class="flex flex-col gap-4 field-row py-2 gap-1">
                      <div class="flex flex-row gap-4 items-center gap-3">
                        <span class="field-label text-sm font-medium text-[#616161] w-[160px] shrink-0">{{ e.label }}</span>
                        <input class="input px-[10px] py-[6px] text-sm border border-[#e0e0e0] rounded bg-white w-[240px]" :placeholder="'add value'" :value="e.value" @input="Draft(($event.target as HTMLInputElement).value)" />
                        <button class="btn px-3 py-1 text-xs rounded border border-[#e0e0e0] bg-white" @click="TagAdd(i)">Add</button>
                      </div>
                      <span class="text-xs text-[#8a8a8a] font-mono">{{ e.value }}</span>
                    </div>
                  </template>
                  <template v-if="e.kind == 'multiselect'">
                    <div class="flex flex-col gap-4 field-row py-2 gap-1">
                      <div class="flex flex-row gap-4 items-center gap-3">
                        <span class="field-label text-sm font-medium text-[#616161] w-[160px] shrink-0">{{ e.label }}</span>
                        <input class="input px-[10px] py-[6px] text-sm border border-[#e0e0e0] rounded bg-white w-[240px]" :placeholder="'add value'" :value="e.value" @input="Draft(($event.target as HTMLInputElement).value)" />
                        <button class="btn px-3 py-1 text-xs rounded border border-[#e0e0e0] bg-white" @click="TagAdd(i)">Add</button>
                      </div>
                      <span class="text-xs text-[#8a8a8a] font-mono">{{ e.value }}</span>
                    </div>
                  </template>
                  <template v-if="e.kind == 'subform'">
                    <div class="flex flex-col gap-4 field-row border rounded p-2 gap-1 bg-white">
                      <span class="field-label text-sm font-medium text-[#616161]">{{ e.label }}</span>
                      <span class="text-xs text-[#8a8a8a] font-mono">{{ e.frag }}</span>
                    </div>
                  </template>
                </div>
                <div class="flex flex-col gap-4 field-row sidecar-row py-2 gap-1">
                  <span class="field-label text-sm font-medium text-[#616161]">Soul (markdown sidecar)</span>
                  <textarea class="sidecar w-full min-h-[160px] p-2 text-xs border border-[#e0e0e0] rounded bg-white font-mono" :placeholder="'# Soul — the role\'s system prompt / personality (markdown).'" v-model="sidecar_draft" @input="SidecarDraft(($event.target as HTMLInputElement).value)" />
                </div>
              </div>
            </div>
          </template>
        </template>
      </div>
    </div>

</template>

<style>
/* Component styles */

</style>
