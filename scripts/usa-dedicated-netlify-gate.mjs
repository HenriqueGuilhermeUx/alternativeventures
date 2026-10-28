/** Offline, fail-closed assessment of four separate USA Netlify projects.
 * Input: JSON { projects: [Netlify get-project objects], expectedHeads: {slug: PR_SHA} }.
 * No API calls, secrets, writes, deployment, or inference from an empty site URL.
 * A ready deploy is never independent proof of the bytes served over HTTP.
 */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';

const shaPattern = /^[a-f0-9]{40}$/i;
export const sites = Object.freeze({
  'av-usa-modo': '241772f0-7d68-4ff3-a20d-aeac9bcbb3f8',
  'av-usa-docwallet': 'a5b1cda8-535a-4db2-b01f-07f41c30be76',
  'av-usa-finsight': '9f4a4804-6640-49f5-9769-892e1f283ee3',
  'av-usa-nexoffices': 'a0b4370c-0f17-4aca-a07d-0d16f9640c61',
});

export function assess(input) {
  const projects = Array.isArray(input?.projects) ? input.projects : [];
  const heads = input?.expectedHeads || {};
  const entries = Object.entries(sites).map(([name, id]) => {
    const matches = projects.filter(p => p?.id === id);
    const project = matches[0];
    const expectedSha = heads[name];
    const deploy = project?.currentDeploy?.currentDeploy;
    const actualSha = deploy?.commit_ref || deploy?.commit_sha || null;
    const identityOk = matches.length === 1 && project?.name === name;
    const headOk = shaPattern.test(expectedSha || '');
    let status = 'unverified-project';
    if (identityOk && headOk) {
      if (!deploy || !Object.keys(deploy).length) status = 'no-deploy';
      else if (deploy?.state !== 'ready' && deploy?.state !== 'current') status = 'deploy-not-ready';
      else if (!shaPattern.test(actualSha || '') ||
               actualSha.toLowerCase() !== expectedSha.toLowerCase()) status = 'deploy-sha-unverified';
      else status = 'requires-independent-http-and-visual-review';
    }
    return {
      project: name, site_id: id, expected_pr_head_sha: headOk ? expectedSha : null,
      deploy_id: typeof deploy?.id === 'string' ? deploy.id : null,
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
    name, id, currentDeploy: { state: 'current', currentDeploy: {} },
  }));
  const expectedHeads = Object.fromEntries(Object.keys(sites).map(name => [name, sha]));
  const input = { projects, expectedHeads };
  assert.deepEqual(assess(input).projects.map(p => p.status), Array(4).fill('no-deploy'));
  const ready = { ...projects[0], currentDeploy: { currentDeploy: {
    id: 'test-deploy', state: 'ready', commit_ref: sha,
  } } };
  const altered = [ready, ...projects.slice(1)];
  assert.equal(assess({ projects: altered, expectedHeads }).projects[0].status,
    'requires-independent-http-and-visual-review');
  assert.equal(assess({ projects: altered, expectedHeads }).release_approved, false);
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
  console.log('PASS: four dedicated USA site IDs, empty deployments, mismatched SHAs and non-approval');
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
