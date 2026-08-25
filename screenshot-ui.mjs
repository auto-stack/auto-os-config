// Capture the current config UI for inspection (7 modules).
import { chromium } from 'playwright'
import { mkdirSync } from 'fs'
import { fileURLToPath } from 'url'

// Plan 008: repo-relative (was a hardcoded main-repo path — wrong in worktrees)
const OUT = fileURLToPath(new URL('./screenshots/', import.meta.url))
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto('http://localhost:17700', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(1500)

const shot = async (name) => {
  await page.screenshot({ path: `${OUT}/${name}.png` })
  console.log('saved', name)
}

// Full sidebar + default state
await shot('00-sidebar-default')

// Click each module by exact name and capture
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
    await page.waitForTimeout(1200)
    await shot(file)
  } else {
    console.log('MISSING in sidebar:', name)
  }
}

await browser.close()
console.log('done')
