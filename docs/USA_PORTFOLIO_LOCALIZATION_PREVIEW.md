# Alternative Ventures USA — isolated portfolio demonstration

Status as of 2026-10-26: **draft PR #3; preview/staging only, not merged into main or released to production**.
Branch: `feature/usa-portfolio-preview-20261024`.

## What exists

- `site/us/index.html` exposes an en-US, noindex/nofollow institutional preview at `/us/`.
- Five interactive **fictional-data** demos are linked: MODO, SmartBots, DocWallet, F-Insight and NexOffices.
- MODO: https://deploy-preview-163--modo1.netlify.app/us/demo
- SmartBots: https://deploy-preview-163--modo1.netlify.app/us/smartbots/demo
- DocWallet: https://deploy-preview-12--docwallet.netlify.app/us/workspace
- F-Insight: https://deploy-preview-26--f-insight.netlify.app/us
- NexOffices: https://nexoffices-usa-staging.onrender.com/us/ (separate, static-only staging; not the Brazilian app)
- Links are allowlisted by `scripts/verify-usa-portfolio.mjs`. The institutional browser suite exercises 320/390/1280px and checks keyboard skip-link focus, overflow, runtime errors and unapproved network requests.
- `scripts/usa-live-demos-browser.mjs` and `scripts/usa-nexoffices-render-browser.mjs` verify that linked previews actually render expected English demo content.

## Evidence available before this update

- Institutional browser QA: https://github.com/HenriqueGuilhermeUx/alternativeventures/actions/runs/40260461624 — success on `508ad00`.
- Institutional static preview guard: https://github.com/HenriqueGuilhermeUx/alternativeventures/actions/runs/40260461110 — success on `508ad00`.
- MODO/SmartBots PR #163, DocWallet PR #12, F-Insight PR #26: respective US checks and Netlify preview statuses succeeded on their PR HEADs.
- NexOffices PR #91 at `5b77618`: US browser and isolation checks succeeded; **four separate inherited Brazilian copy checks failed** (DocFlow, Pergunte à empresa, Pix conectado ao seu financeiro, Recebimento Pix). See NexOffices issues #92–#95. These checks must not be hidden or altered in the USA workstream.
- CI success and staging status are not equivalent to independent visual approval or production readiness.

## Explicit boundaries and remaining gates

No live accounts, customer data, contact submission, messages, payments, financial operations, provider activation or regulated US integrations. No changes to Brazilian `site/index.html`, `site/main.css`, `netlify.toml`, login, redirects, APIs or clients. No merges or production deploys without fresh authorization.

Before calling the package fully homologated: inspect all five demos visually on mobile/desktop, confirm the live staging artifact matches the intended HEAD, validate Brazilian route regressions, review commercial/legal copy and accessibility, and separately triage NexOffices' four existing BR CI failures. Keep this PR in draft and indexing disabled until those gates are explicitly approved.

The NexOffices link above supersedes the earlier informational-only note: an isolated staging demo now exists, but is **not** a commercial US service.
