import io
p = r'D:\autostack\auto-os-config\auto\src\front\config_editor.at'
s = io.open(p, encoding='utf-8').read()

old = '''                                    if e.kind == "tags" {
                                        div (style: "flex items-center gap-2") {
                                            input (value: "", "type": "text", placeholder: "add…", style: "input tag-input") {
                                                oninput: .Draft
                                            }
                                            button (style: "btn", text: "Add") {
                                                onclick: .TagAdd(e)
                                            }
                                        }
                                    }'''
new = '''                                    if e.kind == "tags" {
                                        div (style: "tags") {
                                            for t in e.items {
                                                span (style: "tag") {
                                                    text (text: t) {}
                                                    button (text: "×", style: "tag-x") {
                                                        onclick: .TagRemove(e, t)
                                                    }
                                                }
                                            }
                                            input (value: "", "type": "text", placeholder: "add…", style: "tag-input") {
                                                oninput: .Draft
                                                onkeydown.enter: .TagAdd(e)
                                            }
                                        }
                                    }'''
assert old in s, 'tags branch'
s = s.replace(old, new)

old = '''                                    if e.kind == "multiselect" {
                                        div (style: "flex items-center gap-2") {
                                            input (value: "", "type": "text", placeholder: "add…", style: "input tag-input") {
                                                oninput: .Draft
                                            }
                                            button (style: "btn", text: "Add") {
                                                onclick: .TagAdd(e)
                                            }
                                        }
                                    }'''
new = '''                                    if e.kind == "multiselect" {
                                        div (style: "multiselect") {
                                            if e.options.len() == 0 {
                                                p (style: "ms-empty", text: "No options available (directory empty or missing).") {}
                                            }
                                        }
                                    }'''
assert old in s, 'multiselect branch'
s = s.replace(old, new)

old = '''                                    if e.kind == "table" {
                                        div (style: "table-readonly") {
                                            text (text: e.frag, style: "font-mono text-xs text-[#616161] whitespace-pre-wrap break-all") {}
                                        }
                                    }'''
new = '''                                    if e.kind == "table" {
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
                                                                            onchange: .TableCell(e, ri, c.name, $event.target.value)
                                                                            for o in c.options {
                                                                                option (value: o.value, text: o.label) {}
                                                                            }
                                                                            option (value: r[c.name], text: r[c.name]) {}
                                                                        }
                                                                    }
                                                                    if c.kind == "number" {
                                                                        input (value: r[c.name], "type": "number", style: "cell-input") {
                                                                            onchange: .TableCell(e, ri, c.name, $event.target.value)
                                                                        }
                                                                    }
                                                                    if c.kind != "select" && c.kind != "number" {
                                                                        input (value: r[c.name], "type": "text", style: "cell-input") {
                                                                            onchange: .TableCell(e, ri, c.name, $event.target.value)
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                            td (style: "row-act") {
                                                                button (text: "×", style: "del-row") {
                                                                    onclick: .TableRowRemove(e, ri)
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
                                                onclick: .TableRowAdd(e)
                                            }
                                        }
                                    }'''
assert old in s, 'table branch'
s = s.replace(old, new)

io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('editor view branches ok (fixed anchors)')
