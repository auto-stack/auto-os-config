import io
p = r'D:\autostack\auto-os-config\auto\src\back\api.at'
s = io.open(p, encoding='utf-8').read()

old = '''    let frag = json.get(body, ku)
    let spec = inferField(ku, frag, module_id, "")
    return {
        key: ku,
        kind: spec.kind,
        label: spec.label,
        value: displayOf(frag),
        frag: frag,
        is_table: is_object_array(frag),
        ek: spec.ek,
        ew: spec.ew,
        ep: spec.ep,
        url: enumUrlOfEk(spec.ek, spec.ew, module_id, spec.ep),
        depth: 0,
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
new = '''    let frag = json.get(body, ku)
    let spec = inferField(ku, frag, module_id, "")
    let opts = selectOptionsOf(spec, module_id)
    return {
        key: ku,
        kind: spec.kind,
        label: spec.label,
        value: displayOf(frag),
        frag: frag,
        is_table: is_object_array(frag),
        ek: spec.ek,
        ew: spec.ew,
        ep: spec.ep,
        url: enumUrlOfEk(spec.ek, spec.ew, module_id, spec.ep),
        depth: 0,
        is_on: displayOf(frag) == "true",
        is_provider: spec.kind == "subform" && fragHasKey(frag, "kind"),
        box_class: "field-row",
        options: opts,
        has_current: optionValuesHave(opts, displayOf(frag)),
        items: stringItemsOf(frag),
        t_cols: tableColsOf(frag, module_id),
        t_rows: [],
    }
}'''
assert old in s, 'entryAt block not found'
s = s.replace(old, new)

old = '''    let frag = json.get(sub, ku)
    let spec = inferField(ku, frag, module_id, head)
    var bc = "subform-cont"'''
new = '''    let frag = json.get(sub, ku)
    let spec = inferField(ku, frag, module_id, head)
    let opts = selectOptionsOf(spec, module_id)
    var bc = "subform-cont"'''
assert old in s, 'subAt head not found'
s = s.replace(old, new)

old = '''        depth: 1,
        is_on: displayOf(frag) == "true",
        box_class: bc,
        options: selectOptionsOf(spec, module_id),
        has_current: optionValuesHave(selectOptionsOf(spec, module_id), displayOf(frag)),
        items: stringItemsOf(frag),
        t_cols: tableColsOf(frag, module_id),
        t_rows: [],
    }
}'''
new = '''        depth: 1,
        is_on: displayOf(frag) == "true",
        box_class: bc,
        options: opts,
        has_current: optionValuesHave(opts, displayOf(frag)),
        items: stringItemsOf(frag),
        t_cols: tableColsOf(frag, module_id),
        t_rows: [],
    }
}'''
assert old in s, 'subAt return not found'
s = s.replace(old, new)

io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('dedup ok')
