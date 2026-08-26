// tmp/stage1-acceptance-sheet.mjs — Plan 009 阶段一验收工件：CSS 手写版
// (tmp/phase1-baseline-old/) vs 当前 Auto/Vue 统一类串版 (screenshots/) 的
// 12 视图并排对比表。左 = CSS 基准，右 = 当前；输出 tmp/stage1-acceptance-sheet.png。
import { chromium } from 'playwright';
import { readFileSync } from 'fs';

const names = [
  '00-sidebar-default', '01-ai-daemon', '02-auto-musk', '03-roles',
  '04-skills', '05-ai-client', '06-modes', '07-harness-roles',
  'screenshot-theme-daemon-coral', 'screenshot-theme-daemon-indigo',
  'screenshot-theme-roles-coral', 'screenshot-theme-roles-ocean',
];
const b64 = (p) => readFileSync(p).toString('base64');
// numbered module shots live in screenshots/, the 4 theme shots (from
// test-theme-switch.mjs) at the repo root
const cur = (n) => (n.startsWith('screenshot-theme-') ? n : `screenshots/${n}`);

const rows = names.map((n) => `
  <section>
    <h2>${n}</h2>
    <div class="pair">
      <figure><figcaption>CSS 手写版（8-25 12:33 基准）</figcaption><img src="data:image/png;base64,${b64(`tmp/phase1-baseline-old/${n}.png`)}"></figure>
      <figure><figcaption>Auto/Vue 统一类串版（当前 HEAD）</figcaption><img src="data:image/png;base64,${b64(`${cur(n)}.png`)}"></figure>
    </div>
  </section>`).join('');

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  body { font-family: Segoe UI, sans-serif; margin: 20px; background: #f3f3f3; }
  h1 { font-size: 18px; }
  section { margin-bottom: 28px; }
  h2 { font-size: 14px; color: #333; margin: 0 0 6px; }
  .pair { display: flex; gap: 10px; }
  figure { margin: 0; flex: 1; min-width: 0; }
  figcaption { font-size: 11px; color: #666; margin-bottom: 4px; }
  img { width: 100%; border: 1px solid #ccc; display: block; }
</style></head><body>
<h1>Plan 009 阶段一验收对比 — CSS 手写版 vs Auto/Vue 统一类串版（12 视图）</h1>
${rows}
</body></html>`;

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1900, height: 1000 } });
await p.setContent(html, { waitUntil: 'load' });
await p.screenshot({ path: 'tmp/stage1-acceptance-sheet.png', fullPage: true });
await b.close();
console.log('saved tmp/stage1-acceptance-sheet.png');
