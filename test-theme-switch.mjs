import { chromium } from 'playwright';

// Verify the theme system against the CURRENT unified UI (Plan 006 baseline;
// the old version of this test probed the retired aaid/musk remote pages).
//
// The accent is a single HSL token (--primary) written onto <html>; we verify
// it flows into real elements on three different surfaces:
//   1. the host shell (active nav item name color)
//   2. DaemonView/ConfigEditor (Save button background)
//   3. CollectionBrowser (selected entity row tint)
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.on('pageerror', err => console.log(`[PAGE_ERROR] ${err.message}`));

// Deterministic start: forget any persisted accent from earlier runs.
await page.addInitScript(() => localStorage.clear());

await page.goto('http://127.0.0.1:17700', { waitUntil: 'networkidle', timeout: 10000 });
await page.waitForSelector('.sidebar', { timeout: 10000 });
await page.waitForTimeout(800);

const navNameColor = () =>
  page.$eval('.nav-item.active .nav-name', el => getComputedStyle(el).color);

console.log('=== default (indigo) — click AI Daemon ===');
await page.click('.nav-item:has-text("AI Daemon")');
await page.waitForSelector('.test-card', { timeout: 10000 });
// Plan 008 batch 3: the unified editor is Load-first — kick the initial
// load so the primary Save button (accent-asserted below) exists.
const loadBtn = page.locator('.config-editor button:has-text("Load")');
if (await loadBtn.count()) { await loadBtn.click(); }
await page.waitForSelector('.config-editor .btn.primary', { timeout: 10000 });
const navBefore = await navNameColor();
const btnBefore = await page.$eval(
  '.config-editor .btn.primary', el => getComputedStyle(el).backgroundColor);
console.log(`  nav name color   = ${navBefore}`);
console.log(`  save button bg   = ${btnBefore}`);
await page.screenshot({ path: 'screenshot-theme-daemon-indigo.png', fullPage: true });

console.log('\n=== switch to Coral (2nd swatch) ===');
await page.$$eval('.theme-picker .swatch', (els, i) => els[i].click(), 1);
await page.waitForTimeout(400);
const navAfter = await navNameColor();
const btnAfter = await page.$eval(
  '.config-editor .btn.primary', el => getComputedStyle(el).backgroundColor);
console.log(`  nav name color   = ${navAfter}`);
console.log(`  save button bg   = ${btnAfter}`);
await page.screenshot({ path: 'screenshot-theme-daemon-coral.png', fullPage: true });

console.log('\n=== Roles (collection) — still Coral ===');
await page.click('.nav-item:has-text("Roles")');
await page.waitForSelector('.entity-list', { timeout: 10000 });
// Select the first entity so the active-row tint (accent-light) shows.
await page.click('.entity-list .e-name');
await page.waitForTimeout(600);
const rowCoral = await page.$eval(
  '.entity-list .e-row.active', el => getComputedStyle(el).backgroundColor);
console.log(`  selected row bg  = ${rowCoral}`);
await page.screenshot({ path: 'screenshot-theme-roles-coral.png', fullPage: true });

console.log('\n=== switch to Ocean (3rd swatch) on Roles ===');
await page.$$eval('.theme-picker .swatch', (els, i) => els[i].click(), 2);
await page.waitForTimeout(400);
const rowOcean = await page.$eval(
  '.entity-list .e-row.active', el => getComputedStyle(el).backgroundColor);
console.log(`  selected row bg  = ${rowOcean}`);
await page.screenshot({ path: 'screenshot-theme-roles-ocean.png', fullPage: true });

const passed =
  navBefore !== navAfter && btnBefore !== btnAfter && rowCoral !== rowOcean;
console.log(`\n=== RESULT: ${passed ? '✅ theme switch works across all surfaces' : '❌ colors did not change'} ===`);
if (passed) {
  console.log(`  nav name:  ${navBefore} → ${navAfter} (changed ✓)`);
  console.log(`  save btn:  ${btnBefore} → ${btnAfter} (changed ✓)`);
  console.log(`  roles row: ${rowCoral} → ${rowOcean} (changed ✓)`);
}
if (!passed) process.exitCode = 1;
await browser.close();
