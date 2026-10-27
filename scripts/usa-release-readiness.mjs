/** Read-only, fail-closed release decision for the synthetic USA demo artifact.
 * CI success and an HTML SHA claim never constitute production approval.
 * No network requests, credentials, deployment or customer data are used.
 */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';

const SHA = /^[0-9a-f]{40}$/i;

const EXPECTED_NETLIFY_PRS = [
  'HenriqueGuilhermeUx/modo#163',
  'HenriqueGuilhermeUx/docwallet#12',
  'HenriqueGuilhermeUx/f-insight#26',
  'HenriqueGuilhermeUx/alternativeventures#3',
];

// GitHub commit statuses are useful review evidence, never proof of the
// actual deployed bytes. Missing, stale or duplicated records fail closed.
export function assessNetlify(manifest, evidence) {
  const entries = Array.isArray(evidence?.previews) ? evidence.previews : [];
  const problems = [];
  if (evidence?.schema_version !== 1 || entries.length !== 4 ||
      evidence?.github_status_success_count !== 4) {
    problems.push('Incomplete or invalid four-preview status report');
  }
  for (const pr of EXPECTED_NETLIFY_PRS) {
    const matches = entries.filter(item => item?.pr === pr);
    const item = matches[0];
    if (matches.length !== 1 || !SHA.test(item?.pr_head_sha || '') ||
        item?.draft_open_expected_branch !== true ||
        item?.github_reports_success_for_exact_head !== true ||
        item?.github_netlify_state !== 'success' ||
        item?.classification !== 'github-status-success-only' ||
        item?.independently_verified_live_deploy_sha !== false) {
      problems.push('Missing, duplicate, invalid or non-success exact-HEAD status for ' + pr);
    }
    if (pr === 'HenriqueGuilhermeUx/alternativeventures#3' &&
        item?.pr_head_sha?.toLowerCase() !== manifest.pr_head_sha.toLowerCase()) {
      problems.push('Institutional Netlify status does not match screenshot manifest HEAD');
    }
  }
  if (entries.some(item => !EXPECTED_NETLIFY_PRS.includes(item?.pr))) {
    problems.push('Unexpected preview identity in status report');
  }
  return {
    status: problems.length ? 'unverified' : 'github-status-success-only',
    github_status_success_count: entries.filter(item =>
      item?.github_reports_success_for_exact_head === true).length,
    independently_verified_live_deploy_sha: false,
    problems,
  };
}

export function assess(manifest, provenance, netlify = null) {
  assert.equal(manifest.schema_version, 1, 'Unsupported screenshot manifest');
  assert.match(manifest.pr_head_sha, SHA, 'Invalid institutional PR HEAD');
  assert.equal(manifest.captures?.length, 18, 'Incomplete USA screenshot evidence');
  assert.equal(new Set(manifest.captures.map(item => item.file)).size, 18,
    'Duplicate screenshot evidence');
  assert.equal(provenance.schema_version, 1, 'Unsupported Render provenance report');
  assert.equal(provenance.pr, 'HenriqueGuilhermeUx/nexoffice#91', 'Unexpected Render PR');
  const reasons = [];
  const netlifyAssessment = assessNetlify(manifest, netlify);
  if (netlifyAssessment.status !== 'github-status-success-only') {
    reasons.push('Netlify exact-HEAD preview status evidence is incomplete or inconsistent: ' +
      netlifyAssessment.problems.join('; '));
  }
  reasons.push('Netlify deployed bundle SHAs have not been independently verified');
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
    netlify_preview_status: netlifyAssessment.status,
    netlify_github_success_count: netlifyAssessment.github_status_success_count,
    netlify_independent_deploy_sha_verified: false,
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
  const previews = EXPECTED_NETLIFY_PRS.map(pr => ({
    pr, pr_head_sha: sha, draft_open_expected_branch: true,
    github_reports_success_for_exact_head: true, github_netlify_state: 'success',
    classification: 'github-status-success-only',
    independently_verified_live_deploy_sha: false,
  }));
  const netlify = { schema_version: 1, github_status_success_count: 4, previews };
  assert.equal(assessNetlify(manifest, netlify).status, 'github-status-success-only');
  assert.equal(assess(manifest, provenance, netlify).netlify_preview_status, 'github-status-success-only');
  assert.equal(assess(manifest, provenance, netlify).decision, 'not-approved');
  assert.equal(assessNetlify(manifest, { ...netlify, previews: previews.slice(1) }).status, 'unverified');
  assert.equal(assessNetlify(manifest, { ...netlify, previews: [...previews.slice(0, 3), previews[0]] }).status, 'unverified');
  assert.equal(assessNetlify(manifest, { ...netlify, previews: previews.map(p =>
    p.pr.endsWith('alternativeventures#3') ? { ...p, pr_head_sha: 'b'.repeat(40) } : p) }).status, 'unverified');
  assert.equal(assessNetlify(manifest, { ...netlify, previews: previews.map(p =>
    p.pr.endsWith('modo#163') ? { ...p, github_netlify_state: 'pending' } : p) }).status, 'unverified');
  assert.equal(assessNetlify(manifest, { ...netlify, previews: previews.map(p =>
    p.pr.endsWith('modo#163') ? { ...p, independently_verified_live_deploy_sha: true } : p) }).status, 'unverified');
  assert.equal(assessNetlify(manifest, null).status, 'unverified');
  console.log('PASS: USA release readiness rejects missing, duplicated, stale and pending Netlify evidence; GitHub green is never release approval');
} else {
  const directory = 'artifacts/usa-review';
  const manifest = JSON.parse(readFileSync(`${directory}/manifest.json`, 'utf8'));
  const provenance = JSON.parse(readFileSync(`${directory}/nexoffices-render-provenance.json`, 'utf8'));
  const netlify = JSON.parse(readFileSync(`${directory}/netlify-status-evidence.json`, 'utf8'));
  const report = assess(manifest, provenance, netlify);
  writeFileSync(`${directory}/release-readiness.json`, JSON.stringify(report, null, 2) + '\n');
  assert.equal(report.decision, 'not-approved', 'Automated CI must not grant release approval');
  console.log('PASS: review evidence release decision recorded as NOT APPROVED (' +
    report.reasons.length + ' outstanding conditions)');
}
