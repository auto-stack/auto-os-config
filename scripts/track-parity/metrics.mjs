// scripts/track-parity/metrics.mjs — 分区 diff%（plan010 T7/T9，入库 per review
// fix#3）。用法: node scripts/track-parity/metrics.mjs（无参,vue/vm 目录约定同 diff.mjs）。
// 分区: sidebar 0-288 / content-head 288-1440 x 0-48 / content-body 其余。
import { readdirSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const dir = (p) => fileURLToPath(new URL(`../../tmp/track-parity/${p}/`, import.meta.url));
// 分区:侧栏 0-288 / 内容头 288-1440 x 0-48 / 内容体 288-1440 x 48-900
const ZONES = [
  ['sidebar', 0, 288, 0, 900],
  ['content-head', 288, 1440, 0, 48],
  ['content-body', 288, 1440, 48, 900],
];
const names = readdirSync(dir('vue')).filter(f => f.endsWith('.png')).map(f => f.replace(/\.png$/, '')).sort();
console.log(['view', ...ZONES.map(z => z[0]), 'total'].join('\t'));
for (const name of names) {
  let a, b;
  try {
    a = PNG.sync.read(readFileSync(`${dir('vue')}/${name}.png`));
    b = PNG.sync.read(readFileSync(`${dir('vm')}/${name}.png`));
  } catch { console.log(`${name}\tSKIP`); continue; }
  const d = new PNG({ width: a.width, height: a.height });
  pixelmatch(a.data, b.data, d.data, a.width, a.height, { threshold: 0.1 });
  const row = [name];
  for (const [zn, x0, x1, y0, y1] of ZONES) {
    let diff = 0, total = 0;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const i = (y * a.width + x) * 4;
      total++;
      if (d.data[i] === 255 && d.data[i+1] === 0 && d.data[i+2] === 0) diff++;
    }
    row.push((diff / total * 100).toFixed(1) + '%');
  }
  let diff = 0;
  for (let i = 0; i < d.data.length; i += 4) if (d.data[i] === 255 && d.data[i+1] === 0 && d.data[i+2] === 0) diff++;
  row.push((diff / (a.width * a.height) * 100).toFixed(2) + '%');
  console.log(row.join('\t'));
}
