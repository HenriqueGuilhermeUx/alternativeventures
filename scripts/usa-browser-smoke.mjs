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
  console.log('PASS: institutional USA 320/390/1280px browser QA, refresh, reduced motion, keyboard focus, approved-only network requests and staging links');
} finally {
  await browser?.close();
  server.kill('SIGTERM');
}
