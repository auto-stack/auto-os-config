import { ref } from 'vue'
import { fetchModulesViewSafe, getHash, expandGroupFor } from '../../lib/api'

const modules = ref<any>([])
const groups = ref<any>([])
const standalone = ref<any>([])
const expanded = ref<any>([])
const active_id = ref<string | null>(null)
const active_kind = ref<string>('')
const read_only = ref<boolean>(false)
const loading = ref<boolean>(false)
const error = ref<string>('')
const title = ref<string>('AutoOS Settings')

export function useModulesStore(): any {
    const Init = async () => { loading.value = true;
error.value = '';
let r = await fetchModulesViewSafe();
if (r.ok) {modules.value = r.data.modules;
groups.value = r.data.groups;
standalone.value = r.data.standalone;
if (expanded.value.length == 0 && r.data.firstGroup != '') {expanded.value = [r.data.firstGroup];
}
let h = await getHash();
if (h != '') {let m = modules.value.find((x: any) => x.id == h);
if (m != null) {active_id.value = m.id;
active_kind.value = m.kind;
read_only.value = m.format == 'frontmatter-md';
title.value = m.name;
expanded.value = await expandGroupFor(expanded.value, groups.value, h);
}}}
if (r.ok == false) {error.value = r.error;
modules.value = [];
groups.value = [];
standalone.value = [];
}
loading.value = false;
 }
    const Select = async (id: string) => { let m = modules.value.find((x: any) => x.id == id);
if (m != null) {active_id.value = m.id;
active_kind.value = m.kind;
read_only.value = m.format == 'frontmatter-md';
title.value = m.name;
expanded.value = await expandGroupFor(expanded.value, groups.value, id);
}
 }
    const ToggleGroup = (gid: string) => { if (expanded.value.includes(gid)) {expanded.value = expanded.value.filter((x: any) => x != gid);
}
if (expanded.value.includes(gid) == false) {expanded.value = expanded.value.concat([gid]);
}
 }
    return {
        modules,
        groups,
        standalone,
        expanded,
        active_id,
        active_kind,
        read_only,
        loading,
        error,
        title,
        Init,
        Select,
        ToggleGroup,
    }
}
