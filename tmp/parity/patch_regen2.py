import io
p = r'D:\autostack\auto-os-config\auto\gen\regen.sh'
s = io.open(p, encoding='utf-8').read()
# replacement 侧 $event 被 shell 双引号展开成空串 → 加反斜杠转义
s = s.replace('|($event.target as HTMLInputElement).value|g"', '|(\\$event.target as HTMLInputElement).value|g"')
s = s.replace('|($event.target as HTMLInputElement).checked|g"', '|(\\$event.target as HTMLInputElement).checked|g"')
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('replacement escaping fixed')
