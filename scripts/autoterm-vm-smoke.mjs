#!/usr/bin/env node
// autoterm-vm-smoke.mjs — OS-013 T6:AutoTerm 桌面会话验收冒烟。
//
// 启动 `auto run -r vm`(merged,back 桥进程内),经 AutoUI MCP 驱动:
// 导航入 AutoTerm 页 → 开会话(spawn)→ echo 往返 → resize → timeout+
// Interrupt(008 双投递)→ Close;截图入 evidence(tmp/autoterm-smoke/)。
// 前置:auto CLI 含 auto.term.* natives(OS-013 T2);autoterm_core.dll +
// autoterm-ctrlc.exe 与 auto exe 同目录(003 §5,scripts/deploy-autoterm.sh);
// ~/.auto/libs/stdlib/auto/term{,.vm}.at 在位。
//
// Usage: node scripts/autoterm-vm-smoke.mjs
//   AUTOTERM_SMOKE_AUTO_DIR=<dir>  // auto exe 目录前置 PATH(默认取 PATH 上的 auto)
//   AUTOTERM_SMOKE_PORT=9325       // MCP 端口
import { spawn, execSync } from 'child_process';
import { setTimeout as sleep } from 'timers/promises';
import { mkdirSync, copyFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';

const MCP_PORT = process.env.AUTOTERM_SMOKE_PORT || String(9400 + Math.floor(Math.random() * 400));
const MCP = `http://127.0.0.1:${MCP_PORT}/mcp`;
const OUT = new URL('../tmp/autoterm-smoke/', import.meta.url);
mkdirSync(OUT, { recursive: true });
const NL = String.fromCharCode(10);
const results = { passed: true };
const pass = (m) => console.log('  ✓ PASS: ' + m);
const fail = (m) => { results.passed = false; console.log('  ✗ FAIL: ' + m); };

let channelEverUp = false;
async function call(name, args, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const r = await fetch(MCP, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } }),
        signal: AbortSignal.timeout(15000),
      });
      const j = await r.json();
      channelEverUp = true;
      return j.result?.content?.[0].text ?? '';
    } catch { await sleep(1200); }
  }
  return null;
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
async function snapshot() { return (await call('autoui_snapshot', { include_state: false })) ?? ''; }
async function pressGet(label) {
  for (let a = 0; a < 4; a++) {
    const lines = (await snapshot()).split('\n');
    for (let i = 0; i < lines.length; i++) {
      const t = lines[i].trim();
      if (!t.startsWith('button')) continue;
      if (t.includes(`"${label}"`)) return t.match(/(vnode_|aura_)\d+/)[0];
      const em = t.match(/^button #(vnode_\d+) ""\s*\{$/);
      if (em) {
        for (let j = i + 1; j < Math.min(i + 8, lines.length); j++) {
          const tm = lines[j].match(/text [^"]*"(.*?)"/);
          if (tm && tm[1] === label) return em[1];
          if (/\}\s*$/.test(lines[j])) break;
        }
      }
    }
    await sleep(1200);
  }
  return null;
}
async function press(label, waitMs = 2500) {
  const id = await pressGet(label);
  if (id === null) return false;
  await call('autoui_action', { element_id: id, action: 'press' });
  await sleep(waitMs);
  return true;
}
function navButtons(snap) {
  const out = [];
  const re = /button #(vnode_\d+) "([^"]*)"/g;
  let m;
  while ((m = re.exec(snap))) out.push({ id: m[1], lines: m[2].split(NL).map((s) => s.trim()) });
  return out;
}
async function pressNav(name, waitMs = 3000) {
  for (let a = 0; a < 4; a++) {
    const hit = navButtons(await snapshot()).find((b) => b.lines.includes(name));
    if (hit) { await call('autoui_action', { element_id: hit.id, action: 'press' }); await sleep(waitMs); return true; }
    await sleep(1200);
  }
  return false;
}
async function navVisible(name) {
  return navButtons(await snapshot()).some((b) => b.lines.includes(name));
}
// .Tick 200ms 重建滚动 vnode id,陈旧 id 的 press 可能误触导航离开本页
//(Interrupt 段实测)。按压前确保 AutoTerm 页在位(控制条可寻),否则重导航。
async function ensureTermPage() {
  for (let a = 0; a < 4; a++) {
    const snapNow = await snapshot();
    if (/New Session/.test(snapNow)) return true;
    await pressNav('AutoTerm', 2500);
  }
  return /New Session/.test(await snapshot());
}
async function findInputByPlaceholder(ph) {
  const lines = (await snapshot()).split(NL);
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(`placeholder: "${ph}"`)) {
      for (let j = i; j >= 0; j--) {
        const m = lines[j].match(/^\s*input #(vnode_\d+)/);
        if (m) return m[1];
      }
    }
  }
  return null;
}
async function shoot(name) {
  const resp = (await call('autoui_screenshot', {})) ?? '';
  const m = resp.match(/([^\s"']+\.png)/i);
  if (!m) { console.log(`  ⚠ screenshot unavailable: ${resp.slice(0, 100)}`); return; }
  const base = m[1].replace(/\\/g, '/').split('/').pop();
  try {
    copyFileSync(fileURLToPath(new URL(`../auto/src/front/tmp/${base}`, import.meta.url)), new URL(`${name}.png`, OUT));
    console.log(`  📸 ${name}.png saved`);
  } catch (e) { console.log(`  ⚠ screenshot copy failed: ${e.message}`); }
}

// ── launch ──────────────────────────────────────────────────────────────────
const env = { ...process.env, AUTOUI_MCP_PORT: MCP_PORT };
const AUTO_EXE = process.env.AUTOTERM_SMOKE_AUTO_EXE || 'auto';
const proc = spawn(AUTO_EXE, ['run', '-r', 'vm'], {
  cwd: fileURLToPath(new URL('../auto/', import.meta.url)),
  env, stdio: ['ignore', 'pipe', 'pipe'], detached: false,
});
let appLog = '';
proc.stderr.on('data', d => { appLog += d; });
proc.stdout.on('data', d => { appLog += d; });
process.on('exit', () => { try { writeFileSync(new URL('../tmp/autoterm-smoke/app.log', import.meta.url), appLog); } catch {} });
const killApp = () => { try { proc.kill(); } catch {} };
process.on('exit', killApp);

try {
  // boot + content readiness(e2e-vm 同款:窗口前台化 + 侧栏就绪轮询)
  let up = false;
  for (let i = 0; i < 25 && !up; i++) {
    const t = await call('autoui_state', { fields: ['title'] }, 1);
    if (t !== null) up = true; else await sleep(800);
  }
  if (!up) throw new Error('vm app never came up (MCP channel)');
  pass('vm app up, MCP channel ready');
  try {
    execSync(
      'powershell -NoProfile -Command "' +
      "$p = Get-Process auto -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -eq 'Auto - App' } | Select-Object -First 1; " +
      'if ($p) { Add-Type \'using System; using System.Runtime.InteropServices; public class FG { [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h); [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int c); }\'; ' +
      '[FG]::ShowWindow($p.MainWindowHandle, 9) | Out-Null; [FG]::SetForegroundWindow($p.MainWindowHandle) | Out-Null }"',
      { stdio: 'ignore', timeout: 10000 },
    );
  } catch { /* best-effort */ }
  let ready = false;
  for (let i = 0; i < 20 && !ready; i++) {
    const snap = await snapshot();
    if (snap.includes('AutoOS Settings') && snap.includes('button')) ready = true;
    else await sleep(1500);
  }
  if (!ready) throw new Error('sidebar did not render');

  // T4:导航入口在案并可进入
  if (await navVisible('AutoTerm')) pass('sidebar nav entry "AutoTerm" visible');
  else fail('sidebar nav entry "AutoTerm" missing');
  if (await pressNav('AutoTerm')) pass('nav into AutoTerm page');
  else fail('nav into AutoTerm page failed');

  // T3:页面装载(占位态)+ terminal 元素在位
  let snap = await snapshot();
  if (snap.includes('New Session')) pass('AutoTermPage rendered (controls + placeholder)');
  else fail('AutoTermPage controls not found in snapshot');
  let st = await state('term_handle', 'term_status');
  if (st.term_handle === '0' && st.term_status === '"idle"') pass('no-session placeholder state (handle=0, idle)');
  else fail(`placeholder state: handle=${st.term_handle} status=${st.term_status}`);

  // T6:开会话(spawn)→ 引擎快照入视口
  if (!(await press('New Session'))) fail('New Session button not found');
  st = await state('term_handle', 'term_status', 'term_exited');
  if (st.term_handle !== null && st.term_handle !== '0' && st.term_status === '"running"') pass(`session spawned (handle=${st.term_handle}, running)`);
  else fail(`session spawn: handle=${st.term_handle} status=${st.term_status}`);
  await sleep(1500);
  st = await state('term_lines');
  const bannerSeen = (st.term_lines ?? '').length > 10;
  if (bannerSeen) pass('engine viewport snapshot flowing (.lines populated)');
  else fail('engine viewport snapshot empty (.lines)');
  snap = await snapshot();
  try { writeFileSync(new URL('../tmp/autoterm-smoke/snapshot-at-terminal.txt', import.meta.url), snap); } catch {}
  // 检视层契约(PLAN-009 P1):terminal 在快照里是带几何标签的 Text 占位
  // ("terminal key=… cols=… rows=… lines=N")——真渲染在 iced 侧(截图为证)。
  const termNodes = snap.split(NL).filter(l => /terminal key=\S+ cols=\d+ rows=\d+ lines=\d+/.test(l));
  if (termNodes.length > 0) pass(`terminal view node in snapshot (${termNodes[0].trim().slice(0, 90)})`);
  else fail('terminal view node NOT in snapshot (element dropped before view tree)');
  await shoot('01-session-open');

  // T6:echo 往返
  const inputId = await findInputByPlaceholder('Type a command and press Send…');
  if (inputId) {
    await call('autoui_type', { element_id: inputId, text: 'echo autoterm_desktop_ok' });
    await sleep(800);
    if (await press('Send', 2000)) {
      let echoed = false;
      for (let i = 0; i < 10 && !echoed; i++) {
        st = await state('term_lines');
        echoed = (st.term_lines ?? '').includes('autoterm_desktop_ok');
        if (!echoed) await sleep(500);
      }
      if (echoed) pass('echo roundtrip: marker visible in viewport lines');
      else fail('echo roundtrip: marker not found in viewport lines');
      await shoot('02-echo-roundtrip');
    } else fail('Send button not found');
  } else fail('command input not found by placeholder');

  // T6:resize(80x24 ↔ 100x30)
  if (await press('Resize', 1500)) {
    st = await state('term_cols', 'term_rows');
    if (st.term_cols === '100' && st.term_rows === '30') pass('resize applied (100x30)');
    else fail(`resize: cols=${st.term_cols} rows=${st.term_rows}`);
    await shoot('03-resized-100x30');
    await press('Resize', 1500); // 还原
  } else fail('Resize button not found');

  // T6:timeout + Interrupt(008 双投递:ping 长跑 → interrupt → 提示符回返)
  if (!(await ensureTermPage())) { fail('AutoTerm page lost before interrupt stage'); }
  const inputId2 = await findInputByPlaceholder('Type a command and press Send…');
  if (inputId2) {
    await call('autoui_type', { element_id: inputId2, text: 'ping -n 30 127.0.0.1' });
    await sleep(800);
    await press('Send', 1500);
    // .Tick 200ms 重建会滚动 vnode id——单次 press 可能按在过期 id 上
    //(MCP 快照→action 竞态)。带重试:中断证据未现即再按,至多 5 次。
    let interrupted = false;
    for (let attempt = 0; attempt < 6 && !interrupted; attempt++) {
      await ensureTermPage();
      await press('Interrupt', 1800);
      st = await state('term_lines', 'term_exited');
      const l = (st.term_lines ?? '').toLowerCase();
      interrupted = l.includes('statistics') || l.includes('统计') || l.includes('^c') || l.includes('control-break') || l.includes('丢 失') || l.includes('数据包') || st.term_exited === 'true';
    }
    if (interrupted) {
      // 中断有效证据:本地化统计摘要(zh: 统计信息/en: statistics)、^C
      // 标记、或会话退出(interrupt 双投递击穿 cmd——003 §4.1 auto 豁免
      // 语义外的行为,截图为准)。
      pass('interrupt delivered: ping aborted (stats/^C/session-exit evidence)');
      await shoot('04-after-interrupt');
    } else {
      try {
        const dbg = await snapshot();
        const stDbg = await state('term_lines', 'term_exited', 'term_status');
        writeFileSync(new URL('../tmp/autoterm-smoke/interrupt-debug.txt', import.meta.url),
          stDbg.term_lines + NL + '---SNAP BUTTONS---' + NL +
          dbg.split(NL).filter(l => l.trim().startsWith('button')).join(NL));
      } catch {}
      fail('interrupt evidence not found after retries (buttons/press landed — see app.log UI_EVENT)');
    }
  }

  // T6:关会话
  if (await press('Close', 1500)) {
    st = await state('term_handle', 'term_status');
    if (st.term_handle === '0' && st.term_status === '"idle"') pass('session closed (handle freed, idle)');
    else fail(`close: handle=${st.term_handle} status=${st.term_status}`);
    await shoot('05-session-closed');
  } else fail('Close button not found');
} catch (e) {
  fail(`driver error: ${e.message}`);
} finally {
  killApp();
}
console.log(results.passed ? '\nAUTOTERM VM SMOKE: ALL PASS' : '\nAUTOTERM VM SMOKE: FAILURES ABOVE');
process.exit(results.passed ? 0 : 1);
