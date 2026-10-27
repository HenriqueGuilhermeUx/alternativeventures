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

// The shared-BR debt audit must be bound to the same NexOffices PR HEAD as
// the Render provenance report. Four red checks are never silently waived.
const EXPECTED_SHARED_CI_DEBTS = [
  ['DocWallet Workspace Experience V1', 92],
  ['Product Discovery Onboarding V1', 93],
  ['NextGen Financial Engine V1', 94],
  ['Receiving Account Onboarding V1', 95],
];
const NEXOFFICE_RUN = /^https:\/\/github\.com\/HenriqueGuilhermeUx\/nexoffice\/actions\/runs\/[0-9]+$/;

export function assessSharedCiDebts(provenance, evidence) {
  const problems = [];
  const failures = Array.isArray(evidence?.failures) ? evidence.failures : [];
  if (evidence?.schema_version !== 1 || evidence?.pr_draft !== true ||
      !SHA.test(evidence?.pr_head_sha || '') || !SHA.test(evidence?.base_sha || '') ||
      evidence?.pr_head_sha?.toLowerCase() !==
        String(provenance?.expected_pr_head_sha || '').toLowerCase() ||
      evidence?.release_approved !== false || evidence?.legacy_status !== 'not-proven' ||
      failures.length !== 4) {
    problems.push('Missing, stale or invalid exact-HEAD NexOffices debt report');
  }
  for (const [workflow, issue] of EXPECTED_SHARED_CI_DEBTS) {
    const matches = failures.filter(row => row?.workflow === workflow);
    const row = matches[0];
    if (matches.length !== 1 ||
        row?.tracking_issue !==
          'https://github.com/HenriqueGuilhermeUx/nexoffice/issues/' + issue ||
        row?.exact_pr_head_verified !== true ||
        row?.pr_run_conclusion !== 'failure' ||
        !NEXOFFICE_RUN.test(row?.pr_run_url || '') ||
        !['unverified-no-equivalent-base-run',
          'requires-assertion-level-comparison'].includes(row?.baseline_classification) ||
        (row?.base_run_url !== null && !NEXOFFICE_RUN.test(row?.base_run_url || '')) ||
        (row?.base_run_url === null && row?.base_run_conclusion !== null) ||
        (row?.base_run_url === null &&
          row?.baseline_classification !== 'unverified-no-equivalent-base-run') ||
        (row?.base_run_url !== null &&
          row?.baseline_classification !== 'requires-assertion-level-comparison')) {
      problems.push('Missing or inconsistent shared-BR failure: ' + workflow);
    }
  }
  if (failures.some(row =>
    !EXPECTED_SHARED_CI_DEBTS.some(([workflow]) => workflow === row?.workflow))) {
    problems.push('Unexpected workflow in NexOffices debt report');
  }
  if (evidence?.exact_head_failed_count !== 4 ||
      evidence?.equivalent_base_run_count !==
        failures.filter(row => row?.base_run_url !== null).length) {
    problems.push('Inconsistent failure or baseline counts');
  }
  return {
    status: problems.length ? 'unverified' : 'four-failures-unresolved',
    exact_head_failed_count: problems.length ? 0 : 4,
    baseline_proven: false,
    problems,
  };
}

// GitGuardian is a separate check-run, not a fifth shared-product CI debt.
export function assessSecurityCheck(provenance, evidence) {
  const item = evidence?.security_check;
  const valid = evidence?.pr_head_sha?.toLowerCase() ===
      String(provenance?.expected_pr_head_sha || '').toLowerCase() &&
    SHA.test(evidence?.pr_head_sha || '') &&
    item?.name === 'GitGuardian Security Checks' &&
    item?.exact_pr_head_verified === true &&
    /^https:\/\/github\.com\/HenriqueGuilhermeUx\/nexoffice\/runs\/[0-9]+$/.test(item?.check_run_url || '');
  if (!valid) return 'unverified';
  if (item.classification === 'failed' && item.conclusion === 'failure') return 'failed';
  if (item.classification === 'passed' && item.conclusion === 'success') return 'passed';
  return 'unverified';
}

export function assess(manifest, provenance, netlify = null, ciDebts = null) {
  assert.equal(manifest.schema_version, 1, 'Unsupported screenshot manifest');
  assert.match(manifest.pr_head_sha, SHA, 'Invalid institutional PR HEAD');
  assert.equal(manifest.captures?.length, 18, 'Incomplete USA screenshot evidence');
  assert.equal(new Set(manifest.captures.map(item => item.file)).size, 18,
    'Duplicate screenshot evidence');
  assert.equal(provenance.schema_version, 1, 'Unsupported Render provenance report');
  assert.equal(provenance.pr, 'HenriqueGuilhermeUx/nexoffice#91', 'Unexpected Render PR');
  const reasons = [];
  const netlifyAssessment = assessNetlify(manifest, netlify);
  const sharedCiAssessment = assessSharedCiDebts(provenance, ciDebts);
  const securityStatus = assessSecurityCheck(provenance, ciDebts);
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
  if (sharedCiAssessment.status === 'unverified') {
    reasons.push('NexOffices shared-product CI debt evidence is missing, stale or inconsistent: ' +
      sharedCiAssessment.problems.join('; '));
  } else {
    reasons.push('Four NexOffices shared-product CI failures remain unclassified against baseline main');
  }
  if (securityStatus === 'failed') {
    reasons.push('NexOffices GitGuardian security check failed on the exact PR #91 HEAD; investigate separately from four BR CI debts');
  } else if (securityStatus !== 'passed') {
    reasons.push('NexOffices GitGuardian exact-HEAD security check evidence is missing or unverified');
  }
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
    nexoffices_shared_ci_debt_evidence: sharedCiAssessment.status,
    nexoffices_exact_head_failed_checks: sharedCiAssessment.exact_head_failed_count,
    nexoffices_shared_ci_baseline_proven: false,
    nexoffices_security_check_status: securityStatus,
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
  const ciDebts = {
    schema_version: 1, pr_draft: true, pr_head_sha: sha, base_sha: 'b'.repeat(40),
    release_approved: false, legacy_status: 'not-proven',
    exact_head_failed_count: 4, equivalent_base_run_count: 0,
    security_check: { name: 'GitGuardian Security Checks',
      exact_pr_head_verified: true,
      check_run_url: 'https://github.com/HenriqueGuilhermeUx/nexoffice/runs/123',
      conclusion: 'failure', classification: 'failed' },
    failures: EXPECTED_SHARED_CI_DEBTS.map(([workflow, issue], i) => ({
      workflow, tracking_issue: 'https://github.com/HenriqueGuilhermeUx/nexoffice/issues/' + issue,
      exact_pr_head_verified: true, pr_run_conclusion: 'failure',
      pr_run_url: 'https://github.com/HenriqueGuilhermeUx/nexoffice/actions/runs/' + (100 + i),
      base_run_url: null, base_run_conclusion: null,
      baseline_classification: 'unverified-no-equivalent-base-run',
    })),
  };
  assert.equal(assessSharedCiDebts(provenance, ciDebts).status, 'four-failures-unresolved');
  assert.equal(assess(manifest, provenance, netlify, ciDebts).nexoffices_exact_head_failed_checks, 4);
  assert.equal(assess(manifest, provenance, netlify, ciDebts).decision, 'not-approved');
  assert.equal(assessSecurityCheck(provenance, ciDebts), 'failed');
  assert.equal(assess(manifest, provenance, netlify, ciDebts).nexoffices_security_check_status, 'failed');
  assert.ok(assess(manifest, provenance, netlify, ciDebts).reasons.some(x => x.includes('GitGuardian security check failed')));
  assert.equal(assessSecurityCheck(provenance, { ...ciDebts, security_check: {
    ...ciDebts.security_check, conclusion: 'success', classification: 'passed' } }), 'passed');
  assert.equal(assessSecurityCheck(provenance, { ...ciDebts, security_check: {
    ...ciDebts.security_check, check_run_url: 'https://example.com/123' } }), 'unverified');
  assert.equal(assessSecurityCheck(provenance, { ...ciDebts, pr_head_sha: 'c'.repeat(40) }), 'unverified');
  assert.equal(assessSecurityCheck(provenance, { ...ciDebts, security_check: null }), 'unverified');
  assert.equal(assessSharedCiDebts(provenance, null).status, 'unverified');
  assert.equal(assessSharedCiDebts(provenance, { ...ciDebts,
    pr_head_sha: 'c'.repeat(40) }).status, 'unverified');
  assert.equal(assessSharedCiDebts(provenance, { ...ciDebts,
    exact_head_failed_count: 3 }).status, 'unverified');
  assert.equal(assessSharedCiDebts(provenance, { ...ciDebts,
    failures: [...ciDebts.failures.slice(0, 3), ciDebts.failures[0]] }).status, 'unverified');
  assert.equal(assessSharedCiDebts(provenance, { ...ciDebts,
    failures: ciDebts.failures.map((row, i) =>
      i === 0 ? { ...row, pr_run_conclusion: 'success' } : row) }).status, 'unverified');
  assert.equal(assessSharedCiDebts(provenance, { ...ciDebts,
    failures: ciDebts.failures.map((row, i) =>
      i === 0 ? { ...row, base_run_url: 'https://github.com/HenriqueGuilhermeUx/nexoffice/actions/runs/200',
        base_run_conclusion: 'failure',
        baseline_classification: 'requires-assertion-level-comparison' } : row),
    equivalent_base_run_count: 1 }).status, 'four-failures-unresolved');
  console.log('PASS: USA release readiness rejects missing, duplicated, stale and pending Netlify evidence; GitHub green is never release approval');
} else {
  const directory = 'artifacts/usa-review';
  const manifest = JSON.parse(readFileSync(`${directory}/manifest.json`, 'utf8'));
  const provenance = JSON.parse(readFileSync(`${directory}/nexoffices-render-provenance.json`, 'utf8'));
  const netlify = JSON.parse(readFileSync(`${directory}/netlify-status-evidence.json`, 'utf8'));
  const ciDebts = JSON.parse(readFileSync(`${directory}/nexoffices-shared-ci-debts.json`, 'utf8'));
  const report = assess(manifest, provenance, netlify, ciDebts);
  writeFileSync(`${directory}/release-readiness.json`, JSON.stringify(report, null, 2) + '\n');
  assert.equal(report.decision, 'not-approved', 'Automated CI must not grant release approval');
  console.log('PASS: review evidence release decision recorded as NOT APPROVED (' +
    report.reasons.length + ' outstanding conditions)');
}
