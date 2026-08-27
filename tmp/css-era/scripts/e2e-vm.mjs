#!/usr/bin/env node
// e2e-vm.mjs — VM desktop track regression gate (Plan 007 Phase 5).
//
// Launches `auto run -r vm` (in auto/) with an MCP channel and drives the
// desktop app via the AutoUI MCP JSON-RPC tools, asserting on model state —
// the same channel desktop_mcp.py uses for auto-lang's own examples.
// Requires: daemon on :17701, the auto CLI on PATH.
//
// Usage: node scripts/e2e-vm.mjs
import { spawn } from 'child_process';
import { setTimeout as sleep } from 'timers/promises';

const MCP_PORT = process.env.E2E_VM_PORT || '9321';
const MCP = `http://127.0.0.1:${MCP_PORT}/mcp`;
const results = { passed: true };
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
      return j.result?.content?.[0]?.text ?? '';
    } catch { await sleep(1200); }
  }
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

// ── launch ──────────────────────────────────────────────────────────────────
const proc = spawn('auto', ['run', '-r', 'vm'], {
  cwd: new URL('../auto/', import.meta.url),
  env: { ...process.env, AUTOUI_MCP_PORT: MCP_PORT },
  stdio: 'ignore',
  detached: false,
});
process.on('exit', () => { try { proc.kill(); } catch {} });

console.log('=== VM desktop e2e (Plan 007) ===');
if (!(await waitUp())) { console.log('FATAL: vm app / MCP channel never came up'); process.exit(1); }
pass('vm app up, MCP channel ready');

// 1. boot: modules loaded via fire_init
let st = await state('modules', 'expanded');
if (st.modules && st.modules.includes('vmref')) pass(`modules loaded (${(st.modules.match(/vmref/g) || []).length})`);
else fail('modules not loaded');

// 2. sidebar: pick Roles (collection)
if (!(await press('🎭  Roles'))) fail('Roles nav button not found');
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
const inputs = [...snap1.matchAll(/input #(vnode_\d+)/g)].map((m) => m[1]);
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
if (!(await press('🔌  AI Daemon', 4500))) fail('AI Daemon nav not found');
if (!(await press('Test connection', 7000))) fail('Test connection button not found');
st = await state('status');
if (st.status === '"ok"') pass('Test connection → ok');
else fail(`test connection: ${st.status}`);

// 8. theme
if (!(await press('Coral', 1500))) fail('Coral swatch not found');
st = await state('current');
if (st.current === '"coral"') pass('accent switch → coral');
else fail(`accent: ${st.current}`);

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
