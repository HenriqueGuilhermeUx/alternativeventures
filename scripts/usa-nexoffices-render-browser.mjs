/** Verify the separately hosted NexOffices USA demo before exposing it in the US portfolio.
 * No credentials, user records, payment rails, analytics or Brazilian APIs.
 */
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const base = 'https://nexoffices-usa-staging.onrender.com';
let browser;
try {
  browser = await chromium.launch({headless: true});
  mkdirSync('artifacts/usa-review', { recursive: true });
  for (const width of [320, 390, 1280]) {
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
    // Audit the *published* Render demo's accessible structure, not only its
    // screenshot. This remains a regression gate, not a human WCAG sign-off.
    assert.equal(await page.getByRole('main').count(), 1,
      'NexOffices USA needs exactly one main landmark at ' + width + 'px');
    assert.equal(await page.getByRole('heading', {level: 1}).count(), 1,
      'NexOffices USA needs exactly one h1 at ' + width + 'px');
    assert.match(await page.title(), /NexOffices USA/i,
      'NexOffices USA browser title must identify the English preview');
    const unnamedControls = await page.locator('input:not([type="hidden"]), select, textarea, button').evaluateAll(controls =>
      controls.filter(el => el.getClientRects().length > 0).filter(el => {
        const aria = el.getAttribute('aria-label')?.trim();
        const labelledBy = el.getAttribute('aria-labelledby')?.trim();
        const labels = 'labels' in el ? [...(el.labels || [])].some(label => label.textContent?.trim()) : false;
        const buttonText = el.tagName === 'BUTTON' && Boolean(el.textContent?.trim());
        return !aria && !labelledBy && !labels && !buttonText;
      }).map(el => el.outerHTML.slice(0, 180))
    );
    assert.deepEqual(unnamedControls, [],
      'NexOffices USA has visible controls without accessible names at ' + width + 'px');
    const brokenFragments = await page.locator('a[href^="#"]').evaluateAll(links =>
      links.map(link => link.getAttribute('href')).filter(href =>
        !href || href === '#' || !document.getElementById(href.slice(1)))
    );
    assert.deepEqual(brokenFragments, [],
      'NexOffices USA has broken in-page navigation at ' + width + 'px');
    assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'), 'noindex,nofollow');
    const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
    assert.match(csp, /connect-src 'none'/);
    assert.match(csp, /form-action 'none'/);
    assert.equal(await page.locator('.avnw-list article').count(), 3);
    assert.equal(await page.locator('.avsp-list article').count(), 3);
    await page.getByRole('heading', {name:'Know exactly what needs review.'}).waitFor();
    assert.equal(await page.locator('.avdr-list article').count(), 3);
    await page.getByRole('heading', {name:'Turn scattered signals into a next-step briefing.'}).waitFor();
    assert.equal(await page.locator('.avcb-list article').count(), 0);
    await page.getByRole('heading', {name:'One activity feed across the workspace.'}).waitFor();
    assert.equal(await page.locator('.avhub-events article').count(), 0);
    if (width === 390) {
      await page.getByLabel('Task description').fill('Fictional staging QA task');
      await page.getByRole('button', {name:'Add sample task'}).click();
      assert.equal(await page.locator('.avnw-list article').count(), 4);
      assert.ok((await page.locator('.avhub-events article').count()) >= 1, 'Task activity must appear in shared activity feed');
      await page.getByLabel('Opportunity title').fill('Fictional staging QA opportunity');
      await page.getByLabel('Fictional organization').fill('Example LLC');
      await page.getByRole('button', {name:'Add sample opportunity'}).click();
      assert.equal(await page.locator('.avsp-list article').count(), 4);
      assert.ok((await page.locator('.avhub-events article').count()) >= 2, 'CRM updates must appear in shared activity feed');
      await page.getByLabel('Fictional document title').fill('Sample legal-review checklist');
      await page.getByRole('button', {name:'Add sample document'}).click();
      assert.equal(await page.locator('.avdr-list article').count(), 4);
      await page.getByLabel('Filter demo activity').selectOption('Documents');
      assert.ok((await page.locator('.avhub-events article').count()) >= 1, 'Document workflow must update filtered activity feed');
      await page.getByLabel('Filter demo activity').selectOption('All');
      await page.getByLabel('Sample legal-review checklist review stage').selectOption('In review');
      await page.getByText('Sample legal-review checklist: Draft → In review').waitFor();
      await page.getByLabel('Sample team focus').selectOption('Documents');
      await page.getByRole('button', {name:'Prepare sample brief'}).click();
      await page.getByText('Documents sample briefing').waitFor();
      assert.equal(await page.locator('.avcb-list article').count(), 2);
      await page.getByRole('button', {name:'Mark Review the sample service proposal as reviewed'}).click();
      await page.getByText('1 of 2 reviewed').waitFor();
      // Synthetic interactions must not create browser-side records even when
      // the UI appears to reset on refresh. Check before reloading, too.
      const storedAfterActions = await page.evaluate(() => ({
        localKeys: Object.keys(localStorage),
        sessionKeys: Object.keys(sessionStorage),
        readableCookies: document.cookie,
      }));
      assert.deepEqual(storedAfterActions.localKeys, [], 'NexOffices sample actions wrote localStorage');
      assert.deepEqual(storedAfterActions.sessionKeys, [], 'NexOffices sample actions wrote sessionStorage');
      assert.equal(storedAfterActions.readableCookies, '', 'NexOffices sample actions wrote readable cookies');
      await page.reload({waitUntil:'domcontentloaded'});
      await page.getByRole('heading', {name:'Keep every next step visible.'}).waitFor();
      assert.equal(await page.locator('.avnw-list article').count(), 3, 'Task demo must not persist');
      assert.equal(await page.locator('.avsp-list article').count(), 3, 'CRM demo must not persist');
      assert.equal(await page.locator('.avdr-list article').count(), 3, 'Document review demo must not persist');
      assert.equal(await page.locator('.avdr-activity li').count(), 0, 'Review activity cannot persist');
      assert.equal(await page.locator('.avcb-list article').count(), 0, 'Sample coordination brief cannot persist');
      assert.equal(await page.locator('.avhub-events article').count(), 0, 'Cross-module activity cannot persist');
    }
    const viewport = await page.evaluate(() => document.documentElement.clientWidth);
    const scroll = await page.evaluate(() => document.documentElement.scrollWidth);
    assert.ok(scroll <= viewport + 2, 'Horizontal overflow at ' + width + ': ' + scroll);
    assert.deepEqual(errors, [], 'Runtime errors at ' + width);
    assert.deepEqual(forbiddenRequests, [], 'Unexpected external/API request at ' + width);
    // Mobile screenshots are taken without any user data; 390px is reloaded to discard all fictional test edits.
    await page.screenshot({ path: `artifacts/usa-review/nexoffices-${width}px.png`, fullPage: true, animations: 'disabled' });
    console.log('PASS: isolated NexOffices USA Render staging ' + width + 'px; interactive fictional data, no persistence, no network');
    await page.close();
  }
} finally { await browser?.close(); }
