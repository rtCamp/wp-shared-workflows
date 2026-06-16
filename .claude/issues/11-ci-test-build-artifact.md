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

- [2026-05-28] README-only delivery (repo house style): reusable workflow + README caller examples + CHANGELOG entry. No committed fixture, no `_examples/` file, no in-PR self-test wrapper — matches how #3/#5/#7/#9/#19 shipped. Verify via `act` dry-run and a real consumer repo's CI.
- [2026-05-28] Workflow-owned wp-env: the workflow runs `npx --yes @wordpress/env` itself and writes a `.wp-env.override.json` to pin `phpVersion`/`core` and mount the artifact, rather than reusing the consumer's `npm run wp-env` (which `ci-test-a11y.yml` does). Keeps version pinning self-contained.
- [2026-05-28] Override mounts the artifact **in isolation** — it sets `plugins: []` and `themes: []` so the consumer's `.wp-env.json` (standard rtCamp config mounts the dev source `"."`) does not collide with the artifact mapping at the same destination. Discovered during smoke testing (a standard rtCamp `.wp-env.json` mounts the dev source as `plugins: ["."]`).
- [2026-05-28] Explicit `slug` input (the directory to activate) instead of deriving it from plugin headers / composer.json — deterministic across project shapes. Added `node-version` too (needed to drive `npx`, parity with sibling workflows). Both go beyond the issue's literal four-input contract.
- [2026-05-28] Used `wp doctor check --all --format=json` (runs the checks, returns per-check `status`) — the issue's reference used `wp doctor list`, which only lists available checks. Fail only on `error` severity; warnings allowed. Verified against the doctor-command docs: `check` runs, `--all` = every registered check, results are `{name, status, message}` with `status` ∈ `success|warning|error`.
- [2026-05-28] Artifact contract documented: the artifact must be a complete installable plugin/theme directory, so consumers point `ci-build.yml`'s `artifact-path` at a packaged dist dir, not bare `build/`. `actions/download-artifact` restores contents uncompressed — no unzip step.
- [2026-05-28] `wp doctor check --all` flagged `constant-wp-debug-falsy` as `error` during smoke testing (a real CI run, after the visibility fix). Cause: wp-env enables `WP_DEBUG` by default (dev environment), and that check is production-oriented — so it errors for every consumer regardless of the artifact (`core-verify-checksums` passed; my earlier guess was wrong). Fix: added a `doctor-ignore-checks` input (default `constant-wp-debug-falsy`) and filter those names out of the error gate in jq; all other error-severity checks still fail the build.
- [2026-05-28] Theme-path + pinned-version were exercised during smoke testing (`install-path: wp-content/themes`, `wp-version: 6.9.4`). Pinned `6.9.4` (latest in its 6.9.x line) so only a *major* (7.0) update is offered → doctor `core-update` returns `warning`, not `error`. Verified via the doctor-command source: `core-update` sets `error` for an available *minor* update, `warning` for a major. Also passed `doctor-ignore-checks: "constant-wp-debug-falsy,core-update"` so the test stays durable as releases advance (core updates are about WordPress core, not the artifact).
- [2026-05-28] `permissions: contents: read` is sufficient — the artifact is downloaded from the same run (consumer calls `ci-build` then this), so no `actions: read` / cross-run id needed. `wp-env stop` runs in an `if: always()` step with its own `timeout-minutes: 2` so no container leaks.

---

## Files changed so far

- `.github/workflows/ci-test-build-artifact.yml` — new
- `README.md` — edited (new `### ci-test-build-artifact.yml` section under Individual workflows)
- `CHANGELOG.md` — edited (Unreleased → Added bullet)
- `.claude/issues/11-ci-test-build-artifact.md` — new (this file)

Consumer-side verification was done separately via smoke testing (external, not tracked here).

---

## Verification run

```bash
❯ act workflow_call -W .github/workflows/ci-test-build-artifact.yml --dryrun
INFO[0000] Using docker host 'unix:///var/run/docker.sock', and daemon socket 'unix:///var/run/docker.sock' 
WARN  ⚠ You are using Apple M-series chip and you have not specified container architecture, you might encounter issues while running act. If so, try running it with '--container-architecture linux/amd64'. ⚠  
*DRYRUN* [CI / Test Build Artifact/Boot artifact in wp-env] ⭐ Run Set up job
*DRYRUN* [CI / Test Build Artifact/Boot artifact in wp-env] 🚀  Start image=node:16-buster-slim
*DRYRUN* [CI / Test Build Artifact/Boot artifact in wp-env]   🐳  docker pull image=node:16-buster-slim platform= username= forcePull=true
*DRYRUN* [CI / Test Build Artifact/Boot artifact in wp-env]   🐳  docker create image=node:16-buster-slim platform= entrypoint=["tail" "-f" "/dev/null"] cmd=[] network="host"
*DRYRUN* [CI / Test Build Artifact/Boot artifact in wp-env]   🐳  docker run image=node:16-buster-slim platform= entrypoint=["tail" "-f" "/dev/null"] cmd=[] network="host"
*DRYRUN* [CI / Test Build Artifact/Boot artifact in wp-env]   ✅  Success - Set up job
*DRYRUN* [CI / Test Build Artifact/Boot artifact in wp-env]   ☁  git clone 'https://github.com/actions/setup-node' # ref=39370e3970a6d050c480ffad4ff0ed4d3fdee5af
*DRYRUN* [CI / Test Build Artifact/Boot artifact in wp-env] Non-terminating error while running 'git clone': some refs were not updated
*DRYRUN* [CI / Test Build Artifact/Boot artifact in wp-env]   ☁  git clone 'https://github.com/actions/download-artifact' # ref=d3f86a106a0bac45b974a628896c90dbdf5c8093
*DRYRUN* [CI / Test Build Artifact/Boot artifact in wp-env] ⭐ Run Main Checkout repository
*DRYRUN* [CI / Test Build Artifact/Boot artifact in wp-env]   ✅  Success - Main Checkout repository [6.879458ms]
*DRYRUN* [CI / Test Build Artifact/Boot artifact in wp-env] ⭐ Run Main Set up Node.js
*DRYRUN* [CI / Test Build Artifact/Boot artifact in wp-env]   ✅  Success - Main Set up Node.js [6.783ms]
*DRYRUN* [CI / Test Build Artifact/Boot artifact in wp-env] ⭐ Run Main Download build artifact
*DRYRUN* [CI / Test Build Artifact/Boot artifact in wp-env]   ✅  Success - Main Download build artifact [6.240375ms]
*DRYRUN* [CI / Test Build Artifact/Boot artifact in wp-env] ⭐ Run Main Write wp-env override
*DRYRUN* [CI / Test Build Artifact/Boot artifact in wp-env]   ✅  Success - Main Write wp-env override [15.153375ms]
*DRYRUN* [CI / Test Build Artifact/Boot artifact in wp-env] ⭐ Run Main Start wp-env
*DRYRUN* [CI / Test Build Artifact/Boot artifact in wp-env]   ✅  Success - Main Start wp-env [17.473208ms]
*DRYRUN* [CI / Test Build Artifact/Boot artifact in wp-env] ⭐ Run Main Activate plugin or theme
*DRYRUN* [CI / Test Build Artifact/Boot artifact in wp-env]   ✅  Success - Main Activate plugin or theme [19.252875ms]
*DRYRUN* [CI / Test Build Artifact/Boot artifact in wp-env] ⭐ Run Main Run wp doctor
*DRYRUN* [CI / Test Build Artifact/Boot artifact in wp-env]   ✅  Success - Main Run wp doctor [14.417958ms]
*DRYRUN* [CI / Test Build Artifact/Boot artifact in wp-env] ⭐ Run Main Stop wp-env
*DRYRUN* [CI / Test Build Artifact/Boot artifact in wp-env]   ✅  Success - Main Stop wp-env [13.550458ms]
*DRYRUN* [CI / Test Build Artifact/Boot artifact in wp-env] ⭐ Run Post Set up Node.js
*DRYRUN* [CI / Test Build Artifact/Boot artifact in wp-env]   ✅  Success - Post Set up Node.js [4.557333ms]
*DRYRUN* [CI / Test Build Artifact/Boot artifact in wp-env] ⭐ Run Complete job
*DRYRUN* [CI / Test Build Artifact/Boot artifact in wp-env] Cleaning up container for job Boot artifact in wp-env
*DRYRUN* [CI / Test Build Artifact/Boot artifact in wp-env]   ✅  Success - Complete job
*DRYRUN* [CI / Test Build Artifact/Boot artifact in wp-env] 🏁  Job succeeded

WP_VERSION=latest PHP_VERSION=8.3 INSTALL_PATH=wp-content/plugins SLUG=my-plugin \
  jq -n --arg wp "$WP_VERSION" --arg php "$PHP_VERSION" --arg dest "${INSTALL_PATH%/}/${SLUG}" \
  '{
     core: (if $wp == "latest" then null else "WordPress/WordPress#\($wp)" end),
     phpVersion: $php,
     plugins: [],
     themes: [],
     mappings: { ($dest): "./artifact" }
   }'
{
  "core": "WordPress/WordPress#",
  "phpVersion": "",
  "plugins": [],
  "themes": [],
  "mappings": {
    "/": "./artifact"
  }
}
```

Binding test (boots wp-env + Docker, which `act` cannot do reliably) is done via smoke testing: a real CI run boots `ci-build` → `ci-test-build-artifact` against a packaged plugin/theme, confirming activate + `wp doctor` pass and `wp-env stop` runs on failure.

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
