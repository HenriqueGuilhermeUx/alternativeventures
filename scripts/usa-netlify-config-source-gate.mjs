/** Read-only exact-HEAD source gate for three USA-only Netlify package configs.
 * Green artifact CI is NOT a Git connection, a deployment, or release approval.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const owner = 'HenriqueGuilhermeUx';
const shaPattern = /^[a-f0-9]{40}$/i;
const targets = [
  { repo: 'docwallet', pr: 12, dir: 'deploy/netlify/docwallet',
    blob: 'a16abebc6ae4ad0820c6fb4faacb8170b0f2d530',
    guards: [
      { path: 'scripts/usa-netlify-site-guard.mjs', blob: 'b5c6150d6843137d28fc618284ca1ac8c745f942' },
      { path: 'scripts/usa-netlify-isolation-check.mjs', blob: '38009a9b8898bec54a111478ab6acce8c7f9ec5b' },
    ],
    publish: 'dist-usa-docwallet', node: '22',
    command: 'node scripts/usa-netlify-site-guard.mjs && npm install --no-audit --no-fund && npx vite build --config vite.usa.config.ts && node scripts/usa-netlify-isolation-check.mjs' },
  { repo: 'f-insight', pr: 26, dir: 'deploy/netlify/f-insight',
    blob: '960f635e5ed35fa4ef8f3252883e5c7b0cf7e2d3',
    guards: [
      { path: 'scripts/usa-netlify-site-guard.mjs', blob: 'b326e3433852e6797b7119a714eceecec60597e1' },
      { path: 'scripts/usa-netlify-isolation-check.mjs', blob: '7b3d258003e152887c5c6815905bf61c13048f13' },
    ],
    publish: 'dist-usa-finsight', node: '22',
    command: 'node scripts/usa-netlify-site-guard.mjs && corepack enable && corepack prepare pnpm@9.15.5 --activate && pnpm install --no-frozen-lockfile && pnpm exec vite build --config vite.usa.config.ts && node scripts/usa-netlify-isolation-check.mjs' },
  { repo: 'nexoffice', pr: 91, dir: 'deploy/netlify/nexoffices',
    blob: 'e627422abe52000eb9f42b77d1c079e246148c3d',
    guards: [
      { path: 'scripts/usa-netlify-site-guard.mjs', blob: '47c77413caa165914969cc9414439008d61afa9a' },
      { path: 'scripts/usa-netlify-isolation-check.mjs', blob: '4d8b5eb52e2fa1d0f6dc434bb7e7c9621a605f7d' },
    ],
    publish: 'apps/web/dist-usa', node: '24',
    command: 'node scripts/usa-netlify-site-guard.mjs && npm install --include=dev && cd apps/web && USA_PREVIEW_SOURCE_SHA=$COMMIT_REF npx vite build --config vite.usa.config.ts && cd ../.. && node scripts/usa-netlify-isolation-check.mjs' },
];
const branch = 'feature/usa-localized-preview-20261024';
function gitBlob(content) {
  const bytes = Buffer.from(content, 'utf8');
  return createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex');
}
export function assess(target, pr, file, guardFiles = []) {
  const problems = [];
  if (pr?.number !== target.pr || pr?.state !== 'open' || pr?.draft !== true ||
      pr?.merged_at !== null || pr?.head?.repo?.full_name !== owner + '/' + target.repo ||
      pr?.head?.ref !== branch || pr?.base?.ref !== 'main' ||
      !shaPattern.test(pr?.head?.sha || ''))
    problems.push('PR identity, branch, draft state or exact HEAD invalid');
  if (file?.path !== target.dir + '/netlify.toml' || file?.type !== 'file' ||
      file?.encoding !== 'base64' || file?.sha !== target.blob)
    problems.push('dedicated package path or reviewed blob mismatch');
  const content = Buffer.from(file?.content || '', 'base64').toString('utf8');
  if (!content || gitBlob(content) !== file?.sha)
    problems.push('file bytes do not match Git blob');
  for (const expectedGuard of target.guards || []) {
    const guard = guardFiles.find(item => item?.path === expectedGuard.path);
    if (!guard || guard.type !== 'file' || guard.encoding !== 'base64' ||
        guard.sha !== expectedGuard.blob ||
        gitBlob(Buffer.from(guard.content || '', 'base64').toString('utf8')) !== guard.sha)
      problems.push('reviewed USA guard script missing or changed: ' + expectedGuard.path);
  }
  const actual = content.split('\n').filter(x => !/^\s*(?:#|$)/.test(x)).join('\n').trim();
  const expected = [
    '[build]', '  base = "."',
    '  command = "' + target.command + '"',
    '  publish = "' + target.publish + '"',
    '[build.environment]', '  NODE_VERSION = "' + target.node + '"',
  ].join('\n');
  if (actual !== expected)
    problems.push('unexpected build recipe, override, API, function or route');
  return { repo: owner + '/' + target.repo, pr: target.pr,
    head_sha: shaPattern.test(pr?.head?.sha || '') ? pr.head.sha : null,
    package_directory: target.dir, source_config_verified: problems.length === 0,
    git_build_connection_verified: false, netlify_deploy_verified: false,
    release_approved: false, problems };
}
if (process.argv.includes('--self-test')) {
  for (const target of targets) {
    const content = [
      '[build]', '  base = "."',
      '  command = "' + target.command + '"',
      '  publish = "' + target.publish + '"', '',
      '[build.environment]', '  NODE_VERSION = "' + target.node + '"', '',
    ].join('\n');
    const guardFiles = target.guards.map((guard, index) => {
      const bytes = 'reviewed USA guard fixture ' + index;
      return { path: guard.path, type: 'file', encoding: 'base64',
        sha: gitBlob(bytes), content: Buffer.from(bytes).toString('base64') };
    });
    const fixture = { ...target, blob: gitBlob(content),
      guards: target.guards.map((guard, index) =>
        ({ ...guard, blob: guardFiles[index].sha })) };
    const pr = { number: target.pr, state: 'open', draft: true, merged_at: null,
      head: { repo: { full_name: owner + '/' + target.repo },
        ref: branch, sha: 'a'.repeat(40) }, base: { ref: 'main' } };
    const file = { path: target.dir + '/netlify.toml', type: 'file',
      encoding: 'base64', sha: fixture.blob,
      content: Buffer.from(content).toString('base64') };
    assert.equal(assess(fixture, pr, file, guardFiles).source_config_verified, true);
    assert.equal(assess(fixture, pr, file, guardFiles.slice(1)).source_config_verified, false);
    for (const guard of guardFiles) {
      const tampered = guardFiles.map(item => item === guard ?
        { ...item, content: Buffer.from('tampered').toString('base64') } : item);
      assert.equal(assess(fixture, pr, file, tampered).source_config_verified, false);
      const changedSha = guardFiles.map(item => item === guard ?
        { ...item, sha: 'b'.repeat(40) } : item);
      assert.equal(assess(fixture, pr, file, changedSha).source_config_verified, false);
    }
    for (const changed of [
      content.replace('node scripts/usa-netlify-site-guard.mjs && ', ''),
      content.replace(target.publish, 'dist'),
      content + '\n[[redirects]]\n  from = "/*"\n  to = "/index.html"\n',
      content + '\n[context.production]\n  command = "npm run build"\n',
      content + '\nVITE_API_URL = "https://br.example"\n',
    ]) {
      const altered = { ...file, sha: gitBlob(changed),
        content: Buffer.from(changed).toString('base64') };
      assert.equal(assess(fixture, pr, altered, guardFiles).source_config_verified, false);
    }
    assert.equal(assess(fixture, { ...pr, draft: false }, file, guardFiles).source_config_verified, false);
    assert.equal(assess(fixture, pr, { ...file, sha: 'b'.repeat(40) }, guardFiles).source_config_verified, false);
  }
  console.log('PASS: USA source config gate pins build recipe and six security guard scripts');
} else {
  async function github(path) {
    const headers = { Accept: 'application/vnd.github+json',
      'User-Agent': 'av-usa-config-source-gate' };
    if (process.env.GITHUB_TOKEN)
      headers.Authorization = 'Bearer ' + process.env.GITHUB_TOKEN;
    const r = await fetch('https://api.github.com' + path, {
      headers, redirect: 'error', signal: AbortSignal.timeout(20000) });
    if (!r.ok) throw new Error('GitHub read failed: HTTP ' + r.status);
    return r.json();
  }
  const rows = [];
  for (const target of targets) {
    const repo = '/repos/' + owner + '/' + target.repo;
    const pr = await github(repo + '/pulls/' + target.pr);
    assert.match(pr?.head?.sha || '', shaPattern);
    const file = await github(repo + '/contents/' + target.dir +
      '/netlify.toml?ref=' + pr.head.sha);
    const guardFiles = [];
    for (const guard of target.guards) {
      guardFiles.push(await github(repo + '/contents/' + guard.path +
        '?ref=' + pr.head.sha));
    }
    rows.push(assess(target, pr, file, guardFiles));
  }
  for (const row of rows)
    console.log(row.repo + '#' + row.pr + ': ' +
      (row.source_config_verified ? 'source config verified; NOT DEPLOYED' :
        'BLOCKED: ' + row.problems.join('; ')));
  assert.ok(rows.every(x => x.source_config_verified),
    'USA source config changed; require manual review before Git connection');
}