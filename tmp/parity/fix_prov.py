import io
p = r'D:\autostack\auto-os-config\auto\src\back\api.at'
s = io.open(p, encoding='utf-8').read()
old = '''    let frag = json.get(body, ku)
    let spec = inferField(ku, frag, module_id, "")
    let opts = selectOptionsOf(spec, module_id)'''
new = '''    let frag = json.get(body, ku)
    // css-era configEntries：顶层字段的 provider 上下文 = 全局 default_provider
    // （default_model 据此成为 self-models 枚举下拉/空选项回退）。
    let prov = ""
    let dp = json.get(body, "default_provider")
    if json.type_of(dp) == "string" {
        prov = unquote(dp)
    }
    let spec = inferField(ku, frag, module_id, prov)
    let opts = selectOptionsOf(spec, module_id)'''
assert old in s
s = s.replace(old, new)
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)

p2 = r'D:\autostack\auto-os-config\src\lib\api.ts'
s = io.open(p2, encoding='utf-8').read()
old = '''export function entryAt(body: any, i: number, moduleId: string): any {
  const obj = asBodyObj(body)
  const key = Object.keys(obj)[i]
  const frag = obj[key]
  const spec = inferField(key, frag, moduleId, '')'''
new = '''export function entryAt(body: any, i: number, moduleId: string): any {
  const obj = asBodyObj(body)
  const key = Object.keys(obj)[i]
  const frag = obj[key]
  // css-era configEntries：顶层字段的 provider 上下文 = 全局 default_provider。
  const prov = typeof obj.default_provider === 'string' ? obj.default_provider : ''
  const spec = inferField(key, frag, moduleId, prov)'''
assert old in s
s = s.replace(old, new)
io.open(p2, 'w', encoding='utf-8', newline='\n').write(s)
print('provider ctx fixed both sides')
