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

export function assess(pr, headRuns, mainRuns, mainTotal = 0) {
  assert.equal(pr?.number, 91, 'Unexpected NexOffices PR');
  assert.equal(pr?.state, 'open', 'NexOffices PR is not open');
  assert.equal(pr?.draft, true, 'NexOffices PR is no longer draft');
  assert.equal(pr?.head?.ref, BRANCH, 'Unexpected NexOffices branch');
  assert.equal(pr?.head?.repo?.full_name, REPO, 'Unexpected source repository');
  assert.match(pr?.head?.sha || '', SHA, 'Invalid NexOffices HEAD');
  assert.match(pr?.base?.sha || '', SHA, 'Invalid base SHA');
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
  return {
    schema_version: 1,
    purpose: 'Read-only NexOffices USA PR #91 shared-BR CI debt audit; not a release approval',
    pr_head_sha: head,
    base_sha: base,
    pr_draft: true,
    failures,
    exact_head_failed_count: failures.filter(f => f.exact_pr_head_verified && f.pr_run_conclusion === 'failure').length,
    equivalent_base_run_count: failures.filter(f => f.base_run_url).length,
    main_run_window: { returned: mainRuns.length, total: mainTotal, potentially_truncated: mainTotal > mainRuns.length },
    legacy_status: 'not-proven',
    release_approved: false,
  };
}

if (process.argv.includes('--self-test')) {
  const head = 'a'.repeat(40), base = 'b'.repeat(40);
  const pr = { number: 91, state: 'open', draft: true,
    head: { sha: head, ref: BRANCH, repo: { full_name: REPO } }, base: { sha: base } };
  const runs = DEBTS.map((d, i) => ({
    name: d.name, head_sha: head, conclusion: 'failure',
    html_url: 'https://github.com/' + REPO + '/actions/runs/' + (100 + i),
  }));
  const report = assess(pr, runs, [], 438);
  assert.equal(report.exact_head_failed_count, 4);
  assert.equal(report.equivalent_base_run_count, 0);
  assert.equal(report.legacy_status, 'not-proven');
  assert.equal(report.release_approved, false);
  assert.equal(report.failures[0].baseline_classification, 'unverified-no-equivalent-base-run');
  assert.equal(assess(pr, runs, [{ ...runs[0], head_sha: base }], 1).equivalent_base_run_count, 1);
  assert.equal(assess(pr, runs.slice(1), [], 0).exact_head_failed_count, 3);
  assert.throws(() => assess({ ...pr, draft: false }, runs, []), /draft/);
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
  const [headRuns, mainRuns] = await Promise.all([
    github('/actions/runs?head_sha=' + pr.head.sha + '&per_page=100'),
    github('/actions/runs?branch=main&per_page=100'),
  ]);
  const report = assess(pr, headRuns.workflow_runs, mainRuns.workflow_runs, mainRuns.total_count);
  report.checked_at = new Date().toISOString();
  mkdirSync('artifacts/usa-review', { recursive: true });
  writeFileSync('artifacts/usa-review/nexoffices-shared-ci-debts.json',
    JSON.stringify(report, null, 2) + '\n');
  console.log('NexOffices exact HEAD shared-BR failures: ' + report.exact_head_failed_count +
    '/4; equivalent main runs: ' + report.equivalent_base_run_count +
    '/4; legacy classification NOT PROVEN');
  if (report.exact_head_failed_count !== 4)
    console.log('::warning::Shared-BR CI changed; inspect the four separate workflows before release.');
}
