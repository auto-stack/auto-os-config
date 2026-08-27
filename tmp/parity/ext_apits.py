import io, re
p = r'D:\autostack\auto-os-config\src\lib\api.ts'
s = io.open(p, encoding='utf-8').read()

# ── entryAt 追加字段 ────────────────────────────────────────────────────────
old = '''    is_provider: spec.kind === 'subform' && frag != null && typeof frag === 'object' && !Array.isArray(frag) && 'kind' in frag,
    box_class: 'field-row',
    // vue-only extras: the still-unified CollectionBrowser (batch 4) consumes
    // the spec-bearing EntityEntry shape; `raw` keeps the original JS value.
    spec,
    raw: frag,
  }
}'''
new = '''    is_provider: spec.kind === 'subform' && frag != null && typeof frag === 'object' && !Array.isArray(frag) && 'kind' in frag,
    box_class: 'field-row',
    // 2026-08-27 像素对拍二阶段（与 api.at 孪生）：select 真下拉 / tags chips /
    // 可编辑表格。options 读 warmEnums 预热的 enumCache（未预热 → []）。
    options: spec.kind === 'select' ? enumCache.get(enumUrlOf(spec.optionsFrom)) ?? [] : [],
    has_current: spec.kind === 'select' && optionValuesHave(enumCache.get(enumUrlOf(spec.optionsFrom)) ?? [], displayOfValue(frag)),
    items: tagItemsOf(frag),
    t_cols: tableColsOf(frag, moduleId),
    t_rows: Array.isArray(frag) ? frag : [],
    // vue-only extras: the still-unified CollectionBrowser (batch 4) consumes
    // the spec-bearing EntityEntry shape; `raw` keeps the original JS value.
    spec,
    raw: frag,
  }
}'''
assert old in s, 'entryAt tail not found'
s = s.replace(old, new)

# ── subAt 追加字段 ──────────────────────────────────────────────────────────
old = '''    depth: 1,
    is_on: displayOfValue(frag) === 'true',
    box_class: boxClass,
  }
}'''
new = '''    depth: 1,
    is_on: displayOfValue(frag) === 'true',
    box_class: boxClass,
    options: spec.kind === 'select' ? enumCache.get(enumUrlOf(spec.optionsFrom)) ?? [] : [],
    has_current: spec.kind === 'select' && optionValuesHave(enumCache.get(enumUrlOf(spec.optionsFrom)) ?? [], displayOfValue(frag)),
    items: tagItemsOf(frag),
    t_cols: tableColsOf(frag, moduleId),
    t_rows: Array.isArray(frag) ? frag : [],
  }
}'''
assert old in s, 'subAt tail not found'
s = s.replace(old, new)

# ── 新 fns：插在 subAt 之后（editField 之前）────────────────────────────────
anchor = '''/** vm contract twin (editField): typed whole-replace at "a" or "a.b". */'''
fns = '''// ── 2026-08-27 像素对拍二阶段：select 选项 / tags chips / 可编辑表格 ──────

/** options 的 value 是否已含 val（css-era has_current）。 */
function optionValuesHave(opts: { value: string }[], val: string): boolean {
  return opts.some((o) => o.value === val)
}

/** tags/multiselect 的字符串元素。 */
function tagItemsOf(frag: unknown): string[] {
  return Array.isArray(frag) ? frag.map((x) => (typeof x === 'string' ? x : String(x))) : []
}

/** 表格列描述（css-era tableInfo+mergeCols 等价；inferColumn 强制标量）。 */
export function tableColsOf(frag: unknown, moduleId: string): { name: string; kind: string; options: { value: string; label: string }[] }[] {
  if (!Array.isArray(frag)) return []
  const cols: { name: string; kind: string; options: { value: string; label: string }[] }[] = []
  const seen = new Set<string>()
  for (const row of frag) {
    if (row == null || typeof row !== 'object') continue
    for (const k of Object.keys(row)) {
      if (seen.has(k)) continue
      seen.add(k)
      const sample = (frag as Record<string, unknown>[]).find((r) => k in r)?.[k]
      const spec = inferColumn(k, sample, moduleId)
      const url = enumUrlOf(spec.optionsFrom)
      cols.push({ name: k, kind: spec.kind, options: url ? enumCache.get(url) ?? [] : [] })
    }
  }
  return cols
}

/** Init 预热：把 body 里所有 select 字段/表格枚举列的选项拉进 enumCache。 */
export async function warmEnums(body: unknown, moduleId: string): Promise<boolean> {
  const obj = asBodyObj(body) ?? {}
  const provider = typeof obj.default_provider === 'string' ? obj.default_provider : ''
  const urls: string[] = []
  for (const [key, value] of Object.entries(obj)) {
    const spec = inferField(key, value, moduleId, provider)
    if (spec.kind === 'select') {
      const u = enumUrlOf(spec.optionsFrom)
      if (u) urls.push(u)
    } else if (spec.kind === 'table') {
      for (const c of tableColsOf(value, moduleId)) {
        void c
      }
    } else if (spec.kind === 'subform' && value && typeof value === 'object') {
      for (const [sk, sv] of Object.entries(value)) {
        const sspec = inferField(sk, sv, moduleId, provider)
        if (sspec.kind === 'select') {
          const u = enumUrlOf(sspec.optionsFrom)
          if (u) urls.push(u)
        }
        if (Array.isArray(sv)) {
          for (const c of tableColsOf(sv, moduleId)) {
            // tableColsOf 读取 enumCache；列选项也要预热
            const spec2 = inferColumn(c.name, sv.find((r: any) => c.name in r)?.[c.name], moduleId)
            const u2 = enumUrlOf(spec2.optionsFrom)
            if (u2) urls.push(u2)
          }
        }
      }
    }
  }
  await Promise.all(urls.map((u) => loadEnum(u)))
  return true
}

/** 表格单元格整改（css-era setCell；按旧单元格类型重定型），返回新 body 文本。 */
export function setCellText(body: any, path: string, i: number, col: string, val: string): string {
  const obj = asBodyObj(body)
  const parts = path.split('.')
  const arr = parts.length === 1 ? obj[parts[0]] : obj[parts[0]]?.[parts[1]]
  if (!Array.isArray(arr) || i >= arr.length) return JSON.stringify(obj)
  const row = { ...(arr[i] ?? {}) }
  const coerce = (old: unknown): unknown => {
    if (typeof old === 'boolean') return val === 'true'
    if (typeof old === 'number' && /^-?[0-9.]+$/.test(val)) return Number(val)
    return val
  }
  row[col] = coerce(arr[i]?.[col])
  arr[i] = row
  return JSON.stringify(obj)
}

/** 追加空行（css-era blankRow：按现有列全集补 ""）。 */
export function tableAddRowText(body: any, path: string): string {
  const obj = asBodyObj(body)
  const parts = path.split('.')
  const arr = parts.length === 1 ? obj[parts[0]] : obj[parts[0]]?.[parts[1]]
  if (!Array.isArray(arr)) return JSON.stringify(obj)
  const cols = tableColsOf(arr, 'add-row').map((c) => c.name)
  const row: Record<string, string> = {}
  for (const c of cols) row[c] = ''
  arr.push(row)
  return JSON.stringify(obj)
}

/** 删除第 i 行。 */
export function tableRemoveRowText(body: any, path: string, i: number): string {
  const obj = asBodyObj(body)
  const parts = path.split('.')
  const arr = parts.length === 1 ? obj[parts[0]] : obj[parts[0]]?.[parts[1]]
  if (!Array.isArray(arr) || i >= arr.length) return JSON.stringify(obj)
  arr.splice(i, 1)
  return JSON.stringify(obj)
}

/** vm contract twin (editField): typed whole-replace at "a" or "a.b". */'''
assert anchor in s
s = s.replace(anchor, fns, 1)

# inferColumn 导入
old = "import { inferField, humanize } from '../editor/types'"
if old in s:
    s = s.replace(old, "import { inferField, inferColumn, humanize } from '../editor/types'")
else:
    # 可能是其他形式
    m = re.search(r"import \{([^}]*)\} from '\.\./editor/types'", s)
    assert m, 'editor/types import not found'
    if 'inferColumn' not in m.group(1):
        s = s.replace(m.group(0), m.group(0).replace('{', '{ inferColumn,', 1))

io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('api.ts extended')
