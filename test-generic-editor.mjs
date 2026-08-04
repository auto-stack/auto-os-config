// End-to-end verification of the unified daemon + generic config editor
// (Plan 002, Phase 2). Requires:
//   - backend daemon running on :17701  (cargo run --manifest-path backend/Cargo.toml)
//   - vite dev server on :17700         (npm run dev)
//
// Verifies:
//   1. AI Daemon module renders the generic ConfigEditor with real ai-daemon.at
//      data: default_provider dropdown, api_key password fields, tier_routing
//      tables.
//   2. Auto Musk module renders its config.at fields (daemon_url, harness...).
//   3. Editing a field marks it dirty and Save persists to the file (+ .bak).
//   4. The test-connection button reports the daemon offline (aaid not running).

import { chromium } from 'playwright';
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const CONFIG_ROOT = join(homedir(), '.config', 'autoos');
const DAEMON_AT = join(CONFIG_ROOT, 'ai-daemon.at');
const MUSK_AT = join(CONFIG_ROOT, 'apps', 'musk', 'config.at');

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

const errors = [];
page.on('pageerror', (err) => errors.push(`PAGE_ERROR: ${err.message}`));
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(`CONSOLE_ERROR: ${msg.text()}`);
});

const results = { passed: true };
const fail = (msg) => { results.passed = false; console.log('  ✗ FAIL: ' + msg); };
const pass = (msg) => console.log('  ✓ PASS: ' + msg);

/** Click a sidebar module by its exact display name (avoids :has-text matching
 *  description text, and exact-match guards against name prefixes like
 *  "Roles" vs "Harness Roles"). */
async function clickModule(page, name) {
  await page.locator('.nav-item .nav-name', { hasText: new RegExp(`^${name}$`) }).locator('..').click();
}

// Snapshot the original musk config so we can restore it after the save test.
const originalMusk = readFileSync(MUSK_AT, 'utf8');

console.log('=== Opening http://localhost:17700 ===');
await page.goto('http://localhost:17700', { waitUntil: 'domcontentloaded', timeout: 10000 });
await page.waitForTimeout(1000);

// ── Module 1: AI Daemon (generic ConfigEditor) ───────────────────────────
console.log('\n=== Module 1: AI Daemon (generic editor) ===');
await clickModule(page, "AI Daemon");
await page.waitForTimeout(1500);

let info = await page.evaluate(() => {
  // Count field rows + look for specific controls.
  const rows = document.querySelectorAll('.field-row, .subform');
  const selects = document.querySelectorAll('select');
  const passwordInputs = document.querySelectorAll('input[type="password"]');
  const tables = document.querySelectorAll('.tbl');
  const fileMeta = document.querySelector('.mono')?.textContent;
  const hasError = !!document.querySelector('.state-msg.error');
  const labels = [...document.querySelectorAll('.field-label')].map((e) => e.textContent);
  return { rowCount: rows.length, selectCount: selects.length, passwordCount: passwordInputs.length, tableCount: tables.length, fileMeta, hasError, labels };
});
console.log('  fields:', info.rowCount, '| selects:', info.selectCount, '| passwords:', info.passwordCount, '| tables:', info.tableCount);
console.log('  file:', info.fileMeta);
console.log('  labels:', info.labels.join(', '));

if (info.hasError) {
  const errText = await page.evaluate(() => document.querySelector('.state-msg.error')?.textContent);
  fail(`error state shown: ${errText}`);
} else {
  pass('no error state');
}
// Two providers have api_key (zhipu, deepseek); the `local` one has
// auth_required:false and no api_key — so 2 password fields is correct.
if (info.passwordCount >= 2) pass(`api_key rendered as password (${info.passwordCount} found)`);
else fail(`expected >=2 password fields, got ${info.passwordCount}`);
if (info.selectCount >= 1) pass(`select dropdowns present (${info.selectCount} selects)`);
else fail('no select dropdowns');
if (info.labels.some((l) => l?.toLowerCase().includes('idle timeout'))) pass('scalar field (idle_timeout_min) rendered');
else fail('idle_timeout_min field not found');
if (info.tableCount >= 1) pass(`tier_routing rendered as table (${info.tableCount} tables)`);
else fail('no tables — tier_routing arrays should render as tables');

// default_provider dropdown should list zhipu/deepseek/local (from enum endpoint).
// Find the select whose options include provider names, rather than the first.
const providerOptions = await page.evaluate(() => {
  const sels = [...document.querySelectorAll('select')];
  const prov = sels.find((s) => [...s.options].some((o) => ['zhipu', 'deepseek', 'local'].includes(o.value)));
  return prov ? [...prov.options].map((o) => o.value) : [];
});
console.log('  provider options:', providerOptions);
if (providerOptions.includes('zhipu') && providerOptions.includes('deepseek') && providerOptions.includes('local')) {
  pass('default_provider dropdown lists providers from /api/enums/self');
} else {
  fail('provider dropdown missing expected options');
}

// ── Test connection button (aaid offline or online) ───────────────────────
// ai-daemon renders DaemonView (a built-in bespoke file view) which includes
// the test-connection button. If absent, something regressed — fail loudly.
console.log('\n=== Test connection (aaid may be online or offline) ===');
const hasTestBtn = await page.evaluate(() => !!document.querySelector('.test-card'));
if (!hasTestBtn) {
  fail('ai-daemon should render DaemonView (test-card), but it is absent');
  console.log('  (skipped: ai-daemon currently renders the generic editor; DaemonView restored in Plan 003 Step 4)');
} else {
  await page.click('button:has-text("Test")');
  await page.waitForFunction(() => {
    const s = document.querySelector('.test-status')?.textContent?.trim();
    return s && !s.includes('testing');
  }, { timeout: 20000 });
  const testStatus = await page.evaluate(() => document.querySelector('.test-status')?.textContent?.trim());
  console.log('  status:', testStatus);
  if (testStatus && (testStatus.includes('offline') || testStatus.includes('failed'))) {
    pass(`test-connection handled offline daemon (${testStatus})`);
  } else if (testStatus && (testStatus.includes('online') || testStatus.includes('ok'))) {
    pass(`daemon online (${testStatus})`);
  } else {
    fail(`unexpected test status: ${testStatus}`);
  }
}

// ── Module 2: Auto Musk (generic ConfigEditor) ───────────────────────────
console.log('\n=== Module 2: Auto Musk (generic editor) ===');
await clickModule(page, "Auto Musk");
await page.waitForTimeout(1500);

info = await page.evaluate(() => ({
  labels: [...document.querySelectorAll('.field-label')].map((e) => e.textContent),
  hasError: !!document.querySelector('.state-msg.error'),
  file: document.querySelector('.mono')?.textContent,
  toggleChecked: document.querySelector('.field-row > .field-control .toggle input, .toggle input')?.checked,
}));
console.log('  labels:', info.labels.join(', '));
console.log('  file:', info.file);
if (info.hasError) fail('Auto Musk showed error');
else pass('Auto Musk loaded');
if (info.labels.some((l) => l?.toLowerCase().includes('daemon url'))) pass('daemon_url field present');
else fail('daemon_url field missing');
if (info.labels.some((l) => l?.toLowerCase().includes('auto start'))) pass('auto_start_daemon toggle field present');
else fail('auto_start_daemon field missing');

// ── Save round-trip: toggle auto_start_daemon, save, verify file ──────────
console.log('\n=== Save round-trip (auto_start_daemon) ===');
const beforeToggle = await page.evaluate(() => {
  const t = document.querySelector('.toggle input');
  return t ? t.checked : null;
});
console.log('  auto_start_daemon before:', beforeToggle);
if (beforeToggle === null) fail('could not find auto_start_daemon toggle');
// The native checkbox is display:none (the toggle is styled); click the label.
await page.click('.toggle');
await page.waitForTimeout(200);
const dirtyShown = await page.evaluate(() => !!document.querySelector('.dirty'));
if (dirtyShown) pass('dirty indicator shown after edit');
else fail('dirty indicator not shown');

// handle the confirm() dialog (first save)
page.once('dialog', (d) => d.accept());
await page.click('button:has-text("Save")');
await page.waitForTimeout(1500);
const afterFile = readFileSync(MUSK_AT, 'utf8');
const autoStartInFile = /auto_start_daemon\s*:\s*(true|false)/.exec(afterFile);
console.log('  file after save:', autoStartInFile?.[1]);
if (autoStartInFile && autoStartInFile[1] === String(!beforeToggle)) {
  pass(`save persisted to file (auto_start_daemon=${autoStartInFile[1]})`);
} else {
  fail(`file does not reflect toggle: found ${autoStartInFile?.[1]}, expected ${!beforeToggle}`);
}
if (existsSync(MUSK_AT + '.bak')) pass('.bak backup created');
else fail('no .bak backup created');

// restore the original musk config (cleanup)
writeFileSync(MUSK_AT, originalMusk);
try { unlinkSync(MUSK_AT + '.bak'); } catch {}

console.log('\n=== Page errors during run ===');
// The test-connection action legitimately 503s when aaid is offline (the
// expected "offline" path) — filter that expected network response.
const realErrors = errors.filter(
  (e) => !e.includes('503 (Service Unavailable)') && !/Failed to load resource.*503/.test(e),
);
if (realErrors.length === 0) pass('no unexpected page/console errors');
else realErrors.forEach((e) => fail(e));

await browser.close();
console.log(`\n=== RESULT: ${results.passed ? 'PASS' : 'FAIL'} ===`);
process.exit(results.passed ? 0 : 1);
