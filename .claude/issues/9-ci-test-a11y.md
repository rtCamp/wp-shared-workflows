# Issue #9 — Add ci-test-a11y reusable workflow

**Status:** done
**Branch:** `v1.0.0/task/ci-test-a11y`
**PR:** #10
**Assignee:** @Adi-ty

---

## Summary

Every rtCamp WordPress project that ships UI runs the same accessibility regression check — pa11y-ci against the built site served by `@wordpress/env`. The wiring (build → wp-env start → pa11y → wp-env stop) is tedious to maintain and copy-pasted across consumers; some projects skip a11y entirely as a result. This task adds `ci-test-a11y.yml` — a single reusable workflow that captures that sequence with `if: always()` cleanup, so every consumer can adopt one canonical implementation via `uses: rtCamp/shared-workflows/.github/workflows/ci-test-a11y.yml@v1`. The reusable workflow stays trigger-agnostic; consumers wire the `Run a11y` label gate at the caller level per CLAUDE.md.

---

## Decisions made

- [2026-05-12] `node-version` defaults to `"22"` rather than `required: true` — matches CLAUDE.md ("Node in workflows: 22, overridable per call") and the input-design convention adopted in the lint-trio / test-js / test-php / build PRs. `required: true` is reserved for unguessable identity (deploy slugs, bucket names) on future CD workflows.
- [2026-05-12] Build runs before `wp-env start`, not after. pa11y crawls user-facing pages served by WordPress; those pages need compiled CSS/JS. Swapping the order would silently let pa11y inspect un-built markup and might still pass — a false-green. Order is load-bearing and called out in "Things to avoid".
- [2026-05-12] `wp-env stop` carries `if: always()` so a failing pa11y run does not leak a Docker stack into the next job. Without it, repeat runs on the same runner hit port-in-use flakes.
- [2026-05-12] No `setup-php` / `composer install` step in v1.0.0. pa11y serves pages from inside the wp-env Docker containers which carry their own PHP; the consumer's plugin/theme code is mounted in. Plugins with Composer autoloaders that fatal without `vendor/` are a real edge case but uncommon enough to defer behind a follow-up `install-composer-deps` opt-in input rather than baking host-side composer setup into every a11y run.
- [2026-05-12] Reusable workflow stays trigger-agnostic. CLAUDE.md notes a11y is "label-triggered by default", but that wiring (`if: contains(github.event.pull_request.labels.*.name, 'Run a11y')`) belongs at the caller — embedding it here would force the gate on every consumer.
- [2026-05-12] No `env: CI: true` on any step. GitHub Actions sets `CI=true` automatically on hosted runners. The legacy workflow set it explicitly — that was redundant.
- [2026-05-12] No HTML report artifact upload in v1.0.0. pa11y can emit HTML reports and uploading them as a GitHub artifact is genuinely useful for debugging failing runs, but it adds an `actions/upload-artifact` step and a path-resolution decision. Defer to a follow-up.
- [2026-05-12] No browser / wp-env Docker / build-output caching in v1.0.0. `setup-node` `cache: npm` covers the slow part (dependency install). wp-env Docker image caching is genuinely tricky and rarely worth the complexity for the first cut.
- [2026-05-12] Drive-by fix to `.yamllint.yml` line 14 (bracket spacing) — same starter-kit bug that the lint-trio, ci-test-js, ci-test-php, and ci-build PRs all touch. Whichever PR merges first wins; later ones hit a one-line conflict.

### Action SHA pins recorded

- `actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683` — v4.2.2.
- `actions/setup-node@39370e3970a6d050c480ffad4ff0ed4d3fdee5af` — v4.1.0.

---

## Files changed so far

- `.github/workflows/ci-test-a11y.yml` — new
- `.claude/issues/9-ci-test-a11y.md` — new (rename to match the issue number once filed)
- `CHANGELOG.md` — new (first entry under `## Unreleased`)
- `README.md` — edited (Individual workflows section + caller example with label gate + inputs row)
- `.yamllint.yml` — edited (drive-by bracket-spacing fix on line 14)

---

## Verification run

```bash
❯ pipx run yamllint .
❯ act workflow_call -W .github/workflows/ci-test-a11y.yml --dryrun 
*DRYRUN* [CI / Test a11y/pa11y-ci] ⭐ Run Set up job
*DRYRUN* [CI / Test a11y/pa11y-ci] 🚀  Start image=node:16-buster-slim
*DRYRUN* [CI / Test a11y/pa11y-ci]   🐳  docker pull image=node:16-buster-slim platform= username= forcePull=true
*DRYRUN* [CI / Test a11y/pa11y-ci]   🐳  docker create image=node:16-buster-slim platform= entrypoint=["tail" "-f" "/dev/null"] cmd=[] network="host"
*DRYRUN* [CI / Test a11y/pa11y-ci]   🐳  docker run image=node:16-buster-slim platform= entrypoint=["tail" "-f" "/dev/null"] cmd=[] network="host"
*DRYRUN* [CI / Test a11y/pa11y-ci]   ✅  Success - Set up job
*DRYRUN* [CI / Test a11y/pa11y-ci]   ☁  git clone 'https://github.com/actions/setup-node' # ref=39370e3970a6d050c480ffad4ff0ed4d3fdee5af
*DRYRUN* [CI / Test a11y/pa11y-ci] ⭐ Run Main Checkout repository
*DRYRUN* [CI / Test a11y/pa11y-ci]   ✅  Success - Main Checkout repository [7.135916ms]
*DRYRUN* [CI / Test a11y/pa11y-ci] ⭐ Run Main Set up Node.js
*DRYRUN* [CI / Test a11y/pa11y-ci]   ✅  Success - Main Set up Node.js [11.4295ms]
*DRYRUN* [CI / Test a11y/pa11y-ci] ⭐ Run Main Install npm dependencies
*DRYRUN* [CI / Test a11y/pa11y-ci]   ✅  Success - Main Install npm dependencies [16.7305ms]
*DRYRUN* [CI / Test a11y/pa11y-ci] ⭐ Run Main Build production assets
*DRYRUN* [CI / Test a11y/pa11y-ci]   ✅  Success - Main Build production assets [16.109583ms]
*DRYRUN* [CI / Test a11y/pa11y-ci] ⭐ Run Main Start wp-env
*DRYRUN* [CI / Test a11y/pa11y-ci]   ✅  Success - Main Start wp-env [16.489ms]
*DRYRUN* [CI / Test a11y/pa11y-ci] ⭐ Run Main Run pa11y-ci
*DRYRUN* [CI / Test a11y/pa11y-ci]   ✅  Success - Main Run pa11y-ci [16.027583ms]
*DRYRUN* [CI / Test a11y/pa11y-ci] ⭐ Run Main Stop wp-env
*DRYRUN* [CI / Test a11y/pa11y-ci]   ✅  Success - Main Stop wp-env [13.088125ms]
*DRYRUN* [CI / Test a11y/pa11y-ci] ⭐ Run Post Set up Node.js
*DRYRUN* [CI / Test a11y/pa11y-ci]   ✅  Success - Post Set up Node.js [4.724833ms]
*DRYRUN* [CI / Test a11y/pa11y-ci] ⭐ Run Complete job
*DRYRUN* [CI / Test a11y/pa11y-ci] Cleaning up container for job pa11y-ci
*DRYRUN* [CI / Test a11y/pa11y-ci]   ✅  Success - Complete job
*DRYRUN* [CI / Test a11y/pa11y-ci] 🏁  Job succeeded
```

---

## Open questions

- _(none yet)_

---

## Notes for the reviewer

- The `if: always()` on `wp-env stop` is non-negotiable — without it, a failing pa11y leaves containers running and the next CI run on the same runner hits port-in-use errors.
- Composer install is deliberately absent. If reviewers want it for v1.0.0, the cleanest shape is an `install-composer-deps` boolean (default `false`) that conditionally sets up PHP and runs `composer install --no-scripts` before the build step. Happy to fold that in if requested — flagging here so it is a conscious decision rather than an oversight.
- `.yamllint.yml` fix is duplicated across the PRs. Whichever merges first wins; later ones hit a one-line conflict.

---

## Handoff log

_(no rotations yet — delete this line when the first entry is added)_
