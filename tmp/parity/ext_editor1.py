import io
p = r'D:\autostack\auto-os-config\auto\src\front\config_editor.at'
s = io.open(p, encoding='utf-8').read()

# ── use 行：追加 warmEnumsText/setCellText/tableAddRowText/tableRemoveRowText ──
old = 'use back.api: fetchConfigSafe, putConfigSafe, deleteBlockSafe, entriesCount, entryAt, subCount, subAt, editField, editTagField, addBlockText, bodyHasText, metaFile'
new = 'use back.api: fetchConfigSafe, putConfigSafe, deleteBlockSafe, entriesCount, entryAt, subCount, subAt, editField, editTagField, addBlockText, bodyHasText, metaFile, warmEnumsText, setCellText, tableAddRowText, tableRemoveRowText'
assert old in s
s = s.replace(old, new)

# ── msg：表格 + tags 移除 ──────────────────────────────────────────────────
old = '''        Apply(map, str),
        TagAdd(map),
        Toggle(map, bool),'''
new = '''        Apply(map, str),
        TagAdd(map),
        TagRemove(map, str),
        Toggle(map, bool),
        TableCell(map, int, str, str),
        TableRowAdd(map),
        TableRowRemove(map, int),'''
assert old in s
s = s.replace(old, new)

# ── Init/Load：entries 构建前预热枚举（两个 handler 同体，直接全量替换）────
old = '''            var r = fetchConfigSafe(.module_id)
            if r.ok {
                .body = r.value
                .meta_file = metaFile(r.meta)
                .dirty = false
                .loaded_once = true
                .status = "loaded"
                var es = []'''
new = '''            var r = fetchConfigSafe(.module_id)
            if r.ok {
                .body = r.value
                .meta_file = metaFile(r.meta)
                .dirty = false
                .loaded_once = true
                .status = "loaded"
                let w = warmEnumsText(.body, .module_id)
                var es = []'''
assert s.count(old) == 2, f'init/load anchor x{s.count(old)}'
s = s.replace(old, new)

# ── 新 handlers（挂在 .TagAdd 之后）────────────────────────────────────────
old = '''        .Save -> {
            if .dirty && .body != "" {'''
new = '''        .TagRemove(e, t) -> {
            .body = editTagField(.body, e.key, "", t)
            .dirty = true
            var es = []
            let n = entriesCount(.body)
            var i = 0
            loop {
                if i >= n {
                    break
                }
                es.push(entryAt(.body, i, .module_id))
                if entryAt(.body, i, .module_id).kind == "subform" {
                    let sc = subCount(entryAt(.body, i, .module_id).frag)
                    var j = 0
                    loop {
                        if j >= sc {
                            break
                        }
                        es.push(subAt(.body, entryAt(.body, i, .module_id).key, j, .module_id))
                        j = j + 1
                    }
                }
                i = i + 1
            }
            .entries = es
            .draft = ""
        }

        .TableCell(e, ri, col, v) -> {
            .body = setCellText(.body, e.key, ri, col, v)
            .dirty = true
            var es = []
            let n = entriesCount(.body)
            var i = 0
            loop {
                if i >= n {
                    break
                }
                es.push(entryAt(.body, i, .module_id))
                if entryAt(.body, i, .module_id).kind == "subform" {
                    let sc = subCount(entryAt(.body, i, .module_id).frag)
                    var j = 0
                    loop {
                        if j >= sc {
                            break
                        }
                        es.push(subAt(.body, entryAt(.body, i, .module_id).key, j, .module_id))
                        j = j + 1
                    }
                }
                i = i + 1
            }
            .entries = es
            .draft = ""
        }

        .TableRowAdd(e) -> {
            .body = tableAddRowText(.body, e.key)
            .dirty = true
            var es = []
            let n = entriesCount(.body)
            var i = 0
            loop {
                if i >= n {
                    break
                }
                es.push(entryAt(.body, i, .module_id))
                if entryAt(.body, i, .module_id).kind == "subform" {
                    let sc = subCount(entryAt(.body, i, .module_id).frag)
                    var j = 0
                    loop {
                        if j >= sc {
                            break
                        }
                        es.push(subAt(.body, entryAt(.body, i, .module_id).key, j, .module_id))
                        j = j + 1
                    }
                }
                i = i + 1
            }
            .entries = es
            .draft = ""
        }

        .TableRowRemove(e, ri) -> {
            .body = tableRemoveRowText(.body, e.key, ri)
            .dirty = true
            var es = []
            let n = entriesCount(.body)
            var i = 0
            loop {
                if i >= n {
                    break
                }
                es.push(entryAt(.body, i, .module_id))
                if entryAt(.body, i, .module_id).kind == "subform" {
                    let sc = subCount(entryAt(.body, i, .module_id).frag)
                    var j = 0
                    loop {
                        if j >= sc {
                            break
                        }
                        es.push(subAt(.body, entryAt(.body, i, .module_id).key, j, .module_id))
                        j = j + 1
                    }
                }
                i = i + 1
            }
            .entries = es
            .draft = ""
        }

        .Save -> {
            if .dirty && .body != "" {'''
assert old in s
s = s.replace(old, new, 1)

io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('editor msgs+handlers ok')
