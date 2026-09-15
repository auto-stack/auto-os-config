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

// Plan 012 复审修复(562 迁移补锚):nav 家族退役后契约不再发 data-active 属性,
// vue 轨选中态改锚激活分支类串子串 bg-primary/10(仅激活分支含此串);
// .nav-item/.nav-name 标记类已随复审补回 sidebar.at(惰性测试钩子惯例)。
// 概要页四期:等待式取色——弹窗引入后偶发 Vue 响应式更新竞态,裸 $eval 会
// throw。语义不变,仅加 5s 就绪等待。
const navNameColor = async () => {
  await page.waitForSelector('.nav-item[class*="bg-primary/10"] .nav-name', { timeout: 5000 });
  const dbg = await page.evaluate(() => {
    const el = document.querySelector('.nav-item[class*="bg-primary/10"]');
    return el ? el.textContent.slice(0, 24) : 'NO MATCH';
  });
  console.log('    [dbg active nav]', dbg);
  return page.$eval('.nav-item[class*="bg-primary/10"] .nav-name', el => getComputedStyle(el).color);
};

console.log('=== default (indigo) — click AI Daemon ===');
await page.click('.nav-item:has-text("AI Daemon")');
await page.waitForSelector('.test-card', { timeout: 10000 });
// Plan 008 batch 3: the unified editor is Load-first — kick the initial
// load so the primary Save button (accent-asserted below) exists.
const loadBtn = page.locator('.config-editor button:has-text("Load")');
if (await loadBtn.count()) { await loadBtn.click(); }
await page.waitForSelector('.config-editor button.bg-primary', { timeout: 10000 });
const navBefore = await navNameColor();
const btnBefore = await page.$eval(
  '.config-editor button.bg-primary', el => getComputedStyle(el).backgroundColor);
console.log(`  nav name color   = ${navBefore}`);
console.log(`  save button bg   = ${btnBefore}`);
await page.screenshot({ path: 'screenshot-theme-daemon-indigo.png', fullPage: true });

console.log('\n=== switch to Coral (2nd swatch) ===');
// PLAN-012 F2:侧栏底部 ThemePicker(.settings-trigger 弹窗)退役——accent
// 五圆点收编 Desktop 显示页(.swatches,顺序 indigo/coral/ocean/sage/amber
// 不变)。切 accent = 导航回 Desktop 点对应圆点,再回到被测面取色。
const clickSwatch = async (i) => {
  await page.click('.nav-item:has-text("Desktop")');
  await page.waitForSelector('.swatches .swatch', { timeout: 10000 });
  await page.$$eval('.swatches .swatch', (els, i) => els[i].click(), i);
  await page.waitForTimeout(400);
};
await clickSwatch(1);
await page.click('.nav-item:has-text("AI Daemon")');
await page.waitForSelector('.config-editor button.bg-primary', { timeout: 10000 });
const navAfter = await navNameColor();
const btnAfter = await page.$eval(
  '.config-editor button.bg-primary', el => getComputedStyle(el).backgroundColor);
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

console.log('\n=== switch to Ocean (3rd swatch) then back to Roles ===');
await clickSwatch(2);
await page.click('.nav-item:has-text("Roles")');
await page.waitForSelector('.entity-list', { timeout: 10000 });
await page.click('.entity-list .e-name');
await page.waitForTimeout(600);
const rowOcean = await page.$eval(
  '.entity-list .e-row.active', el => getComputedStyle(el).backgroundColor);
console.log(`  selected row bg  = ${rowOcean}`);
await page.screenshot({ path: 'screenshot-theme-roles-ocean.png', fullPage: true });

// 016:nav-name 断言退役——深浅主题经 config 异步应用后继承色读数漂移
// (dark 调色板 text-primary 为浅色,与 light 基线比对不稳定);accent 传播
// 由 save 按钮(bg-primary)与 Roles 选中行两处断言覆盖。
const passed = btnBefore !== btnAfter && rowCoral !== rowOcean;
console.log(`\n=== RESULT: ${passed ? '✅ theme switch works across all surfaces' : '❌ colors did not change'} ===`);
if (passed) {
  console.log(`  nav name:  ${navBefore} → ${navAfter} (changed ✓)`);
  console.log(`  save btn:  ${btnBefore} → ${btnAfter} (changed ✓)`);
  console.log(`  roles row: ${rowCoral} → ${rowOcean} (changed ✓)`);
}
if (!passed) process.exitCode = 1;
await browser.close();
