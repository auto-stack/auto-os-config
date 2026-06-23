import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

const consoleMsgs = [];
page.on('console', msg => consoleMsgs.push(`[${msg.type()}] ${msg.text()}`));
page.on('pageerror', err => consoleMsgs.push(`[PAGE_ERROR] ${err.message}`));
page.on('requestfailed', req => consoleMsgs.push(`[REQ_FAIL] ${req.url()} ${req.failure()?.errorText}`));

console.log('=== Opening http://localhost:17700 ===');
await page.goto('http://localhost:17700', { waitUntil: 'networkidle', timeout: 10000 });
await page.waitForTimeout(2000);

// Check sidebar
const navItems = await page.$$eval('.nav-item .nav-name', els => els.map(e => e.textContent));
console.log('Nav items:', navItems);

// Click "AI Daemon"
console.log('\n=== Clicking AI Daemon ===');
await page.click('text=AI Daemon');
await page.waitForTimeout(5000);

// Check content area
const contentText = await page.$eval('.content-body', el => el.textContent);
console.log('Content (first 300 chars):', contentText?.slice(0, 300));

// Check for error
const errorMsg = await page.$('.state-msg.error');
if (errorMsg) {
  console.log('ERROR:', (await errorMsg.textContent())?.slice(0, 200));
} else {
  console.log('NO ERROR — checking for config form...');
  // Look for provider cards or form elements
  const hasProvider = await page.$('.provider-card, .aaid-config, input');
  console.log('Has form elements:', !!hasProvider);
  if (hasProvider) {
    // Take a screenshot
    await page.screenshot({ path: 'screenshot-daemon-config.png', fullPage: true });
    console.log('Screenshot saved: screenshot-daemon-config.png');
  }
}

console.log('\n=== Browser console ===');
consoleMsgs.forEach(m => console.log(m));

await browser.close();
console.log('\n=== Done ===');
