import io
p = r'D:\autostack\auto-os-config\auto\gen\regen.sh'
lines = io.open(p, encoding='utf-8').read().split('\n')

CAST_V = '      -e "s|\\$event\\.target\\.value|($event.target as HTMLInputElement).value|g" \\'
CAST_C = '      -e "s|\\$event\\.target\\.checked|($event.target as HTMLInputElement).checked|g" \\'
CAST_V4 = '    -e "s|\\$event\\.target\\.value|($event.target as HTMLInputElement).value|g" \\'
CAST_C4 = '    -e "s|\\$event\\.target\\.checked|($event.target as HTMLInputElement).checked|g" \\'

# 组件部署段：在 "$f" > "../src/components/${base}" 行前插入两条规则
for i, l in enumerate(lines):
    if '$f" > "../src/components/${base}"' in l:
        lines[i:i] = [CAST_V, CAST_C]
        break
else:
    raise SystemExit('component deploy line not found')

# 根 App.vue 段：在 "$f" > "../src/App.vue" 行前插入（4 空格缩进）
for i, l in enumerate(lines):
    if '"gen/front/vue/src/App.vue" > "../src/App.vue"' in l:
        lines[i:i] = [CAST_V4, CAST_C4]
        break
else:
    raise SystemExit('App.vue deploy line not found')

io.open(p, 'w', encoding='utf-8', newline='\n').write('\n'.join(lines))
print('regen.sh patched')
