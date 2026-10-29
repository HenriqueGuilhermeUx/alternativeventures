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
