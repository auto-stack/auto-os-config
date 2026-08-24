<!-- ScalarFields component - Auto-generated from Auto language -->
<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { loadEnum, enumUrlOf } from '../../auto/src/front/utils/controls_ext'


const reveal = ref<boolean>(false)
const tag_input = ref<string>('')
const options = ref<any[]>([])
const val = ref<any>(null)

const opts_src = computed<any>(() => props.spec.optionsFrom)
const has_options = computed<boolean>(() => options.value.length > 0)
const has_current = computed<boolean>(() => props.modelValue != null && !!(props.modelValue) && options.value.find((x) => x.value === props.modelValue) == null)

const props = defineProps<{
  spec: any
  modelValue: any
  path: string
}>()

const emit = defineEmits<{
  Value: [any]
  Changed: [any]
  ToggleChanged: [any]
  ToggleReveal: []
  TagInputChanged: []
  AddTag: []
  RemoveTag: [string]
  ToggleOption: [string]
  PickChanged: [any]
  NumChanged: [any]
}>()

watch(() => props.modelValue, () => {
  val.value = props.modelValue;
}, { immediate: true })

watch(opts_src, () => {
  options.value = [];
  let u = enumUrlOf(props.spec.optionsFrom);
  if (u != '') {let p = loadEnum(u);
  p.then((opts: any) => { options.value = opts;
   });
  }
}, { immediate: true })

function AddTag(): void {
  if (tag_input.value.trim() != '') {let arr = [];
  if (props.modelValue != null) {arr = props.modelValue;
  }if (arr.includes(tag_input.value.trim()) == false) {emit('Value', { path: props.path, value: arr.concat([tag_input.value.trim()]) });
  }tag_input.value = '';
  }

  emit('AddTag')
}

function Changed(e: any): void {
  emit('Value', { path: props.path, value: e.target.value });

  emit('Changed', e)
}

function NumChanged(e: any): void {
  emit('Value', { path: props.path, value: parseInt(e.target.value) });

  emit('NumChanged', e)
}

function PickChanged(e: any): void {
  emit('Value', { path: props.path, value: e.target.value });

  emit('PickChanged', e)
}

function RemoveTag(t: any): void {
  if (props.modelValue != null) {emit('Value', { path: props.path, value: props.modelValue.filter((x: any) => x != t) });
  }

  emit('RemoveTag', t)
}

function TagInputChanged(): void {
  tag_input.value = tag_input.value;

  emit('TagInputChanged')
}

function ToggleChanged(e: any): void {
  emit('Value', { path: props.path, value: e.target.checked });

  emit('ToggleChanged', e)
}

function ToggleOption(v: any): void {
  let arr = [];
  if (props.modelValue != null) {arr = props.modelValue;
  }
  if (arr.includes(v)) {emit('Value', { path: props.path, value: arr.filter((x: any) => x != v) });
  }
  if (arr.includes(v) == false) {emit('Value', { path: props.path, value: arr.concat([v]) });
  }

  emit('ToggleOption', v)
}

function ToggleReveal(): void {
  reveal.value = !reveal.value;

  emit('ToggleReveal')
}


</script>

<template>
    <div class="field-row">
      <label class="field-label">
        <span>{{ spec.label }}</span>
      </label>
      <div class="field-control">
        <template v-if="spec.kind == 'toggle'">
          <label class="toggle">
            <input :checked="modelValue" :type="'checkbox'" @change="ToggleChanged($event)" />
            <span class="toggle-track">
              <span class="toggle-thumb" />
            </span>
            <span class="toggle-text">
              <template v-if="modelValue">
                <span>On</span>
              </template>
              <template v-if="modelValue == false">
                <span>Off</span>
              </template>
            </span>
          </label>
        </template>
        <template v-else-if="spec.kind == 'number'">
          <input class="input" :type="'number'" v-model="val" @input="NumChanged($event)" />
        </template>
        <template v-else-if="spec.kind == 'password'">
          <div class="secret">
            <input class="input" :autocomplete="'off'" :placeholder="'(not set)'" :type="(reveal ? 'text' : 'password')" v-model="val" @input="Changed($event)" />
            <button class="reveal" @click="ToggleReveal">
              <template v-if="reveal">
                <span>🙈</span>
              </template>
              <template v-if="reveal == false">
                <span>👁</span>
              </template>
            </button>
          </div>
        </template>
        <template v-else-if="spec.kind == 'select'">
          <template v-if="has_options">
            <select class="input" :value="val" @change="PickChanged($event)">
              <option :key="o.value" :value="o.value" v-for="o in options">
                <span>{{ o.label }}</span>
              </option>
              <template v-if="has_current">
                <option :value="val">
                  <span>{{ modelValue }} (current)</span>
                </option>
              </template>
            </select>
          </template>
          <template v-if="has_options == false">
            <div class="fallback-text">
              <input class="input" :placeholder="'(not set)'" :type="'text'" v-model="val" @input="Changed($event)" />
              <span class="fallback-hint">
                <span>no options available (e.g. builtin-only) — type freely</span>
              </span>
            </div>
          </template>
        </template>
        <template v-else-if="spec.kind == 'multiselect'">
          <div class="multiselect">
            <label class="ms-item" :key="o.value" v-for="o in options">
              <input :checked="modelValue != null && modelValue.includes(o.value)" :type="'checkbox'" @click="ToggleOption(o.value)" />
              <span>{{ o.label }}</span>
            </label>
            <template v-if="has_options == false">
              <p class="ms-empty">
                <span>No options available (directory empty or missing).</span>
              </p>
            </template>
          </div>
        </template>
        <template v-else-if="spec.kind == 'tags'">
          <div class="tags">
            <span class="tag" :key="t" v-for="t in modelValue">
              <span>{{ t }}</span>
              <button class="tag-x" @click="RemoveTag(t)">
                <span>×</span>
              </button>
            </span>
            <input class="tag-input" :placeholder="'add…'" v-model="tag_input" @input="TagInputChanged" @keydown.enter.prevent="AddTag" @keyup="TagInputChanged" />
          </div>
        </template>
        <template v-else>
          <input class="input" :placeholder="'(empty)'" :type="'text'" v-model="val" @input="Changed($event)" />
        </template>
      </div>
    </div>

</template>

<style>
/* Component styles */

</style>

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
