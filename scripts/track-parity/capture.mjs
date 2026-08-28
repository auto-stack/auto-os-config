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
// vm 桌面窗口逻辑尺寸：须与 vue 视口「逻辑几何」一致（T7 修正——T6 的 720x450
// 只对齐了 PNG 物理尺寸，逻辑几何却是 vue 半幅：侧栏 w-72 占宽 40% vs vue 20%，
// 全部布局比例失配）。1440x900 逻辑 @2x DPI → PNG 物理 2880x1800，
// 由 normalizeSize 重采样回 1440x900（内容坐标系即与 vue 对齐）。
const VM_WINDOW = '1440x900';
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
  // [侧栏显示名, 产物文件名, 模块 id（backend/src/registry.rs 注册表）]
  ['AI Daemon', '01-ai-daemon', 'ai-daemon'],
  ['Auto Musk', '02-auto-musk', 'auto-musk'],
  ['Roles', '03-roles', 'roles'],
  ['Skills', '04-skills', 'skills'],
  ['AI Client', '05-ai-client', 'ai-client'],
  ['Modes', '06-modes', 'modes'],
  ['Harness Roles', '07-harness-roles', 'musk-harness-roles'],
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
const NL = String.fromCharCode(10);
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
  async function pressNav(target, modId) {
    // nav button 在 vm 快照里是 icon+name+desc 的多行合并标签（e2e-vm 同款
    // 解析，009 Phase 4 教训：walk-back 祖先链会被 "Harness Roles" 遮蔽）。
    // 按 button 自身 id 精确试按，active_id 到位才算导航成功——
    // 不验证 active_id 的导航是假阳性（T7 实证：walk-back 版 6 视图全拍成
    // 裸侧栏默认画面）。快照空壳重试：上游快照通道竞态（446 批一 J1 家族）。
    const snapshot = async () => {
      for (let i = 0; i < 10; i++) {
        const s = (await call('autoui_snapshot', { include_state: false })) ?? '';
        if (s.length > 500) return s;
        await sleep(1200);
      }
      return '';
    };
    for (let a = 0; a < 4; a++) {
      const hit = navButtons(await snapshot()).find((b) => b.lines.includes(target));
      if (hit) {
        await call('autoui_action', { element_id: hit.id, action: 'press' });
        await sleep(2500);
        const st = await call('autoui_state', { fields: ['active_id'] });
        if (String(st).includes(`"${modId}"`)) return true;
      }
      await sleep(1200);
    }
    return false;
  }
  async function pressLabel(label) {
    // e2e-vm pressGet 同款：直接头内标签或空 label 头 + 子 text 节点，重试 4 轮
    for (let a = 0; a < 4; a++) {
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
      await sleep(1200);
    }
    return null;
  }
  function navButtons(snap) {
    const out = [];
    const re = /button #(vnode_\d+) "([^"]*)"/g;
    let m;
    while ((m = re.exec(snap))) out.push({ id: m[1], lines: m[2].split(NL).map((s) => s.trim()) });
    return out;
  }

  // 00: 裸侧栏
  await withApp(async () => { await sleep(1000); await shoot('00-sidebar-default'); });

  for (const [name, file, modId] of VIEWS) {
    await withApp(async () => {
      if (!(await pressNav(name, modId))) { console.log('NAV FAIL:', name); return; }
      const loadId = await pressLabel('Load');
      if (loadId) { await call('autoui_action', { element_id: loadId, action: 'press' }); await sleep(4500); }
      else console.log('no Load button:', name);
      // 集合页选中首实体（与 vue capture 口径一致：vue 对 .e-row 点首个；
      // R10 预载后 vm 侧 skills 列表也有数据，详情区入画口径对齐）
      const PICK = { '03-roles': 'assistant', '04-skills': 'brainstorming' };
      if (PICK[file]) {
        const aid = await pressLabel(PICK[file]);
        if (aid) { await call('autoui_action', { element_id: aid, action: 'press' }); await sleep(4500); }
        else console.log('no first-entity button:', PICK[file]);
      }
      await shoot(file);
    });
  }
}
console.log('capture done:', track);
