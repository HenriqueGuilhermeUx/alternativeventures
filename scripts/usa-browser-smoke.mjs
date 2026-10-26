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
    page.on('request', request => {
      const url = new URL(request.url());
      const allowedFontHosts = ['fonts.googleapis.com', 'fonts.gstatic.com'];
      if (url.origin !== base && !allowedFontHosts.includes(url.hostname)) {
        unexpectedRequests.push(url.href);
      }
    });
    await page.goto(base + '/us/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.getByRole('heading', { name: /Build what matters/i }).waitFor();
    assert.equal(await page.locator('html').getAttribute('lang'), 'en-US');
    assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'), 'noindex,nofollow');
    assert.equal(await page.locator('article.card').count(), 5);
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
      assert.ok(target.href.startsWith('#') || target.href === '/' || target.href === '/us/' ||
        target.href.startsWith('https://'), 'Unapproved link scheme or destination: ' + target.href);
    }
    const allIds = await page.locator('[id]').evaluateAll(elements => elements.map(el => el.id));
    assert.equal(new Set(allIds).size, allIds.length, 'Duplicate DOM ids break label and fragment navigation');

    const names = await page.locator('article.card h3').allInnerTexts();
    assert.deepEqual(names, ['MODO', 'SmartBots', 'DocWallet', 'F-Insight', 'NexOffices']);
    const demos = await page.locator('a.product-demo-link').evaluateAll(links =>
      links.map(element => ({ url: element.getAttribute('href'), target: element.getAttribute('target'), rel: element.getAttribute('rel') }))
    );
    assert.equal(demos.length, 5);
    // WCAG-friendly touch targets: all five demo links must be at least 44px
    // tall and wide across narrow mobile and desktop viewports.
    for (const link of await page.locator('a.product-demo-link').all()) {
      const box = await link.boundingBox();
      assert.ok(box && box.height >= 44 && box.width >= 44,
        `Demo link touch target too small at ${width}px: ${JSON.stringify(box)}`);
    }
    // Primary header navigation is interactive on every viewport, not just the
    // five demo cards. Enforce generous touch targets for the logo and menu.
    for (const link of await page.locator('header a').all()) {
      const box = await link.boundingBox();
      assert.ok(box && box.height >= 44 && box.width >= 44,
        `Header navigation target too small at ${width}px: ${await link.getAttribute('href')} ${JSON.stringify(box)}`);
    }
    const expected = [
      'https://deploy-preview-163--modo1.netlify.app/us/demo',
      'https://deploy-preview-163--modo1.netlify.app/us/smartbots/demo',
      'https://deploy-preview-12--docwallet.netlify.app/us/workspace',
      'https://deploy-preview-26--f-insight.netlify.app/us',
      'https://nexoffices-usa-staging.onrender.com/us/',
    ];
    assert.deepEqual(demos.map(link => link.url), expected);
    for (const link of demos) {
      assert.equal(link.target, '_blank');
      assert.match(link.rel, /noopener/);
      assert.match(link.rel, /noreferrer/);
      assert.match(link.rel, /nofollow/);
    }
    assert.ok(await page.getByRole('link', {name:/Open NexOffices USA interactive preview/}).isVisible());
    const viewportWidth = await page.evaluate(() => document.documentElement.clientWidth);
    const contentWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    assert.ok(contentWidth <= viewportWidth + 2, 'Horizontal overflow at viewport ' + width + ': ' + contentWidth);
    if (width === 320) {
      await page.keyboard.press('Tab');
      const focused = await page.locator(':focus').getAttribute('class');
      assert.equal(focused, 'skip-link');
      await page.keyboard.press('Enter');
      assert.equal(new URL(page.url()).hash, '#main-content');
      assert.ok(await page.locator('#main-content').evaluate(element => document.activeElement === element), 'Skip link must move keyboard focus to main content');
    }
    if (width === 390) {
      // A direct refresh must retain the English preview rather than falling into a BR route.
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.getByRole('heading', { name: /Build what matters/i }).waitFor();
      assert.equal(await page.locator('html').getAttribute('lang'), 'en-US');
      assert.equal(await page.locator('a.product-demo-link').count(), 5);
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
  // Windows high-contrast mode: all five staging links must be reachable by
  // keyboard in document order, with a visible focus indicator.
  const contrast = await browser.newPage({
    viewport: { width: 390, height: 850 },
    forcedColors: 'active',
  });
  await contrast.goto(base + '/us/', { waitUntil: 'domcontentloaded' });
  await contrast.getByRole('heading', { name: /Build what matters/i }).waitFor();
  const expectedKeyboardLinks = await contrast.locator('a.product-demo-link').evaluateAll(
    links => links.map(link => link.getAttribute('href'))
  );
  const focusedKeyboardLinks = [];
  const focusedHeaderLinks = [];
  const expectedHeaderLinks = await contrast.locator('header a').evaluateAll(links => links.map(link => link.getAttribute('href')));
  for (let tab = 0; tab < 20 && focusedKeyboardLinks.length < 5; tab++) {
    await contrast.keyboard.press('Tab');
    const focus = await contrast.evaluate(() => {
      const element = document.activeElement;
      const style = getComputedStyle(element);
      return {
        className: element.className,
        inHeader: Boolean(element.closest('header')),
        href: element.getAttribute('href'),
        outlineStyle: style.outlineStyle,
        outlineWidth: parseFloat(style.outlineWidth),
      };
    });
    if (focus.inHeader) {
      assert.equal(focus.outlineStyle, 'solid', 'High-contrast header link needs a solid keyboard focus ring');
      assert.ok(focus.outlineWidth >= 3, 'High-contrast header focus ring must be at least 3px');
      focusedHeaderLinks.push(focus.href);
    }
    if (focus.className === 'product-demo-link') {
      assert.equal(focus.outlineStyle, 'solid', 'High-contrast demo link needs a solid keyboard focus ring');
      assert.ok(focus.outlineWidth >= 3, 'High-contrast demo link focus ring must be at least 3px');
      focusedKeyboardLinks.push(focus.href);
    }
  }
  assert.deepEqual(focusedKeyboardLinks, expectedKeyboardLinks,
    'All five USA demos must be keyboard reachable in order in forced-colors mode');
  assert.deepEqual(focusedHeaderLinks, expectedHeaderLinks,
    'Every header link must be keyboard reachable in order with a visible high-contrast focus ring');
  await contrast.close();
  console.log('PASS: institutional USA 320/390/1280px browser QA, refresh, reduced motion, keyboard focus, forced-colors keyboard navigation, approved-only network requests and staging links');
} finally {
  await browser?.close();
  server.kill('SIGTERM');
}
