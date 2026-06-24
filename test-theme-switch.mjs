import { chromium } from 'playwright';

// Verify the theme system: picking an accent in the sidebar changes the accent
// color across BOTH the host and both remote config pages (aaid, musk).
// This proves the single --primary variable flows down to remote components
// via CSS custom-property inheritance.
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.on('pageerror', err => console.log(`[PAGE_ERROR] ${err.message}`));

const toRgb = (s) => s.match(/\d+/g)?.slice(0, 3).join(',') || s;

async function readAccentColor() {
  // Read computed --accent off :root (resolved through --primary)
  return page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim());
}
async function aaidPrimaryButtonBg() {
  // aaid's "Save Configuration" button uses background: var(--accent)
  return page.$eval('.aaid-config .btn-primary', el => getComputedStyle(el).backgroundColor);
}
async function agentsBadgeBg() {
  // agents page profession badge uses background: var(--accent-light)
  return page.$eval('.agents-config tbody .badge', el => getComputedStyle(el).backgroundColor);
}
async function skillsStatColor() {
  // skills page count number uses color: var(--accent)
  return page.$eval('.skills-config .stat-num', el => getComputedStyle(el).color);
}

await page.goto('http://localhost:17700', { waitUntil: 'networkidle', timeout: 10000 });
await page.waitForTimeout(1200);

console.log('=== default (indigo) — click AI Daemon ===');
await page.click('text=AI Daemon');
await page.waitForTimeout(3500);
const accentBefore = await readAccentColor();
const btnBefore = toRgb(await aaidPrimaryButtonBg());
console.log(`  --accent = ${accentBefore}`);
console.log(`  aaid save button bg = ${btnBefore}`);
await page.screenshot({ path: 'screenshot-theme-aaid-indigo.png', fullPage: true });

// Switch accent to CORAL via the sidebar swatch (2nd swatch)
console.log('\n=== switch to Coral ===');
await page.$$eval('.theme-picker .swatch', (els, i) => els[i].click(), 1);
await page.waitForTimeout(400);
const accentAfter = await readAccentColor();
const btnAfter = toRgb(await aaidPrimaryButtonBg());
console.log(`  --accent = ${accentAfter}`);
console.log(`  aaid save button bg = ${btnAfter}`);
await page.screenshot({ path: 'screenshot-theme-aaid-coral.png', fullPage: true });

console.log('\n=== now AI Agents (musk) — still Coral ===');
await page.click('.nav-item:has-text("AI Agents")');
await page.waitForTimeout(3500);
const agentsBadge = toRgb(await agentsBadgeBg());
console.log(`  agents profession badge bg = ${agentsBadge}`);
await page.screenshot({ path: 'screenshot-theme-agents-coral.png', fullPage: true });

console.log('\n=== AI Skills — still Coral ===');
await page.click('.nav-item:has-text("AI Skills")');
await page.waitForTimeout(3000);
const skillsColor = toRgb(await skillsStatColor());
console.log(`  skills stat count color = ${skillsColor}`);
await page.screenshot({ path: 'screenshot-theme-skills-coral.png', fullPage: true });

// Switch back to OCEAN (3rd swatch) while on skills page
console.log('\n=== switch to Ocean ===');
await page.$$eval('.theme-picker .swatch', (els, i) => els[i].click(), 2);
await page.waitForTimeout(400);
const skillsColorOcean = toRgb(await skillsStatColor());
console.log(`  skills stat count color = ${skillsColorOcean}`);
await page.screenshot({ path: 'screenshot-theme-skills-ocean.png', fullPage: true });

// Verdict
const passed = btnBefore !== btnAfter && skillsColor !== skillsColorOcean;
console.log(`\n=== RESULT: ${passed ? '✅ theme switch works across all pages' : '❌ colors did not change'} ===`);
if (passed) {
  console.log(`  aaid button:   ${btnBefore} → ${btnAfter} (changed ✓)`);
  console.log(`  agents badge:  ${agentsBadge} (coral ✓)`);
  console.log(`  skills count:  ${skillsColor} → ${skillsColorOcean} (changed ✓)`);
}
if (!passed) process.exitCode = 1;
await browser.close();
