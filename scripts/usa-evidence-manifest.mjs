/** Fail closed if the thirteen fictional-data review screenshots are incomplete.
 * Record integrity hashes and dimensions so a reviewer can trace the exact CI artifact.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const directory = 'artifacts/usa-review';
const expected = [
  ['institutional-320px.png', 320],
  ['institutional-390px.png', 390],
  ['institutional-1280px.png', 1280],
  ['modo-usa-390px.png', 390],
  ['modo-usa-1280px.png', 1280],
  ['smartbots-usa-390px.png', 390],
  ['smartbots-usa-1280px.png', 1280],
  ['docwallet-usa-390px.png', 390],
  ['docwallet-usa-1280px.png', 1280],
  ['f-insight-usa-390px.png', 390],
  ['f-insight-usa-1280px.png', 1280],
  ['nexoffices-390px.png', 390],
  ['nexoffices-1280px.png', 1280],
];
const files = readdirSync(directory).filter(name => name.endsWith('.png')).sort();
assert.deepEqual(files, expected.map(([name]) => name).sort(), 'Expected exactly thirteen USA demo screenshots');
const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const captures = expected.map(([name, viewportWidth]) => {
  const bytes = readFileSync(join(directory, name));
  assert.ok(bytes.length >= 2048, `${name}: empty or truncated screenshot`);
  assert.ok(bytes.subarray(0, 8).equals(signature), `${name}: invalid PNG signature`);
  assert.equal(bytes.toString('ascii', 12, 16), 'IHDR', `${name}: missing PNG IHDR`);
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  assert.equal(width, viewportWidth, `${name}: viewport mismatch`);
  assert.ok(height >= 300 && height <= 30000, `${name}: unexpected screenshot height`);
  return { file: name, viewport_width_px: viewportWidth, image_width_px: width,
    image_height_px: height, size_bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex') };
});
const sha = process.env.USA_PR_HEAD_SHA || null;
if (sha) assert.match(sha, /^[a-f0-9]{40}$/i, 'PR HEAD must be a full Git commit SHA');
const manifest = {
  schema_version: 1,
  purpose: 'USA preview-only fictional-data visual review; not production approval',
  pr_head_sha: sha,
  checkout_sha: process.env.GITHUB_SHA || null,
  workflow_run_url: process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID
    ? `https://github.com/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}` : null,
  captures,
};
writeFileSync(join(directory, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`PASS: ${captures.length} screenshots verified; SHA-256 evidence manifest written`);
