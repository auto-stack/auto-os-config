#!/usr/bin/env node
// poc-t1-verify.mjs — Plan 011 T1 POC 三路径验证器(vm merged 轨)。
//
// 在 examples/poc-hello 启动 `auto run -r vm`(MCP 通道),读取 App 模型的
// hello_val / probe_val,断言与外部 back 的契约值一致:
//   hello_val  == "poc-hello"
//   probe_val  == "ai-daemon.at:ok"(~/.config/autoos/ai-daemon.at 可读)
//
// 形态开关(AUTOOS_BACK_BRIDGE,传给被拉起的 vm 进程):
//   =0 → 形态 a:cdylib 空注册,#[api] 函数体由 VM 解释(零 HTTP 零桥)
//   ≠0 → 形态 b:cdylib 注册宿主桥,#[api] 裸调用改写 auto.host.call
//
// 用法: node scripts/poc-t1-verify.mjs   (需先 cargo build auto-os-config-back)
import { spawn } from 'child_process';
import { setTimeout as sleep } from 'timers/promises';

const MCP_PORT = process.env.POC_MCP_PORT || '9331';
const MCP = `http://127.0.0.1:${MCP_PORT}/mcp`;
const BRIDGE = process.env.AUTOOS_BACK_BRIDGE ?? '1';
const LABEL = BRIDGE === '0' ? '形态a(#[api] 解释,空注册)' : '形态b(宿主桥 Rust 实现)';
const ATTEMPTS = 3;

let channelEverUp = false;

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
  return null;
}

async function waitUp(tries = 30) {
  for (let i = 0; i < tries; i++) {
    const t = await call('autoui_state', { fields: ['title'] }, 1);
    if (t !== null) return true;
    await sleep(800);
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

function killApp(proc) { if (proc) { try { proc.kill(); } catch {} } }

let pass = false, lastErr = '';
for (let attempt = 1; attempt <= ATTEMPTS && !pass; attempt++) {
  console.log(`[poc-t1] ${LABEL} — attempt ${attempt}/${ATTEMPTS}`);
  channelEverUp = false;
  const proc = spawn('auto', ['run', '-r', 'vm'], {
    cwd: new URL('../examples/poc-hello/', import.meta.url),
    env: { ...process.env, AUTOUI_MCP_PORT: MCP_PORT },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let bootLog = '';
  proc.stdout.on('data', (d) => { bootLog += d; });
  proc.stderr.on('data', (d) => { bootLog += d; });

  const up = await waitUp();
  // 装载证据:auto run 编排层打印 external backend linked/loaded,
  // cdylib 注册打印 auto-os-config-back: registering(形态b)。
  const proof = bootLog.split('\n').filter((l) => /external backend|auto-os-config-back/.test(l)).join(' | ');
  console.log(`[poc-t1] boot proof: ${proof || '(no backend lines captured)'}`);
  if (!up) {
    lastErr = 'MCP channel never came up. Boot log:\n' + bootLog.slice(-2500);
    killApp(proc); await sleep(800);
    continue;
  }
  await sleep(1500); // Init 落模型
  const st = await state('hello_val', 'probe_val');
  console.log(`[poc-t1] state: ${JSON.stringify(st)}`);
  // autoui_state 对 str 值按 JSON 引号显示(e2e-vm 同口径:st.status === '"ok"')
  const okHello = st.hello_val === '"poc-hello"';
  const okProbe = st.probe_val === '"ai-daemon.at:ok"';
  if (okHello && okProbe) {
    pass = true;
  } else {
    lastErr = `hello_val=${st.hello_val} probe_val=${st.probe_val}`;
  }
  killApp(proc);
  await sleep(800);
}

console.log(pass
  ? `[poc-t1] PASS — ${LABEL}: hello_val="poc-hello", probe_val="ai-daemon.at:ok"`
  : `[poc-t1] FAIL — ${LABEL}: ${lastErr}`);process.exit(pass ? 0 : 1);
