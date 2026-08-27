// tmp/parity/diff.mjs — 逐视图像素 diff：css/ vs vue/ 同名截图。
// 输出: tmp/parity/diff/<name>.png（红=差异区）+ 控制台报告（差异像素占比 + 差异包围盒）
import { chromium } from 'playwright'
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { PNG } from 'pngjs'
import pixelmatch from 'pixelmatch'

const HERE = fileURLToPath(new URL('./', import.meta.url))
mkdirSync(`${HERE}/diff`, { recursive: true })

const names = readdirSync(`${HERE}/css`).filter(f => f.endsWith('.png')).map(f => f.replace(/\.png$/, ''))

const report = []
for (const name of names) {
  const a = PNG.sync.read(readFileSync(`${HERE}/css/${name}.png`))
  const b = PNG.sync.read(readFileSync(`${HERE}/vue/${name}.png`))
  if (a.width !== b.width || a.height !== b.height) {
    report.push([name, `SIZE MISMATCH ${a.width}x${a.height} vs ${b.width}x${b.height}`].join('\t'))
    continue
  }
  const d = new PNG({ width: a.width, height: a.height })
  const n = pixelmatch(a.data, b.data, d.data, a.width, a.height, { threshold: 0.1 })
  writeFileSync(`${HERE}/diff/${name}.png`, PNG.sync.write(d))
  // 差异包围盒
  let minX = a.width, minY = a.height, maxX = 0, maxY = 0, any = false
  for (let y = 0; y < a.height; y++) {
    for (let x = 0; x < a.width; x++) {
      const i = (y * a.width + x) * 4
      if (d.data[i] === 255 && d.data[i + 1] === 0 && d.data[i + 2] === 0) {
        any = true
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  const pct = (n / (a.width * a.height) * 100).toFixed(2)
  const box = any ? `bbox x:${minX}-${maxX} y:${minY}-${maxY}` : 'none'
  report.push([name, `${pct}%`, box].join('\t'))
}
console.log('view\tdiff%\tdiff-bbox(1440x900)')
console.log(report.join('\n'))

// 汇总页：css | vue | diff 三联并排
const b64 = p => readFileSync(p).toString('base64')
const rows = names.map(n => `
  <section>
    <h2>${n}</h2>
    <div class="triple">
      <figure><figcaption>CSS 原版</figcaption><img src="data:image/png;base64,${b64(`${HERE}/css/${n}.png`)}"></figure>
      <figure><figcaption>Auto/Vue</figcaption><img src="data:image/png;base64,${b64(`${HERE}/vue/${n}.png`)}"></figure>
      <figure><figcaption>diff（红=差异）</figcaption><img src="data:image/png;base64,${b64(`${HERE}/diff/${n}.png`)}"></figure>
    </div>
  </section>`).join('')
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  body { font-family: Segoe UI, sans-serif; margin: 20px; background: #f3f3f3; }
  h1 { font-size: 18px; } section { margin-bottom: 28px; }
  h2 { font-size: 14px; color: #333; margin: 0 0 6px; }
  .triple { display: flex; gap: 8px; } figure { margin: 0; flex: 1; min-width: 0; }
  figcaption { font-size: 11px; color: #666; margin-bottom: 4px; }
  img { width: 100%; border: 1px solid #ccc; display: block; image-rendering: pixelated; }
</style></head><body>
<h1>CSS 原版 vs Auto/Vue — 逐视图对比（左: CSS / 中: Vue / 右: diff）</h1>
${rows}
</body></html>`
writeFileSync(`${HERE}/sheet.html`, html)
const browser = await chromium.launch()
const p = await browser.newPage({ viewport: { width: 2900, height: 1200 } })
await p.goto(`file:///${HERE.replace(/\\/g, '/')}sheet.html`)
await p.screenshot({ path: `${HERE}/sheet.png`, fullPage: true })
await browser.close()
console.log('saved tmp/parity/sheet.png + sheet.html')
