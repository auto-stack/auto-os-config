import { ref } from 'vue'
import { fetchCollectionListSafe, fetchEntitySafe, createEntitySafe, putEntitySafe, deleteEntitySafe, bodyEntries, setEntry, entriesBody } from '../../lib/api'

const module_id = ref<string>('')
const list = ref<any>([])
const selected_name = ref<string | null>(null)
const entries = ref<any>([])
const sidecar = ref<string>('')
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
let lr = await fetchCollectionListSafe(module_id.value);
if (lr.ok) {list.value = lr.list;
}list_loading.value = false;
Select(name);
}
if (r.ok == false) {error.value = r.error;
}
saving.value = false;
 }
    const FieldEdited = async (args: any) => { entries.value = await setEntry(entries.value, args.path, args.value, module_id.value);
dirty.value = true;
 }
    const Init = async (mid: string) => { module_id.value = mid;
error.value = '';
list_loading.value = true;
let r = await fetchCollectionListSafe(mid);
if (r.ok) {list.value = r.list;
}
if (r.ok == false) {error.value = r.error;
list.value = [];
}
list_loading.value = false;
 }
    const MarkDirty = () => { dirty.value = true;
 }
    const Reload = async () => { list_loading.value = true;
let r = await fetchCollectionListSafe(module_id.value);
if (r.ok) {list.value = r.list;
}
if (r.ok == false) {error.value = r.error;
}
list_loading.value = false;
if (selected_name.value != null) {loading.value = true;
error.value = '';
let e = await fetchEntitySafe(module_id.value, selected_name.value);
if (e.ok) {if (e.atom != null) {is_read_only.value = false;
entries.value = await bodyEntries(e.atom.value, module_id.value);
sidecar.value = e.atom.sidecar;
}if (e.atom == null) {is_read_only.value = true;
}}if (e.ok == false) {error.value = e.error;
}loading.value = false;
}
 }
    const Remove = async (name: string) => { error.value = '';
let r = await deleteEntitySafe(module_id.value, name);
if (r.ok) {if (selected_name.value == name) {selected_name.value = null;
entries.value = [];
}list_loading.value = true;
let lr = await fetchCollectionListSafe(module_id.value);
if (lr.ok) {list.value = lr.list;
}list_loading.value = false;
}
if (r.ok == false) {error.value = r.error;
}
 }
    const Save = async () => { if (selected_name.value != null && entries.value.length > 0) {saving.value = true;
error.value = '';
let body = await entriesBody(entries.value);
let r = await putEntitySafe(module_id.value, selected_name.value, body, sidecar.value);
if (r.ok) {dirty.value = false;
list_loading.value = true;
let lr = await fetchCollectionListSafe(module_id.value);
if (lr.ok) {list.value = lr.list;
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
fm_name.value = '';
fm_description.value = '';
fm_body.value = '';
dirty.value = false;
let r = await fetchEntitySafe(module_id.value, name);
if (r.ok) {if (r.atom != null) {
is_read_only.value = false;
entries.value = await bodyEntries(r.atom.value, module_id.value);
sidecar.value = r.atom.sidecar;
}if (r.atom == null) {
is_read_only.value = true;
fm_name.value = r.fm.name;
fm_description.value = r.fm.description;
fm_body.value = r.fm.body;
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
