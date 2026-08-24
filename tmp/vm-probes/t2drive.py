import json, re, time, urllib.request
MCP="http://127.0.0.1:9313/mcp"
def call(n,a,retries=3):
    for i in range(retries):
        try:
            r=urllib.request.Request(MCP,data=json.dumps({"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":n,"arguments":a}}).encode(),headers={"Content-Type":"application/json"})
            return json.loads(urllib.request.urlopen(r,timeout=8).read())["result"]["content"][0]["text"]
        except Exception as e:
            time.sleep(1)
    return f"ERR {n}"
def btn(l):
    for line in call("autoui_snapshot",{"include_state":False}).splitlines():
        if "button" in line and f'"{l}"' in line:
            m=re.search(r"vnode_\d+",line)
            if m: return m.group(0)
def press(l):
    e=btn(l)
    return call("autoui_action",{"element_id":e,"action":"press"}) if e else "NOT FOUND "+l
import sys
for l in sys.argv[1:]:
    print(l, "=>", press(l)); time.sleep(1.2)
print(call("autoui_state",{"fields":["a","c","d","e"]}))
