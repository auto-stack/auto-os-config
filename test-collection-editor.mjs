// E2E test for the collection browser (Plan 002 Phase 3): roles + skills.
//
// Requires: backend daemon on :17701, vite on :17700.
// Verifies:
//   1. Roles module lists entities (assistant), editing works (tier select,
//      skills multiselect), the soul sidecar textarea saves to .soul.md.
//   2. Create a throwaway role, edit it, delete it (confirm modal).
//   3. Skills module lists all skills read-only.

import { chromium } from 'playwright';
import { readFileSync, existsSync, unlinkSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const CONFIG_ROOT = join(homedir(), '.config', 'autoos');
const ROLES_DIR = join(CONFIG_ROOT, 'roles');

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(`PAGE_ERROR: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') errors.push(`CONSOLE_ERROR: ${m.text()}`); });

const results = { passed: true };
const fail = (m) => { results.passed = false; console.log('  ✗ FAIL: ' + m); };
const pass = (m) => console.log('  ✓ PASS: ' + m);

/** Click a sidebar module by its exact display name (avoids the ambiguity of
 *  :has-text, which also matches description text and name prefixes like
 *  "Roles" vs "Harness Roles"). */
async function clickModule(page, name) {
  // .nav-name holds the exact label; its parent .nav-item is the button.
  await page.locator('.nav-item .nav-name', { hasText: new RegExp(`^${name}$`) }).locator('..').click();
}

console.log('=== Opening http://localhost:17700 ===');
await page.goto('http://localhost:17700', { waitUntil: 'domcontentloaded', timeout: 10000 });
await page.waitForTimeout(800);

// Pre-clean any leftover test artifacts from prior failed runs.
for (const f of ['_e2e_role.at', '_e2e_role.at.bak', '_e2e_role.soul.md']) {
  try { unlinkSync(join(ROLES_DIR, f)); } catch {}
}

// ── Roles module ──────────────────────────────────────────────────────────
console.log('\n=== Module: Roles (collection browser) ===');
await clickModule(page, 'Roles');
await page.waitForTimeout(1500);

let listItems = await page.$$eval('.entity-list .e-name', (els) => els.map((e) => e.textContent));
console.log('  list:', listItems);
if (listItems.includes('assistant')) pass('roles list shows assistant');
else fail('assistant not in roles list');

// select assistant → check fields render
await page.click('.entity-list .e-row:has-text("assistant")');
await page.waitForTimeout(1200);
let labels = await page.$$eval('.field-label', (els) => els.map((e) => e.textContent?.replace(/\s+/g, ' ').trim()));
console.log('  labels:', labels.join(' | '));
if (labels.some((l) => l?.toLowerCase().includes('model tier'))) pass('model_tier field present');
else fail('model_tier field missing');
if (labels.some((l) => l?.toLowerCase().includes('soul'))) pass('soul sidecar textarea present');
else fail('soul sidecar missing');

// tier should be a select (enum)
// Plan 008 batch 4: select-kind fields render as free text + hint (D7).
const tierVal = await page.evaluate(() => {
  const labels = [...document.querySelectorAll('.field-label')];
  const tierLabel = labels.find((l) => l.textContent?.toLowerCase().includes('model tier'));
  if (!tierLabel) return null;
  const row = tierLabel.closest('.field-row');
  return row?.querySelector('input, select')?.value ?? null;
});
console.log('  tier field value:', tierVal);
if (tierVal) pass(`model_tier rendered as a control (=${tierVal})`);
else fail('model_tier input missing');

// ── Create / edit / delete a throwaway role ───────────────────────────────
console.log('\n=== Create → edit → delete role ===');
await page.click('.list-head button'); // "+" new (unified browser: the only list-head button)
await page.waitForTimeout(300);
await page.fill('.name-input', '_e2e_role');
await page.click('.create-row button:has-text("Add")');
// Wait for the created entity to appear and be selected (create + reloadList
// + select are three round-trips; a fixed 1500ms sleep flaked on a busy
// machine — Plan 006 baseline hardening).
try {
  await page.waitForSelector('.entity-list button:has-text("_e2e_role")', { timeout: 10000 });
} catch { /* fall through — the check below reports the failure */ }
try {
  await page.waitForSelector('.detail-pane button:has-text("Save")', { timeout: 10000 });
} catch { /* fall through — the Save click below times out with a clear error */ }

let createdInList = await page.$$eval('.entity-list .e-name', (els) => els.map((e) => e.textContent));
if (createdInList.includes('_e2e_role')) pass('created role appears in list');
else fail('created role not in list');

// the new role should be auto-selected; set description + tier + soul, save
await page.waitForTimeout(300);
// Fill the Description text field with a precise locator: the field-row whose
// label is exactly "Description", then its text input. (A loose hasText match
// would also catch the Name row or the Soul row.)
const descRow = page.locator('.field-row').filter({ has: page.locator('.field-label', { hasText: /^Description$/ }) }).first();
const descInput = descRow.locator('input').first();
if ((await descInput.count()) > 0) {
  await descInput.fill('E2E test role');
  // 2026-08-27 像素对拍：编辑为 onchange（失焦/回车）提交，无 Apply 按钮。
  await descInput.press('Tab');
  await page.waitForTimeout(400);
}
// set soul sidecar
const soulTextarea = await page.locator('textarea.sidecar');
if ((await soulTextarea.count()) === 1) {
  await soulTextarea.fill('# Soul\n\nTest personality.');
}
const dirtyBefore = await page.evaluate(() => !!document.querySelector('.dirty'));
if (dirtyBefore) pass('dirty shown after editing new role');
else fail('dirty not shown');

// first save → inline confirm row (Plan 008: state-driven, no dialog)
await page.click('.detail-pane button:has-text("Save")');
await page.waitForTimeout(400);
const yesBtn = page.locator('button:has-text("Yes, save")');
if (await yesBtn.count()) { await yesBtn.click(); }
await page.waitForTimeout(1500);

// verify files
const roleAt = join(ROLES_DIR, '_e2e_role.at');
const soulMd = join(ROLES_DIR, '_e2e_role.soul.md');
const atContent = readFileSync(roleAt, 'utf8');
console.log('  .at after save:', atContent.replace(/\s+/g, ' ').trim().slice(0, 80));
if (atContent.includes('E2E test role')) pass('description saved to .at');
else fail('description not in .at');
if (existsSync(soulMd)) {
  const soul = readFileSync(soulMd, 'utf8');
  if (soul.includes('Test personality.')) pass('soul saved to .soul.md');
  else fail('soul content mismatch');
} else fail('.soul.md not created');

// delete via confirm modal
await page.click('.detail-pane button:has-text("Delete")');
await page.waitForTimeout(400);
await page.click('.modal-actions button:has-text("Delete")');
await page.waitForTimeout(1200);
const afterDelete = await page.$$eval('.entity-list .e-name', (els) => els.map((e) => e.textContent));
if (!afterDelete.includes('_e2e_role')) pass('role deleted from list');
else fail('role still in list after delete');
// .bak may linger (safety net) — clean it
try { unlinkSync(roleAt); } catch {}
try { unlinkSync(roleAt + '.bak'); } catch {}
try { unlinkSync(soulMd); } catch {}

// ── Skills module (read-only) ─────────────────────────────────────────────
console.log('\n=== Module: Skills (read-only collection) ===');
await clickModule(page, 'Skills');
await page.waitForTimeout(1500);
const skillList = await page.$$eval('.entity-list .e-name', (els) => els.map((e) => e.textContent));
console.log('  skills:', skillList.length, 'items:', skillList.slice(0, 3).join(', '), '...');
if (skillList.length >= 5) pass(`skills list loaded (${skillList.length} items)`);
else fail(`expected several skills, got ${skillList.length}`);

// no "+ New" button for read-only collections
const newBtnVisible = await page.evaluate(() => {
  const b = document.querySelector('.list-head button');
  return b ? b.checkVisibility() : false;
});
if (!newBtnVisible) pass('no "New" button on read-only skills');
else fail('New button should be hidden for read-only skills');

// click one skill → read-only view
await page.click('.entity-list .e-row:has-text("brainstorming")');
await page.waitForTimeout(1000);
const roBadge = await page.evaluate(() => !!document.querySelector('.ro-badge'));
const skillBody = await page.evaluate(() => document.querySelector('.skill-body')?.textContent?.slice(0, 40));
if (roBadge) pass('read-only badge shown on skill');
else fail('read-only badge missing');
if (skillBody && skillBody.includes('Brainstorm')) pass('skill markdown body displayed');
else fail('skill body not shown');

console.log('\n=== Page errors during run ===');
if (errors.length === 0) pass('no page/console errors');
else errors.forEach((e) => fail(e));

await browser.close();
console.log(`\n=== RESULT: ${results.passed ? 'PASS' : 'FAIL'} ===`);
process.exit(results.passed ? 0 : 1);
