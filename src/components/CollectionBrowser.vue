<!-- CollectionBrowser component - Auto-generated from Auto language -->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ScalarFields } from '../../auto/src/front/utils/collection_store_ext'
import { TableField } from '../../auto/src/front/utils/collection_store_ext'
import { filterEntities } from '../../auto/src/front/utils/collection_store_ext'
import { useCollectionStore } from '../../auto/src/front/utils/collection_store_ext'

const collectionStore = useCollectionStore()


const filter = ref<string>('')
const creating = ref<boolean>(false)
const new_name = ref<string>('')
const confirm_delete = ref<any>(null)
const sidecar_draft = ref<string>('')

const can_edit = computed<boolean>(() => props.read_only === false && collectionStore.is_read_only === false)
const filtered = computed<any>(() => filterEntities(collectionStore.list, filter.value))

const props = defineProps<{
  module_id: string
  read_only: boolean
}>()

const emit = defineEmits<{
  Init: []
  FilterChanged: []
  ToggleCreate: []
  NewNameChanged: []
  DoCreate: []
  CancelCreate: []
  SelectEntity: [string]
  Reload: []
  Save: []
  AskDelete: []
  CancelDelete: []
  DoDelete: []
  BackdropClose: [any]
  FieldEdited: [any]
  SidecarChanged: []
}>()

function AskDelete(): void {
  confirm_delete.value = collectionStore.selected_name;

  emit('AskDelete')
}

function BackdropClose(e: any): void {
  if (e.target == e.currentTarget) {confirm_delete.value = null;
  }

  emit('BackdropClose', e)
}

function CancelCreate(): void {
  creating.value = false;
  new_name.value = '';

  emit('CancelCreate')
}

function CancelDelete(): void {
  confirm_delete.value = null;

  emit('CancelDelete')
}

function DoCreate(): void {
  let name = new_name.value.trim();
  if (name != '') {collectionStore.Create(name);
  creating.value = false;
  new_name.value = '';
  }

  emit('DoCreate')
}

function DoDelete(): void {
  if (confirm_delete.value != null) {collectionStore.Remove(confirm_delete.value);
  }
  confirm_delete.value = null;

  emit('DoDelete')
}

function FieldEdited(args: any): void {
  collectionStore.FieldEdited(args);

  emit('FieldEdited', args)
}

function FilterChanged(): void {
  filter.value = filter.value;

  emit('FilterChanged')
}

function NewNameChanged(): void {
  new_name.value = new_name.value;

  emit('NewNameChanged')
}

function Reload(): void {
  collectionStore.Reload();

  emit('Reload')
}

function Save(): void {
  collectionStore.Save();

  emit('Save')
}

function SelectEntity(name: any): void {
  collectionStore.Select(name);
  sidecar_draft.value = collectionStore.sidecar;

  emit('SelectEntity', name)
}

function SidecarChanged(): void {
  collectionStore.SetSidecar(sidecar_draft.value);

  emit('SidecarChanged')
}

function ToggleCreate(): void {
  creating.value = !creating.value;

  emit('ToggleCreate')
}

onMounted(() => {
  collectionStore.Init(props.module_id);
})


</script>

<template>
    <div class="collection">
      <aside class="list-pane">
        <div class="list-head">
          <input class="filter-input" :placeholder="'Filter…'" v-model="filter" @input="FilterChanged" @keyup="FilterChanged" />
          <template v-if="can_edit">
            <button class="btn icon" :title="'New'" @click="ToggleCreate">
              <span>+</span>
            </button>
          </template>
        </div>
        <template v-if="creating">
          <div class="create-row">
            <input class="name-input" :placeholder="'entity-name'" v-model="new_name" @input="NewNameChanged" @keydown.enter="DoCreate" @keyup="NewNameChanged" />
            <button class="btn small" :disabled="collectionStore.saving || new_name.trim() == ''" @click="DoCreate">
              <span>Add</span>
            </button>
            <button class="btn small" @click="CancelCreate">
              <span>✕</span>
            </button>
          </div>
        </template>
        <template v-if="collectionStore.list_loading">
          <div class="list-msg">
            <span>Loading…</span>
          </div>
        </template>
        <template v-if="collectionStore.list_loading == false && filtered.length == 0">
          <div class="list-msg empty">
            <template v-if="collectionStore.list.length == 0">
              <span>No entities.</span>
            </template>
            <template v-if="collectionStore.list.length > 0">
              <span>No match.</span>
            </template>
          </div>
        </template>
        <template v-if="filtered.length > 0">
          <div class="entity-list">
            <div :class="(collectionStore.selected_name == e.name ? 'active' : '')" :key="e.name" @click="SelectEntity(e.name)" v-for="e in filtered">
              <span class="e-name">
                <span>{{ e.name }}</span>
              </span>
              <template v-if="e.description != ''">
                <span class="e-desc">
                  <span>{{ e.description }}</span>
                </span>
              </template>
            </div>
          </div>
        </template>
      </aside>
      <section class="detail-pane">
        <template v-if="collectionStore.error != '' && collectionStore.selected_name == null">
          <div class="state-msg error">
            <span>✗ {{ collectionStore.error }}</span>
          </div>
        </template>
        <template v-if="collectionStore.error == '' && collectionStore.selected_name == null">
          <div class="state-msg">
            <span>Select an entity from the left, or create a new one.</span>
          </div>
        </template>
        <template v-if="collectionStore.selected_name != null">
          <template v-if="collectionStore.loading">
            <div class="state-msg">
              <span>Loading…</span>
            </div>
          </template>
          <template v-if="collectionStore.loading == false">
            <div class="toolbar">
              <div class="meta">
                <span class="mono">
                  <span>{{ collectionStore.selected_name }}</span>
                </span>
                <template v-if="collectionStore.dirty">
                  <span class="dirty">
                    <span>● unsaved</span>
                  </span>
                </template>
                <template v-if="collectionStore.is_read_only">
                  <span class="ro-badge">
                    <span>read-only</span>
                  </span>
                </template>
              </div>
              <div class="actions">
                <template v-if="can_edit">
                  <button class="btn" :disabled="collectionStore.saving" @click="Reload">
                    <span>Reload</span>
                  </button>
                </template>
                <template v-if="can_edit">
                  <button class="btn primary" :disabled="collectionStore.saving || collectionStore.dirty == false" @click="Save">
                    <template v-if="collectionStore.saving">
                      <span>Saving…</span>
                    </template>
                    <template v-if="collectionStore.saving == false">
                      <span>Save</span>
                    </template>
                  </button>
                </template>
                <template v-if="can_edit">
                  <button class="btn danger" @click="AskDelete">
                    <span>Delete</span>
                  </button>
                </template>
              </div>
            </div>
            <template v-if="collectionStore.error != ''">
              <div class="state-msg error">
                <span>✗ {{ collectionStore.error }}</span>
              </div>
            </template>
            <template v-if="collectionStore.entries.length > 0 && can_edit">
              <div class="fields">
                <div class="entry" :key="f.key" v-for="f in collectionStore.entries">
                  <template v-if="f.is_table">
                    <div class="field-row" :key="f.key">
                      <label class="field-label">
                        <span>{{ f.spec.label }}</span>
                      </label>
                      <TableField :modelValue="f.value" :module_id="module_id" :path="f.key" :key="'TableField-1-' + (((f as any)?.id ?? f))" @Value="FieldEdited($event)" />
                    </div>
                  </template>
                  <template v-if="f.is_table == false">
                    <div class="field-row" :key="f.key">
                      <label class="field-label">
                        <span>{{ f.spec.label }}</span>
                      </label>
                      <ScalarFields :modelValue="f.value" :path="f.key" :spec="f.spec" :key="'ScalarFields-2-' + (((f as any)?.id ?? f))" @Value="FieldEdited($event)" />
                    </div>
                  </template>
                </div>
                <div class="field-row sidecar-row">
                  <label class="field-label">
                    <span>Soul </span>
                    <span class="hint">
                      <span>(markdown sidecar)</span>
                    </span>
                  </label>
                  <textarea class="sidecar" :placeholder="'# Soul\n\nThe role\'s system prompt / personality (markdown).'" v-model="sidecar_draft" @input="SidecarChanged" />
                </div>
              </div>
            </template>
            <template v-if="collectionStore.entries.length == 0 && collectionStore.is_read_only">
              <div class="fm-view">
                <div class="field-row">
                  <label class="field-label">
                    <span>Name</span>
                  </label>
                  <div class="readonly-val mono">
                    <span>{{ collectionStore.fm_name }}</span>
                  </div>
                </div>
                <div class="field-row">
                  <label class="field-label">
                    <span>Description</span>
                  </label>
                  <div class="readonly-val">
                    <span>{{ collectionStore.fm_description }}</span>
                  </div>
                </div>
                <div class="skill-body">
                  <span>{{ collectionStore.fm_body }}</span>
                </div>
              </div>
            </template>
          </template>
        </template>
      </section>
      <template v-if="confirm_delete != null">
        <div class="modal-backdrop" @click="BackdropClose($event)">
          <div class="modal">
            <p>
              <span>Delete </span>
              <span class="strong">
                <span>{{ confirm_delete }}</span>
              </span>
              <span>?</span>
            </p>
            <p class="modal-hint">
              <span>This removes the </span>
              <span class="inline-code">
                <span>.at</span>
              </span>
              <span> file and its sidecar. A </span>
              <span class="inline-code">
                <span>.bak</span>
              </span>
              <span> is kept.</span>
            </p>
            <div class="modal-actions">
              <button class="btn" @click="CancelDelete">
                <span>Cancel</span>
              </button>
              <button class="btn danger" @click="DoDelete">
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      </template>
    </div>

</template>

<style>
/* Component styles */

</style>

<style scoped>

        .collection {
            display: grid;
            grid-template-columns: 260px 1fr;
            gap: 16px;
            max-width: 960px;
        }
        .list-pane {
            border: 1px solid var(--border);
            border-radius: var(--radius, 8px);
            background: var(--bg-card);
            height: fit-content;
            max-height: 70vh;
            display: flex;
            flex-direction: column;
        }
        .list-head {
            display: flex;
            gap: 6px;
            padding: 8px;
            border-bottom: 1px solid var(--border);
        }
        .filter-input {
            flex: 1;
            padding: 5px 9px;
            border: 1px solid var(--border);
            border-radius: var(--radius-sm, 4px);
            font-size: var(--font-size-sm);
            background: var(--bg-input);
            outline: none;
        }
        .filter-input:focus {
            border-color: var(--accent);
            box-shadow: 0 0 0 2px var(--ring);
        }
        .create-row {
            display: flex;
            gap: 4px;
            padding: 8px;
            border-bottom: 1px solid var(--border);
            background: var(--accent-lighter);
        }
        .name-input {
            flex: 1;
            padding: 4px 8px;
            border: 1px solid var(--border);
            border-radius: var(--radius-sm, 4px);
            font-size: var(--font-size-sm);
            background: var(--bg-input);
            outline: none;
            font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        }
        .entity-list {
            list-style: none;
            margin: 0;
            padding: 4px;
            overflow-y: auto;
        }
        .entity-list > div {
            padding: 7px 10px;
            border-radius: var(--radius-sm, 4px);
            cursor: pointer;
            transition: background 0.12s;
        }
        .entity-list > div:hover {
            background: var(--bg-hover);
        }
        .entity-list > div.active {
            background: var(--accent-light);
        }
        .e-name {
            display: block;
            font-weight: 600;
            font-size: var(--font-size-sm);
            font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
            color: var(--text-primary);
        }
        .e-desc {
            display: block;
            font-size: 11px;
            color: var(--text-muted);
            margin-top: 2px;
            line-height: 1.4;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .list-msg {
            padding: 16px;
            text-align: center;
            color: var(--text-muted);
            font-size: var(--font-size-sm);
        }
        .list-msg.empty {
            font-style: italic;
        }
        .detail-pane {
            min-width: 0;
        }
        .toolbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 4px 0 12px 0;
            border-bottom: 1px solid var(--border);
            margin-bottom: 8px;
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
            color: var(--text-primary);
            font-weight: 600;
        }
        .dirty {
            color: var(--accent);
        }
        .ro-badge {
            background: var(--bg-hover);
            color: var(--text-secondary);
            padding: 1px 8px;
            border-radius: 10px;
            font-size: 11px;
        }
        .actions {
            display: flex;
            gap: 8px;
        }
        .btn {
            border: 1px solid var(--border);
            background: var(--bg-card);
            color: var(--text-primary);
            padding: 5px 14px;
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
        .btn.danger {
            color: var(--danger);
            border-color: var(--border);
        }
        .btn.danger:hover:not(:disabled) {
            background: rgba(196, 43, 28, 0.08);
            border-color: var(--danger);
        }
        .btn.icon {
            padding: 4px 10px;
            font-size: 16px;
            line-height: 1;
        }
        .btn.small {
            padding: 4px 10px;
        }
        .btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        .fields {
            display: flex;
            flex-direction: column;
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
        .field-label .hint {
            font-weight: 400;
            color: var(--text-muted);
            font-size: 11px;
        }
        .sidecar {
            width: 100%;
            min-height: 160px;
            padding: 8px 10px;
            border: 1px solid var(--border);
            border-radius: var(--radius-sm, 4px);
            font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
            font-size: var(--font-size-sm);
            background: var(--bg-input);
            outline: none;
            resize: vertical;
            line-height: 1.5;
        }
        .sidecar:focus {
            border-color: var(--accent);
            box-shadow: 0 0 0 2px var(--ring);
        }
        .readonly-val {
            font-size: var(--font-size-sm);
            color: var(--text-primary);
            padding-top: 6px;
        }
        .skill-body {
            margin-top: 12px;
            padding: 12px 14px;
            background: var(--bg-hover);
            border-radius: var(--radius, 8px);
            font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
            font-size: var(--font-size-sm);
            line-height: 1.5;
            white-space: pre-wrap;
            max-height: 50vh;
            overflow-y: auto;
            color: var(--text-secondary);
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
        .modal-backdrop {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 100;
        }
        .modal {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: var(--radius, 8px);
            padding: 20px 24px;
            max-width: 380px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
        }
        .modal p {
            margin: 0 0 8px 0;
            font-size: var(--font-size-base);
        }
        .modal-hint {
            font-size: var(--font-size-sm);
            color: var(--text-muted);
        }
        .modal-hint .inline-code {
        .modal .strong { font-weight: 600; }
            background: var(--bg-hover);
            padding: 1px 4px;
            border-radius: 3px;
            font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        }
        .modal-actions {
            display: flex;
            gap: 8px;
            justify-content: flex-end;
            margin-top: 16px;
        }
    </style>
