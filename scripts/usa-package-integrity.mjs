/** Offline integrity inventory for the USA fictional-data review artifact.
 * This is artifact consistency evidence, never release authorization.
 * No network, secrets, customer data, deploys or production APIs.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const directory = process.env.USA_REVIEW_DIRECTORY || 'artifacts/usa-review';
const shaPattern = /^[0-9a-f]{40}$/i;
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const reports = [
  'manifest.json', 'netlify-status-evidence.json',
  'nexoffices-render-provenance.json', 'nexoffices-shared-ci-debts.json',
  'release-readiness.json', 'review.html',
];
const parse = name => JSON.parse(readFileSync(join(directory, name), 'utf8'));

function expectedFiles(manifest) {
  assert.equal(manifest.schema_version, 1, 'Unsupported screenshot manifest');
  assert.match(manifest.pr_head_sha || '', shaPattern, 'Invalid institutional PR HEAD');
  assert.equal(manifest.checkout_sha, manifest.pr_head_sha,
    'Screenshot checkout must be the actual PR HEAD');
  assert.equal(manifest.captures?.length, 18, 'Expected eighteen fictional screenshots');
  const names = manifest.captures.map(item => item.file);
  assert.equal(new Set(names).size, 18, 'Duplicate screenshot name');
  for (const name of names) assert.match(name, /^[a-z0-9-]+-(320|390|1280)px\.png$/,
    'Unexpected screenshot filename');
  return [...reports, ...names].sort();
}

function inventory() {
  const manifest = parse('manifest.json');
  const names = expectedFiles(manifest);
  assert.deepEqual(readdirSync(directory).filter(name => name !== 'integrity.json').sort(), names,
    'Unexpected, missing or extra review artifact file');
  const envSha = process.env.USA_PR_HEAD_SHA;
  if (envSha) assert.equal(manifest.pr_head_sha.toLowerCase(), envSha.toLowerCase(),
    'Artifact PR HEAD does not match workflow event');
  for (const item of manifest.captures) {
    const bytes = readFileSync(join(directory, item.file));
    assert.equal(bytes.length, item.size_bytes, 'Screenshot size mismatch: ' + item.file);
    assert.equal(hash(bytes), item.sha256, 'Screenshot hash mismatch: ' + item.file);
  }
  const readiness = parse('release-readiness.json');
  const render = parse('nexoffices-render-provenance.json');
  const debts = parse('nexoffices-shared-ci-debts.json');
  const netlify = parse('netlify-status-evidence.json');
  for (const [name, data] of [
    ['readiness', readiness], ['Render provenance', render],
    ['CI debts', debts], ['Netlify statuses', netlify],
  ]) assert.equal(data.schema_version, 1, 'Unsupported ' + name + ' report schema');
  assert.equal(readiness.decision, 'not-approved', 'Artifact cannot grant release approval');
  assert.equal(readiness.institutional_pr_head_sha, manifest.pr_head_sha,
    'Readiness report institutional HEAD mismatch');
  const renderHead = shaPattern.test(render.expected_pr_head_sha || '')
    ? render.expected_pr_head_sha : null;
  assert.equal(readiness.nexoffices_pr_head_sha, renderHead,
    'Readiness report NexOffices HEAD mismatch');
  if (renderHead && shaPattern.test(debts.pr_head_sha || ''))
    assert.equal(debts.pr_head_sha, renderHead,
      'CI debt report NexOffices HEAD mismatch');
  assert.equal(netlify.independent_live_deploy_sha_verified, false,
    'A GitHub status audit cannot claim independent deployment attestation');
  return {
    schema_version: 1,
    purpose: 'Offline integrity inventory for fictional USA review; NOT release approval',
    institutional_pr_head_sha: manifest.pr_head_sha,
    checkout_sha: manifest.checkout_sha,
    release_decision: 'not-approved',
    files: names.map(name => {
      const bytes = readFileSync(join(directory, name));
      return { name, size_bytes: bytes.length, sha256: hash(bytes) };
    }),
  };
}

function verify(stored, actual) {
  assert.deepEqual(stored, actual, 'Review package changed after integrity inventory');
}

if (process.argv.includes('--self-test')) {
  assert.equal(hash(Buffer.from('abc')),
    'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  assert.throws(() => expectedFiles({ schema_version: 1, pr_head_sha: 'a'.repeat(40),
    checkout_sha: 'b'.repeat(40), captures: [] }), /actual PR HEAD/);
  const original = { files: [{ name: 'test', sha256: hash(Buffer.from('safe')) }] };
  assert.throws(() => verify(original, { files: [{ name: 'test',
    sha256: hash(Buffer.from('tampered')) }] }), /changed after integrity/);
  console.log('PASS: package SHA-256, exact-HEAD and tamper-detection fixtures');
} else {
  const actual = inventory();
  if (process.argv.includes('--verify')) {
    verify(parse('integrity.json'), actual);
    console.log('PASS: independently rehashed ' + actual.files.length + ' review files');
  } else {
    writeFileSync(join(directory, 'integrity.json'), JSON.stringify(actual, null, 2) + '\n');
    console.log('PASS: ' + actual.files.length +
      ' review files inventoried with SHA-256; release NOT APPROVED');
  }
}
