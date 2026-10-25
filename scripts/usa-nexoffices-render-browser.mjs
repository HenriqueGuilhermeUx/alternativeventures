/** Verify the separately hosted NexOffices USA demo before exposing it in the US portfolio.
 * No credentials, user records, payment rails, analytics or Brazilian APIs.
 */
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = 'https://nexoffices-usa-staging.onrender.com';
let browser;
try {
  browser = await chromium.launch({headless: true});
  for (const width of [390, 1280]) {
    const page = await browser.newPage({viewport: {width, height: 844}});
    const errors = [], forbiddenRequests = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('request', request => {
      const url = new URL(request.url());
      const sameOrigin = url.origin === base;
      if (!sameOrigin || url.pathname.startsWith('/api/')) forbiddenRequests.push(url.href);
    });
    const response = await page.goto(base + '/us/', {waitUntil: 'domcontentloaded', timeout: 60000});
    assert.ok(response?.ok(), 'Render USA /us/ is unavailable: ' + response?.status());
    await page.getByRole('heading', {name: 'One place to keep the business moving.'}).waitFor({timeout:30000});
    await page.getByRole('heading', {name: 'See how a business command center could work.'}).waitFor();
    await page.getByRole('heading', {name: 'Keep every next step visible.'}).waitFor();
    assert.equal(await page.locator('html').getAttribute('lang'), 'en-US');
    assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'), 'noindex,nofollow');
    const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
    assert.match(csp, /connect-src 'none'/);
    assert.match(csp, /form-action 'none'/);
    assert.equal(await page.locator('.avnw-list article').count(), 3);
    assert.equal(await page.locator('.avsp-list article').count(), 3);
    if (width === 390) {
      await page.getByLabel('Task description').fill('Fictional staging QA task');
      await page.getByRole('button', {name:'Add sample task'}).click();
      assert.equal(await page.locator('.avnw-list article').count(), 4);
      await page.getByLabel('Opportunity title').fill('Fictional staging QA opportunity');
      await page.getByLabel('Fictional organization').fill('Example LLC');
      await page.getByRole('button', {name:'Add sample opportunity'}).click();
      assert.equal(await page.locator('.avsp-list article').count(), 4);
      await page.reload({waitUntil:'domcontentloaded'});
      await page.getByRole('heading', {name:'Keep every next step visible.'}).waitFor();
      assert.equal(await page.locator('.avnw-list article').count(), 3, 'Task demo must not persist');
      assert.equal(await page.locator('.avsp-list article').count(), 3, 'CRM demo must not persist');
    }
    const viewport = await page.evaluate(() => document.documentElement.clientWidth);
    const scroll = await page.evaluate(() => document.documentElement.scrollWidth);
    assert.ok(scroll <= viewport + 2, 'Horizontal overflow at ' + width + ': ' + scroll);
    assert.deepEqual(errors, [], 'Runtime errors at ' + width);
    assert.deepEqual(forbiddenRequests, [], 'Unexpected external/API request at ' + width);
    console.log('PASS: isolated NexOffices USA Render staging ' + width + 'px; interactive fictional data, no persistence, no network');
    await page.close();
  }
} finally { await browser?.close(); }
