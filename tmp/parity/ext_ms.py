import io
p = r'D:\autostack\auto-os-config\auto\src\back\api.at'
s = io.open(p, encoding='utf-8').read()
old = '''        items: stringItemsOf(frag),
        t_cols: tableColsOf(frag, module_id),
        t_rows: [],'''
new = '''        items: stringItemsOf(frag),
        ms_checked: msCheckedOf(stringItemsOf(frag), selectOptionsOf(spec, module_id)),
        t_cols: tableColsOf(frag, module_id),
        t_rows: [],'''
assert s.count(old) == 2
s = s.replace(old, new)
anchor = '''/// tags/multiselect 的字符串元素（原生数组，视图可直接 for 循环）。'''
addition = '''/// multiselect 复选框的勾选态平行数组（视图无 contains，api 预计算）。
fn msCheckedOf(items []str, opts []any) []bool {
    var out = []
    for o in opts {
        var hit = false
        for t in items {
            if t == o.value {
                hit = true
            }
        }
        out.push(hit)
    }
    return out
}

/// tags/multiselect 的字符串元素（原生数组，视图可直接 for 循环）。'''
assert anchor in s
s = s.replace(anchor, addition, 1)
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('api.at ms_checked ok')

p2 = r'D:\autostack\auto-os-config\src\lib\api.ts'
s = io.open(p2, encoding='utf-8').read()
old = '''    items: tagItemsOf(frag),
    t_cols: tableColsOf(frag, moduleId),
    t_rows: Array.isArray(frag) ? frag : [],'''
new = '''    items: tagItemsOf(frag),
    ms_checked: msCheckedOf(tagItemsOf(frag), spec.kind === 'select' ? enumCache.get(enumUrlOf(spec.optionsFrom)) ?? [] : []),
    t_cols: tableColsOf(frag, moduleId),
    t_rows: Array.isArray(frag) ? frag : [],'''
assert s.count(old) == 2, f'ms target x{s.count(old)}'
s = s.replace(old, new)
old = '''/** tags/multiselect 的字符串元素。 */'''
addition = '''/** multiselect 复选框勾选态平行数组（视图无 contains，api 预计算）。 */
function msCheckedOf(items: string[], opts: { value: string }[]): boolean[] {
  return opts.map((o) => items.includes(o.value))
}

/** tags/multiselect 的字符串元素。 */'''
assert old in s
s = s.replace(old, addition, 1)
io.open(p2, 'w', encoding='utf-8', newline='\n').write(s)
print('api.ts ms_checked ok')
