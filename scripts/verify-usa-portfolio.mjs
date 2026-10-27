import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = path => readFileSync(resolve(root, path), "utf8");
const html = read("site/us/index.html");
const brazil = read("site/index.html");
const netlify = read("netlify.toml");
assert.match(html, /<html lang="en-US">/, "US language missing");
assert.match(html, /name="robots"\s+content="noindex,nofollow"/, "Preview must not be indexed");
// Defense in depth: the informational /us/ page must be incapable of
// executing JavaScript, calling APIs, submitting forms or embedding providers.
// Font stylesheet origins are explicitly permitted; the Brazil site is untouched.
const csp = html.match(/<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]+)"/i)?.[1];
assert.ok(csp, "USA preview Content Security Policy is missing");
const directives = new Map(csp.split(";").map(x => x.trim()).filter(Boolean).map(x => {
  const [name, ...sources] = x.split(/\s+/);
  return [name, sources];
}));
for (const name of ["script-src", "connect-src", "form-action", "object-src", "frame-src", "base-uri"]) {
  assert.deepEqual(directives.get(name), ["'none'"], "USA preview must deny " + name);
}
assert.deepEqual(directives.get("default-src"), ["'self'"], "Unexpected default CSP origin");
assert.deepEqual(directives.get("img-src"), ["'self'", "data:"], "Unexpected image CSP origin");
assert.deepEqual(directives.get("font-src"), ["'self'"], "USA preview fonts must be same-origin only");
assert.deepEqual(directives.get("style-src"), ["'self'", "'unsafe-inline'"], "USA preview styles must not allow remote hosts");

assert.match(html, /<title>Alternative Ventures USA/i);
assert.match(html, /<a class="skip-link" href="#main-content">Skip to main content<\/a>/, "Keyboard skip link missing");
assert.match(html, /<main id="main-content" tabindex="-1">/, "Skip link target must be focusable");
assert.match(html, /\.skip-link:focus\{top:12px\}/, "Skip link must be visible on keyboard focus");
const sectionIds = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
assert.equal(new Set(sectionIds).size, sectionIds.length, "Duplicate section ids");
for (const [, target] of html.matchAll(/href="#([^"]+)"/g)) {
  assert.ok(sectionIds.includes(target), "Broken in-page navigation target: " + target);
}
const demoAnchors = [...html.matchAll(/(<a\b[^>]*class="product-demo-link"[^>]*>)([^<]+)<\/a>/g)];
assert.equal(demoAnchors.length, 5, "Exactly five verified staging demo links are expected");
assert.match(html, /<p class="demo-data-note" id="usa-demo-data-note">Fictional sample data only\./,
  "Visible fictional-data guidance is required before any USA demo links");
assert.match(html, /Do not enter personal, customer, financial, or confidential information/,
  "Preview must warn reviewers against entering real information");
for (const [, anchor, visibleText] of demoAnchors) {
  // WCAG 2.5.3: the accessible name must begin with the text users see,
  // allowing voice-control users to activate the same demo link.
  const visibleLabel = visibleText.replace(/\s*↗\s*$/u, '').trim();
  const accessibleLabel = anchor.match(/aria-label="([^"]+)"/)?.[1] ?? '';
  assert.ok(visibleLabel && accessibleLabel.startsWith(visibleLabel),
    "Demo link accessible name must include its visible label: " + visibleLabel);
  assert.match(anchor, /aria-describedby="usa-demo-data-note(?: nexoffices-preview-note)?"/,
    "Each demo link must expose the fictional-data warning to assistive technology");
  assert.match(anchor, /target="_blank"/, "Staging demos must open in a separate tab");
  assert.match(anchor, /aria-label="[^"]+new tab"/, "Staging demos need a descriptive new-tab label");
  const rel = anchor.match(/rel="([^"]+)"/)?.[1].split(/\s+/) ?? [];
  for (const token of ["noopener", "noreferrer", "nofollow"]) {
    assert.ok(rel.includes(token), "Missing safe external-link rel: " + token);
  }
}
assert.ok(html.includes('Explore NexOffices USA demo'), 'NexOffices must link only to the independent US-only static staging host');
for (const name of ["MODO", "SmartBots", "DocWallet", "F-Insight", "NexOffices"]) {
  assert.ok(html.includes(name), "Missing selected US preview: " + name);
}
assert.match(html, /preview only/i, "US commercial status disclaimer missing");
assert.match(html, /does not open accounts or accept orders/i);
assert.ok(!/action=["']https?:/i.test(html), "No remote forms allowed on preview");

// The US institutional page is a non-interactive showcase. Fail closed if a
// later change adds account inputs, embedded apps, executable third-party
// scripts, persistence or browser-initiated data transmission.
const forbiddenPreviewFeatures = [
  ["input or submission controls", /<(?:form|input|textarea|select|button)\b/i],
  ["embedded third-party content", /<(?:iframe|object|embed)\b/i],
  ["any executable or blocked script markup", /<script\b/i],
  ["inline HTML event handlers", /\bon[a-z]+\s*=/i],
  ["client-side network calls", /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon)\s*\(/i],
  ["persistent browser storage", /\b(?:localStorage|sessionStorage|indexedDB|serviceWorker)\b/i],
];
for (const [feature, pattern] of forbiddenPreviewFeatures) {
  assert.ok(!pattern.test(html), "USA institutional preview must not contain " + feature);
}

const approvedDemoLinks = [
  "https://deploy-preview-163--modo1.netlify.app/us/demo",
  "https://deploy-preview-163--modo1.netlify.app/us/smartbots/demo",
  "https://deploy-preview-12--docwallet.netlify.app/us/workspace",
  "https://deploy-preview-26--f-insight.netlify.app/us",
  "https://nexoffices-usa-staging.onrender.com/us/",
];
const approvedExternalLinks = new Set(approvedDemoLinks);
assert.ok(!/<link\b[^>]*\brel=["\'](?:preconnect|dns-prefetch|stylesheet)["\']/i.test(html),
  "USA institutional preview must not preload or fetch remote stylesheets");
assert.ok(!/@import\s+(?:url\s*\()?\s*["\']?https?:/i.test(html),
  "USA institutional preview must not import remote CSS");
const absoluteLinks = [...html.matchAll(/href=["'](https?:\/\/[^"']+)["']/gi)].map(match => match[1].replace(/&amp;/g, '&'));
for (const link of absoluteLinks) {
  assert.ok(approvedExternalLinks.has(link), "Unexpected external link on USA preview: " + link);
}
for (const demo of approvedDemoLinks) {
  assert.ok(absoluteLinks.includes(demo), "Missing US staging walkthrough: " + demo);
}
assert.ok(!/(https?:\/\/)?(?:trymodo|trydocwallet|f-insight\.org|nexoffices\.com\.br)/i.test(absoluteLinks.join(' ')), "Brazilian production app links are forbidden");

assert.match(brazil, /<html lang="pt-BR">/, "Brazil locale must remain intact");
assert.ok(netlify.includes('publish = "site"'), "Existing publishing root must remain unchanged");
console.log("PASS: Alternative Ventures USA static preview, BR separation and no-US-commerce guard");
