// tmp/probe-mcp-health.mjs — Phase 0: is the vm MCP wedge a deadlock (process
// alive, calls time out) or a crash (process gone)? Boots an app, polls
// snapshot+state every 500ms, reports time-of-death and process state.
import { spawn, execSync } from 'child_process';
import { setTimeout as sleep } from 'timers/promises';

const PORT = process.argv[2] || '9330';
const CADENCE = Number(process.argv[3] || '500');
const MCP = `http://127.0.0.1:${PORT}/mcp`;

const proc = spawn('auto', ['run', '-r', 'vm'], {
  cwd: new URL('../auto/', import.meta.url),
  env: { ...process.env, AUTOUI_MCP_PORT: PORT },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let out = '';
proc.stdout.on('data', (d) => (out += d));
proc.stderr.on('data', (d) => (out += d));
process.on('exit', () => { try { proc.kill(); } catch {} });

async function call(name, args) {
  try {
    const r = await fetch(MCP, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } }),
      signal: AbortSignal.timeout(3000),
    });
    return (await r.json()).result?.content?.[0]?.text ?? '';
  } catch { return null; }
}

// wait for boot
let up = false;
for (let i = 0; i < 25; i++) { if (await call('autoui_state', { fields: ['title'] }) !== null) { up = true; break; } await sleep(500); }
if (!up) { console.log('NEVER UP'); proc.kill(); process.exit(1); }
console.log(`up at ${new Date().toISOString().slice(11, 19)}`);

let dead = false;
const ITERS = Math.round(60000 / CADENCE);
for (let i = 0; i < ITERS && !dead; i++) {
  const snap = await call('autoui_snapshot', { include_state: false });
  const st = await call('autoui_state', { fields: ['title'] });
  if (snap === null && st === null) {
    dead = true;
    console.log(`CHANNEL DEAD at iter ${i} (${((i + 1) * CADENCE / 1000).toFixed(1)}s after up)`);
    break;
  }
  if (i % 20 === 0) console.log(`iter ${i}: snap=${snap === null ? 'null' : snap.length + 'ch'} state=${st === null ? 'null' : 'ok'}`);
  await sleep(CADENCE);
}
if (!dead) { console.log('SURVIVED 60s'); proc.kill(); process.exit(0); }

// dead — check process & port state
await sleep(1500);
const alive = proc.exitCode === null;
let listening = '';
try { listening = execSync(`netstat -ano | findstr :${PORT} | findstr LISTENING`).toString().trim().slice(0, 80); } catch { listening = '(no listener)'; }
console.log(`proc alive: ${alive} (exitCode=${proc.exitCode})`);
console.log(`port: ${listening}`);
console.log(`stdout tail: ${JSON.stringify(out.slice(-400))}`);
proc.kill();
process.exit(0);
