/** Build an isolated, static-only institutional USA preview. No providers or BR functions. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SITE_ID = 'c54ab12d-5d1e-42d8-89ea-bf2348c87b59';
const BRANCH = 'feature/usa-portfolio-preview-20261024';
const SHA = /^[0-9a-f]{40}$/i;
const FORBIDDEN_ENV = /(?:^|_)(?:SUPABASE|DATABASE|POSTGRES|NEON|PRIVY|WOOVI|PIX|STRIPE|BELVO|PAYMENT|RENDER|FIREBASE|OPENAI|API_KEY|SECRET|TOKEN|PASSWORD|PRIVATE_KEY)(?:_|$)/i;
const REDIRECTS = [
  '/api', '/api/*', '/login', '/login/*', '/office', '/office/*',
  '/admin', '/admin/*', '/dev', '/dev/*', '/app', '/app/*',
  '/checkout', '/checkout/*', '/.netlify/functions/*',
].map(route => `${route} /404.html 404!`).join('\n') + '\n';
const HEADERS = `/*
  X-Robots-Tag: noindex, nofollow
  Content-Security-Policy: default-src 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; connect-src 'none'
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  Cache-Control: no-store
`;
const NOT_FOUND = '<!doctype html><html lang="en-US"><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><title>Not found</title><body><h1>Not found</h1><p>This USA preview does not provide this route.</p></body></html>\n';

export function validateEnvironment(env, gitHead) {
  assert.equal(env.SITE_ID, SITE_ID, 'USA-only Netlify site ID required');
  assert.equal(env.SITE_NAME, 'av-usa-institutional', 'USA-only Netlify site name required');
  assert.equal(env.CONTEXT, 'production', 'Only isolated production context is allowed');
  assert.equal(env.BRANCH, BRANCH, 'Only the isolated USA branch is allowed');
  assert.match(env.COMMIT_REF || '', SHA, 'Full immutable commit SHA required');
  assert.equal(env.COMMIT_REF.toLowerCase(), gitHead.toLowerCase(), 'Build SHA differs from checkout');
  const forbidden = Object.keys(env).filter(key => FORBIDDEN_ENV.test(key));
  assert.deepEqual(forbidden, [], 'Inherited provider, secret or BR integration env keys prohibited');
}

export function buildStatic(html, output) {
  assert.match(html, /^<!doctype html>/i, 'Expected standalone HTML entry');
  assert.match(html, /<html lang="en-US">/i, 'Expected US-localized HTML');
  assert.match(html, /<meta name="robots" content="noindex,nofollow"/i, 'Noindex is mandatory');
  assert.match(html, /script-src 'none'/, 'Browser script execution must be disabled');
  assert.match(html, /connect-src 'none'/, 'Outbound connections must be disabled');
  assert.doesNotMatch(html, /<\s*(?:script|form|iframe|object|embed|link)\b/i, 'No executable or remote HTML elements');
  assert.doesNotMatch(html, /\son[a-z]+\s*=/i, 'No inline event handlers');
  assert.doesNotMatch(html, /\b(?:https?:)?\/\//i, 'No external resource or BR service URLs');
  // This preview needs no resource-loading elements. Reject them rather than
  // relying on CSP or a browser to normalize ambiguous attributes.
  assert.doesNotMatch(html, /<\s*(?:base|img|audio|video|source|picture|svg|math)\b/i,
    'No alternate resource or navigation elements');
  // The sole http-equiv is the reviewed CSP. A refresh tag (even with an
  // unquoted or entity-encoded value) must never navigate a preview visitor.
  const equivMentions = [...html.matchAll(/\bhttp-equiv\s*=/gi)];
  const cspMeta = [...html.matchAll(/\bhttp-equiv\s*=\s*(["'])Content-Security-Policy\1/gi)];
  assert.equal(equivMentions.length, 1, 'Only one CSP http-equiv is allowed');
  assert.equal(cspMeta.length, 1, 'Only the CSP http-equiv is allowed');
  // The old quoted-href scan silently accepted href=/login and duplicate
  // href attributes. Count every href token on each actual anchor, then
  // require exactly one quoted, fragment-only destination.
  const anchors = [...html.matchAll(/<\s*a\b[^>]*>/gi)].map(match => match[0]);
  assert.ok(anchors.length > 0, 'At least one local navigation anchor required');
  for (const anchor of anchors) {
    assert.equal([...anchor.matchAll(/\bhref\s*=/gi)].length, 1,
      'Exactly one href per anchor required');
    assert.match(anchor, /\bhref\s*=\s*(["'])#[a-z][a-z0-9-]*\1/i,
      'Only quoted internal fragment links allowed');
    assert.doesNotMatch(anchor, /\b(?:ping|download|target|formaction|action|src|srcset)\s*=/i,
      'No alternate anchor navigation or submission attributes');
  }
  mkdirSync(output, { recursive: true });
  assert.deepEqual(readdirSync(output), [], 'Publish directory must be empty before static build');
  for (const [name, content] of Object.entries({
    'index.html': html, '404.html': NOT_FOUND, 'robots.txt': 'User-agent: *\nDisallow: /\n',
    '_headers': HEADERS, '_redirects': REDIRECTS,
  })) writeFileSync(join(output, name), content);
  assert.deepEqual(readdirSync(output).sort(), ['404.html', '_headers', '_redirects', 'index.html', 'robots.txt'].sort());
}

if (process.argv.includes('--self-test')) {
  const head = 'a'.repeat(40);
  const valid = { SITE_ID, SITE_NAME: 'av-usa-institutional', CONTEXT: 'production',
    BRANCH, COMMIT_REF: head };
  validateEnvironment(valid, head);
  for (const bad of [
    { SITE_ID: '58d7984d-6f50-4caf-86b2-0ee9e954f53e' },
    { SITE_NAME: 'bucolic-smakager-91800f' }, { CONTEXT: 'deploy-preview' },
    { BRANCH: 'main' }, { COMMIT_REF: 'b'.repeat(40) },
    { SUPABASE_URL: 'placeholder' }, { STRIPE_SECRET_KEY: 'placeholder' },
  ]) assert.throws(() => validateEnvironment({ ...valid, ...bad }, head));
  const html = '<!doctype html><html lang="en-US"><meta name="robots" content="noindex,nofollow"><meta http-equiv="Content-Security-Policy" content="script-src \'none\'; connect-src \'none\'"><a href="#products">Products</a></html>';
  const dir = mkdtempSync(join(tmpdir(), 'av-usa-static-'));
  try {
    buildStatic(html, dir);
    for (const name of ['index.html', '404.html', 'robots.txt', '_headers', '_redirects'])
      assert.ok(readFileSync(join(dir, name), 'utf8').length > 0);
    assert.throws(() => buildStatic(html, dir), /must be empty/);
    for (const fragment of ['<script>alert(1)</script>', '<form></form>', '<a href="/login">Login</a>',
      '<a href="https://example.com">External</a>', '<img onerror="alert(1)">',
      '<a href=/login>Login</a>', '<a href="#products" href=/login>Duplicate</a>',
      '<a href="#products" target="_blank">Target</a>',
      '<meta http-equiv=refresh content="0;url=/login">',
      '<meta http-equiv="&#114;efresh" content="0;url=/login">',
      '<base href="/login">'])
      assert.throws(() => buildStatic(html + fragment, join(dir, 'invalid')),
        /No |Only |Exactly one|quoted internal/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
  console.log('PASS: USA institutional static-only build guard rejects BR site, branch, integration keys and unsafe HTML');
} else {
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  validateEnvironment(process.env, head);
  buildStatic(readFileSync('site/us/index.html', 'utf8'), 'dist-usa-institutional');
  console.log('PASS: isolated institutional USA static preview packaged without BR functions or routes');
}
