// PLAN-034 e2e: the Roles editor renders a role's `models` candidate chain
// as a table whose provider column is a select fed by the ai-daemon provider
// enum, and Save round-trips the chain to the .at file losslessly.
//
// Requires (all against an ISOLATED config root):
//   - USERPROFILE=<e2e root> auto-os-config-back-server on :17701
//   - vite dev server on :17700        (npm run dev)
//   - the e2e root's roles/chain-test.at (two-candidate chain) and
//     ai-daemon.at (providers deadp + mockp)
//
// Verifies (AC-06):
//   1. chain-test opens in the collection editor; `models` renders as a
//      table (table-wrap) with provider/model columns.
//   2. Provider cells are <select class="cell-select"> whose options include
//      the ai-daemon providers (deadp, mockp) — the warmEnumsText path.
//   3. Editing a provider cell + Save persists; the .at file keeps BOTH
//      candidates in order (round-trip lossless); re-open shows the edit.

import { chromium } from 'playwright';
import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const E2E_ROOT = process.env.PLAN034_ROOT || join(homedir(), '.config', 'autoos');
const ROLE_AT = join(E2E_ROOT, 'roles', 'chain-test.at');

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

const errors = [];
page.on('pageerror', (err) => errors.push(`PAGE_ERROR: ${err.message}`));
page.on('console', (msg) => {
  if (msg.type() !== 'error') return;
  // favicon 404 is noise (no favicon shipped in dev).
  const loc = typeof msg.location === 'function' ? msg.location() : null;
  if (msg.text().includes('Failed to load resource')) {
    console.log('  [resource 404 noise]', loc?.url ?? '(no url)');
    return;
  }
  errors.push(`CONSOLE_ERROR: ${msg.text()}`);
});

const results = { passed: true };
const fail = (msg) => { results.passed = false; console.log('  ✗ FAIL: ' + msg); };
const pass = (msg) => console.log('  ✓ PASS: ' + msg);

async function clickModule(page, name) {
  await page.locator('.nav-item .nav-name', { hasText: new RegExp(`^${name}$`) }).locator('xpath=..').click();
  await page.waitForTimeout(600);
}

console.log('=== Opening http://localhost:17700 ===');
await page.goto('http://localhost:17700', { waitUntil: 'domcontentloaded', timeout: 10000 });
await page.waitForTimeout(1000);

console.log('\n=== Roles module → chain-test entity ===');
await clickModule(page, 'Roles');
await page.waitForSelector('.entity-list .e-row', { timeout: 10000 });
await page.click('.entity-list .e-row:has-text("chain-test")');
await page.waitForTimeout(1200);

// 1. models table rendered with both columns.
const table = await page.evaluate(() => {
  const wrap = document.querySelector('.table-wrap');
  if (!wrap) return null;
  const headerRow = wrap.firstElementChild;
  const headers = headerRow ? headerRow.textContent : '';
  return { headers, selects: wrap.querySelectorAll('select.cell-select').length, inputs: wrap.querySelectorAll('input[type="text"]').length };
});
if (table && table.headers.includes('provider') && table.headers.includes('model')) {
  pass(`models table renders with columns [${table.headers}]`);
} else {
  fail(`models table missing or malformed: ${JSON.stringify(table)}`);
}

// 2. provider cells are selects whose options carry the ai-daemon providers.
const sel = await page.evaluate(() => {
  const first = document.querySelector('.table-wrap select.cell-select');
  if (!first) return null;
  return [...first.querySelectorAll('option')].map((o) => o.value);
});
if (sel && sel.includes('deadp') && sel.includes('mockp')) {
  pass(`provider cell is a select fed by the ai-daemon enum [${sel.join(', ')}]`);
} else {
  fail(`provider select options wrong: ${JSON.stringify(sel)}`);
}

// 3. Edit row 0's provider to mockp, save, verify file round-trip.
const original = readFileSync(ROLE_AT, 'utf8');
await page.locator('.table-wrap select.cell-select').first().selectOption('mockp');
await page.waitForTimeout(500);
await page.click('.detail-pane button:has-text("Save")');
await page.waitForTimeout(400);
const yesBtn = page.locator('.modal-actions button:has-text("Save")');
if (await yesBtn.count()) { await yesBtn.click(); }
await page.waitForTimeout(1200);

const saved = readFileSync(ROLE_AT, 'utf8');
const mockpCount = (saved.match(/provider : "mockp"/g) || []).length;
const ok = mockpCount === 2
  && saved.includes('model : "m1"') && saved.includes('model : "m2"')
  && saved.includes('models : [{');
if (ok) pass('save round-trips the chain losslessly (2-entry models block intact, row 0 edited to mockp)');
else fail(`saved file lost the chain (mockp x${mockpCount}):\n${saved}`);

// 4. Re-open shows the edit (client re-fetches).
await page.click('.entity-list .e-row:has-text("chain-test")');
await page.waitForTimeout(1000);
const reopened = await page.evaluate(() => {
  const rows = document.querySelectorAll('.table-wrap .flex.flex-row.gap-\\[8px\\]');
  const firstSel = document.querySelector('.table-wrap select.cell-select');
  return firstSel ? firstSel.value : null;
});
if (reopened === 'mockp') pass('re-open shows the edited provider (mockp)');
else fail(`re-opened provider value: ${JSON.stringify(reopened)}`);

// Restore the original file (the UI save rewrote it).
const { writeFileSync } = await import('fs');
writeFileSync(ROLE_AT, original);

if (errors.length) {
  results.passed = false;
  console.log('\n✗ page/console errors:');
  for (const e of errors) console.log('  ' + e);
} else {
  console.log('\n✓ no page or console errors');
}

await browser.close();
console.log(results.passed ? '\nPLAN034-MODELS-E2E: PASS' : '\nPLAN034-MODELS-E2E: FAIL');
process.exit(results.passed ? 0 : 1);
