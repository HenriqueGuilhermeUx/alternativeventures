/** Verify that linked Netlify staging previews actually render the expected US demo, not just HTTP 200. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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
  for (const item of expectations) {
    const page = await browser.newPage({viewport:{width:390,height:844}});
    const runtimeErrors = [];
    const brazilianApiCalls = [];
    page.on('pageerror', error => runtimeErrors.push(error.message));
    page.on('request', request => {
      const u = new URL(request.url());
      const preview = new URL(item.url);
      const outsideProviders = ['onrender.com', 'supabase.co'].some(domain => u.hostname === domain || u.hostname.endsWith('.' + domain));
      const brazilApp = ['trymodo.com.br', 'trynexa.com.br', 'nexoffices.com.br'].includes(u.hostname);
      const previewApi = u.origin === preview.origin && u.pathname.startsWith('/api/');
      // The Netlify deploy-preview toolbar calls app.netlify.com telemetry APIs;
      // only block product API endpoints and Brazilian production destinations.
      if (outsideProviders || brazilApp || previewApi) brazilianApiCalls.push(u.href);
    });
    const response = await page.goto(item.url, {waitUntil:'domcontentloaded',timeout:45000});
    assert.ok(response?.ok(), item.label + ' preview unavailable: ' + response?.status());
    await page.getByRole('heading',{name:item.heading}).waitFor({timeout:20000});
    assert.equal(await page.locator('html').getAttribute('lang'), 'en-US', item.label + ': locale mismatch');
    assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'), 'noindex,nofollow', item.label + ': indexing protection absent');
    assert.deepEqual(runtimeErrors, [], item.label + ': page errors');
    assert.deepEqual(brazilianApiCalls, [], item.label + ': unauthorized Brazilian API requests');
    console.log('PASS: ' + item.label + ' -> ' + item.url);
    await page.close();
  }
} finally { await browser?.close(); }
