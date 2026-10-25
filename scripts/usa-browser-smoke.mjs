/** Public-facing USA portfolio browser QA; local static files and no customer input. */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
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
  for (const width of [390, 1280]) {
    const page = await browser.newPage({ viewport: { width, height: 850 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
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
    assert.equal(demos.length, 4);
    const expected = [
      'https://deploy-preview-163--modo1.netlify.app/us/demo',
      'https://deploy-preview-163--modo1.netlify.app/us/smartbots/demo',
      'https://deploy-preview-12--docwallet.netlify.app/us/workspace',
      'https://deploy-preview-26--f-insight.netlify.app/us',
    ];
    assert.deepEqual(demos.map(link => link.url), expected);
    for (const link of demos) {
      assert.equal(link.target, '_blank');
      assert.match(link.rel, /noopener/);
      assert.match(link.rel, /noreferrer/);
      assert.match(link.rel, /nofollow/);
    }
    assert.ok(await page.getByText('NexOffices interactive preview link is withheld until a staging URL is verified.').isVisible());
    const viewportWidth = await page.evaluate(() => document.documentElement.clientWidth);
    const contentWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    assert.ok(contentWidth <= viewportWidth + 2, 'Horizontal overflow at viewport ' + width + ': ' + contentWidth);
    if (width === 390) {
      await page.keyboard.press('Tab');
      const focused = await page.locator(':focus').getAttribute('class');
      assert.equal(focused, 'skip-link');
      await page.keyboard.press('Enter');
      assert.equal(new URL(page.url()).hash, '#main-content');
    }
    assert.deepEqual(errors, [], 'USA corporate page runtime errors');
    await page.close();
  }
  console.log('PASS: institutional USA mobile/desktop browser QA, accessible navigation, stage-only demo links');
} finally {
  await browser?.close();
  server.kill('SIGTERM');
}
