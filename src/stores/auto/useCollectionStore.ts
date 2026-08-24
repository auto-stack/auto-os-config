import { ref } from 'vue'
import { fetchCollectionListRaw, collectionCount, collectionAt, fetchEntityFlat, createEntitySafe, putEntitySafe, deleteEntitySafe, entriesCount, entryAt, editField } from '../../lib/api'

const module_id = ref<string>('')
const list = ref<any>([])
const selected_name = ref<string | null>(null)
const entries = ref<any>([])
const sidecar = ref<string>('')
const body_text = ref<string>('')
const fm_name = ref<string>('')
const fm_description = ref<string>('')
const fm_body = ref<string>('')
const is_read_only = ref<boolean>(false)
const list_loading = ref<boolean>(false)
const loading = ref<boolean>(false)
const saving = ref<boolean>(false)
const error = ref<string>('')
const dirty = ref<boolean>(false)

export function useCollectionStore(): any {
    const Create = async (name: string) => { saving.value = true;
error.value = '';
let r = await createEntitySafe(module_id.value, name);
if (r.ok) {list_loading.value = true;
let lr = await fetchCollectionListRaw(module_id.value);
if (lr.ok) {let items = [];
let n = await collectionCount(lr.text);
let i: number = 0;
while (true) {
if (i >= n) {break;
}let e = await collectionAt(lr.text, i);
items.push({ name: e.name, description: e.description });
i = i + 1;
}
list.value = items;
}list_loading.value = false;
Select(name);
}
if (r.ok == false) {error.value = r.error;
}
saving.value = false;
 }
    const FieldEdited = async (args: any) => { body_text.value = await editField(body_text.value, args.path, args.value);
let es = [];
let n = await entriesCount(body_text.value);
let i: number = 0;
while (true) {
if (i >= n) {break;
}es.push(await entryAt(body_text.value, i, module_id.value));
i = i + 1;
}
entries.value = es;
dirty.value = true;
 }
    const Init = async (mid: string) => { module_id.value = mid;
error.value = '';
list_loading.value = true;
let r = await fetchCollectionListRaw(mid);
if (r.ok) {let items = [];
let n = await collectionCount(r.text);
let i: number = 0;
while (true) {
if (i >= n) {break;
}let e = await collectionAt(r.text, i);
items.push({ name: e.name, description: e.description });
i = i + 1;
}
list.value = items;
}
if (r.ok == false) {error.value = r.error;
list.value = [];
}
list_loading.value = false;
 }
    const MarkDirty = () => { dirty.value = true;
 }
    const Reload = async () => { list_loading.value = true;
let r = await fetchCollectionListRaw(module_id.value);
if (r.ok) {let items = [];
let n = await collectionCount(r.text);
let i: number = 0;
while (true) {
if (i >= n) {break;
}let e = await collectionAt(r.text, i);
items.push({ name: e.name, description: e.description });
i = i + 1;
}
list.value = items;
}
if (r.ok == false) {error.value = r.error;
}
list_loading.value = false;
if (selected_name.value != null) {loading.value = true;
error.value = '';
let e = await fetchEntityFlat(module_id.value, selected_name.value);
if (e.ok) {if (e.is_atom) {is_read_only.value = false;
body_text.value = e.value;
sidecar.value = e.sidecar;
let es = [];
let n2 = await entriesCount(e.value);
let i2: number = 0;
while (true) {
if (i2 >= n2) {break;
}es.push(await entryAt(e.value, i2, module_id.value));
i2 = i2 + 1;
}
entries.value = es;
}if (e.is_atom == false) {is_read_only.value = true;
fm_name.value = e.fm_name;
fm_description.value = e.fm_description;
fm_body.value = e.fm_body;
}}if (e.ok == false) {error.value = e.error;
}loading.value = false;
}
 }
    const Remove = async (name: string) => { error.value = '';
let r = await deleteEntitySafe(module_id.value, name);
if (r.ok) {if (selected_name.value == name) {selected_name.value = null;
entries.value = [];
body_text.value = '';
}list_loading.value = true;
let lr = await fetchCollectionListRaw(module_id.value);
if (lr.ok) {let items = [];
let n = await collectionCount(lr.text);
let i: number = 0;
while (true) {
if (i >= n) {break;
}let e = await collectionAt(lr.text, i);
items.push({ name: e.name, description: e.description });
i = i + 1;
}
list.value = items;
}list_loading.value = false;
}
if (r.ok == false) {error.value = r.error;
}
 }
    const Save = async () => { if (selected_name.value != null && body_text.value != '') {saving.value = true;
error.value = '';
let r = await putEntitySafe(module_id.value, selected_name.value, body_text.value, sidecar.value);
if (r.ok) {dirty.value = false;
list_loading.value = true;
let lr = await fetchCollectionListRaw(module_id.value);
if (lr.ok) {let items = [];
let n = await collectionCount(lr.text);
let i: number = 0;
while (true) {
if (i >= n) {break;
}let e = await collectionAt(lr.text, i);
items.push({ name: e.name, description: e.description });
i = i + 1;
}
list.value = items;
}list_loading.value = false;
}if (r.ok == false) {error.value = r.error;
}saving.value = false;
}
 }
    const Select = async (name: string) => { selected_name.value = name;
loading.value = true;
error.value = '';
entries.value = [];
sidecar.value = '';
body_text.value = '';
fm_name.value = '';
fm_description.value = '';
fm_body.value = '';
dirty.value = false;
let r = await fetchEntityFlat(module_id.value, name);
if (r.ok) {if (r.is_atom) {
is_read_only.value = false;
body_text.value = r.value;
sidecar.value = r.sidecar;
let es = [];
let n = await entriesCount(r.value);
let i: number = 0;
while (true) {
if (i >= n) {break;
}es.push(await entryAt(r.value, i, module_id.value));
i = i + 1;
}
entries.value = es;
}if (r.is_atom == false) {
is_read_only.value = true;
fm_name.value = r.fm_name;
fm_description.value = r.fm_description;
fm_body.value = r.fm_body;
}}
if (r.ok == false) {error.value = r.error;
}
loading.value = false;
 }
    const SetSidecar = (v: any) => { sidecar.value = v;
dirty.value = true;
 }
    return {
        module_id,
        list,
        selected_name,
        entries,
        sidecar,
        body_text,
        fm_name,
        fm_description,
        fm_body,
        is_read_only,
        list_loading,
        loading,
        saving,
        error,
        dirty,
        Create,
        FieldEdited,
        Init,
        MarkDirty,
        Reload,
        Remove,
        Save,
        Select,
        SetSidecar,
    }
}
