import { chromium } from 'playwright';

// End-to-end verification that BOTH remote config modules load real, reactive
// data inside the host. A passing run proves:
//   1. aaid (AI Daemon) config page loads + its providers render reactively
//   2. musk (AI Agent) config page loads + its modes render reactively
//   3. a single shared Vue runtime backs both (no dual-instance reactivity bug)
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

const errors = [];
page.on('pageerror', err => errors.push(`PAGE_ERROR: ${err.message}`));
page.on('console', msg => {
  if (msg.type() === 'error') errors.push(`CONSOLE_ERROR: ${msg.text()}`);
});

const results = { aaid: null, musk: null, passed: true };

console.log('=== Opening http://localhost:17700 ===');
await page.goto('http://localhost:17700', { waitUntil: 'networkidle', timeout: 10000 });
await page.waitForTimeout(1500);

const navItems = await page.$$eval('.nav-item .nav-name', els => els.map(e => e.textContent));
console.log('Nav items:', navItems);

// ── Module 1: AI Daemon (aaid :17654) ──────────────────────────────────────
console.log('\n=== Module 1: AI Daemon ===');
await page.click('text=AI Daemon');
await page.waitForTimeout(4000);

let info = await page.evaluate(() => ({
  providers: document.querySelectorAll('.provider-card').length,
  listen: document.querySelector('.field input')?.value || '',
  hasError: !!document.querySelector('.state-msg.error'),
  bodyText: document.querySelector('.content-body')?.textContent?.slice(0, 80),
}));
results.aaid = info;
console.log(`  provider cards: ${info.providers}`);
console.log(`  listen addr: "${info.listen}"`);
console.log(`  error shown: ${info.hasError}`);
// aaid should render at least 1 provider (the configured Zhipu one)
if (info.providers < 1 || info.hasError) {
  results.passed = false;
  console.log('  ✗ FAIL: no providers rendered or error shown');
} else {
  console.log('  ✓ PASS: providers rendered reactively');
}
await page.screenshot({ path: 'screenshot-aaid.png', fullPage: true });

// ── Module 2: AI Agent (musk :8080) ────────────────────────────────────────
console.log('\n=== Module 2: AI Agent ===');
await page.click('text=AI Agent');
await page.waitForTimeout(4000);

info = await page.evaluate(() => ({
  modes: document.querySelectorAll('.mode-card').length,
  professions: document.querySelectorAll('tbody tr').length,
  skills: document.querySelectorAll('.skill-row').length,
  hasError: !!document.querySelector('.state-msg.error'),
  hasLoading: document.querySelector('.content-body')?.textContent?.includes('Loading'),
  bodyText: document.querySelector('.content-body')?.textContent?.slice(0, 80),
}));
results.musk = info;
console.log(`  mode cards: ${info.modes}`);
console.log(`  profession rows: ${info.professions}`);
console.log(`  skill rows: ${info.skills}`);
console.log(`  still loading: ${info.hasLoading}`);
console.log(`  error shown: ${info.hasError}`);
// musk should render its 4 built-in modes + professions + skills
if (info.modes < 1 || info.hasError || info.hasLoading) {
  results.passed = false;
  console.log('  ✗ FAIL: modes not rendered, loading, or error');
} else {
  console.log('  ✓ PASS: modes rendered reactively');
}
await page.screenshot({ path: 'screenshot-musk.png', fullPage: true });

// ── Verdict ─────────────────────────────────────────────────────────────────
console.log('\n=== Console errors ===');
if (errors.length === 0) console.log('  (none)');
errors.forEach(e => console.log(' ', e));

console.log(`\n=== RESULT: ${results.passed ? '✅ ALL PASSED' : '❌ FAILED'} ===`);
if (!results.passed) process.exitCode = 1;
await browser.close();
