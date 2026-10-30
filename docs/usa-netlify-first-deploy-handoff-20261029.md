# Alternative Ventures USA — dedicated Netlify first-deploy handoff (2026-10-29)

**Review-only operational evidence. Not authorization to launch, merge, connect Brazilian production, or activate accounts, billing, API, banking or signing.** All four USA projects belong to team `68a5094671bba3abf89c3983`. Netlify project read-back on 2026-10-29 showed team SSO required for **all** deploys, zero project environment variables, zero shared team environment variables, and no published deploy for the three sites below. A reserved `.netlify.app` hostname is not proof of a published application.

| USA-only site (site ID) | GitHub repository / isolated branch | Dedicated Package directory | Output | Netlify evidence |
| --- | --- | --- | --- | --- |
| `av-usa-docwallet` (`a5b1cda8-535a-4db2-b01f-07f41c30be76`) | `HenriqueGuilhermeUx/docwallet` / `feature/usa-localized-preview-20261024` | `deploy/netlify/docwallet` | `dist-usa-docwallet` | No current deploy ID |
| `av-usa-finsight` (`9f4a4804-6640-49f5-9769-892e1f283ee3`) | `HenriqueGuilhermeUx/f-insight` / `feature/usa-localized-preview-20261024` | `deploy/netlify/f-insight` | `dist-usa-finsight` | No current deploy ID |
| `av-usa-nexoffices` (`a0b4370c-0f17-4aca-a07d-0d16f9640c61`) | `HenriqueGuilhermeUx/nexoffice` / `feature/usa-localized-preview-20261024` | `deploy/netlify/nexoffices` | `apps/web/dist-usa` | No current deploy ID |

**Do not connect any of these three repositories using the root/default Netlify configuration.** The project must explicitly select the USA-only Package directory above; leave Base directory unset. Review the Netlify build log to prove it loaded `deploy/netlify/<product>/netlify.toml`, ran `scripts/usa-netlify-site-guard.mjs` before installation and built only the USA Vite entry. The guard checks exact Netlify SITE_ID, allowed branch/context and absence of inherited integration keys. A root-config build can bypass this guard, so CI alone is insufficient. If the integration cannot set or inspect Package directory, **do not connect Git or deploy**.

## Source/CI evidence at this read-back

| Isolated feature branch | Resolved Git commit | Workflow results on that commit |
| --- | --- | --- |
| MODO | `730e1e34088c2d983606217aa21a9cc6a121a951` | 7 success |
| DocWallet | `7d2f62a58936dc738dfbc08d2d91b110a1a315b1` | 5 success |
| F-Insight | `014819143cfd6729bfb8a6e2f501fc33d77d7ac2` | 4 success |
| NexOffices | `b7c54f3411acbc2b6a7233ad53a76ae882573d43` | 16 success / 4 failure |
| Institutional | `d585fadd3950bb6b7465ae653d7338e1358a8732` | 2 success (before this documentation update) |

The four NexOffices failures are in shared UX/onboarding workflows (`NextGen Financial Engine V1`, `DocWallet Workspace Experience V1`, `Receiving Account Onboarding V1`, `Product Discovery Onboarding V1`). Do not disable, modify or reclassify them without a separate baseline comparison and authorization. On 2026-10-29 the GitHub PR metadata endpoint independently confirmed that **all five PRs are open, draft, unmerged** and that the four product SHAs above match their PR heads; the institutional SHA above was also independently confirmed as PR #3 head before this update.

## Existing MODO deploy — not equivalent to launch approval

The dedicated MODO project `241772f0-7d68-4ff3-a20d-aeac9bcbb3f8` reports real Netlify deploy `6ae28e8751c9d9dc22c3573e` as `ready`, published `2026-10-29T00:09:46.568Z`, commit `5bb5b8c17c8b83d0de6ea5c0c517addfbe5fdaa8`, branch `deploy/modo-usa-netlify-20261028`. This is intentionally **not** the MODO PR branch SHA. Validate ancestry with the independent MODO branch-provenance gate. Netlify reports 4 processed redirects, 1 processed header rule, no functions or edge functions and no secret-scan findings across 451 files. The content behind team SSO was not independently fetched or visually reviewed; keep release approval false.

## Mandatory first-deploy review sequence (per site)

1. Before any Git connection, recheck exact project ID, team, all-deploy SSO, empty environment variable scopes, selected isolated branch and Package directory. Do not change the Brazilian site's configuration, default branch or root `netlify.toml`.
2. Confirm the USA guard executes **before** dependency installation and verify that the build output contains only the standalone USA bundle plus its `_headers`, `_redirects`, `404.html` and `robots.txt`. No Netlify/Edge Functions, server process, PWA, login, billing or provider connection.
3. Obtain the real Netlify deploy ID, immutable permalink, deploy commit SHA, build-log config selection, processed header/redirect counts and secret-scan results. Reject a missing deploy, unexpected SHA, unexpected server-side execution or absent security rules.
4. With an authorized SSO reviewer session, inspect actual HTTP and browser behavior: allowed USA paths 200; forbidden BR/login/API/payment paths 404; CSP, noindex and frame protections; no outbound API calls, storage of client data, service worker or external provider. Do not store SSO tokens/cookies in logs or artifacts.
5. Perform independent 320/390/1280px visual, keyboard and accessibility review of the **served** bytes. Record screenshot hashes, defects, reviewer, date and exact immutable permalink. Keep all PRs draft and `release_approved=false` until evidence is independently approved.

**Current operational blocker:** available Netlify connector provides project/deploy/access/environment inspection but does not offer Git/build connection, Package directory editing, artifact upload or authenticated visual inspection. Leave the three sites without deploy rather than use a default Brazilian build. No duplicate backend/database is required for these static synthetic previews.

## 2026-10-29 08:40 BRT — first-deploy readiness recheck

- Read back all four **exact** Netlify project IDs: SSO required on **all** deploys; no project-level environment variables and no team-shared variables. This is a point-in-time check, not a guarantee against later configuration changes.
- `av-usa-docwallet`, `av-usa-finsight`, and `av-usa-nexoffices` each return `currentDeploy: {}` (no published deploy ID). Netlify may still return a `branchVersionOfSite` URL for these empty sites; **do not treat that URL as a successful deployment**. Do not advertise them as live.
- The existing MODO deploy is `ready`, commit `5bb5b8c17c8b83d0de6ea5c0c517addfbe5fdaa8`, with Netlify `deploy_source=api`; its existence does **not** prove that a Git-based build configuration is available or that authenticated HTTP and visual QA passed.
- The three dedicated `netlify.toml` files were fetched from their isolated GitHub branches. All require Package directory selection and execute `scripts/usa-netlify-site-guard.mjs` before package installation; DocWallet uses Node 22 / npm, F-Insight Node 22 / pnpm 9.15.5, NexOffices Node 24 / npm. The Netlify connector cannot configure or inspect the actual Git/build selection. Therefore, **no new deploy was initiated**.
- GitHub Actions on the exact PR heads: MODO 7/7 success, DocWallet 5/5, F-Insight 4/4, NexOffices 16/20 (the four shared failures above). CI artifacts are **not** evidence of a Netlify publication. All PRs remain draft; the institutional PR CI should be checked again on the new documentation commit.
- Release gate remains `release_approved=false` for all four projects until a real deploy ID, verified immutable URL, correct build configuration, authenticated HTTP checks and visual inspection are available. No Brazilian services, databases, clients, payments or deployments may be modified.

## 2026-10-29 10:41 BRT — NexOffices shared CI failure signatures (read-only)

Read the **failed job steps and decoded job logs** on exact draft PR #91 HEAD `b7c54f3411acbc2b6a7233ad53a76ae882573d43`. These are four independently observed failures, not permission to edit shared modules or weaken their assertions:

| Failed workflow (GitHub run) | Failing job step | Observed failure signature |
| --- | --- | --- |
| [NextGen Financial Engine V1](https://github.com/HenriqueGuilhermeUx/nexoffice/actions/runs/40736901365) | `Financial engine contract smoke` | `missing practical UX: Pix conectado ao seu financeiro` |
| [DocWallet Workspace Experience V1](https://github.com/HenriqueGuilhermeUx/nexoffice/actions/runs/40736901492) | `Validate DocWallet workspace experience contract` | `DocWallet Workspace Experience V1 failed: DocFlow visible` |
| [Receiving Account Onboarding V1](https://github.com/HenriqueGuilhermeUx/nexoffice/actions/runs/40736901307) | `Validate receiving account onboarding contract` | `missing onboarding copy: Recebimento Pix` |
| [Product Discovery Onboarding V1](https://github.com/HenriqueGuilhermeUx/nexoffice/actions/runs/40736901381) | `Validate discovery contract` | `missing capability tile: Pergunte à empresa` |

**Interpretation limit:** the logs show missing expected Brazilian copy/visibility in the tested contract, but do not establish whether the regression predates the USA branch. No baseline-main assertion-level comparison was performed; keep all four checks failed and unresolved. No shared test, component, or BR workflow was modified.

At this read-back, all five PRs remain open/draft/unmerged. Their exact HEAD workflow results remain MODO 7/7, DocWallet 5/5, F-Insight 4/4, NexOffices 16/20, institutional 2/2 **before this documentation commit**. The four Netlify project records still require team SSO for all deploys; all four project env-var listings and the shared team env-var listing were empty. Only MODO has a published deploy ID (`6ae28e8751c9d9dc22c3573e`, `ready`); the other three return empty current-deploy objects. No Git/build connection or new deploy was attempted. HTTP-authenticated inspection, served-byte provenance and visual sign-off remain missing; release approval stays false.

## 2026-10-29 11:34 BRT — exact-commit shared-contract parity and security check

- The USA institutional branch now includes a read-only eight-file source-contract parity audit in `scripts/usa-nexoffices-ci-debt-audit.mjs`, commit [`a64c396`](https://github.com/HenriqueGuilhermeUx/alternativeventures/commit/a64c39605ae581a867983c5cd5873479ea8af574). It compares four shared NexOffices BR components and their four smoke scripts by GitHub blob SHA on the **exact** PR #91 HEAD `b7c54f3411acbc2b6a7233ad53a76ae882573d43` and base `ac1621a51b612dbc9353f5ee5a84becdbd6b7c0f`. It never edits or executes the BR modules.
- [Browser QA run 40892607785](https://github.com/HenriqueGuilhermeUx/alternativeventures/actions/runs/40892607785) passed and logged **8/8 identical file bytes** across these exact commits. This supports unchanged shared source and smoke assertions in the USA PR. It **does not prove** that the four failures predate the USA branch, nor that an equivalent main workflow passed or failed. Equivalent base workflow runs: **0/4 located**; four PR-head shared checks remain **failed**.
- The same exact-head read-only audit separately reported **GitGuardian: failed** for NexOffices PR #91. This is a **distinct security check**, not a fifth shared UX workflow. Its cause and any actual finding require investigation before release; do not infer that a credential was exposed, do not waive it, and do not change BR security controls in this USA workstream.
- [Preview Guard run 40892607790](https://github.com/HenriqueGuilhermeUx/alternativeventures/actions/runs/40892607790) also passed. The release-readiness report remained **NOT APPROVED**, with six outstanding conditions. CI is review evidence, not launch authorization.
- Fresh Netlify project read-back: all four exact USA site IDs still require team SSO for all deploys. All four project environment-variable lists and the team-shared list are empty. Only `av-usa-modo` has a confirmed `ready` deploy (`6ae28e8751c9d9dc22c3573e`); DocWallet, F-Insight and NexOffices still have **no current deploy ID**. The MODO permalink and CDN screenshot were not available for independent authenticated visual inspection. No Git/build connection or new Netlify deploy was initiated.
- Remain draft; keep `release_approved=false`. No BR deployment, merge, login, payment, provider integration, customer-data access or shared module/test edit is authorized.

## 2026-10-29 11:37 BRT — additional USA SmartBots access-control correction

- Netlify project discovery for `av-usa*` revealed an additional **USA-only** project, [`av-usa-smartbots`](https://app.netlify.com/projects/av-usa-smartbots), site ID `2fb27ecf-fe3d-4527-90cb-d43b05b15ae8`, not included in the four-project handoff above. Its current deploy `6ae2005ff006c567fc307e1b` was already `ready` (published 2026-10-28), commit `27dcd491c6d9db3b6c4b129af81be096c0da10ce` on isolated branch `deploy/smartbots-usa-netlify-20261028`.
- **Security finding and mitigation:** initial Netlify read-back showed **no SSO requirement** on SmartBots. I enabled team SSO for **all deploys** of this USA-only site using Netlify's visitor access controls, and independently read back `requiresSSOTeamLogin=true`, `whichProjectsRequireSSOTeamLogin=all`, `requiresPassword=false`. Its site environment-variable list is empty. This changes only access to the USA SmartBots project, not the Brazilian site, its deployment bytes, or its Git branch.
- GitHub comparison of SmartBots deploy commit against MODO PR #163 HEAD `730e1e34088c2d983606217aa21a9cc6a121a951` returned `diverged` (ahead 1, behind 2). **Do not** assert this deploy is the current PR build. It still requires independent source, authenticated HTTP and served-byte/visual review before launch approval.
- The original four USA Netlify projects retain team SSO on all deploys. No new deploy, public launch, billing, API or credential change was performed.

## 2026-10-29 13:39 BRT — GitGuardian finding count verified; USA first-deploy gate remains closed

- Read the **GitHub Checks API for the exact NexOffices PR #91 HEAD** `b7c54f3411acbc2b6a7233ad53a76ae882573d43` (`/repos/HenriqueGuilhermeUx/nexoffice/commits/<SHA>/check-runs?per_page=100`). GitHub returned **23 of 23 checks**, including one `GitGuardian Security Checks` result with `status=completed`, `conclusion=failure`, and check output title **`1 secret uncovered!`**. The check summary also reports one finding while scanning 112 PR commits. **This is a scanner-reported finding, not independent confirmation of a live credential.** No finding contents or credential values were retrieved or recorded in this handoff.
- **Security hold:** keep NexOffices USA unpublished and PR #91 draft. The authorized repository security owner must inspect the finding in [GitGuardian](https://dashboard.gitguardian.com), determine whether it is a true positive, and, if confirmed, revoke/rotate the affected credential and remediate exposure through the appropriate security process. Do not paste the secret into issues, logs, PR comments, this document, or CI artifacts. Do not dismiss/waive the check without evidence. No production credential was modified in this review.
- The four separate shared UX smoke failures remain **4/4 unresolved**; the GitGuardian finding is an **additional, independent security blocker**, not a fifth UX failure. The previously established 8/8 source-file parity does not resolve either the security finding or the baseline-test uncertainty.
- Fresh Netlify read-back: all **five** dedicated USA projects (MODO, SmartBots, DocWallet, F-Insight, NexOffices) require team SSO on **all** deploys; all five project environment-variable lists and the shared team list returned **zero entries**. Zero configured variables does **not** prove that a historical GitGuardian finding is harmless. MODO and SmartBots each have a confirmed `ready` deploy, neither authenticated-HTTP nor visually homologated; the other three have **no published deploy ID**, despite Netlify returning reserved URLs.
- GitHub PR metadata and exact-head workflow checks remain: MODO #163 **7/7**, DocWallet #12 **5/5**, F-Insight #26 **4/4**, NexOffices #91 **16/20** workflow runs plus the separate failed GitGuardian check, institutional #3 **2/2** before this documentation change. All five PRs were read back as open/draft/unmerged.
- The available Netlify integration still lacks Git connection, Package directory selection, and direct deployment of these three standalone packages. **Do not** fall back to Brazilian root builds. No merge, BR deploy, customer-data access, billing, payments, backend/database duplication or real integration was performed. Release approval remains `false`.

## 2026-10-30 — institutional USA Netlify target isolation (read-only)

An additional Netlify project inspection found that project `bucolic-smakager-91800f` (site ID `58d7984d-6f50-4caf-86b2-0ee9e954f53e`) is **not an approved USA institutional target**. Its primary URL is `https://alternativeventures.com.br`, and its current `ready` deployment `6acc01f47ca32e0008a33eef` was published on 2026-10-11 from the repository's `main` branch at commit `8c08860ba9836a34dce28ff6bc403e4734c206c0`. The project does **not** require team SSO. These are Netlify project/deploy API observations, not an authorization to change the Brazilian website.

**Fail-closed handoff:** never connect the institutional USA PR #3 branch to this Brazilian Netlify project, replace its primary URL, alter its access controls, or deploy a USA preview to it. The USA institutional PR remains draft and without a separately verified USA Netlify deployment. Any future institutional USA preview must use a separately identified USA-only target, with all-deploy SSO and exact Git/build provenance confirmed before publication. A reserved hostname or an unrelated `ready` deploy is not proof of USA release.

At this same read-back, the five USA product projects still require SSO for all deploys. MODO and SmartBots have existing `ready` deployments without authenticated served-byte/visual approval; DocWallet, F-Insight, and NexOffices have no current deployment IDs. All five GitHub PRs remain draft and unmerged; exact-head workflows are MODO 7/7, DocWallet 5/5, F-Insight 4/4, NexOffices 16/20 plus a separate failed GitGuardian check, and institutional 2/2 before this documentation update. No new Netlify deployment, Git/build connection, payment integration, database, or Brazilian change was made.
