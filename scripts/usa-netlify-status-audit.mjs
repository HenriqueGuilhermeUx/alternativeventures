/** Read-only evidence: GitHub Netlify status on each exact USA PR HEAD.
 * This is NOT independent verification of the deployed bundle SHA or release approval.
 * Never accesses customer APIs, credentials, payments or production write endpoints.
 */
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';

const owner = 'HenriqueGuilhermeUx';
const shaPattern = /^[a-f0-9]{40}$/i;
const targets = [
  ['MODO / SmartBots', 'modo', 163, 'feature/usa-modo-smartbots-localization-20261024', 'netlify/modo1/deploy-preview', 'deploy-preview-163--modo1.netlify.app'],
  ['DocWallet', 'docwallet', 12, 'feature/usa-localized-preview-20261024', 'netlify/docwallet/deploy-preview', 'deploy-preview-12--docwallet.netlify.app'],
  ['F-Insight', 'f-insight', 26, 'feature/usa-localized-preview-20261024', 'netlify/f-insight/deploy-preview', 'deploy-preview-26--f-insight.netlify.app'],
  ['Institutional', 'alternativeventures', 3, 'feature/usa-portfolio-preview-20261024', 'netlify/bucolic-smakager-91800f/deploy-preview', 'deploy-preview-3--bucolic-smakager-91800f.netlify.app'],
];

export function assess(target, pr, statuses) {
  const [name, repo, number, branch, context, host] = target;
  const sha = pr?.head?.sha;
  const validPr = pr?.number === number && pr?.state === 'open' && pr?.draft === true &&
    pr?.head?.repo?.full_name === owner + '/' + repo && pr?.head?.ref === branch &&
    shaPattern.test(sha || '');
  const matching = Array.isArray(statuses) ? statuses.filter(s => s?.context === context) : [];
  const status = matching[0];
  let urlOk = false;
  try {
    const url = new URL(status?.target_url);
    urlOk = url.protocol === 'https:' && url.hostname === host &&
      (url.pathname === '/' || url.pathname === '');
  } catch { /* missing or malformed status URL */ }
  const success = Boolean(validPr && matching.length === 1 && status?.state === 'success' && urlOk);
  return {
    name, pr: owner + '/' + repo + '#' + number,
    pr_head_sha: shaPattern.test(sha || '') ? sha : null,
    draft_open_expected_branch: Boolean(validPr),
    github_netlify_context: context,
    github_netlify_state: status?.state || 'missing',
    github_netlify_target: status?.target_url || null,
    github_reports_success_for_exact_head: success,
    independently_verified_live_deploy_sha: false,
    classification: success ? 'github-status-success-only' : 'unverified',
  };
}

if (process.argv.includes('--self-test')) {
  const target = targets[0], sha = 'a'.repeat(40);
  const pr = { number: target[2], state: 'open', draft: true,
    head: { sha, ref: target[3], repo: { full_name: owner + '/modo' } } };
  const good = [{ context: target[4], state: 'success', target_url: 'https://' + target[5] }];
  assert.equal(assess(target, pr, good).classification, 'github-status-success-only');
  assert.equal(assess(target, pr, good).independently_verified_live_deploy_sha, false);
  for (const [p, statuses] of [
    [{ ...pr, draft: false }, good],
    [pr, []],
    [pr, [good[0], good[0]]],
    [pr, [{ ...good[0], state: 'pending' }]],
    [pr, [{ ...good[0], target_url: 'https://wrong.example' }]],
    [{ ...pr, head: { ...pr.head, sha: 'invalid' } }, good],
  ]) assert.equal(assess(target, p, statuses).classification, 'unverified');
  console.log('PASS: exact-HEAD status audit rejects missing, pending, duplicated, wrong-host, non-draft and invalid-SHA evidence');
} else {
  const report = {
    schema_version: 1,
    purpose: 'Read-only GitHub Netlify status evidence for fictional USA previews; NOT release approval',
    checked_at: new Date().toISOString(),
    independent_live_deploy_sha_verified: false,
    previews: [],
  };
  async function github(path) {
    const headers = { Accept: 'application/vnd.github+json',
      'User-Agent': 'av-usa-status-audit' };
    if (process.env.GITHUB_TOKEN) headers.Authorization = 'Bearer ' + process.env.GITHUB_TOKEN;
    const response = await fetch('https://api.github.com' + path, {
      method: 'GET', headers, redirect: 'error', signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) throw new Error('GitHub HTTP ' + response.status);
    return response.json();
  }
  for (const target of targets) {
    const [, repo, number] = target;
    try {
      const pr = await github('/repos/' + owner + '/' + repo + '/pulls/' + number);
      const sha = pr?.head?.sha;
      const status = shaPattern.test(sha || '') ?
        await github('/repos/' + owner + '/' + repo + '/commits/' + sha + '/status') :
        { statuses: [] };
      report.previews.push(assess(target, pr, status.statuses));
    } catch (error) {
      report.previews.push({
        name: target[0], pr: owner + '/' + repo + '#' + number,
        classification: 'unverified', github_reports_success_for_exact_head: false,
        independently_verified_live_deploy_sha: false,
        reason: 'Read-only GitHub lookup failed: ' + String(error.message || error).slice(0, 120),
      });
    }
  }
  report.github_status_success_count = report.previews.filter(p =>
    p.github_reports_success_for_exact_head).length;
  mkdirSync('artifacts/usa-review', { recursive: true });
  writeFileSync('artifacts/usa-review/netlify-status-evidence.json',
    JSON.stringify(report, null, 2) + '\n');
  console.log('USA Netlify exact-HEAD GitHub status evidence: ' +
    report.github_status_success_count + '/4; live deployed SHA remains independently unverified');
  if (report.github_status_success_count !== 4)
    console.log('::warning::Netlify status evidence incomplete; release is not approved.');
}
