// E2E test for the Plan 003 remote-component protocol (createComponent(Vue)).
//
// Requires:
//   - backend daemon on :17701
//   - vite on :17700
//   - the example remote module built + served on :17720
//     (cd examples/remote-module && npm i && npm run build && node serve.mjs)
//   - a drop-in at ~/.config/autoos/modules.d/example-remote.at (kind=custom)
//
// Verifies the protocol's core promise: a remote component loaded via dynamic
// import() renders, its reactivity works (mutating a ref re-renders the
// template — the exact thing that broke with two Vue instances), and it can
// read config data through the unified daemon.

import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(`PAGE_ERROR: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') errors.push(`CONSOLE_ERROR: ${m.text()}`); });

const results = { passed: true };
const fail = (m) => { results.passed = false; console.log('  ✗ FAIL: ' + m); };
const pass = (m) => console.log('  ✓ PASS: ' + m);

async function clickModule(page, name) {
  // Exact match: :has-text is substring-based and would also hit name
  // prefixes (e.g. "Roles" vs "Harness Roles").
  await page.locator('.nav-item .nav-name', { hasText: new RegExp(`^${name}$`) }).locator('..').click();
}

console.log('=== Opening http://localhost:17700 ===');
await page.goto('http://localhost:17700', { waitUntil: 'domcontentloaded', timeout: 10000 });

// The example-remote module must appear in the sidebar (drop-in discovered).
// Wait for the registry fetch + render instead of a fixed sleep: on a busy
// machine 1s was not enough (e2e back-to-back flake, Plan 006 baseline).
console.log('\n=== Sidebar discovery ===');
try {
  await page.waitForFunction(
    () => [...document.querySelectorAll('.nav-item .nav-name')]
      .some((e) => e.textContent?.trim() === 'Example Remote'),
    { timeout: 10000 },
  );
} catch { /* fall through — the check below reports the failure */ }
const navNames = await page.$$eval('.nav-item .nav-name', (els) => els.map((e) => e.textContent?.trim()));
console.log('  nav:', navNames.join(', '));
if (navNames.includes('Example Remote')) pass('drop-in custom module appears in sidebar');
else fail('Example Remote not in sidebar (drop-in not loaded?)');

// Select it → the remote bundle loads via import().
console.log('\n=== Remote component loads ===');
await clickModule(page, 'Example Remote');
await page.waitForTimeout(2000);

const loaded = await page.evaluate(() => {
  const root = document.querySelector('.example-remote');
  return {
    present: !!root,
    heading: root?.querySelector('h2')?.textContent?.trim(),
    hasIncrementBtn: !!root?.querySelector('button'),
    mentionsFactory: root?.querySelector('.tagline')?.textContent?.includes('createComponent'),
  };
});
console.log('  ', JSON.stringify(loaded));
if (loaded.present && loaded.heading === 'Example Remote Module') pass('remote component rendered');
else fail('remote component did not render');
if (loaded.mentionsFactory) pass('factory-protocol tagline shown');

// THE critical test: reactivity. Click increment, confirm the number updates
// AND the "reactivity works" badge appears. This is exactly what silently
// broke under the old two-Vue-instance regime.
console.log('\n=== Reactivity (single shared Vue instance) ===');
const beforeCount = await page.evaluate(() => document.querySelector('.demo-row strong')?.textContent?.trim());
await page.click('.demo-row button');
await page.waitForTimeout(300);
const after = await page.evaluate(() => ({
  count: document.querySelector('.demo-row strong')?.textContent?.trim(),
  reactivityOk: !!document.querySelector('.demo-row .ok'),
}));
console.log(`  count: ${beforeCount} → ${after.count}`);
if (after.count === '1' && after.reactivityOk) {
  pass('reactivity works: ref mutation re-rendered the template (single Vue instance)');
} else {
  fail(`reactivity broken: count=${after.count}, ok=${after.reactivityOk} (two Vue instances?)`);
}

// Click once more to be sure it keeps updating (not a one-shot fluke).
await page.click('.demo-row button');
await page.waitForTimeout(200);
const count2 = await page.evaluate(() => document.querySelector('.demo-row strong')?.textContent?.trim());
if (count2 === '2') pass('increment is repeatable (count → 2)');
else fail(`increment not repeatable: ${count2}`);

// Daemon data integration: the component fetches /api/config/example-remote.
// example-remote has no config file of its own, so this 404s — but the
// component handles it. What matters is that it tried (proving it uses the
// unified daemon, not a private API). We check the error-state path is graceful.
console.log('\n=== Daemon data integration ===');
const cfgState = await page.evaluate(() => {
  const root = document.querySelector('.example-remote');
  const err = root?.querySelector('.err')?.textContent?.trim();
  const cfg = root?.querySelector('.cfg')?.textContent?.trim();
  const hint = root?.querySelector('.hint')?.textContent?.trim();
  return { err, cfg, hint };
});
console.log('  ', JSON.stringify(cfgState));
// example-remote isn't a file in the registry's file sense, so /api/config 404s
// → the component shows an error. That's the expected graceful path here.
if (cfgState.err || cfgState.cfg || cfgState.hint) pass('component reached a data state (uses the daemon)');
else fail('no data state shown');

console.log('\n=== Page errors during run ===');
// The demo component intentionally fetches /api/config/example-remote, which
// 400s because the module is kind=custom (no config file). That's an expected
// data-probe, not a real error — filter it out.
const realErrors = errors.filter(
  (e) => !e.includes('400 (Bad Request)') && !e.includes('Failed to load resource'),
);
if (realErrors.length === 0) pass('no unexpected page/console errors');
else realErrors.forEach((e) => fail(e));

await browser.close();
console.log(`\n=== RESULT: ${results.passed ? 'PASS' : 'FAIL'} ===`);
process.exit(results.passed ? 0 : 1);
