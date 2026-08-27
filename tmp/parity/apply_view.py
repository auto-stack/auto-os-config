import io
p = r'D:\autostack\auto-os-config\auto\src\front\collection_browser.at'
s = io.open(p, encoding='utf-8').read()

new_view = open(r'D:\autostack\auto-os-config\tmp\parity\new_view.atfrag', encoding='utf-8').read()

start = s.index('    view {')
end = s.index('    on {')
s = s[:start] + new_view + s[end:]
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('view replaced ok')
