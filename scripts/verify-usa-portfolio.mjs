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
assert.match(html, /<title>Alternative Ventures USA/i);
for (const name of ["MODO", "SmartBots", "DocWallet", "F-Insight", "NexOffices"]) {
  assert.ok(html.includes(name), "Missing selected US preview: " + name);
}
assert.match(html, /preview only/i, "US commercial status disclaimer missing");
assert.match(html, /does not open accounts or accept orders/i);
assert.ok(!/action=["']https?:/i.test(html), "No remote forms allowed on preview");
assert.ok(!/href=["']https?:\/\/(?!fonts|alternativeventures)/i.test(html), "No links to live Brazilian product apps from US preview");
assert.match(brazil, /<html lang="pt-BR">/, "Brazil locale must remain intact");
assert.ok(netlify.includes('publish = "site"'), "Existing publishing root must remain unchanged");
console.log("PASS: Alternative Ventures USA static preview, BR separation and no-US-commerce guard");
