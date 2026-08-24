#!/usr/bin/env python3
"""Plan 007 Phase 1 probe driver: MCP-drive the probe app and print results."""
import json, re, sys, time, urllib.request

MCP = "http://127.0.0.1:9311/mcp"

def call(name, args):
    req = urllib.request.Request(
        MCP,
        data=json.dumps({"jsonrpc": "2.0", "id": 1, "method": "tools/call",
                         "params": {"name": name, "arguments": args}}).encode(),
        headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=8) as r:
        out = json.loads(r.read())
    return out["result"]["content"][0]["text"]

def snap():
    return call("autoui_snapshot", {"include_state": False})

def find_btn(label):
    for line in snap().splitlines():
        if "button" in line and f'"{label}"' in line:
            m = re.search(r"vnode_\d+", line)
            if m:
                return m.group(0)
    return None

def press(label):
    eid = find_btn(label)
    if not eid:
        return f"BUTTON NOT FOUND: {label}"
    return call("autoui_action", {"element_id": eid, "action": "press"})

def type_into(placeholder, text):
    for line in snap().splitlines():
        if "input" in line and f'"{placeholder}"' in line:
            m = re.search(r"vnode_\d+", line)
            if m:
                return call("autoui_type", {"element_id": m.group(0), "text": text})
    return f"INPUT NOT FOUND: {placeholder}"

def state(*fields):
    return call("autoui_state", {"fields": list(fields)})

def section(name):
    print(f"\n===== {name} =====")

def main():
    section("V1 transport")
    print(press("GO")); time.sleep(0.5)
    print(state("v1_result", "v1_dead", "v1_config", "v1_put"))

    section("V2 store")
    print(press("V2 store")); time.sleep(0.3)
    print(press("GO2")); time.sleep(0.8)
    print(state("v2_dummy"))  # store fields come via .store merge; dump all instead
    print(call("autoui_state", {"fields": ["store_modules_dummy"]}))
    # full state dump is easier
    print(snap()[-800:])

    section("V3 logic")
    print(press("V3 logic")); time.sleep(0.3)
    print(press("GO3")); time.sleep(0.5)
    print(state("v3_kinds", "v3_table", "v3_dyn", "v3_blank"))

    section("V4 controls")
    print(press("V4 controls")); time.sleep(0.3)
    print("checkbox:", press("toggle me")); time.sleep(0.3)
    print(state("t4_on"))
    print("type num:", type_into("number", "42")); time.sleep(0.3)
    print(state("t4_num"))
    print("type pw:", type_into("password", "s3cret")); time.sleep(0.3)
    print(state("t4_pw"))
    print("show/hide:", press("show/hide")); time.sleep(0.2)
    print(state("t4_pw_show"))
    print("select Pro:", press("Pro")); time.sleep(0.2)
    print(state("t4_sel"))
    print("multi skills:", press("skills")); time.sleep(0.2)
    print(state("t4_multi"))
    print("tag input:", type_into("tag + Enter", "beta")); time.sleep(0.2)
    print(state("t4_tag_input", "t4_tags"))
    print("add row:", press("add row")); time.sleep(0.2)
    print(state("t4_rows"))
    print("del:", press("del")); time.sleep(0.2)
    print("confirm open:", press("delete thing")); time.sleep(0.3)
    print("confirm yes:", press("Confirm")); time.sleep(0.2)
    print(state("t4_confirmed", "t4_confirm_open"))

    section("V5 theme/persist")
    print(press("V5 theme")); time.sleep(0.3)
    print("coral:", press("coral")); time.sleep(0.2)
    print(state("accent"))
    print(press("persist roundtrip")); time.sleep(0.5)
    print(state("persist_roundtrip"))

if __name__ == "__main__":
    main()
