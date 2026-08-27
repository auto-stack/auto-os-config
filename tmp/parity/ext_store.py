import io, re
p = r'D:\autostack\auto-os-config\auto\src\front\collection_store.at'
s = io.open(p, encoding='utf-8').read()

# use 行追加 warmEnumsText / table fns
old = 'use back.api: fetchCollectionListRaw, collectionCount, collectionAt, fetchEntityFlat, createEntitySafe, putEntitySafe, deleteEntitySafe, entriesCount, entryAt, editField, editTagField, fieldDisplayOf'
new = 'use back.api: fetchCollectionListRaw, collectionCount, collectionAt, fetchEntityFlat, createEntitySafe, putEntitySafe, deleteEntitySafe, entriesCount, entryAt, editField, editTagField, fieldDisplayOf, warmEnumsText, setCellText, tableAddRowText, tableRemoveRowText, setBodyField'
assert old in s
s = s.replace(old, new)

# msg 追加
old = '''        FieldEdited(map),'''
new = '''        FieldEdited(map),
        SetBodyText(str),
        TagRemove(str, str),'''
assert old in s
s = s.replace(old, new)

# 预热：所有 entriesCount 重建点之前插 warm（body_text 已就位处）
n = s.count('''            var es = []''')
s = s.replace('''            var es = []''', '''            let w = warmEnumsText(.body_text, .module_id)
            var es = []''')
# Pick/Reload 等缩进不同的情况
n2 = s.count('''                var es = []''')
s = s.replace('''                var es = []''', '''                let w = warmEnumsText(.body_text, .module_id)
                var es = []''')
print('warm inserted at', n, '+', n2, 'sites')

# 新 handlers：挂在 .TagField 之后
old = '''        .TagField(k, add) -> {'''
new = '''        .SetBodyText(nb) -> {
            .body_text = nb
            var es = []
            var ek = []
            let n = entriesCount(.body_text)
            var i = 0
            loop {
                if i >= n {
                    break
                }
                let d = entryAt(.body_text, i, .module_id)
                es.push(d)
                ek.push(d.key)
                i = i + 1
            }
            .entries = es
            .entry_keys = ek
        }

        .TagRemove(k, t) -> {
            .body_text = editTagField(.body_text, k, "", t)
            var es = []
            var ek = []
            let n = entriesCount(.body_text)
            var i = 0
            loop {
                if i >= n {
                    break
                }
                let d = entryAt(.body_text, i, .module_id)
                es.push(d)
                ek.push(d.key)
                i = i + 1
            }
            .entries = es
            .entry_keys = ek
        }

        .TagField(k, add) -> {'''
assert old in s
s = s.replace(old, new, 1)

io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('collection store ok')
