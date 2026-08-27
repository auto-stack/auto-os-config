// tmp/parity/metrics.mjs — 双端同选器取 getBoundingClientRect+computed style 对照。
// 用法: node metrics.mjs <baseA> <baseB> <selector> [props]
import { chromium } from 'playwright'

const [urlA, urlB, sel, propsS] = process.argv.slice(2)
const props = (propsS || 'top,height,width,fontSize,lineHeight,fontFamily,paddingTop,paddingBottom,fontWeight,color').split(',')
const pick = `() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return null;
  const r = el.getBoundingClientRect(); const c = getComputedStyle(el);
  return { rect: { top: r.top, left: r.left, w: r.width, h: r.height }, cs: Object.fromEntries([${JSON.stringify(props)}].flat().map(p => [p, c[p]])) }; }`

const browser = await chromium.launch()
for (const url of [urlA, urlB]) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1200)
  const m = await page.evaluate(pick)
  console.log(url, JSON.stringify(m))
  await page.close()
}
await browser.close()
