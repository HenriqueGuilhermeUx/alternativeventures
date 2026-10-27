/** Offline, script-free review gallery. Verify all 18 synthetic CI screenshots before rendering. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const directory = 'artifacts/usa-review';
const manifest = JSON.parse(readFileSync(join(directory, 'manifest.json'), 'utf8'));
const groups = [
  ['Institutional portfolio', 'institutional'],
  ['MODO', 'modo-usa'],
  ['SmartBots', 'smartbots-usa'],
  ['DocWallet', 'docwallet-usa'],
  ['F-Insight', 'f-insight-usa'],
  ['NexOffices', 'nexoffices'],
];
const widths = [320, 390, 1280];
const expectedNames = groups.flatMap(([, prefix]) => widths.map(width => `${prefix}-${width}px.png`));
assert.equal(manifest.schema_version, 1, 'Unsupported evidence manifest schema');
assert.match(manifest.pr_head_sha, /^[a-f0-9]{40}$/i, 'Review requires a full PR HEAD SHA');
assert.equal(manifest.captures.length, 18, 'Review requires eighteen captures');
assert.deepEqual(manifest.captures.map(item => item.file).sort(), [...expectedNames].sort(),
  'Review manifest does not contain the six approved demos at three viewports');
const evidenceReports = [
  ['Screenshot integrity manifest', 'manifest.json'],
  ['Release readiness decision', 'release-readiness.json'],
  ['Netlify exact-HEAD preview status', 'netlify-status-evidence.json'],
  ['NexOffices Render provenance', 'nexoffices-render-provenance.json'],
  ['NexOffices shared-product CI debts', 'nexoffices-shared-ci-debts.json'],
];
const reports = new Map(evidenceReports.map(([, filename]) =>
  [filename, JSON.parse(readFileSync(join(directory, filename), 'utf8'))]));
for (const [filename, report] of reports) {
  assert.equal(report.schema_version, 1, 'Unsupported review report schema: ' + filename);
}
const readiness = reports.get('release-readiness.json');
assert.equal(readiness.institutional_pr_head_sha, manifest.pr_head_sha,
  'Release readiness must match screenshot evidence HEAD');
assert.equal(readiness.decision, 'not-approved',
  'The offline review must never imply automatic release approval');
const captures = new Map();
for (const capture of manifest.captures) {
  const bytes = readFileSync(join(directory, capture.file));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), capture.sha256,
    `Evidence hash mismatch: ${capture.file}`);
  assert.equal(bytes.length, capture.size_bytes, `Evidence size mismatch: ${capture.file}`);
  const width = Number(capture.file.match(/-(320|390|1280)px\.png$/)?.[1]);
  assert.equal(capture.viewport_width_px, width, `Viewport metadata mismatch: ${capture.file}`);
  assert.equal(capture.image_width_px, width, `Image width mismatch: ${capture.file}`);
  captures.set(capture.file, capture);
}
const escapeHtml = value => String(value).replace(/[&<>"']/g, ch =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const sections = groups.map(([label, prefix]) => `
<section aria-labelledby="${prefix}-heading">
  <h2 id="${prefix}-heading">${escapeHtml(label)}</h2>
  <div class="screenshots">${widths.map(width => {
    const name = `${prefix}-${width}px.png`;
    const capture = captures.get(name);
    return `<figure>
      <a href="${name}" aria-label="Open full ${escapeHtml(label)} screenshot at ${width} pixels">
        <img src="${name}" loading="lazy" alt="${escapeHtml(label)} fictional USA preview at ${width} pixel viewport" width="${width}" height="${capture.image_height_px}">
      </a>
      <figcaption><strong>${width}px viewport</strong> · ${capture.image_height_px}px captured height<br>
        <code title="SHA-256 integrity hash">SHA-256: ${capture.sha256}</code></figcaption>
    </figure>`;
  }).join('\n')}</div>
</section>`).join('\n');
const html = `<!doctype html>
<html lang="en-US"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">
<title>Alternative Ventures USA — Offline demo review</title>
<style>
:root{color-scheme:light dark;font:16px/1.5 system-ui,sans-serif}
*{box-sizing:border-box}body{max-width:1400px;margin:auto;padding:1rem 1.25rem}
a{color:inherit}a:focus-visible{outline:3px solid currentColor;outline-offset:4px}
.skip{position:absolute;left:-10000px}.skip:focus{left:1rem;top:1rem;background:Canvas;padding:.5rem;z-index:1}
header{border-bottom:1px solid GrayText;margin-bottom:2rem;padding-bottom:1rem}
.notice{border-left:4px solid currentColor;padding:.6rem 1rem;background:Canvas}
.screenshots{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr));gap:1rem}
figure{margin:0;border:1px solid GrayText;border-radius:.6rem;overflow:hidden}
figure a{display:block;max-height:440px;overflow:auto;background:Canvas}
img{display:block;width:100%;height:auto}figcaption{padding:.7rem;overflow-wrap:anywhere}
code{font-size:.7rem}section{margin:2rem 0}h2{border-bottom:1px solid GrayText;padding-bottom:.4rem}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
</style></head><body>
<a class="skip" href="#main">Skip to review images</a>
<header><h1>Alternative Ventures USA — Offline demo review</h1>
<p class="notice"><strong>Manual review required.</strong> These are fictional-data CI screenshots, not approval for production, regulated integrations, accounts, payments or customer use.</p>
<p>Institutional PR #3 HEAD: <code>${manifest.pr_head_sha}</code><br>
Six demo surfaces · 18 screenshots · 320px, 390px and 1280px viewports.</p>
<p>Open the images to inspect full resolution. The companion <code>manifest.json</code> contains SHA-256 hashes and CI provenance. This gallery works offline and contains no JavaScript, forms or remote assets.</p>
</header><main id="main" tabindex="-1">
<section aria-labelledby="evidence-heading">
<h2 id="evidence-heading">Evidence and release decision</h2>
<p><strong>NOT APPROVED.</strong> Automated checks do not constitute human sign-off. Open the local JSON reports to inspect exact-HEAD status, provenance and unresolved issues.</p>
<ul class="evidence-links">${evidenceReports.map(([label, filename]) =>
  `<li><a href="${filename}" class="evidence-link">${escapeHtml(label)} (JSON)</a></li>`).join("")}
</ul>
</section>
<h2>Human review checklist — not yet signed off</h2>
<ul><li>Readability, spacing, contrast and visible focus</li><li>Copy clarity, en-US terminology and fictional-data disclaimers</li><li>Responsive presentation and keyboard/screen-reader review in the actual previews</li><li>NexOffices Render deploy SHA and four separate Brazilian CI debts</li></ul>
${sections}
</main></body></html>\n`;
assert.equal((html.match(/<img\s/g) || []).length, 18, 'Gallery must include all screenshots');
assert.ok(!/<script\b/i.test(html), 'Offline gallery must not execute JavaScript');
assert.ok(!/\b(?:src|href)="https?:/i.test(html), 'Offline gallery must not request external assets');
writeFileSync(join(directory, 'review.html'), html);
console.log(`PASS: offline USA review.html generated with ${captures.size} verified screenshots at HEAD ${manifest.pr_head_sha}`);
