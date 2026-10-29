/** Read-only CI evidence for the four separate NexOffices Brazilian smoke failures.
 * Never classifies a failure as pre-existing without a comparable main run.
 * No credentials, production writes, deployments, or real customer data.
 */
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';

const OWNER = 'HenriqueGuilhermeUx';
const REPO = OWNER + '/nexoffice';
const SHA = /^[a-f0-9]{40}$/i;
const BRANCH = 'feature/usa-localized-preview-20261024';
const DEBTS = [
  { name: 'DocWallet Workspace Experience V1', issue: 92 },
  { name: 'Product Discovery Onboarding V1', issue: 93 },
  { name: 'NextGen Financial Engine V1', issue: 94 },
  { name: 'Receiving Account Onboarding V1', issue: 95 },
];

const CONTRACT_PATHS = [
  "apps/web/src/DocumentWorkspaceBridge.tsx",
  "apps/web/src/ProductDiscovery.tsx",
  "apps/web/src/FinancialEngineCollectionsCenter.tsx",
  "apps/web/src/ReceivingAccountOnboardingBridge.tsx",
  "scripts/smoke-docwallet-workspace-experience-v1.mjs",
  "scripts/smoke-product-discovery-onboarding-v1.mjs",
  "scripts/smoke-nextgen-financial-engine-v1.mjs",
  "scripts/smoke-receiving-account-onboarding-v1.mjs"
];

/** Same blob SHA proves identical file bytes on these two exact commits,
 * not a passing baseline workflow or a historical root cause. */
export function assessSourceParity(records) {
  const entries = CONTRACT_PATHS.map(path => {
    const matches = Array.isArray(records) ? records.filter(row => row?.path === path) : [];
    const row = matches.length === 1 ? matches[0] : null;
    const valid = Boolean(row && SHA.test(row.head_sha || '') && SHA.test(row.base_sha || ''));
    return {
      path,
      head_blob_sha: valid ? row.head_sha : null,
      base_blob_sha: valid ? row.base_sha : null,
      identical: valid && row.head_sha.toLowerCase() === row.base_sha.toLowerCase(),
    };
  });
  const complete = Array.isArray(records) && records.length === CONTRACT_PATHS.length &&
    entries.every(row => row.head_blob_sha && row.base_blob_sha);
  const identical = complete && entries.every(row => row.identical);
  return {
    classification: identical ? 'identical-file-bytes-on-exact-head-and-base' : 'unverified-or-diverged',
    expected_file_count: CONTRACT_PATHS.length,
    identical_file_count: entries.filter(row => row.identical).length,
    entries,
    baseline_workflow_result_proven: false,
    regression_cause_proven: false,
    release_approved: false,
  };
}

export function assess(pr, headRuns, mainRuns, mainTotal = 0, securityChecks = null) {
  assert.equal(pr?.number, 91, 'Unexpected NexOffices PR');
  assert.equal(pr?.state, 'open', 'NexOffices PR is not open');
  assert.equal(pr?.draft, true, 'NexOffices PR is no longer draft');
  assert.equal(pr?.head?.ref, BRANCH, 'Unexpected NexOffices branch');
  assert.equal(pr?.head?.repo?.full_name, REPO, 'Unexpected source repository');
  assert.match(pr?.head?.sha || '', SHA, 'Invalid NexOffices HEAD');
  assert.match(pr?.base?.sha || '', SHA, 'Invalid base SHA');
  assert.equal(pr?.base?.ref, 'main', 'Unexpected NexOffices base branch');
  assert.ok(Array.isArray(headRuns) && Array.isArray(mainRuns), 'Missing workflow runs');
  const head = pr.head.sha;
  const base = pr.base.sha;
  const failures = DEBTS.map(({ name, issue }) => {
    const matches = headRuns.filter(run => run?.name === name && run?.head_sha === head);
    const run = matches.find(run => run.conclusion === 'failure') || matches[0];
    const mainMatches = mainRuns.filter(run => run?.name === name && run?.head_sha === base);
    const baseline = mainMatches[0] || null;
    return {
      workflow: name,
      tracking_issue: 'https://github.com/' + REPO + '/issues/' + issue,
      pr_run_url: run?.html_url || null,
      pr_run_conclusion: run?.conclusion || 'missing',
      exact_pr_head_verified: Boolean(run && run.head_sha === head),
      base_run_url: baseline?.html_url || null,
      base_run_conclusion: baseline?.conclusion || null,
      baseline_classification: baseline ? 'requires-assertion-level-comparison' : 'unverified-no-equivalent-base-run',
    };
  });
  // GitGuardian is a separate security gate, not one of the four shared-BR workflows.
  // Missing, duplicated or non-completed check-runs remain unverified.
  const securityMatches = Array.isArray(securityChecks) ? securityChecks.filter(run =>
    run?.name === 'GitGuardian Security Checks' && run?.head_sha === head) : [];
  const security = securityMatches.length === 1 ? securityMatches[0] : null;
  const securityClassification = !security || security.status !== 'completed'
    ? 'unverified' : security.conclusion === 'success' ? 'passed'
      : security.conclusion === 'failure' ? 'failed' : 'unverified';
  return {
    schema_version: 1,
    purpose: 'Read-only NexOffices USA PR #91 shared-BR CI debt audit; not a release approval',
    pr_head_sha: head,
    base_sha: base,
    pr_draft: true,
    failures,
    security_check: {
      name: 'GitGuardian Security Checks',
      exact_pr_head_verified: Boolean(security && security.head_sha === head),
      check_run_url: security?.html_url || null,
      conclusion: security?.conclusion || 'missing',
      classification: securityClassification,
    },
    exact_head_failed_count: failures.filter(f => f.exact_pr_head_verified && f.pr_run_conclusion === 'failure').length,
    equivalent_base_run_count: failures.filter(f => f.base_run_url).length,
    main_run_window: { query_scope: 'exact-base-sha', returned: mainRuns.length,
      total: mainTotal, potentially_truncated: mainTotal > mainRuns.length },
    legacy_status: 'not-proven',
    release_approved: false,
  };
}

if (process.argv.includes('--self-test')) {
  const head = 'a'.repeat(40), base = 'b'.repeat(40);
  const pr = { number: 91, state: 'open', draft: true,
    head: { sha: head, ref: BRANCH, repo: { full_name: REPO } }, base: { sha: base, ref: 'main' } };
  const runs = DEBTS.map((d, i) => ({
    name: d.name, head_sha: head, conclusion: 'failure',
    html_url: 'https://github.com/' + REPO + '/actions/runs/' + (100 + i),
  }));
  const report = assess(pr, runs, [], 438);
  assert.equal(report.exact_head_failed_count, 4);
  assert.equal(report.equivalent_base_run_count, 0);
  assert.equal(report.legacy_status, 'not-proven');
  assert.equal(report.main_run_window.query_scope, 'exact-base-sha');
  assert.equal(report.main_run_window.potentially_truncated, true);
  assert.equal(report.release_approved, false);
  assert.equal(report.security_check.classification, 'unverified');
  const check = { name: 'GitGuardian Security Checks', head_sha: head,
    status: 'completed', conclusion: 'failure',
    html_url: 'https://github.com/' + REPO + '/runs/123' };
  assert.equal(assess(pr, runs, [], 0, [check]).security_check.classification, 'failed');
  assert.equal(assess(pr, runs, [], 0, [{ ...check, conclusion: 'success' }]).security_check.classification, 'passed');
  assert.equal(assess(pr, runs, [], 0, [check, check]).security_check.classification, 'unverified');
  assert.equal(assess(pr, runs, [], 0, [{ ...check, head_sha: base }]).security_check.classification, 'unverified');
  const sameFiles = CONTRACT_PATHS.map(path => ({ path, head_sha: head, base_sha: head }));
  assert.equal(assessSourceParity(sameFiles).classification,
    'identical-file-bytes-on-exact-head-and-base');
  assert.equal(assessSourceParity(sameFiles).baseline_workflow_result_proven, false);
  assert.equal(assessSourceParity(sameFiles).release_approved, false);
  assert.equal(assessSourceParity(sameFiles.slice(1)).classification, 'unverified-or-diverged');
  assert.equal(assessSourceParity([...sameFiles.slice(1), sameFiles[1]]).classification,
    'unverified-or-diverged');
  assert.equal(assessSourceParity(sameFiles.map((row, i) =>
    i === 0 ? { ...row, base_sha: base } : row)).classification, 'unverified-or-diverged');
  assert.equal(assessSourceParity(sameFiles.map((row, i) =>
    i === 0 ? { ...row, base_sha: 'invalid' } : row)).classification, 'unverified-or-diverged');
  assert.equal(report.failures[0].baseline_classification, 'unverified-no-equivalent-base-run');
  assert.equal(assess(pr, runs, [{ ...runs[0], head_sha: base }], 1).equivalent_base_run_count, 1);
  assert.equal(assess(pr, runs.slice(1), [], 0).exact_head_failed_count, 3);
  assert.throws(() => assess({ ...pr, draft: false }, runs, []), /draft/);
  assert.throws(() => assess({ ...pr, base: { ...pr.base, ref: 'release' } }, runs, []), /base branch/);
  assert.throws(() => assess({ ...pr, head: { ...pr.head, sha: 'bad' } }, runs, []), /Invalid/);
  console.log('PASS: four separate debts, exact HEAD matching, missing baseline and fail-closed release classification');
} else {
  async function github(path) {
    const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'av-usa-ci-debt-audit' };
    if (process.env.GITHUB_TOKEN) headers.Authorization = 'Bearer ' + process.env.GITHUB_TOKEN;
    const response = await fetch('https://api.github.com/repos/' + REPO + path, {
      method: 'GET', headers, redirect: 'error', signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) throw new Error('GitHub read failed: HTTP ' + response.status);
    return response.json();
  }
  const pr = await github('/pulls/91');
  const [headRuns, mainRuns, checkRuns] = await Promise.all([
    github('/actions/runs?head_sha=' + pr.head.sha + '&per_page=100'),
    // Query the exact PR base commit, not the newest 100 runs from main.
    // The old branch window could hide comparable runs among hundreds of newer commits.
    github('/actions/runs?head_sha=' + pr.base.sha + '&per_page=100'),
    github('/commits/' + pr.head.sha + '/check-runs?per_page=100'),
  ]);
  assert.ok(mainRuns.workflow_runs.every(run => run.head_sha === pr.base.sha),
    'GitHub returned a run from a different base SHA');
  assert.ok(checkRuns.total_count <= checkRuns.check_runs.length,
    'Security check run pagination incomplete; cannot classify GitGuardian');
  const report = assess(pr, headRuns.workflow_runs, mainRuns.workflow_runs,
    mainRuns.total_count, checkRuns.check_runs);
  // Read exact commit blobs, not floating main or the PR merge ref.
  // This does not run the Brazilian baseline workflow or change any BR file.
  const sourceRows = await Promise.all(CONTRACT_PATHS.map(async path => {
    const [headFile, baseFile] = await Promise.all([
      github('/contents/' + path + '?ref=' + pr.head.sha),
      github('/contents/' + path + '?ref=' + pr.base.sha),
    ]);
    return { path, head_sha: headFile.sha, base_sha: baseFile.sha };
  }));
  report.source_contract_parity = assessSourceParity(sourceRows);
  report.checked_at = new Date().toISOString();
  mkdirSync('artifacts/usa-review', { recursive: true });
  writeFileSync('artifacts/usa-review/nexoffices-shared-ci-debts.json',
    JSON.stringify(report, null, 2) + '\n');
  console.log('NexOffices exact HEAD shared-BR failures: ' + report.exact_head_failed_count +
    '/4; equivalent main runs: ' + report.equivalent_base_run_count +
    '/4; legacy classification NOT PROVEN; GitGuardian: ' +
    report.security_check.classification + '; exact-commit shared source parity: ' +
    report.source_contract_parity.identical_file_count + '/8 (' +
    report.source_contract_parity.classification + ')');
  if (report.exact_head_failed_count !== 4)
    console.log('::warning::Shared-BR CI changed; inspect the four separate workflows before release.');
}
