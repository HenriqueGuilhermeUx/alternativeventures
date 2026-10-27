/** Verify that linked Netlify staging previews actually render the expected US demo, not just HTTP 200. */
import assert from 'node:assert/strict';
import { readFileSync, mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const html = readFileSync('site/us/index.html', 'utf8');
const allDemoUrls = [...html.matchAll(/<a\b[^>]*class="product-demo-link"[^>]*href="([^"]+)"/g)].map(x => x[1]);
const urls = allDemoUrls.filter(url => new URL(url).hostname.endsWith('.netlify.app'));
assert.equal(allDemoUrls.length, 5, 'The USA portfolio must expose exactly five approved demo links');
assert.ok(allDemoUrls.includes('https://nexoffices-usa-staging.onrender.com/us/'), 'NexOffices Render link missing');
// The separate usa-nexoffices-render-browser test exercises the fifth, isolated Render demo.
const expectations = [
  { label: 'MODO USA', url: 'https://deploy-preview-163--modo1.netlify.app/us/demo', heading: 'Campaign brief' },
  { label: 'SmartBots USA', url: 'https://deploy-preview-163--modo1.netlify.app/us/smartbots/demo', heading: 'Lead inbox' },
  { label: 'DocWallet USA', url: 'https://deploy-preview-12--docwallet.netlify.app/us/workspace', heading: 'Document workspace' },
  { label: 'F-Insight USA', url: 'https://deploy-preview-26--f-insight.netlify.app/us', heading: 'Sharper financial research. A clearer way to decide.' },
];
assert.deepEqual(urls, expectations.map(x => x.url), 'Portal links diverged from the approved preview destinations');
let browser;
try {
  browser = await chromium.launch({ headless:true });
  mkdirSync('artifacts/usa-review', { recursive: true });
  for (const item of expectations) {
    const page = await browser.newPage({viewport:{width:390,height:844}});
    const runtimeErrors = [];
    const brazilianApiCalls = [];
    const blockedPreviewTelemetry = [];
    page.on('pageerror', error => runtimeErrors.push(error.message));
    // Fail closed *before* an accidental real request can reach a provider.
    // The previews are static, synthetic demos: no POSTs, backend endpoints,
    // third-party APIs, or Brazilian production traffic are authorized.
    // Netlify's own preview toolbar and read-only Google font assets are the
    // only permitted cross-origin exceptions.
    await page.route('**/*', async route => {
      const request = route.request();
      const u = new URL(request.url());
      const preview = new URL(item.url);
      const readOnly = request.method() === 'GET' || request.method() === 'HEAD';
      const samePreview = u.origin === preview.origin;
      const previewBackend = /^\/(?:api\/|\.netlify\/(?:functions|edge-functions)\/)/.test(u.pathname);
      const toolbar = u.protocol === 'https:' && u.hostname === 'app.netlify.com';
      const fontAsset = u.protocol === 'https:' && readOnly &&
        ['fonts.googleapis.com', 'fonts.gstatic.com'].includes(u.hostname);
      // Netlify-hosted previews can inject Segment/Bugsnag instrumentation.
      // Abort these known telemetry calls before transmission, record them
      // separately, and keep all unknown external/provider calls as failures.
      const previewTelemetry = u.protocol === 'https:' && (
        (readOnly && u.hostname === 'cdn.segment.com' && u.pathname.startsWith('/analytics.js/')) ||
        (request.method() === 'POST' && u.hostname === 'sessions.bugsnag.com' && u.pathname === '/')
      );
      if (previewTelemetry) {
        blockedPreviewTelemetry.push(request.method() + ' ' + u.href);
        await route.abort('blockedbyclient');
        return;
      }
      const forbidden = samePreview ? (!readOnly || previewBackend) : !(toolbar || fontAsset);
      if (forbidden) {
        brazilianApiCalls.push(request.method() + ' ' + u.href);
        await route.abort('blockedbyclient');
        return;
      }
      await route.continue();
    });
    const response = await page.goto(item.url, {waitUntil:'domcontentloaded',timeout:45000});
    assert.ok(response?.ok(), item.label + ' preview unavailable: ' + response?.status());
    await page.getByRole('heading',{name:item.heading}).waitFor({timeout:20000});
    assert.equal(await page.locator('html').getAttribute('lang'), 'en-US', item.label + ': locale mismatch');
    assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'), 'noindex,nofollow', item.label + ': indexing protection absent');
    // Review semantic accessibility on the real deployed US preview, not just
    // screenshots. This is a regression gate, not a substitute for human WCAG QA.
    assert.equal(await page.getByRole('main').count(), 1,
      item.label + ': expected exactly one main landmark');
    assert.equal(await page.getByRole('heading', { level: 1 }).count(), 1,
      item.label + ': expected exactly one page h1');
    assert.ok((await page.title()).trim().length >= 8,
      item.label + ': missing meaningful browser title');
    const unnamedControls = await page.locator('input:not([type="hidden"]), select, textarea, button').evaluateAll(controls =>
      controls.filter(el => el.getClientRects().length > 0).filter(el => {
        const aria = el.getAttribute('aria-label')?.trim();
        const labelledBy = el.getAttribute('aria-labelledby')?.trim();
        const labels = 'labels' in el ? [...(el.labels || [])].some(label => label.textContent?.trim()) : false;
        const text = el.tagName === 'BUTTON' && Boolean(el.textContent?.trim());
        return !aria && !labelledBy && !labels && !text;
      }).map(el => el.outerHTML.slice(0, 180))
    );
    assert.deepEqual(unnamedControls, [], item.label + ': visible form controls missing accessible names');
    assert.deepEqual(runtimeErrors, [], item.label + ': page errors');
    assert.deepEqual(brazilianApiCalls, [], item.label + ': unauthorized Brazilian API requests');
    // A direct refresh of every externally hosted /us route must stay in the English demo,
    // not fall through to a Brazilian application or a generic hosting error page.
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.getByRole('heading', { name: item.heading }).waitFor({ timeout: 20000 });
    assert.ok(new URL(page.url()).pathname.startsWith('/us'), item.label + ': refresh escaped the US route');
    assert.equal(await page.locator('html').getAttribute('lang'), 'en-US', item.label + ': refresh lost en-US');
    assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'), 'noindex,nofollow', item.label + ': refresh lost noindex');
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    assert.ok(dimensions.content <= dimensions.viewport + 2,
      item.label + ': horizontal overflow after refresh: ' + JSON.stringify(dimensions));
    assert.deepEqual(runtimeErrors, [], item.label + ': page errors after refresh');
    assert.deepEqual(brazilianApiCalls, [], item.label + ': unauthorized requests after refresh');
    // These public staging pages contain fictional examples only; screenshots never include customer accounts.
    const slug = item.label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    await page.screenshot({ path: `artifacts/usa-review/${slug}-390px.png`, fullPage: true, animations: 'disabled' });
    // Also inspect each externally hosted demo at desktop width. A mobile-only
    // screenshot cannot demonstrate responsive desktop layout or detect overflow.
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.getByRole('heading', { name: item.heading }).waitFor({ timeout: 20000 });
    const desktopDimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    assert.ok(desktopDimensions.content <= desktopDimensions.viewport + 2,
      item.label + ': desktop horizontal overflow: ' + JSON.stringify(desktopDimensions));
    assert.equal(await page.locator('html').getAttribute('lang'), 'en-US', item.label + ': desktop locale mismatch');
    assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'), 'noindex,nofollow', item.label + ': desktop indexing protection absent');
    assert.deepEqual(runtimeErrors, [], item.label + ': desktop page errors');
    assert.deepEqual(brazilianApiCalls, [], item.label + ': desktop unauthorized Brazilian API requests');
    await page.screenshot({ path: `artifacts/usa-review/${slug}-1280px.png`, fullPage: true, animations: 'disabled' });
    // Narrow 320px phones are a distinct layout boundary from 390px devices.
    // Verify the real deployed preview, not a local mock or screenshot alone.
    await page.setViewportSize({ width: 320, height: 850 });
    await page.getByRole('heading', { name: item.heading }).waitFor({ timeout: 20000 });
    const narrowDimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    assert.ok(narrowDimensions.content <= narrowDimensions.viewport + 2,
      item.label + ': 320px horizontal overflow: ' + JSON.stringify(narrowDimensions));
    assert.equal(await page.locator('html').getAttribute('lang'), 'en-US', item.label + ': 320px locale mismatch');
    assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'), 'noindex,nofollow', item.label + ': 320px indexing protection absent');
    assert.deepEqual(runtimeErrors, [], item.label + ': 320px page errors');
    assert.deepEqual(brazilianApiCalls, [], item.label + ': 320px unauthorized requests');
    await page.screenshot({ path: `artifacts/usa-review/${slug}-320px.png`, fullPage: true, animations: 'disabled' });
    // Cross-repository end-to-end verification: a rendering screenshot alone
    // cannot prove that the published preview's primary fictional workflow works.
    // Exercise only local demo state. Never upload files, send messages or use
    // accounts, payments, customer information or real providers.
    await page.setViewportSize({ width: 390, height: 844 });
    if (item.label === 'MODO USA') {
      await page.getByLabel('Business name').fill('Sample neighborhood studio');
      await page.getByLabel('Target audience').fill('Fictional local visitors');
      await page.getByRole('button', { name: 'Build sample plan' }).click();
      await page.getByText('Sample plan generated locally with predefined rules. No AI request was made.').waitFor();
      await page.getByRole('heading', { name: 'Position your offer' }).waitFor();
    } else if (item.label === 'SmartBots USA') {
      await page.getByLabel('Name or alias').fill('Sample: Avery');
      await page.getByLabel('Area of interest').fill('Fictional inquiry');
      await page.getByRole('button', { name: 'Add sample lead' }).click();
      await page.getByRole('button', { name: /Sample: Avery/i }).waitFor();
      await page.getByRole('button', { name: 'Reset demo' }).click();
      assert.equal(await page.getByRole('button', { name: /Sample: Avery/i }).count(), 0,
        'SmartBots demo reset must remove the fictional lead');
    } else if (item.label === 'DocWallet USA') {
      await page.getByRole('button', { name: 'Mark reviewed' }).first().click();
      assert.equal((await page.locator('.avus-grid article').nth(1).locator('h3').innerText()).trim(), '1',
        'DocWallet sample review must update the local queue');
      await page.getByRole('button', { name: 'Reset sample data' }).click();
      assert.equal((await page.locator('.avus-grid article').nth(1).locator('h3').innerText()).trim(), '2',
        'DocWallet reset must restore the fictional queue');
    } else if (item.label === 'F-Insight USA') {
      await page.getByLabel('Illustrative budget (USD)').fill('10000');
      await page.getByLabel('Stocks allocation (%)').fill('70');
      await page.getByLabel('Bonds allocation (%)').fill('40');
      assert.match(await page.locator('.avfi-error').innerText(), /no more than 100%/i,
        'F-Insight must reject an invalid hypothetical allocation');
      await page.getByRole('button', { name: 'Reset scenario' }).click();
      assert.equal(await page.getByLabel('Stocks allocation (%)').inputValue(), '50',
        'F-Insight must restore its fictional defaults');
    }
    // Browser refresh alone does not prove that fictional inputs were never
    // written to browser persistence. Assert the same isolated demo context
    // has no stored customer-like data after each sample interaction.
    const demoPersistence = await page.evaluate(() => ({
      localKeys: Object.keys(localStorage),
      sessionKeys: Object.keys(sessionStorage),
      readableCookies: document.cookie,
    }));
    assert.deepEqual(demoPersistence.localKeys, [],
      item.label + ': fictional workflow wrote localStorage');
    assert.deepEqual(demoPersistence.sessionKeys, [],
      item.label + ': fictional workflow wrote sessionStorage');
    assert.equal(demoPersistence.readableCookies, '',
      item.label + ': fictional workflow wrote readable cookies');
    // Functional demo interactions must not trigger real submission endpoints.
    // Network guards above cover the entire interaction, including asynchronous requests.
    const afterAction = await page.evaluate(() => ({
      locale: document.documentElement.lang,
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    assert.equal(afterAction.locale, 'en-US', item.label + ': workflow switched locale');
    assert.ok(afterAction.content <= afterAction.viewport + 2,
      item.label + ': interactive workflow introduced horizontal overflow: ' + JSON.stringify(afterAction));
    // A fictional workflow must never become a persistent customer record.
    // Reload the actual published preview after each interaction and verify
    // the initial state is restored without contacting any production API.
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.getByRole('heading', { name: item.heading }).waitFor({ timeout: 20000 });
    assert.equal(await page.locator('html').getAttribute('lang'), 'en-US',
      item.label + ': reload after interaction lost the US locale');
    if (item.label === 'MODO USA') {
      assert.equal(await page.getByText('Sample plan generated locally with predefined rules. No AI request was made.').count(), 0,
        'MODO fictional generated plan must not survive reload');
    } else if (item.label === 'SmartBots USA') {
      assert.equal(await page.getByRole('button', { name: /Sample: Avery/i }).count(), 0,
        'SmartBots fictional lead must not survive reload');
    } else if (item.label === 'DocWallet USA') {
      assert.equal((await page.locator('.avus-grid article').nth(1).locator('h3').innerText()).trim(), '2',
        'DocWallet fictional review queue must return to its initial state after reload');
    } else if (item.label === 'F-Insight USA') {
      assert.equal(await page.getByLabel('Stocks allocation (%)').inputValue(), '50',
        'F-Insight hypothetical allocation must not survive reload');
    }
    const postReloadDimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    assert.ok(postReloadDimensions.content <= postReloadDimensions.viewport + 2,
      item.label + ': post-workflow reload introduced horizontal overflow: ' + JSON.stringify(postReloadDimensions));
    // Exercise enlarged root text after the synthetic workflow and reload.
    // This is a focused reflow regression check, not a complete WCAG zoom audit.
    // It runs on the real deployed preview and cannot change product data.
    await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
    const enlarged = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    assert.ok(enlarged.content <= enlarged.viewport + 2,
      item.label + ': 200% root text scaling introduced horizontal overflow: ' + JSON.stringify(enlarged));
    assert.ok(await page.getByRole('heading', { name: item.heading }).isVisible(),
      item.label + ': primary heading disappeared after 200% root text scaling');
    // Test high-contrast/forced-color presentation and reduced motion on the
    // actual preview, not merely on the local source. Keep the 200% text scale
    // to catch compound accessibility regressions; no data or provider calls.
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    const accessibleDimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    assert.ok(accessibleDimensions.content <= accessibleDimensions.viewport + 2,
      item.label + ': forced colors + reduced motion + 200% text caused horizontal overflow: ' +
      JSON.stringify(accessibleDimensions));
    assert.ok(await page.getByRole('heading', { name: item.heading }).isVisible(),
      item.label + ': main heading hidden in forced-colors mode');
    const focusTarget = page.locator('button:not([disabled]):visible, input:not([disabled]):visible, select:not([disabled]):visible, textarea:not([disabled]):visible').first();
    assert.ok(await focusTarget.count(), item.label + ': no enabled, visible focusable demo control');
    await focusTarget.focus();
    assert.equal(await focusTarget.evaluate(el => document.activeElement === el), true,
      item.label + ': visible demo control cannot receive focus in forced-colors mode');
    await page.emulateMedia({ forcedColors: 'none', reducedMotion: 'no-preference' });
    assert.deepEqual(runtimeErrors, [], item.label + ': interactive demo runtime errors');
    assert.deepEqual(brazilianApiCalls, [], item.label + ': interactive demo attempted forbidden backend requests');
    console.log('PASS: ' + item.label + ' 320px + 390px + 1280px -> ' + item.url +
      '; preview telemetry requests blocked before transmission: ' + blockedPreviewTelemetry.length);
    await page.close();
  }
} finally { await browser?.close(); }
