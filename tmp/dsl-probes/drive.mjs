// drive.mjs — Phase 1 probe driver (Plan 006): drives /probe.html and reports
// which DSL patterns work at RUNTIME. The defineModel deep-mutation results
// (probe B) decide the D5 convention's enforcement level.
import { chromium } from 'playwright'

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(`PAGE_ERROR: ${e.message}`))
page.on('console', (m) => { if (m.type() === 'error') errors.push(`CONSOLE_ERROR: ${m.text()}`) })

const results = []
const check = (name, ok, detail = '') => {
  results.push({ name, ok })
  console.log(`  ${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`)
}

await page.goto('http://127.0.0.1:17700/probe.html', { waitUntil: 'networkidle', timeout: 15000 })
await page.waitForSelector('.probe-a', { timeout: 10000 })
await page.waitForSelector('.probe-b', { timeout: 10000 })
await page.waitForTimeout(300)

// ── Probe A: dynamic form dispatch ─────────────────────────────────────────
console.log('=== Probe A: dynamic form ===')

// 1. toggle flip
const toggle = page.locator('.pa-toggle')
let before = await toggle.isChecked()
await toggle.click()
await page.waitForTimeout(150)
let after = await toggle.isChecked()
check('A1 toggle dispatch flips value', before === true && after === false, `${before} → ${after}`)

// 2. number input (SetField bumps to 42)
const numInput = page.locator('.field-row:nth-child(2) input.input').first()
await numInput.fill('7')
await page.waitForTimeout(150)
check('A2 number input round-trips', (await numInput.inputValue()) === '42', await numInput.inputValue())

// 3. password reveal
const pw = page.locator('.pa-pw')
const typeBefore = await pw.getAttribute('type')
await page.click('.reveal')
await page.waitForTimeout(150)
const typeAfter = await pw.getAttribute('type')
check('A3 password reveal switches type', typeBefore === 'password' && typeAfter === 'text', `${typeBefore} → ${typeAfter}`)
await page.click('.reveal')

// 4. select
await page.selectOption('.pa-select', 'mid')
await page.waitForTimeout(150)
check('A4 select updates descriptor value', (await page.locator('.pa-select').inputValue()) === 'mid')

// 5. multiselect (options rendered from array, click adds)
const msBox = page.locator('.ms-item input').last() // "Mid" option box
const msBefore = await msBox.isChecked()
await msBox.click()
await page.waitForTimeout(150)
const msAfter = await msBox.isChecked()
check('A5 multiselect toggles membership', msBefore === false && msAfter === true, `${msBefore} → ${msAfter}`)

// 6. tags: enter-add, x-remove
const tagCount = async () => await page.locator('.tag').count()
const tc0 = await tagCount()
await page.fill('.tag-input', 'gamma')
await page.press('.tag-input', 'Enter')
await page.waitForTimeout(200)
const tc1 = await tagCount()
check('A6 tags enter-add', tc0 === 2 && tc1 === 3, `${tc0} → ${tc1}`)
await page.locator('.tag-x').first().click()
await page.waitForTimeout(200)
const tc2 = await tagCount()
check('A7 tags x-remove', tc2 === 2, `${tc1} → ${tc2}`)
const tagText = await page.locator('.tag').first().textContent()
check('A8 tag removal removed the right one', (tagText ?? '').includes('beta'), `first tag now: ${tagText}`)

// 7. table: rows render, add, remove, cell edit
const rowCount = async () => await page.locator('.tbl tbody tr').count()
const rc0 = await rowCount()
await page.click('.add-row')
await page.waitForTimeout(150)
const rc1 = await rowCount()
check('A9 table + Row', rc0 === 2 && rc1 === 3, `${rc0} → ${rc1}`)
const cell = page.locator('.cell-input').first()
await cell.fill('x')
await page.waitForTimeout(150)
check('A10 table cell edit round-trips', (await cell.inputValue()) === 'max', await cell.inputValue())
await page.locator('.del-row').last().click()
await page.waitForTimeout(150)
const rc2 = await rowCount()
check('A11 table row remove', rc2 === 2, `${rc1} → ${rc2}`)

// ── Probe B: deep mutation reactivity ──────────────────────────────────────
console.log('=== Probe B: deep mutation (defineModel 🔴) ===')
const keyText = () => page.$eval('.pb-key', (el) => el.textContent.trim())
const modelsText = () => page.$eval('.pb-models', (el) => el.textContent.trim())

// marker input proves the page is alive/reactive between checks
await page.fill('.pb-marker', 'alive')
await page.waitForTimeout(150)
const markerOk = (await page.inputValue('.pb-marker')) === 'alive'
check('B0 marker input reactive (sanity)', markerOk)

// RISKY: nested-field write
await page.click('.pb-btn-risky')
await page.waitForTimeout(300)
const riskyKey = await keyText()
const riskyWorked = riskyKey.includes('risky')
console.log(`  [info] risky nested-write key view: "${riskyKey}"`)

// RISKY: nested-array push
await page.click('.pb-btn-addr')
await page.waitForTimeout(300)
const riskyModels = await modelsText()
const riskyPushWorked = riskyModels.includes('r2')
console.log(`  [info] risky nested-push models view: "${riskyModels}"`)

// SAFE: whole-object replace (MUST work)
await page.click('.pb-btn-safe')
await page.waitForTimeout(300)
const safeKey = await keyText()
check('B1 safe whole-replace updates view', safeKey.includes('safe'), `"${safeKey}"`)

// SAFE: whole-array replace
await page.click('.pb-btn-adds')
await page.waitForTimeout(300)
const safeModels = await modelsText()
check('B2 safe array-replace updates view', safeModels.includes('s2'), `"${safeModels}"`)

// computed reactivity (key_len / models_len in .pb-safe)
await page.click('.pb-btn-safe')
await page.waitForTimeout(200)
const safeLine = await page.$eval('.pb-safe', (el) => el.textContent.trim())
check('B3 computed on nested path updates', safeLine.includes('len=4'), `"${safeLine}"`)

console.log(`  [verdict] risky-write propagated: ${riskyWorked ? 'YES (bug not hit here)' : 'NO (confirmes the 🔴)'}`)
console.log(`  [verdict] risky-push propagated: ${riskyPushWorked ? 'YES' : 'NO (confirmes the 🔴)'}`)

if (errors.length) {
  console.log('\n=== Page errors ===')
  for (const e of errors) console.log('  ' + e)
}

const failed = results.filter((r) => !r.ok)
console.log(`\n=== RESULT: ${failed.length === 0 ? 'ALL PASS' : `${failed.length} FAILED`} (${results.length} checks) ===`)
if (errors.length) process.exitCode = 1
if (failed.length) process.exitCode = 1
await browser.close()
