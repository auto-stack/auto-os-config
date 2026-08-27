// scripts/track-parity/capture.mjs — 双轨一致性截图捕获（plan010 T5）。
//
// 用法:
//   node scripts/track-parity/capture.mjs --track vue --base http://localhost:17700
//   node scripts/track-parity/capture.mjs --track vm
// 产物: tmp/track-parity/<track>/<NN-name>.png（PNG 不入库，见 0146dcf 惯例）
//
// vue 轨: Playwright,同视口(1440x900@1x)/同 accent(indigo)/禁过渡动画,
//         等字体就绪后截图——纪律沿 tmp/parity/capture.mjs（plan009 阶段一）。
// vm 轨: `auto run -r vm` + MCP autoui_screenshot。U1 缺陷(plan010 台账)约束下
//         每个 view 用独立 app 实例捕获（boot → 单次导航 → 截图 → 重启）。
import { chromium } from 'playwright';
import { spawn } from 'child_process';
import { mkdirSync, copyFileSync, readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { setTimeout as sleep } from 'timers/promises';
import { PNG } from 'pngjs';

const args = process.argv.slice(2);
const track = (args.includes('--track') && args[args.indexOf('--track') + 1]) || 'vue';
const base = (args.includes('--base') && args[args.indexOf('--base') + 1]) || 'http://localhost:17700';
// vm 桌面窗口逻辑尺寸：目标对齐 vue 视口；实测屏随后按显示倍率重采样回 1440x900
const VM_WINDOW = '720x450'; // x2 scale → 1440x900 物理像素
const TARGET_W = 1440, TARGET_H = 900;
const OUT = fileURLToPath(new URL(`../../tmp/track-parity/${track}/`, import.meta.url));
mkdirSync(OUT, { recursive: true });

function normalizeSize(file) {
  const img = PNG.sync.read(readFileSync(`${OUT}${file}.png`));
  if (img.width === TARGET_W && img.height === TARGET_H) return `${img.width}x${img.height}`;
  const out = new PNG({ width: TARGET_W, height: TARGET_H });
  for (let y = 0; y < TARGET_H; y++) {
    const sy = Math.min(img.height - 1, Math.round((y / TARGET_H) * img.height));
    for (let x = 0; x < TARGET_W; x++) {
      const sx = Math.min(img.width - 1, Math.round((x / TARGET_W) * img.width));
      const si = (sy * img.width + sx) * 4, di = (y * TARGET_W + x) * 4;
      out.data[di] = img.data[si]; out.data[di + 1] = img.data[si + 1];
      out.data[di + 2] = img.data[si + 2]; out.data[di + 3] = img.data[si + 3];
    }
  }
  writeFileSync(`${OUT}${file}.png`, PNG.sync.write(out));
  return `${img.width}x${img.height}→${TARGET_W}x${TARGET_H}`;
}

const VIEWS = [
  ['AI Daemon', '01-ai-daemon'],
  ['Auto Musk', '02-auto-musk'],
  ['Roles', '03-roles'],
  ['Skills', '04-skills'],
  ['AI Client', '05-ai-client'],
  ['Modes', '06-modes'],
  ['Harness Roles', '07-harness-roles'],
];

if (track === 'vue') {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await context.addInitScript(() => { try { localStorage.setItem('autoos-accent-color', 'indigo'); } catch {} });
  const page = await context.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.addStyleTag({ content: `*,*::before,*::after{transition:none!important;animation:none!important;caret-color:transparent!important;scroll-behavior:auto!important}` });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1500);
  const shot = async (name) => { await page.screenshot({ path: `${OUT}${name}.png` }); console.log('saved', `${track}/${name}.png`); };
  await shot('00-sidebar-default');
  for (const [name, file] of VIEWS) {
    const nav = page.locator('.nav-item .nav-name', { hasText: new RegExp(`^${name}$`) }).locator('..');
    if (!(await nav.count())) { console.log('MISSING in sidebar:', name); continue; }
    await nav.click();
    await page.waitForTimeout(600);
    const load = page.locator('.config-editor button:has-text("Load"), .collection button:has-text("Load")');
    if (await load.count()) await load.first().click();
    // 集合页选中首个实体，保证详情区入画（与 css-era 对拍口径一致）
    const row = page.locator('.e-row');
    if (await row.count()) await row.first().click();
    await page.waitForTimeout(1200);
    await shot(file);
  }
  await browser.close();
} else {
  // vm 轨：每视图独立实例（详见文件头 U1 注）
  // accent 基线预置：vm 读 autoos-ui.json（无 localStorage），强制与 vue 对拍口径一致
  {
    const { homedir } = await import('os');
    const stFile = `${homedir()}/AppData/Roaming/autoos-ui.json`;
    try { writeFileSync(stFile, '{"accent":"indigo"}'); } catch {}
  }
  const MCP_PORT = process.env.E2E_VM_PORT || '9450';
  const MCP = `http://127.0.0.1:${MCP_PORT}/mcp`;

  async function withApp(fn) {
    // 清场：同端口僵尸实例会让后续 boot 全部落到旧画面上（U1/U3 假象放大器）
    try { execSync('taskkill /IM auto.exe /F', { stdio: 'ignore' }); await sleep(800); } catch {}
    const proc = spawn('auto', ['run', '-r', 'vm'], {
      cwd: new URL('../../auto/', import.meta.url),
      env: { ...process.env, AUTOUI_MCP_PORT: String(MCP_PORT), AUTO_VM_WINDOW: VM_WINDOW },
      stdio: 'ignore',
    });
    try {
      let up = false;
      for (let i = 0; i < 30 && !up; i++) {
        up = ((await call('autoui_state', { fields: ['title'] })) ?? '').includes('AutoOS Settings');
        if (!up) await sleep(1000);
      }
      if (!up) throw new Error('vm app never came up');
      await sleep(2000); // 内容树构建窗口
      return await fn();
    } finally {
      try { proc.kill(); } catch {}
    }
  }
  async function call(n, a) {
    try {
      const r = await fetch(MCP, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: n, arguments: a } }),
        signal: AbortSignal.timeout(20000) });
      return (await r.json()).result?.content?.[0]?.text ?? '';
    } catch { return null; }
  }

  async function shoot(file) {
    const resp = (await call('autoui_screenshot', {})) ?? '';
    const m = resp.match(/([^\s"']+\.png)/i);
    if (!m) { console.log(`SCREENSHOT FAIL for ${file}: ${resp.slice(0, 120)}`); return; }
    // 工具把 PNG 写在 app cwd 的 tmp/（= auto/src/front/tmp/）——按 basename 取
    const base2 = m[1].replace(/\\/g, '/').split('/').pop();
    copyFileSync(fileURLToPath(new URL(`../../auto/src/front/tmp/${base2}`, import.meta.url)), `${OUT}${file}.png`);
    console.log('saved', `${track}/${file}.png`, `(${normalizeSize(file)})`);
  }
  async function pressNav(target, fields) {
    // 祖先链逐个试按，active_id 到位即止（walk2.mjs 同款）
    const ls = (await call('autoui_snapshot', { include_state: false }) ?? '').split('\n');
    const tx = ls.findIndex((l) => { const m = l.trim().match(/^text [^"]*"(.*?)"$/); return m && m[1] === target; });
    if (tx < 0) return false;
    const cand = [];
    for (let j = tx - 1; j >= 0 && cand.length < 16; j--) {
      const m = ls[j].trim().match(/^(button|container|col|row) #(vnode_\d+)/);
      if (m) cand.push(m[2]);
    }
    for (const id of cand) {
      await call('autoui_action', { element_id: id, action: 'press' });
      await sleep(2500);
      if (!fields) return true;
      const stv = await call('autoui_state', { fields: ['active_id'] });
      if (String(stv).includes(`"${fields}"`)) return true;
    }
    return false;
  }
  async function pressLabel(label) {
    const ls = ((await call('autoui_snapshot', { include_state: false })) ?? '').split('\n');
    for (let i = 0; i < ls.length; i++) {
      const t = ls[i].trim();
      if (!t.startsWith('button')) continue;
      if (t.includes(`"${label}"`)) return t.match(/#(vnode_\d+)/)[1];
      const em = t.match(/^button #(vnode_\d+) ""\s*\{$/);
      if (em) for (let j = i + 1; j < Math.min(i + 8, ls.length); j++) {
        const tm = ls[j].match(/text [^"]*"(.*?)"/);
        if (tm && tm[1] === label) return em[1];
        if (/\}\s*$/.test(ls[j])) break;
      }
    }
    return null;
  }

  // 00: 裸侧栏
  await withApp(async () => { await sleep(1000); await shoot('00-sidebar-default'); });

  for (const [name, file] of VIEWS) {
    await withApp(async () => {
      if (!(await pressNav(name, file === '03-roles' ? 'roles' : null))) { console.log('NAV FAIL:', name); return; }
      const loadId = await pressLabel('Load');
      if (loadId) { await call('autoui_action', { element_id: loadId, action: 'press' }); await sleep(4500); }
      // 集合页选中首实体
      if (file === '03-roles') {
        const aid = await pressLabel('assistant');
        if (aid) { await call('autoui_action', { element_id: aid, action: 'press' }); await sleep(4500); }
      }
      await shoot(file);
    });
  }
}
console.log('capture done:', track);
