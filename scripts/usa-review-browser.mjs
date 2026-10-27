/** Browser-check the generated, fictional-data review gallery before uploading it.
 * The generator verifies hashes; this checks that reviewers can actually open
 * and navigate all eighteen images, with no external requests or scripts.
 */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import { chromium } from 'playwright';

const base = 'http://127.0.0.1:4186';
const manifest = JSON.parse(readFileSync('artifacts/usa-review/manifest.json', 'utf8'));
const expected = new Map(manifest.captures.map(capture => [capture.file, capture]));
assert.equal(expected.size, 18, 'Gallery must have eighteen distinct evidence files');

const server = spawn('python3', ['-m', 'http.server', '4186', '--bind', '127.0.0.1',
  '--directory', 'artifacts/usa-review'], { stdio: ['ignore', 'ignore', 'pipe'] });
let serverErrors = '';
server.stderr.on('data', chunk => { serverErrors += String(chunk).slice(-1200); });
let browser;
try {
  let ready = false;
  for (let attempt = 0; attempt < 50; attempt++) {
    if (server.exitCode !== null) throw new Error('Gallery server exited: ' + serverErrors);
    try {
      if ((await fetch(base + '/review.html')).ok) { ready = true; break; }
    } catch { /* server starting */ }
    await sleep(200);
  }
  assert.ok(ready, 'Gallery test server did not start');
  browser = await chromium.launch({ headless: true });
  for (const width of [320, 390, 1280]) {
    const page = await browser.newPage({ viewport: { width, height: 850 } });
    const forbidden = [], errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', async route => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.origin !== base || !['GET', 'HEAD'].includes(request.method())) {
        forbidden.push(request.method() + ' ' + url.href);
        await route.abort('blockedbyclient');
      } else {
        await route.continue();
      }
    });
    const response = await page.goto(base + '/review.html', { waitUntil: 'domcontentloaded' });
    assert.ok(response?.ok(), 'Offline gallery HTML is unavailable');
    assert.equal(await page.locator('html').getAttribute('lang'), 'en-US');
    assert.equal(await page.getByRole('main').count(), 1);
    assert.equal(await page.getByRole('heading', { level: 1 }).count(), 1);
    assert.equal(await page.locator('section[aria-labelledby]').count(), 6);
    assert.equal(await page.locator('figure').count(), 18);
    assert.equal(await page.locator('script, form, input, textarea').count(), 0);
    assert.ok((await page.locator('body').innerText()).includes(manifest.pr_head_sha),
      'Gallery does not identify its exact PR HEAD');
    assert.ok((await page.locator('body').innerText()).includes('Manual review required.'),
      'Gallery must not imply automated production approval');
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    assert.ok(dimensions.content <= dimensions.viewport + 2,
      'Gallery horizontal overflow at ' + width + 'px: ' + JSON.stringify(dimensions));
    if (width === 390) {
      const images = await page.locator('figure img').all();
      for (const img of images) {
        const filename = await img.getAttribute('src');
        const capture = expected.get(filename);
        assert.ok(capture, 'Unexpected screenshot in gallery: ' + filename);
        assert.ok((await img.getAttribute('alt'))?.trim(),
          'Screenshot has no accessible alternative text: ' + filename);
        const link = img.locator('xpath=..');
        assert.equal(await link.getAttribute('href'), filename,
          'Full-resolution screenshot link is broken: ' + filename);
        await img.scrollIntoViewIfNeeded();
        const decoded = await img.evaluate(async element => {
          await element.decode();
          return { width: element.naturalWidth, height: element.naturalHeight };
        });
        assert.deepEqual(decoded, {
          width: capture.image_width_px, height: capture.image_height_px,
        }, 'Screenshot cannot be decoded at the documented dimensions: ' + filename);
      }
      await page.keyboard.press('Tab');
      // At least one keyboard-reachable screenshot link must have a visible focus ring.
      const first = page.locator('figure a').first();
      await first.focus();
      const focus = await first.evaluate(element => {
        const style = getComputedStyle(element);
        return { active: document.activeElement === element,
          outline: style.outlineStyle, width: parseFloat(style.outlineWidth) };
      });
      assert.ok(focus.active && focus.outline === 'solid' && focus.width >= 3,
        'Gallery screenshot links need a visible keyboard focus ring');
    }
    assert.deepEqual(errors, [], 'Gallery runtime errors at ' + width + 'px');
    assert.deepEqual(forbidden, [], 'Gallery attempted an external or write request');
    await page.close();
  }
  console.log('PASS: USA offline review gallery renders all 18 images; accessible navigation, 320/390/1280px, no external requests');
} finally {
  await browser?.close();
  server.kill('SIGTERM');
}
