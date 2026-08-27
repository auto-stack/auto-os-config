// scripts/track-parity/diff.mjs — 任意两目录同名列像素 diff（plan010 T5）。
// 用法: node scripts/track-parity/diff.mjs <dirA> <dirB> [--out <outDir>]
// 输出: 控制台表格 + <outDir>/<name>.png（红=差异区）。目录缺图标注 SKIP。
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const argv = process.argv.slice(2);
const dirOf = (p) => fileURLToPath(new URL(`../../tmp/track-parity/${p}/`, import.meta.url));
const A = dirOf(argv[0]);
const B = dirOf(argv[1]);
const OUTDIR = (argv.includes('--out') && argv[argv.indexOf('--out') + 1]) || `${argv[0]}-vs-${argv[1]}`;
const OUT = fileURLToPath(new URL(`../../tmp/track-parity/${OUTDIR}/`, import.meta.url));
mkdirSync(OUT, { recursive: true });

const names = [...new Set([...readdirSync(A), ...readdirSync(B)])]
  .filter((f) => f.endsWith('.png')).map((f) => f.replace(/\.png$/, '')).sort();

console.log(['view', 'diff%', 'bbox'].join('\t'));
for (const name of names) {
  let pa, pb;
  try { pa = readFileSync(`${A}/${name}.png`); } catch { console.log(`${name}\tSKIP(no ${argv[0]})`); continue; }
  try { pb = readFileSync(`${B}/${name}.png`); } catch { console.log(`${name}\tSKIP(no ${argv[1]})`); continue; }
  const a = PNG.sync.read(pa), b = PNG.sync.read(pb);
  if (a.width !== b.width || a.height !== b.height) {
    console.log(`${name}\tSIZE ${a.width}x${a.height} vs ${b.width}x${b.height}`);
    continue;
  }
  const d = new PNG({ width: a.width, height: a.height });
  const n = pixelmatch(a.data, b.data, d.data, a.width, a.height, { threshold: 0.1 });
  writeFileSync(`${OUT}/${name}.png`, PNG.sync.write(d));
  let minX = a.width, minY = a.height, maxX = 0, maxY = 0, any = false;
  for (let y = 0; y < a.height; y++) for (let x = 0; x < a.width; x++) {
    const i = (y * a.width + x) * 4;
    if (d.data[i] === 255 && d.data[i + 1] === 0 && d.data[i + 2] === 0) {
      any = true;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
  }
  const pct = (n / (a.width * a.height) * 100).toFixed(2);
  console.log(`${name}\t${pct}\t${any ? `x:${minX}-${maxX} y:${minY}-${maxY}` : 'none'}`);
}
