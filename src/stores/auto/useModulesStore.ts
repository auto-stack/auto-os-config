import { ref } from 'vue'
import { fetchModulesRaw, modulesCount, moduleAt, groupCount, groupAt, groupMemberCount, groupMemberAt, standaloneCount, standaloneAt, selectInfo, groupOfModule, getHash } from '../../lib/api'

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
const raw = ref<string>('')
const search = ref<string>('')
const view_standalone = ref<any>([])
const view_groups = ref<any>([])
const has_results = ref<boolean>(true)

export function useModulesStore(): any {
    const Init = async () => { loading.value = true;
error.value = '';
let r = await fetchModulesRaw();
if (r.ok) {raw.value = r.text;
let mods = [];
let n = await modulesCount(r.text);
let i: number = 0;
while (true) {
if (i >= n) {break;
}let m = await moduleAt(r.text, i);
mods.push({ id: m.id, kind: m.kind, name: m.name, icon: m.icon, description: m.description, group: m.group, format: m.format });
i = i + 1;
}
modules.value = mods;
let grps = [];
let gc = await groupCount(r.text);
let gi: number = 0;
while (true) {
if (gi >= gc) {break;
}let g = await groupAt(r.text, gi);
let members = [];
let mc = await groupMemberCount(r.text, gi);
let mi: number = 0;
while (true) {
if (mi >= mc) {break;
}let mm = await groupMemberAt(r.text, gi, mi);
members.push({ id: mm.id, kind: mm.kind, name: mm.name, icon: mm.icon, description: mm.description, group: mm.group, format: mm.format });
mi = mi + 1;
}
grps.push({ id: g.id, label: g.label, members: members });
gi = gi + 1;
}
groups.value = grps;
let sa = [];
let sc = await standaloneCount(r.text);
let si: number = 0;
while (true) {
if (si >= sc) {break;
}let sm = await standaloneAt(r.text, si);
sa.push({ id: sm.id, kind: sm.kind, name: sm.name, icon: sm.icon, description: sm.description, group: sm.group, format: sm.format });
si = si + 1;
}
standalone.value = sa;

if (await groupCount(r.text) > 0) {let g0 = await groupAt(r.text, 0);
let has: boolean = false;
for (const x of expanded.value) {if (x == g0.id) {has = true;
}}
if (has == false && g0.id != '') {let out = [];
for (const x of expanded.value) {out.push(x);
}
out.push(g0.id);
expanded.value = out;
}}

let h = await getHash();
if (h != '') {let si2 = await selectInfo(raw.value, h);
if (si2.found) {active_id.value = si2.id;
active_kind.value = si2.kind;
read_only.value = si2.read_only;
title.value = si2.name;
let gid = await groupOfModule(raw.value, h);
if (gid != '') {let has2: boolean = false;
for (const x of expanded.value) {if (x == gid) {has2 = true;
}}
if (has2 == false) {let out2 = [];
for (const x of expanded.value) {out2.push(x);
}
out2.push(gid);
expanded.value = out2;
}}}}}





let vg = [];
let q = search.value.toLowerCase();
let any_hit: boolean = false;
for (const g of groups.value) {let members = [];
for (const m of g.members) {let hit: boolean = true;
if (q != '') {hit = false;
if (m.name.toLowerCase().includes(q)) {hit = true;
}if (m.description.toLowerCase().includes(q)) {hit = true;
}}if (hit) {let ncls: string = 'nav-item w-full text-left flex items-start gap-3 pl-[28px] pr-3 py-[10px] rounded hover:bg-[#ededed] transition-colors duration-[120ms]';
let nmcls: string = 'nav-name text-sm font-medium text-[#1a1a1a]';
if (active_id.value == m.id) {ncls = 'nav-item active w-full text-left flex items-start gap-3 pl-[28px] pr-3 py-[10px] rounded bg-primary/10';
nmcls = 'nav-name text-sm font-semibold text-primary';
}members.push({ id: m.id, icon: m.icon, name: m.name, description: m.description, nav_class: ncls, name_class: nmcls });
}}
let open: boolean = false;
for (const x of expanded.value) {if (x == g.id) {open = true;
}}
if (q != '') {open = true;
}if (members.length > 0) {vg.push({ id: g.id, label: g.label, open: open, members: members });
any_hit = true;
}}
view_groups.value = vg;
let vs = [];
for (const sm of standalone.value) {let shit: boolean = true;
if (q != '') {shit = false;
if (sm.name.toLowerCase().includes(q)) {shit = true;
}if (sm.description.toLowerCase().includes(q)) {shit = true;
}}if (shit) {let scls: string = 'nav-item w-full text-left flex items-start gap-3 px-3 py-[10px] rounded hover:bg-[#ededed] transition-colors duration-[120ms]';
let snm: string = 'nav-name text-sm font-medium text-[#1a1a1a]';
if (active_id.value == sm.id) {scls = 'nav-item active w-full text-left flex items-start gap-3 px-3 py-[10px] rounded bg-primary/10';
snm = 'nav-name text-sm font-semibold text-primary';
}vs.push({ id: sm.id, icon: sm.icon, name: sm.name, description: sm.description, nav_class: scls, name_class: snm });
any_hit = true;
}}
view_standalone.value = vs;
has_results.value = any_hit;
if (r.ok == false) {error.value = r.error;
modules.value = [];
groups.value = [];
standalone.value = [];
view_groups.value = [];
view_standalone.value = [];
has_results.value = true;
}
loading.value = false;
 }
    const Search = (query: string) => { search.value = query;





let vg = [];
let q = search.value.toLowerCase();
let any_hit: boolean = false;
for (const g of groups.value) {let members = [];
for (const m of g.members) {let hit: boolean = true;
if (q != '') {hit = false;
if (m.name.toLowerCase().includes(q)) {hit = true;
}if (m.description.toLowerCase().includes(q)) {hit = true;
}}if (hit) {let ncls: string = 'nav-item w-full text-left flex items-start gap-3 pl-[28px] pr-3 py-[10px] rounded hover:bg-[#ededed] transition-colors duration-[120ms]';
let nmcls: string = 'nav-name text-sm font-medium text-[#1a1a1a]';
if (active_id.value == m.id) {ncls = 'nav-item active w-full text-left flex items-start gap-3 pl-[28px] pr-3 py-[10px] rounded bg-primary/10';
nmcls = 'nav-name text-sm font-semibold text-primary';
}members.push({ id: m.id, icon: m.icon, name: m.name, description: m.description, nav_class: ncls, name_class: nmcls });
}}
let open: boolean = false;
for (const x of expanded.value) {if (x == g.id) {open = true;
}}
if (q != '') {open = true;
}if (members.length > 0) {vg.push({ id: g.id, label: g.label, open: open, members: members });
any_hit = true;
}}
view_groups.value = vg;
let vs = [];
for (const sm of standalone.value) {let shit: boolean = true;
if (q != '') {shit = false;
if (sm.name.toLowerCase().includes(q)) {shit = true;
}if (sm.description.toLowerCase().includes(q)) {shit = true;
}}if (shit) {let scls: string = 'nav-item w-full text-left flex items-start gap-3 px-3 py-[10px] rounded hover:bg-[#ededed] transition-colors duration-[120ms]';
let snm: string = 'nav-name text-sm font-medium text-[#1a1a1a]';
if (active_id.value == sm.id) {scls = 'nav-item active w-full text-left flex items-start gap-3 px-3 py-[10px] rounded bg-primary/10';
snm = 'nav-name text-sm font-semibold text-primary';
}vs.push({ id: sm.id, icon: sm.icon, name: sm.name, description: sm.description, nav_class: scls, name_class: snm });
any_hit = true;
}}
view_standalone.value = vs;
has_results.value = any_hit;
 }
    const Select = async (id: string) => { let si = await selectInfo(raw.value, id);
if (si.found) {active_id.value = si.id;
active_kind.value = si.kind;
read_only.value = si.read_only;
title.value = si.name;
let gid = await groupOfModule(raw.value, id);
if (gid != '') {let has: boolean = false;
for (const x of expanded.value) {if (x == gid) {has = true;
}}
if (has == false) {let out = [];
for (const x of expanded.value) {out.push(x);
}
out.push(gid);
expanded.value = out;
}}}





let vg = [];
let q = search.value.toLowerCase();
let any_hit: boolean = false;
for (const g of groups.value) {let members = [];
for (const m of g.members) {let hit: boolean = true;
if (q != '') {hit = false;
if (m.name.toLowerCase().includes(q)) {hit = true;
}if (m.description.toLowerCase().includes(q)) {hit = true;
}}if (hit) {let ncls: string = 'nav-item w-full text-left flex items-start gap-3 pl-[28px] pr-3 py-[10px] rounded hover:bg-[#ededed] transition-colors duration-[120ms]';
let nmcls: string = 'nav-name text-sm font-medium text-[#1a1a1a]';
if (active_id.value == m.id) {ncls = 'nav-item active w-full text-left flex items-start gap-3 pl-[28px] pr-3 py-[10px] rounded bg-primary/10';
nmcls = 'nav-name text-sm font-semibold text-primary';
}members.push({ id: m.id, icon: m.icon, name: m.name, description: m.description, nav_class: ncls, name_class: nmcls });
}}
let open: boolean = false;
for (const x of expanded.value) {if (x == g.id) {open = true;
}}
if (q != '') {open = true;
}if (members.length > 0) {vg.push({ id: g.id, label: g.label, open: open, members: members });
any_hit = true;
}}
view_groups.value = vg;
let vs = [];
for (const sm of standalone.value) {let shit: boolean = true;
if (q != '') {shit = false;
if (sm.name.toLowerCase().includes(q)) {shit = true;
}if (sm.description.toLowerCase().includes(q)) {shit = true;
}}if (shit) {let scls: string = 'nav-item w-full text-left flex items-start gap-3 px-3 py-[10px] rounded hover:bg-[#ededed] transition-colors duration-[120ms]';
let snm: string = 'nav-name text-sm font-medium text-[#1a1a1a]';
if (active_id.value == sm.id) {scls = 'nav-item active w-full text-left flex items-start gap-3 px-3 py-[10px] rounded bg-primary/10';
snm = 'nav-name text-sm font-semibold text-primary';
}vs.push({ id: sm.id, icon: sm.icon, name: sm.name, description: sm.description, nav_class: scls, name_class: snm });
any_hit = true;
}}
view_standalone.value = vs;
has_results.value = any_hit;
 }
    const ToggleGroup = (gid: string) => { let has: boolean = false;
for (const x of expanded.value) {if (x == gid) {has = true;
}}
let out = [];
if (has) {for (const x of expanded.value) {if (x != gid) {out.push(x);
}}
}
if (has == false) {for (const x of expanded.value) {out.push(x);
}
out.push(gid);
}
expanded.value = out;





let vg = [];
let q = search.value.toLowerCase();
let any_hit: boolean = false;
for (const g of groups.value) {let members = [];
for (const m of g.members) {let hit: boolean = true;
if (q != '') {hit = false;
if (m.name.toLowerCase().includes(q)) {hit = true;
}if (m.description.toLowerCase().includes(q)) {hit = true;
}}if (hit) {let ncls: string = 'nav-item w-full text-left flex items-start gap-3 pl-[28px] pr-3 py-[10px] rounded hover:bg-[#ededed] transition-colors duration-[120ms]';
let nmcls: string = 'nav-name text-sm font-medium text-[#1a1a1a]';
if (active_id.value == m.id) {ncls = 'nav-item active w-full text-left flex items-start gap-3 pl-[28px] pr-3 py-[10px] rounded bg-primary/10';
nmcls = 'nav-name text-sm font-semibold text-primary';
}members.push({ id: m.id, icon: m.icon, name: m.name, description: m.description, nav_class: ncls, name_class: nmcls });
}}
let open: boolean = false;
for (const x of expanded.value) {if (x == g.id) {open = true;
}}
if (q != '') {open = true;
}if (members.length > 0) {vg.push({ id: g.id, label: g.label, open: open, members: members });
any_hit = true;
}}
view_groups.value = vg;
let vs = [];
for (const sm of standalone.value) {let shit: boolean = true;
if (q != '') {shit = false;
if (sm.name.toLowerCase().includes(q)) {shit = true;
}if (sm.description.toLowerCase().includes(q)) {shit = true;
}}if (shit) {let scls: string = 'nav-item w-full text-left flex items-start gap-3 px-3 py-[10px] rounded hover:bg-[#ededed] transition-colors duration-[120ms]';
let snm: string = 'nav-name text-sm font-medium text-[#1a1a1a]';
if (active_id.value == sm.id) {scls = 'nav-item active w-full text-left flex items-start gap-3 px-3 py-[10px] rounded bg-primary/10';
snm = 'nav-name text-sm font-semibold text-primary';
}vs.push({ id: sm.id, icon: sm.icon, name: sm.name, description: sm.description, nav_class: scls, name_class: snm });
any_hit = true;
}}
view_standalone.value = vs;
has_results.value = any_hit;
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
        raw,
        search,
        view_standalone,
        view_groups,
        has_results,
        Init,
        Search,
        Select,
        ToggleGroup,
    }
}
