/** Read-only, fail-closed release decision for the synthetic USA demo artifact.
 * CI success and an HTML SHA claim never constitute production approval.
 * No network requests, credentials, deployment or customer data are used.
 */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';

const SHA = /^[0-9a-f]{40}$/i;

export function assess(manifest, provenance) {
  assert.equal(manifest.schema_version, 1, 'Unsupported screenshot manifest');
  assert.match(manifest.pr_head_sha, SHA, 'Invalid institutional PR HEAD');
  assert.equal(manifest.captures?.length, 18, 'Incomplete USA screenshot evidence');
  assert.equal(new Set(manifest.captures.map(item => item.file)).size, 18,
    'Duplicate screenshot evidence');
  assert.equal(provenance.schema_version, 1, 'Unsupported Render provenance report');
  assert.equal(provenance.pr, 'HenriqueGuilhermeUx/nexoffice#91', 'Unexpected Render PR');
  const reasons = [];
  if (!SHA.test(provenance.expected_pr_head_sha || '')) {
    reasons.push('NexOffices PR #91 HEAD could not be independently read');
  } else if (provenance.status !== 'matched-html-claim' ||
    provenance.published_html_claimed_source !== 'render' ||
    provenance.expected_pr_head_sha.toLowerCase() !==
      String(provenance.published_html_claimed_sha || '').toLowerCase()) {
    reasons.push('NexOffices published Render HTML does not attest the current PR #91 HEAD');
  }
  if (provenance.independent_render_deploy_api_verified !== true) {
    reasons.push('Independent Render deployment API verification is missing');
  }
  // Human sign-off and the shared Brazilian CI baseline cannot be inferred
  // from synthetic screenshots or a successful institutional CI workflow.
  reasons.push('Human accessibility and visual review has not been signed off');
  reasons.push('Four NexOffices shared-product CI failures require separate baseline disposition');
  return {
    schema_version: 1,
    purpose: 'USA fictional-data demo release decision; no commercial authorization',
    institutional_pr_head_sha: manifest.pr_head_sha,
    nexoffices_pr_head_sha: SHA.test(provenance.expected_pr_head_sha || '')
      ? provenance.expected_pr_head_sha : null,
    render_html_claim: provenance.published_html_claimed_sha || null,
    render_provenance_status: provenance.status,
    automated_artifact_evidence: 'available-for-review',
    decision: 'not-approved',
    reasons,
    next_step: 'Obtain independent Render deploy SHA evidence, classify BR baseline CI, and record human review before requesting any release approval',
  };
}

if (process.argv.includes('--self-test')) {
  const sha = 'a'.repeat(40);
  const manifest = { schema_version: 1, pr_head_sha: sha,
    captures: Array.from({ length: 18 }, (_, i) => ({ file: `sample-${i}.png` })) };
  const provenance = { schema_version: 1, pr: 'HenriqueGuilhermeUx/nexoffice#91',
    expected_pr_head_sha: sha, published_html_claimed_sha: sha,
    published_html_claimed_source: 'render', status: 'matched-html-claim',
    independent_render_deploy_api_verified: false };
  assert.equal(assess(manifest, provenance).decision, 'not-approved');
  assert.ok(assess(manifest, provenance).reasons.some(x => x.includes('Independent Render')));
  assert.ok(assess(manifest, { ...provenance, published_html_claimed_sha: null,
    status: 'unverified' }).reasons.some(x => x.includes('does not attest')));
  assert.ok(assess(manifest, { ...provenance, published_html_claimed_sha: 'b'.repeat(40),
    status: 'mismatched' }).reasons.some(x => x.includes('does not attest')));
  assert.throws(() => assess({ ...manifest, captures: [] }, provenance), /Incomplete/);
  assert.throws(() => assess({ ...manifest, pr_head_sha: 'invalid' }, provenance), /Invalid/);
  console.log('PASS: USA release readiness fails closed for unverified, mismatched and HTML-only provenance');
} else {
  const directory = 'artifacts/usa-review';
  const manifest = JSON.parse(readFileSync(`${directory}/manifest.json`, 'utf8'));
  const provenance = JSON.parse(readFileSync(`${directory}/nexoffices-render-provenance.json`, 'utf8'));
  const report = assess(manifest, provenance);
  writeFileSync(`${directory}/release-readiness.json`, JSON.stringify(report, null, 2) + '\n');
  assert.equal(report.decision, 'not-approved', 'Automated CI must not grant release approval');
  console.log('PASS: review evidence release decision recorded as NOT APPROVED (' +
    report.reasons.length + ' outstanding conditions)');
}
