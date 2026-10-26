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

## Evidence snapshot — not a release approval

At review start on 2026-10-26: modo #163 `4dd2d84` (4 successful runs), docwallet #12 `3bfeec0` (4), f-insight #26 `7328053` (3), nexoffice #91 `5b77618` (13 successes, 4 failures), alternativeventures #3 `eeac341` (2 successes). These are historical SHA-specific observations and must be rechecked at sign-off.

## Decision

Status: **NOT FULLY HOMOLOGATED**. Blockers: independent visual/accessibility review, Brazil baseline regression classification, and explicit commercial authorization. Demo evidence is for review only.
