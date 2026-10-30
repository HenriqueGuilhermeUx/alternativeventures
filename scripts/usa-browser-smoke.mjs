/** Public-facing USA portfolio browser QA; local static files and no customer input. */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import { chromium } from 'playwright';

const base = 'http://127.0.0.1:4185';
const server = spawn('python3', ['-m', 'http.server', '4185', '--bind', '127.0.0.1', '--directory', 'site'], {
  stdio: ['ignore', 'pipe', 'pipe'],
});
let errorText = '';
server.stderr.on('data', chunk => { errorText += String(chunk).slice(-1500); });
let browser;
try {
  let running = false;
  for (let attempt = 0; attempt < 50; attempt++) {
    if (server.exitCode !== null) throw new Error('Static server exited: ' + errorText);
    try { if ((await fetch(base + '/us/')).ok) { running = true; break; } }
    catch { /* still starting */ }
    await sleep(300);
  }
  assert.ok(running, 'Static preview failed to start');
  browser = await chromium.launch({ headless: true });
  mkdirSync('artifacts/usa-review', { recursive: true });
  for (const width of [320, 390, 1280]) {
    const page = await browser.newPage({ viewport: { width, height: 850 } });
    const errors = [];
    const unexpectedRequests = [];
    page.on('pageerror', error => errors.push(error.message));
    // Fail closed before a third-party or mutating request can leave the
    // institutional page. This static portfolio needs no remote font service.
    await page.route('**/*', async route => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.origin !== base || !['GET', 'HEAD'].includes(request.method())) {
        unexpectedRequests.push(request.method() + ' ' + url.href);
        await route.abort('blockedbyclient');
        return;
      }
      await route.continue();
    });
    await page.goto(base + '/us/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.getByRole('heading', { name: /Build what matters/i }).waitFor();
    assert.equal(await page.locator('html').getAttribute('lang'), 'en-US');
    assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'), 'noindex,nofollow');
    // Browser-level guard: verify that the deployed HTML exposes the same
    // deny-by-default policy as the static contract, on every screen size.
    const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
    assert.ok(csp, 'Institutional preview must publish a CSP');
    for (const directive of ["script-src 'none'", "connect-src 'none'", "form-action 'none'", "object-src 'none'", "frame-src 'none'", "base-uri 'none'"]) {
      assert.ok(csp.split(';').map(x => x.trim()).includes(directive),
        'Institutional preview CSP missing ' + directive);
    }

    assert.equal(await page.locator('article.card').count(), 5);
    // A portfolio preview must remain informational: no collection surfaces,
    // browser persistence, or account-creation controls are permitted here.
    assert.equal(await page.locator('form, input, textarea, select').count(), 0,
      'USA institutional preview must not collect visitor data');
    const browserState = await page.evaluate(() => ({
      local: localStorage.length,
      session: sessionStorage.length,
      cookies: document.cookie,
      scriptCount: document.scripts.length,
    }));
    assert.equal(browserState.local, 0, 'USA institutional preview must not write localStorage');
    assert.equal(browserState.session, 0, 'USA institutional preview must not write sessionStorage');
    assert.equal(browserState.cookies, '', 'USA institutional preview must not set readable cookies');
    assert.equal(browserState.scriptCount, 0,
      'USA institutional preview must be script-free under its deny-all CSP');

    // Prevent inaccessible or ambiguous navigation as new US products are added.
    assert.equal(await page.getByRole('main').count(), 1, 'Exactly one main landmark is required');
    assert.equal(await page.getByRole('heading', { level: 1 }).count(), 1, 'Exactly one page h1 is required');
    const linkAudit = await page.locator('a').evaluateAll(links => links.map(link => ({
      href: link.getAttribute('href'),
      name: (link.getAttribute('aria-label') || link.innerText || '').trim(),
    })));
    for (const link of linkAudit) {
      assert.ok(link.href && link.href !== '#', 'Navigation link has an empty or placeholder destination');
      assert.ok(link.name.length > 0, 'Navigation link is missing an accessible name: ' + link.href);
    }
    // Validate that all local fragment links resolve to real targets and that
    // staging links cannot silently downgrade to HTTP or unknown destinations.
    const navigationTargets = await page.locator('a').evaluateAll(links => links.map(link => {
      const href = link.getAttribute('href') || '';
      return { href, exists: href.startsWith('#') ? Boolean(document.getElementById(href.slice(1))) : true };
    }));
    for (const target of navigationTargets) {
      assert.ok(target.exists, 'Broken internal navigation fragment: ' + target.href);
      assert.ok(target.href.startsWith('#') || target.href.startsWith('https://'),
        'USA preview cannot navigate to Brazilian or unapproved local routes: ' + target.href);
    }
    assert.equal(await page.locator('a[href="/"], a[href="/us/"], a[hreflang="pt-BR"]').count(), 0,
      'USA institutional preview must not link into Brazilian routes');
    const allIds = await page.locator('[id]').evaluateAll(elements => elements.map(el => el.id));
    assert.equal(new Set(allIds).size, allIds.length, 'Duplicate DOM ids break label and fragment navigation');

    const names = await page.locator('article.card h3').allInnerTexts();
    assert.deepEqual(names, ['MODO', 'SmartBots', 'DocWallet', 'F-Insight', 'NexOffices']);
    // Do not make legacy or unverified staging environments clickable from
    // the institutional USA portfolio, even when their own CI is green.
    const pendingDemos = page.locator('p.product-demo-pending');
    assert.equal(await pendingDemos.count(), 5, 'Five product previews must be visibly gated');
    assert.equal(await page.locator('a[href^="https://"], a.product-demo-link').count(), 0,
      'Unverified external demo navigation must remain absent');
    for (const notice of await pendingDemos.all()) {
      assert.ok(await notice.isVisible(), 'Pending-deploy disclosure must be visible');
      assert.match(await notice.innerText(), /pending independent deploy verification/i);
    }
    const sampleDataNotice = page.locator('#usa-demo-data-note');
    assert.equal(await sampleDataNotice.count(), 1, 'Fictional-data warning must have one unique target');
    assert.ok(await sampleDataNotice.isVisible(), 'Fictional-data warning must be visible');
    assert.match(await sampleDataNotice.innerText(), /Do not enter personal, customer, financial, or confidential information/i);
    // Primary header navigation is interactive on every viewport, not just the
    // five demo cards. Enforce generous touch targets for the logo and menu.
    for (const link of await page.locator('header a').all()) {
      const box = await link.boundingBox();
      assert.ok(box && box.height >= 44 && box.width >= 44,
        `Header navigation target too small at ${width}px: ${await link.getAttribute('href')} ${JSON.stringify(box)}`);
    }
    const stagingCaveat = page.locator('#nexoffices-preview-note');
    assert.equal(await stagingCaveat.count(), 1, 'NexOffices provenance caveat must have a unique id');
    assert.ok(await stagingCaveat.isVisible(), 'NexOffices provenance caveat must be visible');
    assert.match(await stagingCaveat.innerText(), /dedicated USA preview not yet deployed/i);
    assert.match(await stagingCaveat.innerText(), /not approved or linked/i);
    // Text-only zoom is a critical narrow-screen accessibility regression check.
    // Do not assert font metrics: enforce usable navigation and zero horizontal scroll.
    if (width === 320) {
      await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
      const scaledWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const scaledViewport = await page.evaluate(() => document.documentElement.clientWidth);
      assert.ok(scaledWidth <= scaledViewport + 2,
        '200% root text scaling must not create horizontal overflow: ' + scaledWidth);
      assert.ok(await page.getByRole('link', { name: 'Products', exact: true }).isVisible(),
        'Products navigation must remain visible after text scaling');
    }
    const viewportWidth = await page.evaluate(() => document.documentElement.clientWidth);
    const contentWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    assert.ok(contentWidth <= viewportWidth + 2, 'Horizontal overflow at viewport ' + width + ': ' + contentWidth);
    if (width === 320) {
      await page.keyboard.press('Tab');
      const focused = await page.locator(':focus').getAttribute('class');
      assert.equal(focused, 'skip-link');
      await page.keyboard.press('Enter');
      assert.equal(new URL(page.url()).hash, '#main-content');
      // Chromium may update the fragment before completing focus navigation.
      // Wait for the actual keyboard focus transition; do not weaken the assertion.
      await page.waitForFunction(() => document.activeElement?.id === 'main-content', null, { timeout: 5000 });
      assert.ok(await page.locator('#main-content').evaluate(element => document.activeElement === element), 'Skip link must move keyboard focus to main content');
    }
    if (width === 390) {
      // A direct refresh must retain the English preview rather than falling into a BR route.
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.getByRole('heading', { name: /Build what matters/i }).waitFor();
      assert.equal(await page.locator('html').getAttribute('lang'), 'en-US');
      assert.equal(await page.locator('p.product-demo-pending').count(), 5);
      // Verify real in-page navigation after refresh, not just static href attributes.
      await page.getByRole('link', { name: 'Products', exact: true }).click();
      assert.equal(new URL(page.url()).hash, '#products', 'Products navigation must reach its section');
      await page.getByRole('link', { name: 'Our approach', exact: true }).click();
      assert.equal(new URL(page.url()).hash, '#approach', 'Approach navigation must reach its section');
    }
    assert.deepEqual(errors, [], 'USA corporate page runtime errors');
    assert.deepEqual(unexpectedRequests, [], 'Institutional USA preview must not contact unapproved APIs or remote hosts');
    // Only the fictional-data institutional page is captured for human visual review.
    await page.screenshot({ path: `artifacts/usa-review/institutional-${width}px.png`, fullPage: true, animations: 'disabled' });
    await page.close();
  }
  // Respect operating-system reduced-motion preferences; avoid forced smooth scrolling.
  const reduced = await browser.newPage({ viewport: { width: 390, height: 850 }, reducedMotion: 'reduce' });
  await reduced.goto(base + '/us/', { waitUntil: 'domcontentloaded' });
  assert.equal(await reduced.locator('html').evaluate(element => getComputedStyle(element).scrollBehavior), 'auto');
  await reduced.close();
  // Windows high-contrast mode: every remaining navigation control must
  // be keyboard reachable in document order. Pending previews must never
  // masquerade as clickable links or enter the tab sequence.
  const contrast = await browser.newPage({
    viewport: { width: 390, height: 850 },
    forcedColors: 'active',
  });
  await contrast.goto(base + '/us/', { waitUntil: 'domcontentloaded' });
  await contrast.getByRole('heading', { name: /Build what matters/i }).waitFor();
  assert.equal(await contrast.locator('a.product-demo-link, a.product-demo-pending').count(), 0,
    'Unverified demo cards must not enter keyboard navigation');
  const expectedKeyboardLinks = await contrast.locator('a').evaluateAll(
    links => links.map(link => link.getAttribute('href'))
  );
  assert.deepEqual(expectedKeyboardLinks,
    ['#main-content', '#main-content', '#products', '#approach', '#products', '#approach'],
    'Only verified local institutional navigation may be focusable');
  const focusedKeyboardLinks = [];
  for (let tab = 0; tab < expectedKeyboardLinks.length; tab++) {
    await contrast.keyboard.press('Tab');
    const focus = await contrast.evaluate(() => {
      const element = document.activeElement;
      const style = getComputedStyle(element);
      return {
        href: element.getAttribute('href'),
        outlineStyle: style.outlineStyle,
        outlineWidth: parseFloat(style.outlineWidth),
      };
    });
    assert.equal(focus.outlineStyle, 'solid', 'Every keyboard navigation link needs a visible high-contrast focus ring');
    assert.ok(focus.outlineWidth >= 3, 'High-contrast focus ring must be at least 3px');
    focusedKeyboardLinks.push(focus.href);
  }
  assert.deepEqual(focusedKeyboardLinks, expectedKeyboardLinks,
    'All allowed navigation links must be keyboard reachable in order');
  await contrast.close();
  console.log('PASS: institutional USA 320/390/1280px browser QA, refresh, reduced motion, keyboard focus, forced-colors keyboard navigation, zero third-party requests and gated demo cards');
} finally {
  await browser?.close();
  server.kill('SIGTERM');
}
