/** Offline provenance check for the separate MODO USA Netlify deployment branch.
 * Never accepts a successful Netlify build as proof of served bytes or release approval.
 * Input must come from independently retrieved GitHub compare and Netlify project/deploy reads.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

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
const DEPLOY_SHA = '5bb5b8c17c8b83d0de6ea5c0c517addfbe5fdaa8';
// Reviewed Git blob IDs at the immutable, independently resolved USA deploy SHA.
// A filename allowlist alone cannot detect a malicious edit inside an allowed file.
const REVIEWED_SOURCE_BLOBS = Object.freeze({
  'apps/web/src/UsLanding.tsx': '395128d7085be7c4bb4156425d8de733b3dd23a6',
  'apps/web/src/usa-main.tsx': 'd03672387721e0d3bc4896171e02bc6dbb25b89d',
  'netlify.toml': 'ba456b7ddaa351d136c5dc644f65b2d9917016a6',
  'scripts/build-usa-netlify.mjs': 'a89e50583de89ebbc551677bec39b97abc4c831a',
  'scripts/usa-netlify-isolation-check.mjs': 'd86783403a44724c3617193ffb30e928c90a973a',
});

// Require exact Netlify-owned hostnames, not a plausible site name in a
// redirect URL, userinfo, path, query string or attacker-controlled suffix.
function exactSiteUrl(value, hostname, allowedProtocols) {
  try {
    const url = new URL(value);
    return allowedProtocols.includes(url.protocol) && url.hostname === hostname &&
      !url.username && !url.password && !url.port &&
      (url.pathname === '/' || url.pathname === '') && !url.search && !url.hash;
  } catch { return false; }
}

function ruleCount(messages, kind) {
  const matches = (Array.isArray(messages) ? messages : [])
    .map(x => String(x?.title || '').match(new RegExp('^([0-9]+) ' + kind + ' rules? processed$')))
    .filter(Boolean);
  return matches.length === 1 ? Number(matches[0][1]) : null;
}

export function assess({ prHead, comparison, resolvedBranchHeadSha, sourceFiles, project, deploy } = {}) {
  const problems = [];
  const check = (condition, message) => { if (!condition) problems.push(message); };
  check(SHA.test(prHead || '') && prHead === PR, 'PR HEAD not pinned to reviewed SHA');
  check(comparison?.status === 'ahead' && comparison?.behind_by === 0 &&
    Number.isSafeInteger(comparison?.ahead_by) && comparison.ahead_by >= 1 &&
    comparison.ahead_by <= 10 &&
    comparison?.base_commit?.sha === prHead &&
    comparison?.merge_base_commit?.sha === prHead &&
    comparison?.base === prHead && comparison?.head === BRANCH &&
    SHA.test(resolvedBranchHeadSha || ''),
    'Deploy branch ancestry not independently proven');
  // GitHub compare returns `head` as the branch REF, not its commit SHA.
  // Require a separate GitHub commit/branch resolution before trusting deploy.commit_ref.
  const comparedHead = resolvedBranchHeadSha;
  const comparedFiles = Array.isArray(comparison?.files)
    ? comparison.files.map(f => f.filename).sort() : [];
  check(JSON.stringify(comparedFiles) === JSON.stringify(FILES),
    'Unexpected deployment-branch changes require manual review');
  // sourceFiles must be obtained independently from GitHub Contents at the
  // exact resolved deploy commit. The ref is checked on every file to prevent
  // mixing results from a later branch HEAD or a Brazilian/default branch.
  const sourceRows = Array.isArray(sourceFiles) ? sourceFiles : [];
  const sourcePaths = sourceRows.map(row => row?.path).sort();
  check(sourceRows.length === FILES.length &&
    JSON.stringify(sourcePaths) === JSON.stringify(FILES) &&
    sourceRows.every(row =>
      row?.ref === resolvedBranchHeadSha &&
      SHA.test(row?.sha || '') &&
      row.sha === REVIEWED_SOURCE_BLOBS[row.path]),
    'Exact reviewed deploy-branch source blobs or immutable refs unverified');
  // The GitHub compare response can be incomplete or contain a rename/delete
  // while retaining an allowlisted filename. Require a complete, internally
  // consistent diff of modifications only before trusting branch provenance.
  check(comparison?.too_large !== true &&
    comparison?.total_commits === comparison?.ahead_by &&
    Array.isArray(comparison?.files) && comparison.files.length === FILES.length &&
    comparison.files.every(file =>
      file?.status === 'modified' && file?.previous_filename == null &&
      Number.isSafeInteger(file?.additions) && file.additions >= 0 &&
      Number.isSafeInteger(file?.deletions) && file.deletions >= 0 &&
      Number.isSafeInteger(file?.changes) &&
      file.changes === file.additions + file.deletions),
    'Deploy branch comparison is truncated, renamed, deleted or internally inconsistent');
  check(project?.id === SITE && project?.name === 'av-usa-modo' &&
    project?.claimed === true && project?._enrichedFields?.teamId === TEAM,
    'Wrong Netlify site or team');
  check(exactSiteUrl(project?._enrichedFields?.urls?.primarySiteUrl,
    'av-usa-modo.netlify.app', ['http:', 'https:']) &&
    exactSiteUrl(deploy?.ssl_url, 'av-usa-modo.netlify.app', ['https:']) &&
    exactSiteUrl(deploy?.links?.alias, 'av-usa-modo.netlify.app', ['https:']) &&
    exactSiteUrl(deploy?.links?.permalink,
      String(deploy?.id || '') + '--av-usa-modo.netlify.app', ['https:']),
    'Canonical project, HTTPS deploy and immutable permalink hosts not verified');
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
  // Fail closed on every executable deployment surface, not just the list of
  // available Functions. A successful static build must not ship SSR/server,
  // Functions or Edge Functions on this team-only review host.
  const titles = Array.isArray(deploy?.summary?.messages)
    ? deploy.summary.messages.map(m => String(m?.title || '')) : [];
  check(Array.isArray(deploy?.available_functions) && deploy.available_functions.length === 0 &&
    Array.isArray(deploy?.required_functions) && deploy.required_functions.length === 0 &&
    Array.isArray(deploy?.required_server) && deploy.required_server.length === 0 &&
    Array.isArray(deploy?.required_edge_functions) && deploy.required_edge_functions.length === 0 &&
    deploy?.server === null &&
    (deploy?.edge_functions_present === null || deploy?.edge_functions_present === false) &&
    titles.filter(t => t === 'No functions deployed').length === 1 &&
    titles.filter(t => t === 'No edge functions deployed').length === 1,
    'Static-only deployment not independently attested: server, functions or edge execution');
  return {
    schema_version: 1, project: 'av-usa-modo',
    pr_head_sha: prHead || null, deployed_sha: deploy?.commit_ref || null,
    compared_ahead_by: comparison?.ahead_by ?? null,
    status: problems.length ? 'blocked' : 'metadata-verified-requires-http-and-visual-review',
    problems, independently_verified_served_bytes: false, release_approved: false,
  };
}

// Read-only exact-commit source verification. This is stronger than a file-name
// allowlist: an unexpected edit within an allowed USA file must block review.
// GitHub API contents are fetched at the independently resolved immutable SHA.
function gitBlob(bytes) {
  return createHash('sha1').update('blob ' + bytes.length + '\\0').update(bytes).digest('hex');
}
async function github(path) {
  const headers = { Accept: 'application/vnd.github+json',
    'User-Agent': 'av-usa-modo-source-attestation' };
  if (process.env.GITHUB_TOKEN) headers.Authorization = 'Bearer ' + process.env.GITHUB_TOKEN;
  const response = await fetch('https://api.github.com' + path, {
    headers, redirect: 'error', signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error('GitHub read failed: HTTP ' + response.status);
  return response.json();
}
async function checkReviewedSource() {
  const prefix = '/repos/HenriqueGuilhermeUx/modo';
  const branch = await github(prefix + '/branches/' + BRANCH);
  const resolved = branch?.commit?.sha;
  assert.equal(resolved, DEPLOY_SHA, 'MODO USA deploy branch HEAD changed; review required');
  const rows = [];
  for (const path of FILES) {
    const file = await github(prefix + '/contents/' +
      path.split('/').map(encodeURIComponent).join('/') + '?ref=' + resolved);
    assert.equal(file?.type, 'file', 'Expected a regular source file: ' + path);
    assert.equal(file?.path, path, 'Unexpected source path');
    assert.equal(file?.encoding, 'base64', 'Source bytes unavailable');
    const bytes = Buffer.from(file.content.replace(/\\s/g, ''), 'base64');
    assert.equal(gitBlob(bytes), file.sha, 'GitHub source blob bytes mismatch: ' + path);
    rows.push({ path, ref: resolved, sha: file.sha });
  }
  assert.deepEqual(rows.map(x => x.path).sort(), FILES);
  assert.ok(rows.every(x => x.sha === REVIEWED_SOURCE_BLOBS[x.path]),
    'MODO USA reviewed source blob changed; manual re-review required');
  console.log('PASS: MODO USA exact deploy SHA and five immutable source blobs verified; NOT RELEASE APPROVED');
}

if (process.argv.includes('--self-test')) {
  const head = '5bb5b8c17c8b83d0de6ea5c0c517addfbe5fdaa8';
  const comparison = {
    status: 'ahead', ahead_by: 5, behind_by: 0, total_commits: 5,
    too_large: null, base: PR, head: BRANCH,
    base_commit: { sha: PR }, merge_base_commit: { sha: PR },
    files: FILES.map(filename => ({ filename, status: 'modified',
      additions: 1, deletions: 1, changes: 2, previous_filename: null })),
  };
  const project = {
    id: SITE, name: 'av-usa-modo', claimed: true,
    _enrichedFields: { teamId: TEAM,
      urls: { primarySiteUrl: 'http://av-usa-modo.netlify.app' },
      projectAccessControls: {
      requiresSSOTeamLogin: true, whichProjectsRequireSSOTeamLogin: 'all',
      requiresPassword: false } },
    currentDeploy: { currentDeploy: { id: 'sample-deploy' } },
  };
  const deploy = {
    id: 'sample-deploy', site_id: SITE, state: 'ready',
    context: 'production', branch: BRANCH, commit_ref: head,
    ssl_url: 'https://av-usa-modo.netlify.app',
    links: { alias: 'https://av-usa-modo.netlify.app',
      permalink: 'https://sample-deploy--av-usa-modo.netlify.app' },
    available_functions: [], required_functions: [], required_server: [],
    required_edge_functions: [], server: null, edge_functions_present: null,
    deploy_validations_report: { secret_scan_result: {
      scannedFilesCount: 451, secretsScanMatches: [], enhancedSecretsScanMatches: [] } },
    summary: { messages: [
      { title: '4 redirect rules processed' }, { title: '1 header rule processed' },
      { title: 'No functions deployed' }, { title: 'No edge functions deployed' },
    ] },
  };
  const sourceFiles = FILES.map(path => ({
    path, ref: head, sha: REVIEWED_SOURCE_BLOBS[path],
  }));
  const base = { prHead: PR, comparison, resolvedBranchHeadSha: head, sourceFiles, project, deploy };
  assert.equal(assess(base).status, 'metadata-verified-requires-http-and-visual-review');
  assert.equal(assess(base).release_approved, false);
  const negatives = [
    { sourceFiles: undefined },
    { sourceFiles: sourceFiles.slice(1) },
    { sourceFiles: [...sourceFiles, sourceFiles[0]] },
    { sourceFiles: sourceFiles.map((row, i) => i === 0 ?
      { ...row, sha: 'c'.repeat(40) } : row) },
    { sourceFiles: sourceFiles.map((row, i) => i === 0 ?
      { ...row, ref: PR } : row) },
    { prHead: 'a'.repeat(40) },
    { comparison: { ...comparison, behind_by: 1 } },
    { comparison: { ...comparison, head: 'main' } },
    { comparison: { ...comparison, base: 'a'.repeat(40) } },
    { comparison: { ...comparison, too_large: true } },
    { comparison: { ...comparison, total_commits: 4 } },
    { comparison: { ...comparison, files: comparison.files.map((f, i) =>
      i === 0 ? { ...f, status: 'removed' } : f) } },
    { comparison: { ...comparison, files: comparison.files.map((f, i) =>
      i === 0 ? { ...f, status: 'renamed', previous_filename: 'apps/web/src/Root.tsx' } : f) } },
    { comparison: { ...comparison, files: comparison.files.map((f, i) =>
      i === 0 ? { ...f, changes: 0 } : f) } },
    { comparison: { ...comparison, files: comparison.files.map((f, i) =>
      i === 0 ? { ...f, additions: -1 } : f) } },
    { resolvedBranchHeadSha: undefined },
    { resolvedBranchHeadSha: PR },
    { comparison: { ...comparison, files: [...comparison.files, { filename: 'apps/web/src/Root.tsx' }] } },
    { project: { ...project, id: 'wrong' } },
    { project: { ...project, _enrichedFields: { ...project._enrichedFields,
      urls: { primarySiteUrl: 'https://av-usa-modo.netlify.app.evil.test' } } } },
    { project: { ...project, _enrichedFields: { ...project._enrichedFields,
      urls: { primarySiteUrl: 'https://av-usa-modo.netlify.app@evil.test' } } } },
    { deploy: { ...deploy, ssl_url: 'http://av-usa-modo.netlify.app' } },
    { deploy: { ...deploy, links: { ...deploy.links,
      alias: 'https://av-usa-modo.netlify.app.evil.test' } } },
    { deploy: { ...deploy, links: { ...deploy.links,
      permalink: 'https://wrong--av-usa-modo.netlify.app' } } },
    { deploy: { ...deploy, links: null } },
    { project: { ...project, _enrichedFields: { ...project._enrichedFields,
      projectAccessControls: { requiresSSOTeamLogin: false } } } },
    { deploy: { ...deploy, branch: 'main' } },
    { deploy: { ...deploy, commit_ref: PR } },
    { deploy: { ...deploy, context: 'deploy-preview' } },
    { deploy: { ...deploy, summary: { messages: [{ title: '0 header rules processed' }] } } },
    { deploy: { ...deploy, deploy_validations_report: { secret_scan_result: {
      scannedFilesCount: 0, secretsScanMatches: [], enhancedSecretsScanMatches: [] } } } },
    { deploy: { ...deploy, available_functions: ['unexpected'] } },
    { deploy: { ...deploy, required_functions: ['unexpected'] } },
    { deploy: { ...deploy, required_server: ['unexpected'] } },
    { deploy: { ...deploy, required_edge_functions: ['unexpected'] } },
    { deploy: { ...deploy, server: { type: 'server' } } },
    { deploy: { ...deploy, edge_functions_present: true } },
    { deploy: { ...deploy, summary: { messages: deploy.summary.messages.filter(m =>
      m.title !== 'No functions deployed') } } },
    { deploy: { ...deploy, summary: { messages: deploy.summary.messages.filter(m =>
      m.title !== 'No edge functions deployed') } } },
  ];
  for (const mutation of negatives) {
    const result = assess({ ...base, ...mutation });
    assert.equal(result.status, 'blocked');
    assert.equal(result.release_approved, false);
  }
  console.log('PASS: USA MODO deploy-branch ancestry, immutable source blob pins, SSO, secrets and static-only gate');
} else if (process.argv.includes('--source-check')) {
  await checkReviewedSource();
} else {
  const idx = process.argv.indexOf('--input');
  if (idx < 0 || !process.argv[idx + 1]) {
    console.error('Usage: node scripts/usa-modo-deploy-branch-gate.mjs --input snapshot.json | --self-test | --source-check');
    process.exitCode = 2;
  } else {
    const input = JSON.parse(readFileSync(process.argv[idx + 1], 'utf8'));
    console.log(JSON.stringify(assess(input), null, 2));
  }
}
