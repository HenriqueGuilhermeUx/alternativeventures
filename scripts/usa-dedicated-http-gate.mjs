/** GET-only, read-only security probe for four dedicated USA Netlify demo hosts.
 * Does not prove deploy SHA, browser isolation, human approval or release.
 * --self-test uses no network. --probe never follows redirects.
 */
import assert from 'node:assert/strict';

export const targets = Object.freeze([
  { name: 'av-usa-modo', host: 'av-usa-modo.netlify.app', paths: ['/', '/us', '/us/smartbots', '/us/demo', '/us/smartbots/demo'] },
  { name: 'av-usa-docwallet', host: 'av-usa-docwallet.netlify.app', paths: ['/', '/us', '/us/workspace'] },
  { name: 'av-usa-finsight', host: 'av-usa-finsight.netlify.app', paths: ['/', '/us'] },
  { name: 'av-usa-nexoffices', host: 'av-usa-nexoffices.netlify.app', paths: ['/us', '/us/'] },
]);
const blocked = Object.freeze([
  '/app', '/login', '/auth/login', '/admin', '/api/test', '/api/v1/health',
  '/checkout', '/billing', '/pix', '/wallet', '/pj', '/office', '/br',
  '/us/login', '/us/admin', '/us/api', '/us/checkout', '/nonexistent-usa-probe',
]);

function directives(value) {
  return new Map(String(value || '').split(';').map(x => x.trim()).filter(Boolean).map(x => {
    const [name, ...args] = x.split(/\s+/);
    return [name.toLowerCase(), args.join(' ').toLowerCase()];
  }));
}

export function assessResponse({ path, allowed, status, headers, body, redirected = false }) {
  const errors = [];
  if (redirected || (status >= 300 && status < 400)) errors.push('redirect');
  if (status !== (allowed ? 200 : 404)) errors.push('unexpected-http-status');
  if (allowed && status === 200) {
    const robots = String(headers?.['x-robots-tag'] || '').toLowerCase();
    if (!robots.includes('noindex') || !robots.includes('nofollow')) errors.push('missing-robots-header');
    if (String(headers?.['x-content-type-options'] || '').toLowerCase() !== 'nosniff') errors.push('missing-nosniff');
    const csp = directives(headers?.['content-security-policy']);
    for (const key of ['connect-src', 'form-action', 'object-src', 'base-uri']) {
      if (csp.get(key) !== "'none'") errors.push('unsafe-csp-' + key);
    }
    if (!/^text\/html(?:;|$)/i.test(String(headers?.['content-type'] || ''))) errors.push('unexpected-content-type');
    if (!/<html\s[^>]*lang=["']en-US["']/i.test(String(body || ''))) errors.push('missing-en-us-html');
    if (!/<meta\s[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(String(body || ''))) errors.push('missing-noindex-meta');
  }
  if (!allowed && status === 404) {
    const deniedBody = String(body || '');
    // A 404 status alone is insufficient: an SPA fallback could still render
    // the live Brazilian app and execute its scripts on a blocked URL.
    if (!/^text\/html(?:;|$)/i.test(String(headers?.['content-type'] || '')))
      errors.push('blocked-route-unexpected-content-type');
    if (!/<h1\b[^>]*>\s*Page\s+(?:not\s+(?:found|available)|unavailable)\b/i.test(deniedBody))
      errors.push('blocked-route-not-static-denial');
    if (/<(?:script|form|iframe)\b|<meta\b[^>]*http-equiv\s*=\s*["']?refresh\b/i.test(deniedBody))
      errors.push('blocked-route-has-active-content');
    if (/<title>[^<]*(login|sign in|checkout|pix|dashboard)/i.test(deniedBody))
      errors.push('blocked-route-serves-sensitive-app');
  }
  return { path, expected_status: allowed ? 200 : 404, observed_status: status,
    passed: errors.length === 0, errors };
}

async function fetchFixed(url) {
  const response = await fetch(url, {
    method: 'GET', redirect: 'manual', credentials: 'omit',
    headers: { Accept: 'text/html' }, signal: AbortSignal.timeout(12000),
  });
  return { status: response.status, headers: Object.fromEntries(response.headers),
    body: (await response.text()).slice(0, 50000),
    redirected: response.redirected || response.status >= 300 && response.status < 400 };
}

export async function probe({ get = fetchFixed } = {}) {
  const sites = [];
  for (const target of targets) {
    const routes = [];
    for (const path of [...target.paths, ...blocked]) {
      const allowed = target.paths.includes(path);
      try {
        routes.push(assessResponse({ path, allowed,
          ...await get(`https://${target.host}${path}`) }));
      } catch (error) {
        routes.push({ path, expected_status: allowed ? 200 : 404,
          observed_status: null, passed: false,
          errors: ['request-failed: ' + String(error?.message || error).slice(0, 120)] });
      }
    }
    sites.push({ site: target.name, host: target.host, routes,
      http_security_checks_passed: routes.every(route => route.passed) });
  }
  return { schema_version: 1,
    purpose: 'GET-only dedicated USA Netlify HTTP checks; not deploy provenance or release approval',
    sites, http_security_checks_passed: sites.every(site => site.http_security_checks_passed),
    deployed_sha_verified: false, browser_network_verified: false,
    human_review_completed: false, release_approved: false };
}

if (process.argv.includes('--self-test')) {
  const html = '<!doctype html><html lang="en-US"><head><meta name="robots" content="noindex,nofollow"></head><body>Demo only</body></html>';
  const headers = { 'content-type': 'text/html; charset=utf-8',
    'x-robots-tag': 'noindex, nofollow', 'x-content-type-options': 'nosniff',
    'content-security-policy': "default-src 'self'; connect-src 'none'; form-action 'none'; object-src 'none'; base-uri 'none'" };
  const good = { path: '/us', allowed: true, status: 200, headers, body: html };
  assert.equal(assessResponse(good).passed, true);
  for (const bad of [
    { ...good, status: 404 }, { ...good, status: 302, redirected: true },
    { ...good, headers: { ...headers,
      'content-security-policy': "connect-src 'self'; form-action 'none'; object-src 'none'; base-uri 'none'" } },
    { ...good, headers: { ...headers, 'x-robots-tag': 'index,follow' } },
    { ...good, headers: { ...headers, 'content-type': 'application/json' } },
    { ...good, body: html.replace('lang="en-US"', 'lang="pt-BR"') },
    { ...good, body: html.replace('noindex,nofollow', 'index,follow') },
    { ...good, headers: { ...headers, 'x-content-type-options': undefined } },
  ]) assert.equal(assessResponse(bad).passed, false, 'Must fail closed: ' + JSON.stringify(bad));
  assert.equal(assessResponse({ path: '/login', allowed: false, status: 404,
    headers, body: '<title>Not Found</title><h1>Page not found</h1>' }).passed, true);
  assert.equal(assessResponse({ path: '/login', allowed: false, status: 200,
    headers, body: html }).passed, false);
  assert.equal(assessResponse({ path: '/login', allowed: false, status: 404,
    headers, body: '<title>Login</title><h1>Page not found</h1>' }).passed, false);
  for (const deniedBody of [
    '<title>Not Found</title><div id="root"></div><script src="/assets/app.js"></script>',
    '<h1>Page not found</h1><form action="/login"></form>',
    '<h1>Page not found</h1><meta http-equiv="refresh" content="0;url=/login">',
  ]) assert.equal(assessResponse({ path: '/login', allowed: false, status: 404,
    headers, body: deniedBody }).passed, false, '404 must be an inert denial page');
  assert.equal(assessResponse({ path: '/login', allowed: false, status: 404,
    headers: { ...headers, 'content-type': 'application/javascript' },
    body: '<h1>Page not found</h1>' }).passed, false);
  const calls = [];
  const result = await probe({ get: async url => {
    calls.push(url);
    return blocked.some(path => url.endsWith(path))
      ? { status: 404, headers, body: '<title>Not Found</title><h1>Page not found</h1>' }
      : { status: 200, headers, body: html };
  } });
  assert.equal(result.http_security_checks_passed, true);
  assert.equal(result.release_approved, false);
  assert.equal(result.deployed_sha_verified, false);
  assert.equal(calls.length, targets.reduce((n, target) => n + target.paths.length + blocked.length, 0));
  assert.ok(calls.every(url => targets.some(target => url.startsWith(`https://${target.host}/`))));
  console.log('PASS: fixed USA hosts, root-route coverage, static inert 404 denials, CSP, noindex, redirects, fail-closed HTTP probe');
} else if (process.argv.includes('--probe')) {
  const result = await probe();
  console.log(JSON.stringify(result, null, 2));
  if (!result.http_security_checks_passed) process.exitCode = 1;
} else {
  console.error('Usage: node scripts/usa-dedicated-http-gate.mjs --self-test | --probe');
  process.exitCode = 2;
}
