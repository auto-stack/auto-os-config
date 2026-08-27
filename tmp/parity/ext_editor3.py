import io
p = r'D:\autostack\auto-os-config\auto\src\front\config_editor.at'
s = io.open(p, encoding='utf-8').read()

old = '''                                    if e.kind == "select" {
                                        input (value: e.value, "type": "text", placeholder: "(not set)", style: "input") {
                                            oninput: .Draft
                                            onchange: .Apply(e, $event.target.value)
                                        }
                                    }'''
new = '''                                    if e.kind == "select" {
                                        if e.options.len() > 0 {
                                            select (value: e.value, style: "input") {
                                                onchange: .Apply(e, $event.target.value)
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
                                                    onchange: .Apply(e, $event.target.value)
                                                }
                                                span (style: "fallback-hint", text: "no options available (e.g. builtin-only) — type freely") {}
                                            }
                                        }
                                    }'''
assert old in s, 'select branch not found'
s = s.replace(old, new)
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('select branch applied')
