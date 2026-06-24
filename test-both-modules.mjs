import { chromium } from 'playwright';

// End-to-end verification that all THREE remote config modules load real,
// reactive data inside the host:
//   1. AI Daemon (aaid :17654)   — providers
//   2. AI Agents (musk :8080)    — modes + professions
//   3. AI Skills (musk :8080)    — skill cards
// Also implicitly proves a single shared Vue runtime backs them (no dual-
// instance reactivity bug).
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

const errors = [];
page.on('pageerror', err => errors.push(`PAGE_ERROR: ${err.message}`));
page.on('console', msg => {
  if (msg.type() === 'error') errors.push(`CONSOLE_ERROR: ${msg.text()}`);
});

const results = { passed: true };
const fail = (msg) => { results.passed = false; console.log('  ✗ FAIL: ' + msg); };
const pass = (msg) => console.log('  ✓ PASS: ' + msg);

console.log('=== Opening http://localhost:17700 ===');
await page.goto('http://localhost:17700', { waitUntil: 'networkidle', timeout: 10000 });
await page.waitForTimeout(1500);

const navItems = await page.$$eval('.nav-item .nav-name', els => els.map(e => e.textContent));
console.log('Nav items:', navItems);

// ── Module 1: AI Daemon (aaid :17654) ──────────────────────────────────────
console.log('\n=== Module 1: AI Daemon ===');
await page.click('.nav-item:has-text("AI Daemon")');
await page.waitForTimeout(4000);

let info = await page.evaluate(() => ({
  providers: document.querySelectorAll('.provider-card').length,
  hasError: !!document.querySelector('.state-msg.error'),
}));
console.log(`  provider cards: ${info.providers}`);
console.log(`  error shown: ${info.hasError}`);
if (info.providers < 1 || info.hasError) fail('no providers rendered or error shown');
else pass('providers rendered reactively');
await page.screenshot({ path: 'screenshot-aaid.png', fullPage: true });

// ── Module 2: AI Agents (musk :8080) — modes + professions ─────────────────
console.log('\n=== Module 2: AI Agents ===');
await page.click('.nav-item:has-text("AI Agents")');
await page.waitForTimeout(4000);

info = await page.evaluate(() => ({
  modes: document.querySelectorAll('.mode-card').length,
  professions: document.querySelectorAll('tbody tr').length,
  // the agents page must NOT show skills (those moved to their own module)
  hasSkillsSection: !!document.querySelector('.skill-card, .skill-row'),
  hasError: !!document.querySelector('.state-msg.error'),
  hasLoading: document.querySelector('.content-body')?.textContent?.includes('Loading'),
}));
console.log(`  mode cards: ${info.modes}`);
console.log(`  profession rows: ${info.professions}`);
console.log(`  has skills section (should be false): ${info.hasSkillsSection}`);
if (info.modes < 1 || info.hasError || info.hasLoading) fail('modes not rendered, loading, or error');
else pass('modes rendered reactively');
if (info.hasSkillsSection) fail('agents page should not contain skills (split incomplete)');
await page.screenshot({ path: 'screenshot-agents.png', fullPage: true });

// ── Module 3: AI Skills (musk :8080) ───────────────────────────────────────
console.log('\n=== Module 3: AI Skills ===');
await page.click('.nav-item:has-text("AI Skills")');
await page.waitForTimeout(4000);

info = await page.evaluate(() => ({
  skills: document.querySelectorAll('.skill-card').length,
  count: document.querySelector('.stat-num')?.textContent || '0',
  hasError: !!document.querySelector('.state-msg.error'),
  hasLoading: document.querySelector('.content-body')?.textContent?.includes('Loading'),
}));
console.log(`  skill cards: ${info.skills}`);
console.log(`  stat count: ${info.count}`);
console.log(`  error shown: ${info.hasError}`);
if (info.skills < 1 || info.hasError || info.hasLoading) fail('skills not rendered, loading, or error');
else pass('skills rendered reactively');
await page.screenshot({ path: 'screenshot-skills.png', fullPage: true });

// ── Verdict ─────────────────────────────────────────────────────────────────
console.log('\n=== Console errors ===');
if (errors.length === 0) console.log('  (none)');
errors.forEach(e => console.log(' ', e));

console.log(`\n=== RESULT: ${results.passed ? '✅ ALL PASSED' : '❌ FAILED'} ===`);
if (!results.passed) process.exitCode = 1;
await browser.close();
