import io
p = r'D:\autostack\auto-os-config\auto\src\back\api.at'
s = io.open(p, encoding='utf-8').read()

# ── entryAt: 追加 options/items/t_cols/t_rows/has_current ──────────────────
old = '''        depth: 0,
        is_on: displayOf(frag) == "true",
        is_provider: spec.kind == "subform" && fragHasKey(frag, "kind"),
        box_class: "field-row",
    }
}'''
new = '''        depth: 0,
        is_on: displayOf(frag) == "true",
        is_provider: spec.kind == "subform" && fragHasKey(frag, "kind"),
        box_class: "field-row",
        options: selectOptionsOf(spec, module_id),
        has_current: optionValuesHave(selectOptionsOf(spec, module_id), displayOf(frag)),
        items: stringItemsOf(frag),
        t_cols: tableColsOf(frag, module_id),
        t_rows: [],
    }
}'''
assert old in s
s = s.replace(old, new)

old = '''        depth: 1,
        is_on: displayOf(frag) == "true",
        box_class: bc,
    }
}'''
new = '''        depth: 1,
        is_on: displayOf(frag) == "true",
        box_class: bc,
        options: selectOptionsOf(spec, module_id),
        has_current: optionValuesHave(selectOptionsOf(spec, module_id), displayOf(frag)),
        items: stringItemsOf(frag),
        t_cols: tableColsOf(frag, module_id),
        t_rows: [],
    }
}'''
assert old in s
s = s.replace(old, new)

# ── 新 fns：插在 loadEnum 之后 ──────────────────────────────────────────────
anchor = '''// ─── modules (modules_store surface) ────────────────────────────────────────'''
fns = '''/// ── 2026-08-27 像素对拍二阶段：select 真下拉 / tags chips / 可编辑表格 ──
/// 提交时机与缓存：entryAt 每次重建都会同步 loadEnum（本地 daemon，量小可接受）；
/// vue 端由 api.ts warmEnums 在 Init 时预热 enumCache 后同步读缓存。

/// select 条目的选项列表（非 select 或无枚举 → []）。
fn selectOptionsOf(spec any, module_id str) []any {
    var out = []
    if spec.kind == "select" {
        out = loadEnum(enumUrlOfEk(spec.ek, spec.ew, module_id, spec.ep))
    }
    return out
}

/// options 的 value 里是否已含 val（css-era has_current：不含才追加 "(current)"）。
fn optionValuesHave(opts []any, val str) bool {
    for o in opts {
        if o.value == val {
            return true
        }
    }
    return false
}

/// tags/multiselect 的字符串元素（原生数组，视图可直接 for 循环）。
fn stringItemsOf(frag str) []str {
    var out = []
    if json.type_of(frag) == "array" {
        let n = json.len(frag)
        var i = 0
        loop {
            if i >= n {
                break
            }
            out.push(displayOf(json.get_at(frag, i)))
            i = i + 1
        }
    }
    return out
}

/// 表格列描述（css-era tableInfo+mergeCols 等价）：去重保序；kind 强制标量
/// （inferColumn 语义：嵌套 object/array → text）；枚举列 options 同步取。
pub fn tableColsOf(frag str, module_id str) []any {
    var cols = []
    if json.type_of(frag) != "array" {
        return cols
    }
    let n = json.len(frag)
    var i = 0
    loop {
        if i >= n {
            break
        }
        let row = json.get_at(frag, i)
        if json.type_of(row) != "object" {
            i = i + 1
        } else {
            let ks = json.keys(row)
            for k in ks {
                let kn = unquote(k)
                var seen = false
                for c in cols {
                    if c.name == kn {
                        seen = true
                    }
                }
                if seen == false {
                    let sample = json.get(row, kn)
                    let spec = inferField(kn, sample, module_id, "")
                    var kind = spec.kind
                    if spec.kind == "table" || spec.kind == "subform" {
                        kind = "text"
                    }
                    var opts = []
                    if spec.ek != "" {
                        opts = loadEnum(enumUrlOfEk(spec.ek, spec.ew, module_id, spec.ep))
                    }
                    cols.push({ name: kn, kind: kind, options: opts })
                }
            }
            i = i + 1
        }
    }
    return cols
}

/// Init 预热（vm 同步；vue 端孪生是 async，走 await）。
pub fn warmEnumsText(body str, module_id str) bool {
    let n = entriesCount(body)
    var i = 0
    loop {
        if i >= n {
            break
        }
        let e = entryAt(body, i, module_id)
        if e.kind == "table" {
            tableColsOf(e.frag, module_id)
        }
        if e.kind == "subform" {
            let sc = subCount(e.frag)
            var j = 0
            loop {
                if j >= sc {
                    break
                }
                let sub = subAt(body, e.key, j, module_id)
                if sub.is_table {
                    tableColsOf(sub.frag, module_id)
                }
                j = j + 1
            }
        }
        i = i + 1
    }
    return true
}

/// depth≤2 的片段取值（editField 的读半边）。
fn fragAt(body str, path str) str {
    let parts = path.split(".")
    if parts.len() == 1 {
        return json.get(body, path)
    }
    return json.get(json.get(body, parts[0]), parts[1])
}

/// 数组片段整体重建（保留其余元素原文）。
fn arrayReplaced(arr str, i int, newRow str) str {
    let n = json.len(arr)
    var out = "["
    var k = 0
    loop {
        if k >= n {
            break
        }
        if k > 0 {
            out = out + ","
        }
        if k == i {
            out = out + newRow
        } else {
            out = out + json.get_at(arr, k)
        }
        k = k + 1
    }
    return out + "]"
}

/// 表格单元格整改（css-era setCell：按旧单元格类型重定型后整片替换）。
pub fn setCellText(body str, path str, i int, col str, v str) str {
    let arr = fragAt(body, path)
    if json.type_of(arr) != "array" {
        return body
    }
    if i >= json.len(arr) {
        return body
    }
    let row = json.get_at(arr, i)
    let nv = new_value_fragment(json.get(row, col), v)
    let row2 = set_obj_field(row, col, nv)
    return setBodyField(body, path, arrayReplaced(arr, i, row2))
}

/// 追加空行（css-era blankRow：按现有列全集补 ""；空表 → {}）。
pub fn tableAddRowText(body str, path str) str {
    let arr = fragAt(body, path)
    if json.type_of(arr) != "array" {
        return body
    }
    let cols = tableColsOf(arr, "add-row")
    var row = "{"
    var first = true
    for c in cols {
        if first == false {
            row = row + ","
        }
        first = false
        row = row + quote_json(c.name) + ":" + quote_json("")
    }
    row = row + "}"
    return setBodyField(body, path, json.len(arr) > 0 && false == true ? arr : arr)
}

'''
# 上面的 tableAddRowText 占位有误，直接重写完整版：
fns = fns.split('/// 追加空行')[0] + '''/// 追加空行（css-era blankRow：按现有列全集补 ""；空表 → {}）。
pub fn tableAddRowText(body str, path str) str {
    let arr = fragAt(body, path)
    if json.type_of(arr) != "array" {
        return body
    }
    let cols = tableColsOf(arr, "add-row")
    var row = "{"
    var first = true
    for c in cols {
        if first == false {
            row = row + ","
        }
        first = false
        row = row + quote_json(c.name) + ":" + quote_json("")
    }
    row = row + "}"
    var out = arr
    if json.len(arr) > 0 {
        out = arr.substr(0, arr.len() - 1) + "," + row + "]"
    } else {
        out = "[" + row + "]"
    }
    return setBodyField(body, path, out)
}

/// 删除第 i 行。
pub fn tableRemoveRowText(body str, path str, i int) str {
    let arr = fragAt(body, path)
    if json.type_of(arr) != "array" {
        return body
    }
    let n = json.len(arr)
    if i >= n {
        return body
    }
    var out = "["
    var k = 0
    var first = true
    loop {
        if k >= n {
            break
        }
        if k != i {
            if first == false {
                out = out + ","
            }
            first = false
            out = out + json.get_at(arr, k)
        }
        k = k + 1
    }
    return setBodyField(body, path, out + "]")
}

// ─── modules (modules_store surface) ────────────────────────────────────────'''
assert anchor in s
s = s.replace(anchor, fns, 1)
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('api.at extended')
