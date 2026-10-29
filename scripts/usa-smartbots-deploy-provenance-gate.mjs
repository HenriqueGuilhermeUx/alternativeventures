/** Offline, fail-closed SmartBots USA deployment provenance review.
 * No network, credentials, deploy, merge, or Brazilian production operations.
 * Input is independently collected GitHub compare + Netlify project/deploy metadata.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const PR = '730e1e34088c2d983606217aa21a9cc6a121a951';
const SITE = '2fb27ecf-fe3d-4527-90cb-d43b05b15ae8';
const TEAM = '68a5094671bba3abf89c3983';
const BRANCH = 'deploy/smartbots-usa-netlify-20261028';
const SHA = /^[0-9a-f]{40}$/i;

function exactUrl(value, host) {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && u.hostname === host &&
      !u.username && !u.password && !u.port &&
      (u.pathname === '/' || u.pathname === '') && !u.search && !u.hash;
  } catch { return false; }
}

function ruleCount(messages, kind) {
  const pattern = new RegExp('^([0-9]+) ' + kind + ' rules? processed$');
  const matches = (Array.isArray(messages) ? messages : [])
    .map(m => String(m?.title || '').match(pattern)).filter(Boolean);
  return matches.length === 1 ? Number(matches[0][1]) : null;
}

export function assess({ prHead, comparison, branchHeadSha, project, deploy } = {}) {
  const problems = [];
  const check = (condition, message) => { if (!condition) problems.push(message); };
  check(prHead === PR, 'reviewed PR #163 HEAD differs');
  check(comparison?.base === PR && comparison?.head === BRANCH &&
    comparison?.base_commit?.sha === PR, 'GitHub comparison does not identify reviewed refs');
  const ancestryOk = comparison?.status === 'ahead' && comparison?.behind_by === 0 &&
    Number.isSafeInteger(comparison?.ahead_by) && comparison.ahead_by >= 1 &&
    comparison.ahead_by <= 10 && comparison?.total_commits === comparison.ahead_by &&
    comparison?.merge_base_commit?.sha === PR && comparison?.too_large !== true &&
    Array.isArray(comparison?.files) && comparison.files.length === 1 &&
    comparison.files[0]?.filename === 'netlify.toml' &&
    comparison.files[0]?.status === 'modified' &&
    comparison.files[0]?.previous_filename == null &&
    Number.isSafeInteger(comparison.files[0]?.additions) &&
    comparison.files[0].additions >= 0 &&
    Number.isSafeInteger(comparison.files[0]?.deletions) &&
    comparison.files[0].deletions >= 0 &&
    comparison.files[0]?.changes ===
      comparison.files[0].additions + comparison.files[0].deletions;
  check(ancestryOk, 'SmartBots deployment branch is not proven descendant of PR #163');
  check(project?.id === SITE && project?.name === 'av-usa-smartbots' &&
    project?.claimed === true && project?._enrichedFields?.teamId === TEAM,
    'Netlify site/team identity unverified');
  const access = project?._enrichedFields?.projectAccessControls;
  check(access?.requiresSSOTeamLogin === true &&
    access?.whichProjectsRequireSSOTeamLogin === 'all' &&
    access?.requiresPassword === false, 'SSO protection is not verified for all deploys');
  check(deploy?.id === project?.currentDeploy?.currentDeploy?.id &&
    deploy?.site_id === SITE && deploy?.state === 'ready' &&
    deploy?.context === 'production' && deploy?.branch === BRANCH,
    'Current dedicated deployment identity/context not verified');
  check(SHA.test(branchHeadSha || '') && deploy?.commit_ref === branchHeadSha,
    'Netlify deploy SHA differs from independently resolved branch HEAD');
  check(exactUrl(deploy?.ssl_url, 'av-usa-smartbots.netlify.app') &&
    exactUrl(deploy?.links?.alias, 'av-usa-smartbots.netlify.app') &&
    exactUrl(deploy?.links?.permalink,
      String(deploy?.id || '') + '--av-usa-smartbots.netlify.app'),
    'Canonical HTTPS and immutable permalink not verified');
  const scan = deploy?.deploy_validations_report?.secret_scan_result;
  check(Number.isSafeInteger(scan?.scannedFilesCount) && scan.scannedFilesCount > 0 &&
    Array.isArray(scan?.secretsScanMatches) && scan.secretsScanMatches.length === 0 &&
    Array.isArray(scan?.enhancedSecretsScanMatches) &&
    scan.enhancedSecretsScanMatches.length === 0,
    'Secret scan is missing or has findings');
  const messages = deploy?.summary?.messages;
  check(ruleCount(messages, 'redirect') === 3 &&
    ruleCount(messages, 'header') === 1,
    'Expected static redirect/header rules not attested');
  check(['available_functions', 'required_functions', 'required_edge_functions',
    'required_server'].every(key => Array.isArray(deploy?.[key]) &&
      deploy[key].length === 0) &&
    deploy?.server === null &&
    (deploy?.edge_functions_present === null ||
      deploy?.edge_functions_present === false) &&
    Array.isArray(messages) &&
    messages.filter(m => m?.title === 'No functions deployed').length === 1 &&
    messages.filter(m => m?.title === 'No edge functions deployed').length === 1,
    'Server-side or edge execution not ruled out');
  return {
    schema_version: 1,
    project: 'av-usa-smartbots',
    pr_head_sha: prHead || null,
    deployed_sha: deploy?.commit_ref || null,
    comparison_status: comparison?.status || null,
    comparison_behind_by: comparison?.behind_by ?? null,
    status: !ancestryOk ? 'blocked-diverged-from-reviewed-pr'
      : problems.length ? 'blocked-unverified-metadata'
      : 'metadata-verified-awaiting-authenticated-http-and-visual-review',
    problems,
    independently_verified_served_bytes: false,
    release_approved: false,
  };
}

if (process.argv.includes('--self-test')) {
  const branchHeadSha = 'b'.repeat(40);
  const comparison = {
    base: PR, head: BRANCH, status: 'ahead', ahead_by: 1, behind_by: 0,
    total_commits: 1, too_large: null,
    base_commit: { sha: PR }, merge_base_commit: { sha: PR },
    files: [{ filename: 'netlify.toml', status: 'modified',
      additions: 3, deletions: 8, changes: 11, previous_filename: null }],
  };
  const project = {
    id: SITE, name: 'av-usa-smartbots', claimed: true,
    _enrichedFields: { teamId: TEAM,
      projectAccessControls: { requiresSSOTeamLogin: true,
        whichProjectsRequireSSOTeamLogin: 'all', requiresPassword: false } },
    currentDeploy: { currentDeploy: { id: 'sample-deploy' } },
  };
  const deploy = {
    id: 'sample-deploy', site_id: SITE, state: 'ready', context: 'production',
    branch: BRANCH, commit_ref: branchHeadSha,
    ssl_url: 'https://av-usa-smartbots.netlify.app',
    links: { alias: 'https://av-usa-smartbots.netlify.app',
      permalink: 'https://sample-deploy--av-usa-smartbots.netlify.app' },
    available_functions: [], required_functions: [], required_edge_functions: [],
    required_server: [], server: null, edge_functions_present: null,
    deploy_validations_report: { secret_scan_result: {
      scannedFilesCount: 449, secretsScanMatches: [], enhancedSecretsScanMatches: [] } },
    summary: { messages: [{ title: '3 redirect rules processed' },
      { title: '1 header rule processed' }, { title: 'No functions deployed' },
      { title: 'No edge functions deployed' }] },
  };
  const base = { prHead: PR, comparison, branchHeadSha, project, deploy };
  assert.equal(assess(base).status,
    'metadata-verified-awaiting-authenticated-http-and-visual-review');
  assert.equal(assess(base).release_approved, false);
  const diverged = { ...comparison, status: 'diverged', ahead_by: 1, behind_by: 2,
    merge_base_commit: { sha: 'c'.repeat(40) } };
  assert.equal(assess({ ...base, comparison: diverged }).status,
    'blocked-diverged-from-reviewed-pr');
  for (const mutation of [
    { prHead: 'c'.repeat(40) },
    { comparison: { ...comparison, files: [{ ...comparison.files[0],
      status: 'renamed' }] } },
    { comparison: { ...comparison, total_commits: 2 } },
    { branchHeadSha: 'c'.repeat(40) },
    { project: { ...project, id: 'wrong' } },
    { project: { ...project, _enrichedFields: { ...project._enrichedFields,
      projectAccessControls: { requiresSSOTeamLogin: false } } } },
    { deploy: { ...deploy, ssl_url: 'https://av-usa-smartbots.netlify.app.evil.test' } },
    { deploy: { ...deploy, links: { ...deploy.links,
      permalink: 'https://wrong--av-usa-smartbots.netlify.app' } } },
    { deploy: { ...deploy, required_functions: ['unsafe'] } },
    { deploy: { ...deploy, deploy_validations_report: {
      secret_scan_result: { scannedFilesCount: 449,
        secretsScanMatches: ['finding-redacted'], enhancedSecretsScanMatches: [] } } } },
    { deploy: { ...deploy, summary: { messages: [
      { title: '0 redirect rules processed' }, { title: '1 header rule processed' },
      { title: 'No functions deployed' }, { title: 'No edge functions deployed' }] } } },
  ]) {
    const result = assess({ ...base, ...mutation });
    assert.ok(result.status.startsWith('blocked-'), JSON.stringify(mutation));
    assert.equal(result.release_approved, false);
  }
  console.log('PASS: SmartBots USA exact PR ancestry, SSO, deploy identity, static-only and fail-closed divergence gate');
} else {
  const index = process.argv.indexOf('--input');
  if (index < 0 || !process.argv[index + 1]) {
    console.error('Usage: node scripts/usa-smartbots-deploy-provenance-gate.mjs --input snapshot.json');
    process.exitCode = 2;
  } else {
    console.log(JSON.stringify(assess(JSON.parse(readFileSync(process.argv[index + 1], 'utf8'))), null, 2));
  }
}
