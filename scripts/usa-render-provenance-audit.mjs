/** Read-only USA staging provenance diagnostic. This is not a release approval.
 * Never calls customer APIs, uses credentials, writes to staging or deploys.
 */
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';

const PR_API = 'https://api.github.com/repos/HenriqueGuilhermeUx/nexoffice/pulls/91';
const STAGING = 'https://nexoffices-usa-staging.onrender.com/us/';
const SHA = /^[0-9a-f]{40}$/i;

function meta(html, name) {
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const attrs = Object.fromEntries([...tag.matchAll(/([\w-]+)\s*=\s*(["'])(.*?)\2/g)]
      .map(([, key, , value]) => [key.toLowerCase(), value]));
    if (attrs.name === name) return attrs.content || null;
  }
  return null;
}

function classify(expected, published, source) {
  if (!SHA.test(expected || '')) return { status: 'unverified', reason: 'GitHub PR HEAD unavailable or invalid' };
  if (!SHA.test(published || '') || source !== 'render') return {
    status: 'unverified', reason: 'Published HTML lacks a full Render-sourced SHA attestation',
  };
  if (expected.toLowerCase() !== published.toLowerCase()) return {
    status: 'mismatched', reason: 'Published HTML claims a different commit from PR #91 HEAD',
  };
  return { status: 'matched-html-claim', reason: 'HTML claim matches HEAD; independent Render deploy API verification remains required' };
}

if (process.argv.includes('--self-test')) {
  const good = 'a'.repeat(40), old = 'b'.repeat(40);
  assert.equal(meta('<meta content="' + good + '" name="usa-preview-source-sha" />', 'usa-preview-source-sha'), good);
  assert.equal(meta("<meta name='usa-preview-source' content='render'>", 'usa-preview-source'), 'render');
  assert.equal(classify(good, good, 'render').status, 'matched-html-claim');
  assert.equal(classify(good, old, 'render').status, 'mismatched');
  assert.equal(classify(good, null, null).status, 'unverified');
  assert.equal(classify(good, good, 'ci').status, 'unverified');
  assert.equal(classify(null, good, 'render').status, 'unverified');
  console.log('PASS: Render provenance parser and fail-closed classification fixtures');
} else {
  const report = {
    schema_version: 1,
    purpose: 'Read-only USA demo provenance diagnostic; NOT deployment or production approval',
    pr: 'HenriqueGuilhermeUx/nexoffice#91',
    github_pr_api: PR_API,
    staging_url: STAGING,
    checked_at: new Date().toISOString(),
    expected_pr_head_sha: null,
    published_html_claimed_sha: null,
    published_html_claimed_source: null,
    status: 'unverified',
    reason: 'Audit not completed',
    independent_render_deploy_api_verified: false,
  };
  async function get(url, headers = {}) {
    const response = await fetch(url, {
      method: 'GET', redirect: 'error', headers,
      signal: AbortSignal.timeout(60000),
    });
    if (!response.ok) throw new Error('HTTP ' + response.status + ' from ' + new URL(url).hostname);
    return response;
  }
  try {
    const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'av-usa-ci-provenance-audit' };
    if (process.env.GITHUB_TOKEN) headers.Authorization = 'Bearer ' + process.env.GITHUB_TOKEN;
    const pr = await (await get(PR_API, headers)).json();
    assert.equal(pr.number, 91, 'Unexpected PR number');
    assert.equal(pr.head?.repo?.full_name, 'HenriqueGuilhermeUx/nexoffice', 'Unexpected PR source repo');
    assert.equal(pr.head?.ref, 'feature/usa-localized-preview-20261024', 'Unexpected PR source branch');
    assert.equal(pr.draft, true, 'USA PR is no longer draft');
    report.expected_pr_head_sha = pr.head.sha;
    const html = await (await get(STAGING)).text();
    report.published_html_claimed_sha = meta(html, 'usa-preview-source-sha');
    report.published_html_claimed_source = meta(html, 'usa-preview-source');
    Object.assign(report, classify(report.expected_pr_head_sha, report.published_html_claimed_sha,
      report.published_html_claimed_source));
  } catch (error) {
    report.status = 'unverified';
    report.reason = 'Read-only provenance lookup failed: ' + String(error.message || error).slice(0, 220);
  }
  mkdirSync('artifacts/usa-review', { recursive: true });
  writeFileSync('artifacts/usa-review/nexoffices-render-provenance.json', JSON.stringify(report, null, 2) + '\n');
  console.log('NexOffices USA staging provenance:', report.status, '-', report.reason);
  if (report.status !== 'matched-html-claim') {
    console.log('::warning::NexOffices Render staging is NOT proven to match PR #91 HEAD; do not approve full USA demo release.');
  }
}
