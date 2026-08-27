import io
p = r'D:\autostack\auto-os-config\auto\src\front\collection_browser.at'
s = io.open(p, encoding='utf-8').read()

# use 行
old = 'use back.api: fieldDisplayOf'
new = 'use back.api: fieldDisplayOf, setCellText, tableAddRowText, tableRemoveRowText'
assert old in s
s = s.replace(old, new)

# msgs
old = '''        ApplyEntry(int, str),
        TagAdd(int),
        Toggle(int, bool),'''
new = '''        ApplyEntry(int, str),
        TagAdd(int),
        TagRemove(int, str),
        MsToggle(int, str, bool),
        Toggle(int, bool),
        TableCell(int, int, str, str),
        TableRowAdd(int),
        TableRowRemove(int, int),'''
assert old in s
s = s.replace(old, new)

# handlers：挂在 .TagAdd 之后（复用 entry_keys 解析）
old = '''        .Toggle(i, on) -> {'''
new = '''        .TagRemove(i, t) -> {
            var k = ""
            var j = 0
            for x in .store.entry_keys {
                if j == i {
                    k = x
                }
                j = j + 1
            }
            if k != "" {
                store.TagRemove(k, t)
            }
        }

        .MsToggle(i, v, on) -> {
            var k = ""
            var j = 0
            for x in .store.entry_keys {
                if j == i {
                    k = x
                }
                j = j + 1
            }
            if k != "" {
                if on {
                    store.TagField(k, v)
                }
                if on == false {
                    store.TagRemove(k, v)
                }
            }
        }

        .TableCell(i, ri, col, v) -> {
            var k = ""
            var j = 0
            for x in .store.entry_keys {
                if j == i {
                    k = x
                }
                j = j + 1
            }
            if k != "" {
                let nb = setCellText(.store.body_text, k, ri, col, v)
                store.SetBodyText(nb)
            }
        }

        .TableRowAdd(i) -> {
            var k = ""
            var j = 0
            for x in .store.entry_keys {
                if j == i {
                    k = x
                }
                j = j + 1
            }
            if k != "" {
                let nb = tableAddRowText(.store.body_text, k)
                store.SetBodyText(nb)
            }
        }

        .TableRowRemove(i, ri) -> {
            var k = ""
            var j = 0
            for x in .store.entry_keys {
                if j == i {
                    k = x
                }
                j = j + 1
            }
            if k != "" {
                let nb = tableRemoveRowText(.store.body_text, k, ri)
                store.SetBodyText(nb)
            }
        }

        .Toggle(i, on) -> {'''
assert old in s
s = s.replace(old, new, 1)

# ── 视图分支升级 ────────────────────────────────────────────────────────────
# tags
old = '''                                    if e.is_table == false && e.kind == "tags" {
                                        div (style: "field-row") {
                                            label (style: "field-label") {
                                                text (text: e.label) {}
                                            }
                                            div (style: "flex items-center gap-2") {
                                                input (value: "", "type": "text", placeholder: "add…", style: "input tag-input") {
                                                    oninput: .Draft
                                                }
                                                button (text: "Add", style: "btn") {
                                                    onclick: .TagAdd(i)
                                                }
                                            }
                                        }
                                    }'''
new = '''                                    if e.is_table == false && e.kind == "tags" {
                                        div (style: "field-row") {
                                            label (style: "field-label") {
                                                text (text: e.label) {}
                                            }
                                            div (style: "tags") {
                                                for t in e.items {
                                                    span (style: "tag") {
                                                        text (text: t) {}
                                                        button (text: "×", style: "tag-x") {
                                                            onclick: .TagRemove(i, t)
                                                        }
                                                    }
                                                }
                                                input (value: "", "type": "text", placeholder: "add…", style: "tag-input") {
                                                    oninput: .Draft
                                                    onkeydown.enter: .TagAdd(i)
                                                }
                                            }
                                        }
                                    }'''
assert old in s, 'tags'
s = s.replace(old, new)

# multiselect
old = '''                                    if e.is_table == false && e.kind == "multiselect" {
                                        div (style: "field-row") {
                                            label (style: "field-label") {
                                                text (text: e.label) {}
                                            }
                                            div (style: "flex items-center gap-2") {
                                                input (value: "", "type": "text", placeholder: "add…", style: "input tag-input") {
                                                    oninput: .Draft
                                                }
                                                button (text: "Add", style: "btn") {
                                                    onclick: .TagAdd(i)
                                                }
                                            }
                                        }
                                    }'''
new = '''                                    if e.is_table == false && e.kind == "multiselect" {
                                        div (style: "field-row") {
                                            label (style: "field-label") {
                                                text (text: e.label) {}
                                            }
                                            div (style: "multiselect") {
                                                for oi, o in e.options {
                                                    label (style: "ms-item") {
                                                        input ("type": "checkbox", checked: e.ms_checked[oi]) {
                                                            onchange: .MsToggle(i, o.value, $event.target.checked)
                                                        }
                                                        text (text: o.label) {}
                                                    }
                                                }
                                                if e.options.len() == 0 {
                                                    p (style: "ms-empty", text: "No options available (directory empty or missing).") {}
                                                }
                                            }
                                        }
                                    }'''
assert old in s, 'multiselect'
s = s.replace(old, new)

# select
old = '''                                    if e.is_table == false && e.kind == "select" {
                                        div (style: "field-row") {
                                            label (style: "field-label") {
                                                text (text: e.label) {}
                                            }
                                            input (value: e.value, "type": "text", placeholder: "(not set)", style: "input") {
                                                oninput: .Draft
                                                onchange: .ApplyEntry(i, $event.target.value)
                                            }
                                        }
                                    }'''
new = '''                                    if e.is_table == false && e.kind == "select" {
                                        div (style: "field-row") {
                                            label (style: "field-label") {
                                                text (text: e.label) {}
                                            }
                                            if e.options.len() > 0 {
                                                select (value: e.value, style: "input") {
                                                    onchange: .ApplyEntry(i, $event.target.value)
                                                    for o in e.options {
                                                        option (value: o.value, text: o.label) {}
                                                    }
                                                    if e.has_current {
                                                        option (value: e.value, text: e.value + " (current)") {}
                                                    }
                                                }
                                            }
                                            if e.options.len() == 0 {
                                                div (style: "fallback-text gap-[0px]") {
                                                    input (value: e.value, "type": "text", placeholder: "(not set)", style: "input") {
                                                        oninput: .Draft
                                                        onchange: .ApplyEntry(i, $event.target.value)
                                                    }
                                                    span (style: "fallback-hint", text: "no options available (e.g. builtin-only) — type freely") {}
                                                }
                                            }
                                        }
                                    }'''
assert old in s, 'select'
s = s.replace(old, new)

# table
old = '''                                    if e.is_table {
                                        div (style: "field-row") {
                                            label (style: "field-label") {
                                                text (text: e.label) {}
                                            }
                                            div (style: "table-readonly") {
                                                text (text: e.frag, style: "font-mono text-xs text-[#616161] whitespace-pre-wrap break-all") {}
                                            }
                                        }
                                    }'''
new = '''                                    if e.is_table {
                                        div (style: "field-row") {
                                            label (style: "field-label") {
                                                text (text: e.label) {}
                                            }
                                            div (style: "table-wrap gap-[0px]") {
                                                table (style: "tbl") {
                                                    thead {
                                                        tr {
                                                            for c in e.t_cols {
                                                                th (text: c.name) {}
                                                            }
                                                            th (style: "row-act") {}
                                                        }
                                                    }
                                                    tbody {
                                                        for ri, r in e.t_rows {
                                                            tr {
                                                                for c in e.t_cols {
                                                                    td {
                                                                        if c.kind == "select" {
                                                                            select (value: r[c.name], style: "cell-select") {
                                                                                onchange: .TableCell(i, ri, c.name, $event.target.value)
                                                                                for o in c.options {
                                                                                    option (value: o.value, text: o.label) {}
                                                                                }
                                                                                option (value: r[c.name], text: r[c.name]) {}
                                                                            }
                                                                        }
                                                                        if c.kind == "number" {
                                                                            input (value: r[c.name], "type": "number", style: "cell-input") {
                                                                                onchange: .TableCell(i, ri, c.name, $event.target.value)
                                                                            }
                                                                        }
                                                                        if c.kind != "select" && c.kind != "number" {
                                                                            input (value: r[c.name], "type": "text", style: "cell-input") {
                                                                                onchange: .TableCell(i, ri, c.name, $event.target.value)
                                                                            }
                                                                        }
                                                                    }
                                                                }
                                                                td (style: "row-act") {
                                                                    button (text: "×", style: "del-row") {
                                                                        onclick: .TableRowRemove(i, ri)
                                                                    }
                                                                }
                                                            }
                                                        }
                                                        if e.t_rows.len() == 0 {
                                                            tr {
                                                                td (style: "empty", text: "(empty — click + Row)") {}
                                                            }
                                                        }
                                                    }
                                                }
                                                button (text: "+ Row", style: "add-row") {
                                                    onclick: .TableRowAdd(i)
                                                }
                                            }
                                        }
                                    }'''
assert old in s, 'table'
s = s.replace(old, new)

# modal：替换 confirm_open 行内条
old = '''                    if .confirm_open {
                        row (style: "flex items-center gap-3 px-3 py-2 border border-[#c42b1c] rounded bg-[#ededed]") {
                            text (text: "Delete this entity? (.at + sidecar removed, .bak kept)", style: "text-sm text-[#c42b1c]") {}
                            div (style: "flex-1") {}
                            button (text: "Yes, delete", style: "px-3 py-1 text-xs rounded bg-[#c42b1c] border-[#c42b1c] text-white") {
                                onclick: .ConfirmDeleteYes
                            }
                            button (text: "Cancel", style: "px-3 py-1 text-xs rounded border border-[#e0e0e0] bg-white") {
                                onclick: .ConfirmDeleteNo
                            }
                        }
                    }'''
new = '''                    if .confirm_open {
                        div (style: "modal-backdrop gap-[0px]") {
                            div (style: "modal gap-[0px]") {
                                p {
                                    text (text: "Delete ") {}
                                    span (style: "strong", text: .store.selected_name) {}
                                    text (text: "?") {}
                                }
                                p (style: "modal-hint") {
                                    text (text: "This removes the ") {}
                                    span (style: "inline-code", text: ".at") {}
                                    text (text: " file and its sidecar. A ") {}
                                    span (style: "inline-code", text: ".bak") {}
                                    text (text: " is kept.") {}
                                }
                                div (style: "modal-actions gap-[8px]") {
                                    button (text: "Cancel", style: "btn") {
                                        onclick: .ConfirmDeleteNo
                                    }
                                    button (text: "Delete", style: "btn danger") {
                                        onclick: .ConfirmDeleteYes
                                    }
                                }
                            }
                        }
                    }'''
assert old in s, 'modal'
s = s.replace(old, new)

io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('collection browser upgraded')
