// End-to-end verification of the unified daemon + generic config editor
// (Plan 002, Phase 2). Requires:
//   - backend daemon running on :17701  (Plan 011: auto-os-config-back-server,端口 17701)
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
  // Plan 012:nav-item 组件化——.nav-name 语义锚由契约组件内建(label span),
  // 精确文本匹配沿用;点击目标改 .nav-item 自身。
  await page.locator('.nav-item .nav-name', { hasText: new RegExp(`^${name}$`) }).locator('xpath=..').click();
  await page.waitForTimeout(600);
  // Plan 008 batch 3: the unified editor is Load-first on BOTH tracks (vm
  // children get no auto-Init) — kick the initial load before inspecting.
  const load = page.locator('.config-editor button:has-text("Load")');
  if (await load.count()) { await load.click(); }
  await page.waitForTimeout(1200);
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
  // Count field rows + look for specific controls (Plan 008 batch 3 unified
  // contract: select renders as free text + hint; tables as readonly JSON;
  // toggle as a plain checkbox).
  const rows = document.querySelectorAll('.field-row');
  const subforms = document.querySelectorAll('.subform-header');
  const passwordInputs = document.querySelectorAll('input[type="password"]');
  const selectRows = [...document.querySelectorAll('.field-row')].filter((r) =>
    r.querySelector('.field-label')?.textContent?.toLowerCase().includes('default model') ||
    r.querySelector('.field-label')?.textContent?.toLowerCase().includes('default provider'));
  const fileMeta = document.querySelector('.mono')?.textContent;
  const hasError = !!document.querySelector('.state-msg.error');
  const labels = [...document.querySelectorAll('.field-label')].map((e) => e.textContent);
    const withInput = selectRows.filter((r) => r.querySelector('input'));
    // OS-015: select 行新契约——有枚举=分段按钮组(.select-group),无枚举=
    // 恰一份自由文本回退(016 批的双渲染已修)。
    const selectShape = selectRows.map((r) => ({
      groupBtns: r.querySelectorAll('.select-group button').length,
      fallbackInputs: r.querySelectorAll('.fallback-text input').length,
      hints: r.querySelectorAll('.fallback-hint').length,
    }));
  return { rowCount: rows.length, subformCount: subforms.length, passwordCount: passwordInputs.length, selectHintCount: withInput.length, selectShape, fileMeta, hasError, labels };
});
console.log('  fields:', info.rowCount, '| subforms:', info.subformCount, '| passwords:', info.passwordCount, '| select shapes:', JSON.stringify(info.selectShape));
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
// OS-015 contract: every select row renders EITHER a segmented option group
// (enum yields options) OR exactly one free-text fallback — never both, never
// a double fallback (the 016-batch regression this plan fixes).
const badSelectRows = info.selectShape.filter((s) =>
  (s.groupBtns > 0 && (s.fallbackInputs > 0 || s.hints > 0)) ||
  (s.groupBtns === 0 && (s.fallbackInputs !== 1 || s.hints !== 1)));
if (info.selectShape.length >= 1 && badSelectRows.length === 0) pass(`select rows render group-or-single-fallback (${JSON.stringify(info.selectShape)})`);
else fail(`malformed select rows: ${JSON.stringify(info.selectShape)}`);
if (info.labels.some((l) => l?.toLowerCase().includes('idle timeout'))) pass('scalar field (idle_timeout_min) rendered');
else fail('idle_timeout_min field not found');
// tier_routing lives inside provider subforms as Lite/Max/Mid/Min/Pro arrays
if (info.labels.some((l) => ['Lite', 'Max', 'Mid', 'Min', 'Pro'].includes(l))) pass('tier routing arrays rendered (readonly JSON blocks)');
else fail('tier routing fields not found');
if (info.subformCount >= 1) pass(`provider subforms rendered (${info.subformCount})`);
else fail('no subform headers');

// default_provider renders as a control (OS-015: segmented option group with
// the current value highlighted when the self-providers enum yields options;
// free-text fallback value otherwise).
const providerField = await page.evaluate(() => {
  const rows = [...document.querySelectorAll('.field-row')];
  const r = rows.find((x) => x.querySelector('.field-label')?.textContent?.toLowerCase().includes('default provider'));
  if (!r) return undefined;
  const active = r.querySelector('.select-group button.bg-primary')?.textContent?.replace(/ \(current\)$/, '');
  return active ?? r.querySelector('input')?.value;
});
console.log('  default_provider value:', providerField);
if (providerField !== undefined) pass('default_provider field present');
else fail('default_provider field missing');

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
  toggleOnActive: !!document.querySelector('.field-row button.toggle-on[class*="bg-primary"]'),
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
  const on = document.querySelector('.field-row button.toggle-on');
  return on ? on.className.includes('bg-primary') : null;
});
console.log('  auto_start_daemon before:', beforeToggle);
if (beforeToggle === null) fail('could not find auto_start_daemon toggle');
// 016 redesign: toggle is an on/off button pair (active = bg-primary).
await page.click(beforeToggle ? '.field-row button.toggle-off' : '.field-row button.toggle-on');
await page.waitForTimeout(200);
const dirtyShown = await page.evaluate(() => !!document.querySelector('.dirty'));
if (dirtyShown) pass('dirty indicator shown after edit');
else fail('dirty indicator not shown after edit');

// inline first-save confirm (Plan 008: state-driven row, no browser dialog)
await page.click('button:has-text("Save")');
await page.waitForTimeout(400);
const confirmRow = page.locator('button:has-text("Yes, save")');
if (await confirmRow.count()) { await confirmRow.click(); }
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
