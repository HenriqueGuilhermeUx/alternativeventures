# Alternative Ventures USA — Demo review gate (2026-10-26)

Scope: MODO/SmartBots PR #163, DocWallet PR #12, F-Insight PR #26, NexOffices PR #91, institutional PR #3. This document authorizes no merge, production deployment, real messaging, accounts, payments, financial transactions, or regulated provider activation.

## Review procedure

1. Record the exact SHA and draft status of all five PRs immediately before review; invalidate previous evidence if any HEAD changes.
2. Check changed-file paths and diffs for Brazil production/configuration changes, secrets, API endpoints, financial actions, real identifiers and network calls. Stop on any unexplained change.
3. For each SHA, record exact CI run links, job conclusions and preview deployment commit. A successful CI on an older SHA does not pass the current HEAD.
4. Test each demo at 320/390/1280 px: keyboard-only navigation, visible focus, reduced motion, high contrast, headings/labels, refresh/direct route, en-US copy, no overflow, and no browser errors.
5. Use only synthetic data. Verify browser network and persistence: no Brazilian API calls, no real providers, no personal data, no live outbound messages, no external financial actions.
6. Inspect screenshot artifacts and SHA-256 manifest, recording reviewer, date, defects and resolution. Automation cannot substitute for independent human accessibility and visual approval.
7. Confirm NexOffices staging deploy SHA matches PR #91 HEAD; keep its four Brazil test failures as separately tracked issues #92–#95. Compare baseline main CI before classifying them as pre-existing; never disable or skip failing checks.
8. Require explicit approval before changing any PR from draft, merging, deploying production, commercial launch or activating regulated services.

## Verified GitHub PR workflow snapshot — 2026-10-26

These observations come from GitHub PR HEAD workflow-run queries, not from independent visual review or proof of production isolation. Revalidate if HEAD changes.

| PR | HEAD | Completed workflow conclusions |
| --- | --- | --- |
| [MODO/SmartBots #163](https://github.com/HenriqueGuilhermeUx/modo/pull/163) | `4dd2d84150ce317d2dfbc18874aefcfa7b8544c1` | 4 success |
| [DocWallet #12](https://github.com/HenriqueGuilhermeUx/docwallet/pull/12) | `3bfeec012c5f65324a2e180a71574d4e96948213` | 4 success |
| [F-Insight #26](https://github.com/HenriqueGuilhermeUx/f-insight/pull/26) | `732805316c32cf01481f3a1897084e4b08eda250` | 3 success |
| [NexOffices #91](https://github.com/HenriqueGuilhermeUx/nexoffice/pull/91) | `5b7761888b3420eb85bede1b1b1a8b99b35c87c3` | 13 success, 4 failure |
| [Institutional #3](https://github.com/HenriqueGuilhermeUx/alternativeventures/pull/3) | `2eed36524e975563c847b8aecd2e561b2d7282e3` | 2 success |

NexOffices failed workflows: Receiving Account Onboarding V1; Product Discovery Onboarding V1; NextGen Financial Engine V1; DocWallet Workspace Experience V1. Track separately in issues #92–#95. Their classification as *pre-existing* remains unverified until baseline `main` is independently checked.

The institutional documentation-only commit `2eed365` passed both USA preview guard and USA browser QA. These successful workflows do not constitute independent human approval of accessibility, screenshots, preview-to-SHA matching, or commercial readiness.

## Decision

Status: **NOT FULLY HOMOLOGATED**. Blockers: independent visual/accessibility review, preview SHA verification, Brazil baseline regression classification, and explicit commercial authorization. Demo evidence is for review only.

## NexOffices USA regression triage — 2026-10-26

Read-only inspection of failed jobs at USA PR #91 HEAD `44e1c5b6900da8cae0033ac9c19ecd5995fb843b`:

| Workflow | Failed run | Observed assertion |
| --- | --- | --- |
| Receiving Account Onboarding V1 | [40354112979](https://github.com/HenriqueGuilhermeUx/nexoffice/actions/runs/40354112979) | missing onboarding copy: `Recebimento Pix` |
| Product Discovery Onboarding V1 | [40354112648](https://github.com/HenriqueGuilhermeUx/nexoffice/actions/runs/40354112648) | missing capability tile: `Pergunte à empresa` |
| NextGen Financial Engine V1 | [40354112148](https://github.com/HenriqueGuilhermeUx/nexoffice/actions/runs/40354112148) | missing practical UX: `Pix conectado ao seu financeiro` |
| DocWallet Workspace Experience V1 | [40354112491](https://github.com/HenriqueGuilhermeUx/nexoffice/actions/runs/40354112491) | DocFlow visible |

These are actual failed assertions, not proof that the underlying Brazilian functions are broken or that failures predate the USA branch. **Baseline main CI comparison remains required**. Keep the four existing issues #92–#95 separate; do not change Brazilian components, rewrite assertions, suppress checks or count 14/18 as an all-green CI. USA isolated browser QA passed on this SHA. The institutional PR HEAD `b9d63c119a6ff6f5dadea0305bb086591b2865a6` passed both preview guard and browser QA; revalidate after any new commit.

## Dedicated Netlify USA access perimeter — 2026-10-28

The four existing **USA-only** Netlify projects were updated to require **team SSO login for all deploys** (not only branch previews). Read-back from Netlify reported `requiresSSOTeamLogin: true` and `whichProjectsRequireSSOTeamLogin: "all"` for each project:

| Project | Site ID |
| --- | --- |
| `av-usa-modo` | `241772f0-7d68-4ff3-a20d-aeac9bcbb3f8` |
| `av-usa-docwallet` | `a5b1cda8-535a-4db2-b01f-07f41c30be76` |
| `av-usa-finsight` | `9f4a4804-6640-49f5-9769-892e1f283ee3` |
| `av-usa-nexoffices` | `a0b4370c-0f17-4aca-a07d-0d16f9640c61` |

All four still reported an **empty `currentDeploy.currentDeploy`** at this check. These are protected empty projects, **not published demos**. This perimeter does not prove app-level tenant isolation or secure backend integration. No Brazilian site or shared team default was changed.

**Verification order for the first USA-only deploy:** (1) check project identity, all-deploy SSO protection and exact artifact/PR SHA; (2) confirm Netlify has a real ready deploy; (3) check the unauthenticated perimeter denies content, without interpreting the expected login/401/redirect as application-route failure; (4) using an approved team reviewer session, run the HTTP route/CSP and Chromium visual checks against the actual deployed bytes; (5) keep `release_approved=false` until evidence and independent review are recorded. Never save SSO cookies, credentials or personal data in CI artifacts. The existing unauthenticated HTTP gate expects application 200/404 responses and **must not be used as proof of content validation behind SSO** without an authenticated, non-secret-leaking review mechanism.

The Netlify connector used here can inspect projects and change visitor access, but offers **no artifact upload or Git/build connection**. Do not connect a repository using the Brazilian default build, and do not claim a site is online based on a reserved `.netlify.app` hostname.
