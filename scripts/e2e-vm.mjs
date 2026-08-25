#!/usr/bin/env node
// e2e-vm.mjs — VM desktop track regression gate (Plan 007 Phase 5; hardened
// Plan 008 Phase 0).
//
// Launches `auto run -r vm` (in auto/) with an MCP channel and drives the
// desktop app via the AutoUI MCP JSON-RPC tools, asserting on model state —
// the same channel desktop_mcp.py uses for auto-lang's own examples.
// Requires: daemon on :17701, the auto CLI on PATH.
//
// KNOWN INFRA FLAKE (Plan 008 Phase 0, upstream auto-lang gap): the vm
// process hard-crashes (exit 0xFFFFFFFF, no stderr) within ~30s under MCP
// polling — reproducible on an idle app (tmp/probe-mcp-health.mjs), i.e.
// unrelated to this repo's code. The gate therefore self-heals: a mid-run
// channel death (app was up, then died) reboots and reruns, up to 3 attempts.
// Real assertion failures and boot failures are NOT retried.
//
// Usage: node scripts/e2e-vm.mjs
import { spawn, execSync } from 'child_process';
import { setTimeout as sleep } from 'timers/promises';

const MCP_PORT = process.env.E2E_VM_PORT || '9321';
const MCP = `http://127.0.0.1:${MCP_PORT}/mcp`;
const results = { passed: true };
let channelDead = false; // set when a call exhausts retries AFTER the channel was proven up
let channelEverUp = false; // boot-phase failures (port not bound yet) are NOT deaths
const pass = (m) => console.log('  ✓ PASS: ' + m);
const fail = (m) => { results.passed = false; console.log('  ✗ FAIL: ' + m); };

async function call(name, args, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const r = await fetch(MCP, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } }),
        signal: AbortSignal.timeout(15000),
      });
      const j = await r.json();
      const t = j.result?.content?.[0]?.text ?? '';
      channelEverUp = true;
      return t;
    } catch { await sleep(1200); }
  }
  // Only a proven-up channel that stops answering counts as a mid-run death
  // (the self-heal trigger). Boot-phase refusals (MCP port not bound yet)
  // must not latch — they previously poisoned every subsequent press/nav.
  if (channelEverUp) channelDead = true;
  return null;
}

async function waitUp(tries = 25) {
  for (let i = 0; i < tries; i++) {
    const t = await call('autoui_state', { fields: ['title'] }, 1);
    if (t !== null) return true;
    await sleep(800);
  }
  return false;
}

async function snapshot() { return (await call('autoui_snapshot', { include_state: false })) ?? ''; }

async function press(label, waitMs = 3000) {
  for (let a = 0; a < 4; a++) {
    if (channelDead) return false;
    const snap = await snapshot();
    for (const line of snap.split('\n')) {
      if (line.includes('button') && line.includes(`"${label}"`)) {
        const m = line.match(/(vnode_|aura_)\d+/);
        if (m) { await call('autoui_action', { element_id: m[0], action: 'press' }); await sleep(waitMs); return true; }
      }
    }
    await sleep(1200);
  }
  return false;
}

// Nav buttons carry icon/name/description as separate text children, so the
// vm snapshot shows their label as a multiline string — match the exact-name
// text child, then walk back to the enclosing button (Plan 008 batch 1).
async function pressNav(name, waitMs = 3000) {
  for (let a = 0; a < 4; a++) {
    if (channelDead) return false;
    const lines = (await snapshot()).split('\n');
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(/text #(vnode_\d+) "(.+)"$/);
      if (m && m[2] === name) {
        for (let j = i - 1; j >= 0; j--) {
          const b = lines[j].match(/button #(vnode_\d+)/);
          if (b) { await call('autoui_action', { element_id: b[1], action: 'press' }); await sleep(waitMs); return true; }
        }
      }
    }
    await sleep(1200);
  }
  return false;
}

async function state(...fields) {
  const t = await call('autoui_state', { fields });
  const out = {};
  if (!t) { for (const f of fields) out[f] = null; return out; }
  for (const line of t.split('\n')) {
    const m = line.match(/^\s*([A-Za-z_0-9]+): (.*) \((str|int|bool|list|val)\)\s*$/);
    if (m) out[m[1]] = m[2];
  }
  for (const f of fields) if (!(f in out)) out[f] = null;
  return out;
}

// ── one full attempt ────────────────────────────────────────────────────────
let proc = null;
function killApp() { if (proc) { try { proc.kill(); } catch {} proc = null; } }

async function runAttempt() {
  channelDead = false;
  proc = spawn('auto', ['run', '-r', 'vm'], {
    cwd: new URL('../auto/', import.meta.url),
    env: { ...process.env, AUTOUI_MCP_PORT: MCP_PORT },
    stdio: 'ignore',
    detached: false,
  });
  let exitedWith = null;
  proc.on('exit', (c) => { exitedWith = c; });

  if (!(await waitUp())) {
    // Boot failure: real regression (app up but MCP broken) unless the
    // process already hard-crashed (the known infra flake) — only then retry.
    const infraCrash = exitedWith !== null;
    killApp();
    return { crashed: infraCrash, ran: false, bootFailed: !infraCrash };
  }
  pass('vm app up, MCP channel ready');
  // iced defers lazy child-widget builds to the first RENDER pass — a
  // minimized/occluded window never renders, so the sidebar subtree stays an
  // unbuilt reference in snapshots forever. Restore + foreground the window
  // (best-effort; desktop-dependent).
  try {
    execSync(
      'powershell -NoProfile -Command "' +
      "$p = Get-Process auto -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -eq 'Auto - App' } | Select-Object -First 1; " +
      'if ($p) { Add-Type \'using System; using System.Runtime.InteropServices; public class FG { [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h); [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int c); }\'; ' +
      '[FG]::ShowWindow($p.MainWindowHandle, 9) | Out-Null; [FG]::SetForegroundWindow($p.MainWindowHandle) | Out-Null }"',
      { stdio: 'ignore', timeout: 10000 },
    );
  } catch { /* best-effort */ }
  // Content-readiness wait: MCP state sync answers BEFORE the UI tree is
  // fully built (the first frame runs the modules-store projection + child
  // widget builds), and snapshotting that window returns a partial tree —
  // or trips the upstream early-poll crash (Phase 0 gap). Poll until the
  // sidebar actually rendered.
  let ready = false;
  for (let i = 0; i < 20 && !ready && !channelDead; i++) {
    const snap = await call('autoui_snapshot', { include_state: false }, 1);
    if (snap && snap.includes('AutoOS Settings') && snap.includes('button')) ready = true;
    else await sleep(1500);
  }
  if (!ready) fail('sidebar did not render (content-readiness timeout)');

  // 1. boot: modules loaded via fire_init
  let st = await state('modules', 'expanded');
  if (st.modules && st.modules.includes('vmref')) pass(`modules loaded (${(st.modules.match(/vmref/g) || []).length})`);
  else fail('modules not loaded');

  // 2. sidebar: pick Roles (collection)
  if (!(await pressNav('Roles'))) fail('Roles nav button not found');
  st = await state('active_kind', 'active_id');
  if (st.active_kind === '"collection"' && st.active_id === '"roles"') pass('Roles selected (kind=collection)');
  else fail(`Roles selection: kind=${st.active_kind} id=${st.active_id}`);

  // 3. collection: Load → names
  if (!(await press('Load', 5000))) fail('Load button not found');
  st = await state('names');
  if (st.names && st.names.includes('assistant')) pass('collection list loaded (assistant)');
  else fail(`collection names: ${st.names}`);

  // 4. pick assistant → entries
  if (!(await press('assistant', 5500))) fail('assistant button not found');
  st = await state('selected_name', 'entries');
  if (st.selected_name === '"assistant"' && st.entries?.includes('vmref')) pass('entity selected, entries projected');
  else fail(`entity select: ${st.selected_name} entries=${st.entries}`);

  // 5. edit Description → Apply → dirty
  const snap1 = await snapshot();
  // Detail-field inputs: in the vm snapshot they appear as BARE lines
  // (`input #id`, no attribute block), while the unified sidebar's search
  // box renders WITH a block (style/placeholder/value/oninput) — the block
  // form shifted the old bare index.
  const NL = String.fromCharCode(10);
  const inputs = [];
  for (const l of snap1.split(NL)) {
    const m = l.trim().match(/^input #(vnode_\d+)$/);
    if (m) inputs.push(m[1]);
  }
  const applies = [...snap1.matchAll(/button #(vnode_\d+) "Apply"/g)].map((m) => m[1]);
  if (inputs.length >= 2 && applies.length >= 1) {
    await call('autoui_type', { element_id: inputs[1], text: 'vm e2e edited' });
    await sleep(1000);
    await call('autoui_action', { element_id: applies[0], action: 'press' });
    await sleep(1500);
    st = await state('dirty', 'body_text');
    if (st.dirty === 'true' && st.body_text?.includes('vm e2e edited')) pass('field edit → dirty (body rebuilt)');
    else fail(`edit/dirty: dirty=${st.dirty}`);
    // 6. save → clean
    if (!(await press('Save', 4000))) fail('Save button not found');
    st = await state('dirty');
    if (st.dirty === 'false') pass('save → dirty cleared');
    else fail(`save: dirty=${st.dirty}`);
  } else {
    fail(`detail inputs/applies missing (inputs=${inputs.length} applies=${applies.length})`);
  }

  // 7. daemon: Test connection
  // The provider roundtrip (/api/action/test-daemon with use_default) is a
  // real network call — observed 1.3s–5.4s with occasional longer stalls, and
  // vm http blocks the interpreter while it runs (so MCP polls can starve
  // too). Poll the status for up to ~30s instead of asserting after one
  // fixed sleep.
  if (!(await pressNav('AI Daemon', 4500))) fail('AI Daemon nav not found');
  if (!(await press('Test connection', 2000))) fail('Test connection button not found');
  for (let i = 0; i < 15 && (!st.status || st.status === '"idle"' || st.status === '""'); i++) {
    st = await state('status');
    if (!st.status || st.status === '"idle"' || st.status === '""') await sleep(2000);
  }
  if (st.status === '"ok"') pass('Test connection → ok');
  else fail(`test connection: ${st.status}`);

  // 8. theme
  if (!(await press('Coral', 1500))) fail('Coral swatch not found');
  st = await state('current');
  if (st.current === '"coral"') pass('accent switch → coral');
  else fail(`accent: ${st.current}`);

  const crashed = channelDead;
  killApp();
  return { crashed, ran: true };
}

// ── main: self-healing loop ─────────────────────────────────────────────────
console.log('=== VM desktop e2e (Plan 007/008) ===');
let attempt = 0;
let last = null;
while (attempt < 3) {
  attempt++;
  if (attempt > 1) {
    console.log(`[e2e-vm] attempt ${attempt - 1} hit the known infra crash (channel died) — rebooting app`);
    results.passed = true; // verdict comes from the attempt that runs to completion
  }
  last = await runAttempt();
  if (!last.crashed) break;
  await sleep(2000);
}
if (!last || (last.crashed && attempt >= 3)) {
  console.log('FATAL: vm app / MCP channel never came up (3 crashes in a row)');
  process.exit(1);
}
if (last.bootFailed) { console.log('FATAL: vm app booted but MCP channel never came up'); process.exit(1); }
process.on('exit', () => killApp());

// restore the fixture description over HTTP (leave no e2e residue)
try {
  const cur = await (await fetch('http://127.0.0.1:17701/api/collection/roles/assistant')).json();
  if (cur.value?.description === 'vm e2e edited') {
    cur.value.description = 'Conversational entry point — overridden to use local Ollama';
    await fetch('http://127.0.0.1:17701/api/collection/roles/assistant', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: cur.value, sidecar: cur.sidecar || '' }),
    });
  }
} catch { /* best-effort */ }

console.log(results.passed ? '=== VM E2E PASSED ===' : '=== VM E2E FAILED ===');
process.exit(results.passed ? 0 : 1);
