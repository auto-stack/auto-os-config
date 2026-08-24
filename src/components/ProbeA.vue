<!-- ProbeA component - Auto-generated from Auto language -->
<script setup lang="ts">

const fields = defineModel<any[]>("fields", { default: [{key: 'enabled', kind: 'toggle', label: 'Enabled', value: true}, {key: 'retries', kind: 'number', label: 'Retries', value: 3}, {key: 'api_key', kind: 'password', label: 'Api Key', value: 's3cr3t'}, {key: 'tier', kind: 'select', label: 'Tier', value: 'min'}, {key: 'modes', kind: 'multiselect', label: 'Modes', value: ['plan']}, {key: 'tags', kind: 'tags', label: 'Tags', value: ['alpha', 'beta']}, {key: 'url', kind: 'text', label: 'Url', value: 'http://x'}] })
const options = defineModel<any[]>("options", { default: [{value: 'min', label: 'Min'}, {value: 'mid', label: 'Mid'}] })
const reveal = defineModel<boolean>("reveal", { default: false })
const tag_input = defineModel<string>("tag_input", { default: '' })
const rows = defineModel<any[]>("rows", { default: [{tier: 'min', weight: '1'}, {tier: 'mid', weight: '5'}] })
const cols = defineModel<any[]>("cols", { default: ['tier', 'weight'] })

const emit = defineEmits<{
  SetField: [any]
  ToggleReveal: []
  TagInputChanged: []
  AddTag: []
  RemoveTag: [string]
  Pick: [string]
  SetCell: [any]
  AddRow: []
  RemoveRow: [number]
}>()

function AddRow(): void {
  rows.value = rows.value.concat([{ tier: 'min', weight: '0' }]);

  emit('AddRow')
}

function AddTag(f: any): void {
  if (tag_input.value.trim() != '') {let out = fields.value.filter((x: any) => false);
  for (const f of fields.value) {if (f.kind == 'tags') {out = out.concat([{ key: f.key, kind: f.kind, label: f.label, value: f.value.concat([tag_input.value.trim()]) }]);
  }if (f.kind != 'tags') {out = out.concat([f]);
  }}
  fields.value = out;
  tag_input.value = '';
  }

  emit('AddTag')
}

function Pick(v: any): void {
  let out = fields.value.filter((x: any) => false);
  for (const f of fields.value) {if (f.kind == 'select' && v == 'sel') {out = out.concat([{ key: f.key, kind: f.kind, label: f.label, value: 'mid' }]);
  }if (f.kind == 'multiselect' && v != 'sel') {if (f.value.includes(v)) {out = out.concat([{ key: f.key, kind: f.kind, label: f.label, value: f.value.filter((x: any) => x != v) }]);
  }if (f.value.includes(v) == false) {out = out.concat([{ key: f.key, kind: f.kind, label: f.label, value: f.value.concat([v]) }]);
  }}if (f.kind != 'select' && f.kind != 'multiselect') {out = out.concat([f]);
  }if (f.kind == 'select' && v != 'sel') {out = out.concat([f]);
  }if (f.kind == 'multiselect' && v == 'sel') {out = out.concat([f]);
  }}
  fields.value = out;

  emit('Pick', v)
}

function RemoveRow(i: any): void {
  let kept = rows.value.filter((x: any) => false);
  rows.value.forEach((row, idx) => {if (idx != i) {kept = kept.concat([row]);
  }});
  rows.value = kept;

  emit('RemoveRow', i)
}

function RemoveTag(t: any): void {
  let out = fields.value.filter((x: any) => false);
  for (const f of fields.value) {if (f.kind == 'tags') {out = out.concat([{ key: f.key, kind: f.kind, label: f.label, value: f.value.filter((x: any) => x != t) }]);
  }if (f.kind != 'tags') {out = out.concat([f]);
  }}
  fields.value = out;

  emit('RemoveTag', t)
}

function SetCell(args: any): void {
  let i = args.i;
  let c = args.c;
  let rows2 = rows.value.filter((x: any) => false);
  rows.value.forEach((row, idx) => {if (idx == i) {if (c == 'tier') {rows2 = rows2.concat([{ tier: 'max', weight: row.weight }]);
  }if (c != 'tier') {rows2 = rows2.concat([{ tier: row.tier, weight: '9' }]);
  }}if (idx != i) {rows2 = rows2.concat([row]);
  }});
  rows.value = rows2;

  emit('SetCell', args)
}

function SetField(args: any): void {
  let k = args.key;
  let out = fields.value.filter((x: any) => false);
  for (const f of fields.value) {if (f.key == k) {if (f.kind == 'toggle') {out = out.concat([{ key: f.key, kind: f.kind, label: f.label, value: !f.value }]);
  }if (f.kind == 'number') {out = out.concat([{ key: f.key, kind: f.kind, label: f.label, value: 42 }]);
  }if (f.kind == 'password') {out = out.concat([{ key: f.key, kind: f.kind, label: f.label, value: 'typed' }]);
  }if (f.kind == 'text') {out = out.concat([{ key: f.key, kind: f.kind, label: f.label, value: 'typed-url' }]);
  }}if (f.key != k) {out = out.concat([f]);
  }}
  fields.value = out;

  emit('SetField', args)
}

function TagInputChanged(): void {
  tag_input.value = tag_input.value;

  emit('TagInputChanged')
}

function ToggleReveal(f: any): void {
  reveal.value = !reveal.value;

  emit('ToggleReveal')
}


</script>

<template>
    <div class="probe-a">
      <div class="field-row" :key="f.key" v-for="f in fields">
        <label class="field-label">
          <span>{{ f.label }}</span>
        </label>
        <div class="field-control">
          <template v-if="f.kind == 'toggle'">
            <input class="pa-toggle" type="checkbox" :checked="f.value" @click="SetField({ key: f.key })" />
          </template>
          <template v-else-if="f.kind == 'number'">
            <input class="input" :value="f.value" @input="SetField({ key: f.key })" />
          </template>
          <template v-else-if="f.kind == 'password'">
            <div class="secret">
              <input class="input pa-pw" :type="(reveal ? 'text' : 'password')" :value="f.value" @input="SetField({ key: f.key })" />
              <button class="reveal" @click="ToggleReveal(f)">
                <span>👁</span>
              </button>
            </div>
          </template>
          <template v-else-if="f.kind == 'select'">
            <select class="input pa-select" :value="f.value" @change="Pick('sel')">
              <option :key="o.value" :value="o.value" v-for="o in options">
                <span>{{ o.label }}</span>
              </option>
            </select>
          </template>
          <template v-else-if="f.kind == 'multiselect'">
            <div class="multiselect">
              <label class="ms-item" :key="o.value" v-for="o in options">
                <input type="checkbox" :checked="f.value.includes(o.value)" @click="Pick(o.value)" />
                <span>{{ o.label }}</span>
              </label>
            </div>
          </template>
          <template v-else-if="f.kind == 'tags'">
            <div class="tags">
              <span class="tag" :key="t" v-for="t in f.value">
                <span>{{ t }}</span>
                <button class="tag-x" @click="RemoveTag(t)">
                  <span>×</span>
                </button>
              </span>
              <input class="tag-input" :placeholder="'add…'" v-model="tag_input" @input="TagInputChanged" @keydown.enter.prevent="AddTag(f)" />
            </div>
          </template>
          <template v-else>
            <input class="input pa-text" :type="'text'" :value="f.value" @input="SetField({ key: f.key })" />
          </template>
        </div>
      </div>
      <table class="tbl">
        <thead>
          <tr>
            <th :key="c" v-for="c in cols">
              <span>{{ c }}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr :key="i" v-for="(row, i) in rows">
            <td :key="c" v-for="c in cols">
              <input class="cell-input" v-model="row[c]" @input="SetCell({ i: i, c: c })" />
            </td>
            <td>
              <button class="del-row" @click="RemoveRow(i)">
                <span>×</span>
              </button>
            </td>
          </tr>
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
