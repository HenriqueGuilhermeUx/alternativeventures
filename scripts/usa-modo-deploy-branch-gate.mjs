/** Offline provenance check for the separate MODO USA Netlify deployment branch.
 * Never accepts a successful Netlify build as proof of served bytes or release approval.
 * Input must come from independently retrieved GitHub compare and Netlify project/deploy reads.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const PR = '730e1e34088c2d983606217aa21a9cc6a121a951';
const SITE = '241772f0-7d68-4ff3-a20d-aeac9bcbb3f8';
const TEAM = '68a5094671bba3abf89c3983';
const BRANCH = 'deploy/modo-usa-netlify-20261028';
const FILES = [
  'apps/web/src/UsLanding.tsx',
  'apps/web/src/usa-main.tsx',
  'netlify.toml',
  'scripts/build-usa-netlify.mjs',
  'scripts/usa-netlify-isolation-check.mjs',
].sort();
const SHA = /^[a-f0-9]{40}$/i;

function ruleCount(messages, kind) {
  const matches = (Array.isArray(messages) ? messages : [])
    .map(x => String(x?.title || '').match(new RegExp('^([0-9]+) ' + kind + ' rules? processed$')))
    .filter(Boolean);
  return matches.length === 1 ? Number(matches[0][1]) : null;
}

export function assess({ prHead, comparison, project, deploy } = {}) {
  const problems = [];
  const check = (condition, message) => { if (!condition) problems.push(message); };
  check(SHA.test(prHead || '') && prHead === PR, 'PR HEAD not pinned to reviewed SHA');
  check(comparison?.status === 'ahead' && comparison?.behind_by === 0 &&
    Number.isSafeInteger(comparison?.ahead_by) && comparison.ahead_by >= 1 &&
    comparison.ahead_by <= 10 &&
    comparison?.base_commit?.sha === prHead &&
    comparison?.merge_base_commit?.sha === prHead &&
    SHA.test(comparison?.head_commit_sha || comparison?.head || ''),
    'Deploy branch ancestry not independently proven');
  const comparedHead = comparison?.head_commit_sha || comparison?.head;
  const comparedFiles = Array.isArray(comparison?.files)
    ? comparison.files.map(f => f.filename).sort() : [];
  check(JSON.stringify(comparedFiles) === JSON.stringify(FILES),
    'Unexpected deployment-branch changes require manual review');
  check(project?.id === SITE && project?.name === 'av-usa-modo' &&
    project?.claimed === true && project?._enrichedFields?.teamId === TEAM,
    'Wrong Netlify site or team');
  const access = project?._enrichedFields?.projectAccessControls;
  check(access?.requiresSSOTeamLogin === true &&
    access?.whichProjectsRequireSSOTeamLogin === 'all' &&
    access?.requiresPassword === false, 'All-deploy team SSO not verified');
  check(project?.currentDeploy?.currentDeploy?.id === deploy?.id &&
    deploy?.site_id === SITE && deploy?.state === 'ready' &&
    deploy?.context === 'production', 'Current production-context deploy not verified');
  check(deploy?.branch === BRANCH && SHA.test(deploy?.commit_ref || '') &&
    deploy?.commit_ref === comparedHead,
    'Deploy branch or exact commit differs from GitHub comparison');
  const scan = deploy?.deploy_validations_report?.secret_scan_result;
  check(Number.isSafeInteger(scan?.scannedFilesCount) &&
    scan.scannedFilesCount > 0 &&
    Array.isArray(scan?.secretsScanMatches) && scan.secretsScanMatches.length === 0 &&
    Array.isArray(scan?.enhancedSecretsScanMatches) && scan.enhancedSecretsScanMatches.length === 0,
    'Secret scan missing or has findings');
  check(ruleCount(deploy?.summary?.messages, 'redirect') === 4 &&
    ruleCount(deploy?.summary?.messages, 'header') === 1,
    'Four allowlist redirects and one header rule not attested');
  check(Array.isArray(deploy?.available_functions) && deploy.available_functions.length === 0 &&
    Array.isArray(deploy?.required_edge_functions) && deploy.required_edge_functions.length === 0,
    'Functions or edge execution not independently excluded');
  return {
    schema_version: 1, project: 'av-usa-modo',
    pr_head_sha: prHead || null, deployed_sha: deploy?.commit_ref || null,
    compared_ahead_by: comparison?.ahead_by ?? null,
    status: problems.length ? 'blocked' : 'metadata-verified-requires-http-and-visual-review',
    problems, independently_verified_served_bytes: false, release_approved: false,
  };
}

if (process.argv.includes('--self-test')) {
  const head = '5bb5b8c17c8b83d0de6ea5c0c517addfbe5fdaa8';
  const comparison = {
    status: 'ahead', ahead_by: 5, behind_by: 0,
    base_commit: { sha: PR }, merge_base_commit: { sha: PR },
    head_commit_sha: head, files: FILES.map(filename => ({ filename })),
  };
  const project = {
    id: SITE, name: 'av-usa-modo', claimed: true,
    _enrichedFields: { teamId: TEAM, projectAccessControls: {
      requiresSSOTeamLogin: true, whichProjectsRequireSSOTeamLogin: 'all',
      requiresPassword: false } },
    currentDeploy: { currentDeploy: { id: 'sample-deploy' } },
  };
  const deploy = {
    id: 'sample-deploy', site_id: SITE, state: 'ready',
    context: 'production', branch: BRANCH, commit_ref: head,
    available_functions: [], required_edge_functions: [],
    deploy_validations_report: { secret_scan_result: {
      scannedFilesCount: 451, secretsScanMatches: [], enhancedSecretsScanMatches: [] } },
    summary: { messages: [
      { title: '4 redirect rules processed' }, { title: '1 header rule processed' },
    ] },
  };
  const base = { prHead: PR, comparison, project, deploy };
  assert.equal(assess(base).status, 'metadata-verified-requires-http-and-visual-review');
  assert.equal(assess(base).release_approved, false);
  const negatives = [
    { prHead: 'a'.repeat(40) },
    { comparison: { ...comparison, behind_by: 1 } },
    { comparison: { ...comparison, files: [...comparison.files, { filename: 'apps/web/src/Root.tsx' }] } },
    { project: { ...project, id: 'wrong' } },
    { project: { ...project, _enrichedFields: { ...project._enrichedFields,
      projectAccessControls: { requiresSSOTeamLogin: false } } } },
    { deploy: { ...deploy, branch: 'main' } },
    { deploy: { ...deploy, commit_ref: PR } },
    { deploy: { ...deploy, context: 'deploy-preview' } },
    { deploy: { ...deploy, summary: { messages: [{ title: '0 header rules processed' }] } } },
    { deploy: { ...deploy, deploy_validations_report: { secret_scan_result: {
      scannedFilesCount: 0, secretsScanMatches: [], enhancedSecretsScanMatches: [] } } } },
    { deploy: { ...deploy, available_functions: ['unexpected'] } },
  ];
  for (const mutation of negatives) {
    const result = assess({ ...base, ...mutation });
    assert.equal(result.status, 'blocked');
    assert.equal(result.release_approved, false);
  }
  console.log('PASS: USA MODO deploy-branch ancestry, exact SHA, allowlist, SSO, secrets and fail-closed HTTP gate');
} else {
  const idx = process.argv.indexOf('--input');
  if (idx < 0 || !process.argv[idx + 1]) {
    console.error('Usage: node scripts/usa-modo-deploy-branch-gate.mjs --input snapshot.json');
    process.exitCode = 2;
  } else {
    const input = JSON.parse(readFileSync(process.argv[idx + 1], 'utf8'));
    console.log(JSON.stringify(assess(input), null, 2));
  }
}
