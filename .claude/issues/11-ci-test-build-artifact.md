# Issue #11 — ci-test-build-artifact reusable workflow

**Status:** in-progress <!-- in-progress | in-review | done -->
**Branch:** `v1.0.0/task/ci-test-build-artifact`
**PR:** #<pr-number> <!-- fill once opened -->
**Assignee:** @Adi-ty

---

## Summary

A green `ci-build.yml` run only proves the build did not crash — not that the packaged output installs and boots in WordPress. This workflow downloads the build artifact, boots a real WordPress in `@wordpress/env`, activates the plugin/theme, and runs `wp doctor`, so failures like a PHP file referenced but never copied into the bundle, an over-eager `.distignore`, or a path-cased file that breaks on Linux fail CI loudly. It lives here because every consuming skeleton needs the same flow against its own artifact.

---

## Decisions made

- [2026-05-28] README-only delivery (repo house style): reusable workflow + README caller examples + CHANGELOG entry. No committed fixture, no `_examples/` file, no in-PR self-test wrapper — matches how #3/#5/#7/#9/#19 shipped. Verify via `act` dry-run and the smoke-test consumer repo.
- [2026-05-28] Workflow-owned wp-env: the workflow runs `npx --yes @wordpress/env` itself and writes a `.wp-env.override.json` to pin `phpVersion`/`core` and mount the artifact, rather than reusing the consumer's `npm run wp-env` (which `ci-test-a11y.yml` does). Keeps version pinning self-contained.
- [2026-05-28] Override mounts the artifact **in isolation** — it sets `plugins: []` and `themes: []` so the consumer's `.wp-env.json` (standard rtCamp config mounts the dev source `"."`) does not collide with the artifact mapping at the same destination. Discovered while wiring the smoke-test repo, whose `.wp-env.json` is `{ "plugins": ["."], "themes": [] }`.
- [2026-05-28] Explicit `slug` input (the directory to activate) instead of deriving it from plugin headers / composer.json — deterministic across project shapes. Added `node-version` too (needed to drive `npx`, parity with sibling workflows). Both go beyond the issue's literal four-input contract.
- [2026-05-28] Used `wp doctor check --all --format=json` (runs the checks, returns per-check `status`) — the issue's reference used `wp doctor list`, which only lists available checks. Fail only on `error` severity; warnings allowed. Verified against the doctor-command docs: `check` runs, `--all` = every registered check, results are `{name, status, message}` with `status` ∈ `success|warning|error`.
- [2026-05-28] Artifact contract documented: the artifact must be a complete installable plugin/theme directory, so consumers point `ci-build.yml`'s `artifact-path` at a packaged dist dir, not bare `build/`. `actions/download-artifact` restores contents uncompressed — no unzip step.
- [2026-05-28] `wp doctor check --all` flagged `constant-wp-debug-falsy` as `error` in the smoke-test happy path (confirmed via a real CI run after the visibility fix). Cause: wp-env enables `WP_DEBUG` by default (dev environment), and that check is production-oriented — so it errors for every consumer regardless of the artifact (`core-verify-checksums` passed; my earlier guess was wrong). Fix: added a `doctor-ignore-checks` input (default `constant-wp-debug-falsy`) and filter those names out of the error gate in jq; all other error-severity checks still fail the build.
- [2026-05-28] `permissions: contents: read` is sufficient — the artifact is downloaded from the same run (consumer calls `ci-build` then this), so no `actions: read` / cross-run id needed. `wp-env stop` runs in an `if: always()` step with its own `timeout-minutes: 2` so no container leaks.

---

## Files changed so far

- `.github/workflows/ci-test-build-artifact.yml` — new
- `README.md` — edited (new `### ci-test-build-artifact.yml` section under Individual workflows)
- `CHANGELOG.md` — edited (Unreleased → Added bullet)
- `.claude/issues/11-ci-test-build-artifact.md` — new (this file)

Consumer-side wiring (separate `smoke-test` repo, not this branch):

- `smoke-test/.github/workflows/ci-test-build-artifact.yml` — copied verbatim
- `smoke-test/.github/workflows/ci.yml` — added `build-package` (full installable plugin artifact) + `test-build-artifact` jobs

---

## Verification run

```bash
$ awk '/\t/{print FILENAME":"NR}' .github/workflows/ci-test-build-artifact.yml   # no tabs -> (no output)

$ WP_VERSION=latest PHP_VERSION=8.3 INSTALL_PATH=wp-content/plugins SLUG=smoke-test \
  jq -n --arg wp "$WP_VERSION" --arg php "$PHP_VERSION" --arg dest "${INSTALL_PATH%/}/${SLUG}" '{...}'
# -> { "core": null, "phpVersion": "8.3", "plugins": [], "themes": [],
#      "mappings": { "wp-content/plugins/smoke-test": "./artifact" } }
# WP_VERSION=6.5 -> "core": "WordPress/WordPress#6.5"

$ act workflow_call -W .github/workflows/ci-test-build-artifact.yml --dryrun
# -> all 8 steps Success, Job succeeded (smoke-script step correctly skipped on empty default)
```

Binding test (boots wp-env + Docker, which `act` cannot do reliably): the `smoke-test` repo's CI runs `build-package` -> `test-build-artifact` against a real `dist/smoke-test/` package. Confirm activate + `wp doctor` pass and `wp-env stop` runs on failure.

---

## Open questions

- _(none yet)_

---

## Notes for the reviewer

- Doctor output parsing is safe without stderr suppression: wp-env spawns the cli command with `stdio: 'inherit'` (`node_modules/@wordpress/env/lib/runtime/docker/index.js`), so the WP-CLI JSON is alone on stdout while wp-env's ora spinner writes status to stderr. `result=$(…)` captures only stdout. Earlier `2>/dev/null` was removed (it only hid useful diagnostics). `wp doctor check` exits 1 on an error-severity check, so the capture uses `|| true` to always print the report; the explicit `jq` is the gate (and fails the step under `set -e` on empty/garbage output).
- `npx --yes @wordpress/env` first-run install counts against the ~6 min target; `--update` + runner Docker cache should keep it under budget.
- Isolation override clears `plugins`/`themes`; a consumer that needs companion plugins active during the smoke test is not covered yet (would be a future `companion-plugins` input).

---

## Handoff log

_(no rotations yet — delete this line when the first entry is added)_
