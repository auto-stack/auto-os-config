import json, re, time, urllib.request
MCP = "http://127.0.0.1:9311/mcp"
def call(n, a):
    for i in range(4):
        try:
            r = urllib.request.Request(MCP, data=json.dumps({"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":n,"arguments":a}}).encode(), headers={"Content-Type":"application/json"})
            return json.loads(urllib.request.urlopen(r, timeout=10).read())["result"]["content"][0]["text"]
        except Exception:
            time.sleep(1.2)
    return "ERR "+n
def btn(l):
    for line in call("autoui_snapshot", {"include_state": False}).splitlines():
        if "button" in line and f'"{l}"' in line:
            m = re.search(r"vnode_\d+", line)
            if m: return m.group(0)
    return None
def press(l, wait=1.2):
    for attempt in range(4):
        e = btn(l)
        if e:
            r = call("autoui_action", {"element_id": e, "action": "press"})
            changes = [x for x in r.splitlines() if "->" in x]
            print(f"[{l}] " + ("; ".join(changes) if changes else r.splitlines()[0]))
            time.sleep(wait)
            return True
        time.sleep(1.2)
    print(f"[{l}] NOT FOUND"); return False
def st(*f):
    print("  STATE:", call("autoui_state", {"fields": list(f)}).replace("\n", " "))
def type_ph(ph, text):
    e = None
    for line in call("autoui_snapshot", {"include_state": False}).splitlines():
        if "input" in line and f'"{ph}"' in line:
            m = re.search(r"vnode_\d+", line)
            if m: e = m.group(0); break
    if e:
        call("autoui_type", {"element_id": e, "text": text}); time.sleep(0.8)
    else:
        print(f"  input {ph} NOT FOUND")

print("=== V1 ==="); press("GO", 2.0); st("v1_result","v1_config","v1_put")
print("=== V2 store ==="); press("V2 store"); press("GO2", 2.0); st("modules_len_dummy")
print(call("autoui_state", {"fields": ["__all__"]})[:600])
press("select roles", 1.0)
print(call("autoui_state", {"fields": ["__all__"]})[:600])
print("=== V3 ==="); press("V3 logic"); press("GO3", 1.5); st("v3_kinds","v3_table","v3_dyn","v3_blank")
print("=== V4 ==="); press("V4 controls")
press("toggle me", 0.5); st("t4_on")
type_ph("number", "42"); st("t4_num")
type_ph("password", "s3cret"); st("t4_pw")
press("show/hide", 0.5); st("t4_pw_show")
press("Pro", 0.5); st("t4_sel")
press("skills", 0.5); st("t4_multi")
type_ph("tag + Enter", "beta"); st("t4_tag_input","t4_tags")
press("add row", 0.5); st("t4_rows")
press("delete thing", 0.5); st("t4_confirm_open")
press("Confirm", 0.5); st("t4_confirmed","t4_confirm_open")
print("=== V5 ==="); press("V5 theme")
press("coral", 0.5); st("accent")
press("persist roundtrip", 1.5); st("persist_roundtrip")
