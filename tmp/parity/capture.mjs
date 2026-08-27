// tmp/parity/capture.mjs — CSS 原版 vs Auto/Vue 版像素对拍捕获脚本。
// 用法: node tmp/parity/capture.mjs <baseUrl> <outDir>
// 纪律: 同视口(1440x900@1x)、同 accent(indigo)、禁过渡动画、等字体就绪后截图。
import { chromium } from 'playwright'
import { mkdirSync } from 'fs'
import { fileURLToPath } from 'url'

const [baseUrl, outDirRaw] = process.argv.slice(2)
if (!baseUrl || !outDirRaw) {
  console.error('usage: node capture.mjs <baseUrl> <outDir>')
  process.exit(1)
}
const OUT = fileURLToPath(new URL(`./${outDirRaw}/`, import.meta.url))
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
})
// 固定 accent = indigo，双端 origin 各自独立 localStorage，防历史残留漂移
await context.addInitScript(() => {
  try { localStorage.setItem('autoos-accent-color', 'indigo') } catch (e) {}
})
const page = await context.newPage()

await page.goto(baseUrl, { waitUntil: 'domcontentloaded' })
await page.addStyleTag({
  content: `*, *::before, *::after {
    transition: none !important; animation: none !important;
    caret-color: transparent !important; scroll-behavior: auto !important;
  }`,
})
await page.evaluate(() => document.fonts.ready)
await page.waitForTimeout(1500)

const shot = async (name) => {
  await page.screenshot({ path: `${OUT}/${name}.png` })
  console.log('saved', `${outDirRaw}/${name}.png`)
}

await shot('00-sidebar-default')

// 与 screenshot-ui.mjs 相同的导航序列（.nav-item .nav-name 双版共用）
const modules = [
  ['AI Daemon', '01-ai-daemon'],
  ['Auto Musk', '02-auto-musk'],
  ['Roles', '03-roles'],
  ['Skills', '04-skills'],
  ['AI Client', '05-ai-client'],
  ['Modes', '06-modes'],
  ['Harness Roles', '07-harness-roles'],
]
for (const [name, file] of modules) {
  const nav = page.locator('.nav-item .nav-name', { hasText: new RegExp(`^${name}$`) }).locator('..')
  if (await nav.count()) {
    await nav.click()
    await page.waitForTimeout(600)
    // 统一编辑器是 Load-first（批3 起）；CSS 版直接出表单。有 Load 就点掉再拍"已加载态"
    const load = page.locator('.config-editor button:has-text("Load")')
    if (await load.count()) { await load.click() }
    await page.waitForTimeout(1200)
    await shot(file)
  } else {
    console.log('MISSING in sidebar:', name)
  }
}

await browser.close()
console.log('done')
