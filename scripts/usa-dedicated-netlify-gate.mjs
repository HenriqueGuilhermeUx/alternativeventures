/** Offline, fail-closed assessment of four separate USA Netlify projects.
 * Input: JSON { projects: [Netlify get-project objects], expectedHeads: {slug: PR_SHA} }.
 * No API calls, secrets, writes, deployment, or inference from an empty site URL.
 * A ready deploy is never independent proof of the bytes served over HTTP.
 */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';

const shaPattern = /^[a-f0-9]{40}$/i;
// Team ID is public Netlify project metadata, never an API token.
const expectedTeamId = '68a5094671bba3abf89c3983';

function canonicalHostMatches(project, name) {
  try {
    const url = new URL(project?._enrichedFields?.urls?.primarySiteUrl);
    return ['http:', 'https:'].includes(url.protocol) &&
      url.hostname === `${name}.netlify.app` &&
      (url.pathname === '/' || url.pathname === '') &&
      !url.username && !url.password && !url.port && !url.search && !url.hash;
  } catch { return false; }
}
export const sites = Object.freeze({
  'av-usa-modo': '241772f0-7d68-4ff3-a20d-aeac9bcbb3f8',
  'av-usa-docwallet': 'a5b1cda8-535a-4db2-b01f-07f41c30be76',
  'av-usa-finsight': '9f4a4804-6640-49f5-9769-892e1f283ee3',
  'av-usa-nexoffices': 'a0b4370c-0f17-4aca-a07d-0d16f9640c61',
});

export function assess(input) {
  const projects = Array.isArray(input?.projects) ? input.projects : [];
  const heads = input?.expectedHeads || {};
  // Full Netlify deploy details are optional, but missing details never prove
  // that the isolated artifact or its HTTP security rules were published.
  const deployDetails = input?.deployDetails || {};
  const entries = Object.entries(sites).map(([name, id]) => {
    const matches = projects.filter(p => p?.id === id);
    const project = matches[0];
    const expectedSha = heads[name];
    const deploy = project?.currentDeploy?.currentDeploy;
    const detail = deployDetails[id] || null;
    const detailIdentityOk = Boolean(detail && detail.id === deploy?.id &&
      detail.site_id === id && detail.state === 'ready');
    const actualSha = deploy?.commit_ref || deploy?.commit_sha ||
      (detailIdentityOk ? detail.commit_ref : null);
    const messages = detailIdentityOk && Array.isArray(detail?.summary?.messages)
      ? detail.summary.messages : [];
    // The deploy summary reports processed Netlify _headers and _redirects.
    // A ready deploy with zero header rules is NOT an isolated USA preview.
    const noHeaderRules = messages.some(m => /no header rules processed/i.test(m?.title || ''));
    const noRedirectRules = messages.some(m => /no redirect rules processed/i.test(m?.title || ''));
    // A deploy summary without positive rule counts cannot attest that the
    // dedicated _headers/_redirects files were actually processed.
    const processedRuleCount = kind => {
      const suffixes = [' ' + kind + ' rule processed', ' ' + kind + ' rules processed'];
      const titles = messages.map(m => String(m?.title || ''));
      const title = titles.find(t => suffixes.some(suffix => t.endsWith(suffix)));
      if (!title) return null;
      const count = Number(title.split(' ')[0]);
      return Number.isSafeInteger(count) && count >= 0 ? count : null;
    };
    const headerRuleCount = processedRuleCount('header');
    const redirectRuleCount = processedRuleCount('redirect');
    const identityOk = matches.length === 1 && project?.name === name;
    const teamOk = project?._enrichedFields?.teamId === expectedTeamId;
    const urlOk = canonicalHostMatches(project, name);
    const projectOk = identityOk && teamOk && urlOk && project?.claimed === true;
    // Review builds must remain team-only until explicitly approved for public access.
    const access = project?._enrichedFields?.projectAccessControls;
    const protectedForAllDeploys = access?.requiresSSOTeamLogin === true &&
      access?.whichProjectsRequireSSOTeamLogin === 'all' &&
      access?.requiresPassword === false;
    const headOk = shaPattern.test(expectedSha || '');
    let status = 'unverified-project';
    if (projectOk && headOk) {
      if (!protectedForAllDeploys) status = 'unprotected-project';
      else if (!deploy || !Object.keys(deploy).length) status = 'no-deploy';
      else if (deploy?.state !== 'ready' && deploy?.state !== 'current') status = 'deploy-not-ready';
      else if (!shaPattern.test(actualSha || '') ||
               actualSha.toLowerCase() !== expectedSha.toLowerCase()) status = 'deploy-sha-unverified';
      else if (detail && !detailIdentityOk) status = 'deploy-detail-mismatch';
      else if (noHeaderRules || headerRuleCount === 0) status = 'deploy-missing-security-headers';
      else if (noRedirectRules || redirectRuleCount === 0) status = 'deploy-missing-route-guard';
      else if (!detail) status = 'requires-deploy-detail-and-independent-http-review';
      else if (headerRuleCount === null || redirectRuleCount === null)
        status = 'deploy-security-rules-unverified';
      else if (name === 'av-usa-modo' && redirectRuleCount < 6)
        status = 'deploy-insufficient-route-guard';
      else status = 'requires-independent-http-and-visual-review';
    }
    return {
      project: name, site_id: id, expected_pr_head_sha: headOk ? expectedSha : null,
      project_identity_verified: Boolean(projectOk),
      team_verified: teamOk, canonical_url_verified: urlOk,
      team_login_protected_all_deploys: protectedForAllDeploys,
      deploy_id: typeof deploy?.id === 'string' ? deploy.id : null,
      deploy_detail_identity_verified: detailIdentityOk,
      deploy_reports_no_header_rules: noHeaderRules,
      deploy_reports_no_redirect_rules: noRedirectRules,
      processed_header_rule_count: headerRuleCount,
      processed_redirect_rule_count: redirectRuleCount,
      status, independently_verified_served_bytes: false,
      release_approved: false,
    };
  });
  return {
    schema_version: 1,
    purpose: 'Read-only dedicated USA Netlify site metadata gate; NOT publication approval',
    unexpected_projects: projects.filter(p => !Object.values(sites).includes(p?.id)).length,
    duplicate_or_missing_projects: Object.values(sites).some(id =>
      projects.filter(p => p?.id === id).length !== 1),
    projects: entries,
    release_approved: false,
  };
}

if (process.argv.includes('--self-test')) {
  const sha = 'a'.repeat(40);
  const projects = Object.entries(sites).map(([name, id]) => ({
    name, id, claimed: true,
    _enrichedFields: { teamId: expectedTeamId,
      urls: { primarySiteUrl: `http://${name}.netlify.app` },
      projectAccessControls: { requiresSSOTeamLogin: true,
        whichProjectsRequireSSOTeamLogin: 'all', requiresPassword: false } },
    currentDeploy: { state: 'current', currentDeploy: {} },
  }));
  const expectedHeads = Object.fromEntries(Object.keys(sites).map(name => [name, sha]));
  const input = { projects, expectedHeads };
  assert.deepEqual(assess(input).projects.map(p => p.status), Array(4).fill('no-deploy'));
  const ready = { ...projects[0], currentDeploy: { currentDeploy: {
    id: 'test-deploy', state: 'ready', commit_ref: sha,
  } } };
  const altered = [ready, ...projects.slice(1)];
  assert.equal(assess({ projects: altered, expectedHeads }).projects[0].status,
    'requires-deploy-detail-and-independent-http-review');
  const detail = { id: 'test-deploy', site_id: sites['av-usa-modo'],
    state: 'ready', commit_ref: sha,
    summary: { messages: [
      { title: '6 redirect rules processed' },
      { title: '1 header rule processed' },
    ] } };
  const withDetails = d => ({ projects: altered, expectedHeads,
    deployDetails: { [sites['av-usa-modo']]: d } });
  assert.equal(assess(withDetails(detail)).projects[0].status,
    'requires-independent-http-and-visual-review');
  assert.equal(assess(withDetails({ ...detail, summary: { messages: [] } }))
    .projects[0].status, 'deploy-security-rules-unverified');
  assert.equal(assess(withDetails({ ...detail, summary: { messages: [
    { title: '1 redirect rule processed' }, { title: '1 header rule processed' },
  ] } })).projects[0].status, 'deploy-insufficient-route-guard');
  assert.equal(assess(withDetails({ ...detail, summary: { messages: [
    { title: '6 redirect rules processed' }, { title: '0 header rules processed' },
  ] } })).projects[0].status, 'deploy-missing-security-headers');
  assert.equal(assess(withDetails({ ...detail, summary: { messages: [
    { title: '1 redirect rule processed' },
    { title: 'No header rules processed' },
  ] } })).projects[0].status, 'deploy-missing-security-headers');
  assert.equal(assess(withDetails({ ...detail, summary: { messages: [
    { title: 'No redirect rules processed' },
    { title: '1 header rule processed' },
  ] } })).projects[0].status, 'deploy-missing-route-guard');
  assert.equal(assess(withDetails({ ...detail, site_id: 'wrong-site' }))
    .projects[0].status, 'deploy-detail-mismatch');
  assert.equal(assess({ projects: altered, expectedHeads }).release_approved, false);
  assert.equal(assess({ projects: [{ ...ready, _enrichedFields: {
    ...ready._enrichedFields, projectAccessControls: {
      requiresSSOTeamLogin: false, whichProjectsRequireSSOTeamLogin: null,
      requiresPassword: false } } }, ...projects.slice(1)], expectedHeads
  }).projects[0].status, 'unprotected-project');
  assert.equal(assess({ projects: [{ ...ready, _enrichedFields: {
    ...ready._enrichedFields, projectAccessControls: {
      requiresSSOTeamLogin: true, whichProjectsRequireSSOTeamLogin: 'non-production',
      requiresPassword: false } } }, ...projects.slice(1)], expectedHeads
  }).projects[0].status, 'unprotected-project');
  assert.equal(assess({ projects: [{ ...ready, _enrichedFields: {
    ...ready._enrichedFields, teamId: 'wrong-team' } }, ...projects.slice(1)],
    expectedHeads }).projects[0].status, 'unverified-project');
  assert.equal(assess({ projects: [{ ...ready, _enrichedFields: {
    ...ready._enrichedFields, urls: { primarySiteUrl: 'https://modo1.netlify.app' } } },
    ...projects.slice(1)], expectedHeads }).projects[0].status, 'unverified-project');
  assert.equal(assess({ projects: [{ ...ready, claimed: false }, ...projects.slice(1)],
    expectedHeads }).projects[0].status, 'unverified-project');
  assert.equal(assess({ projects: [{ ...ready, _enrichedFields: {
    ...ready._enrichedFields, urls: { primarySiteUrl: 'https://av-usa-modo.netlify.app.evil.test' } } },
    ...projects.slice(1)], expectedHeads }).projects[0].status, 'unverified-project');
  assert.equal(assess({ projects: [{ ...ready, name: 'wrong' }, ...projects.slice(1)],
    expectedHeads }).projects[0].status, 'unverified-project');
  assert.equal(assess({ projects: [ready, ready, ...projects.slice(1)],
    expectedHeads }).projects[0].status, 'unverified-project');
  assert.equal(assess({ projects: [{ ...ready, currentDeploy: {
    currentDeploy: { id: 'test', state: 'ready', commit_ref: 'b'.repeat(40) } } },
    ...projects.slice(1)], expectedHeads }).projects[0].status, 'deploy-sha-unverified');
  assert.equal(assess({ projects: altered, expectedHeads: {} }).projects[0].status,
    'unverified-project');
  assert.equal(assess(input).projects.every(p => !p.independently_verified_served_bytes), true);
  console.log('PASS: USA site IDs, SSO, deploy detail identity, missing header/redirect rules, SHA mismatches and non-approval');
} else {
  const index = process.argv.indexOf('--input');
  if (index < 0 || !process.argv[index + 1]) {
    console.error('Usage: node scripts/usa-dedicated-netlify-gate.mjs --input snapshot.json [--output report.json]');
    process.exitCode = 2;
  } else {
    const result = assess(JSON.parse(readFileSync(process.argv[index + 1], 'utf8')));
    const outputIndex = process.argv.indexOf('--output');
    if (outputIndex >= 0 && process.argv[outputIndex + 1])
      writeFileSync(process.argv[outputIndex + 1], JSON.stringify(result, null, 2) + '\n');
    else console.log(JSON.stringify(result, null, 2));
  }
}
