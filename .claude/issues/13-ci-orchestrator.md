# Issue #13 — Add CI orchestrator workflow (`wp-ci.yml`)

**Status:** in-review
**Branch:** `v1.0.0/task/ci-orchestrator`
**PR:** #25
**Assignee:** @Adi-ty

---

## Summary

The individual CI workflows each do one thing; a consuming skeleton would otherwise call ~8 of them by hand and keep them in sync. `wp-ci.yml` is the orchestrator a skeleton calls once: it routes to the right subset based on a single `project-type` input (`plugin` | `theme` | `package`), runs `ci-detect-changes` first, and gates every downstream job on the per-bucket change counts so untouched file types are skipped. A `skip` input drops a named job without forking. It is the CI counterpart to the planned CD orchestrator (`wp-cd.yml`, #17).

---

## Decisions made

- [2026-05-29] **Branched off `v1.0.0/task/ci-lint-workflows` (#2)**, not `release/v1.0.0`. `detect-changes` is the orchestrator's backbone (every job gates on its outputs), so it must exist on the branch for the orchestrator to be written in its real shape. PR is **stacked against the #2 branch** (clean diff = orchestrator + docs + example); rebase onto `release/v1.0.0` once #2 merges. Review-only for now — will not merge.
- [2026-05-29] **Gating uses counts, not the issue's booleans.** The real `ci-detect-changes.yml` outputs `*-count` + `*-files`, not `php-changed == 'true'`. Jobs gate on `needs.detect-changes.outputs.<x>-count > 0` and pass `*-files` into each linter's `changed-files`. (Hardens / corrects the issue's reference snippet.)
- [2026-05-29] **Started from a `project-type` (required) + `skip` contract.** Updated the stale top-level README consumer example that advertised non-existent inputs (CLAUDE.md: README examples must actually work).
- [2026-06-16] **Contract expanded to replace the legacy "Test and Measure" workflow.** Added the `php-versions` × `wp-versions` (+ `test-php-exclude`) matrix for `test-php`, a `use-wp-env` toggle (default true; false = standalone PHPUnit for a pure Composer library), an `enable-phpstan` passthrough to `lint-php`, and a `validate-inputs` job that fails fast on a bad `project-type` or matrix input. Coverage reporting stays a v1.x follow-up.
- [2026-05-29] **`skip` matching is comma-bounded:** `!contains(format(',{0},', inputs.skip), ',<id>,')` so `skip: build` never also drops `build-artifact`.
- [2026-06-16] **`build-artifact` wired; `bc` dropped.** `ci-test-build-artifact.yml` is present and wired into the orchestrator. `ci-test-bc.yml` stays deferred (TS blocker), so no `bc` job is defined. With all `uses:` targets present, `act --dryrun` parses the whole orchestrator.
- [2026-06-16] **No committed example caller.** Dropped `.github/workflows/_examples/caller-wp-ci.yml` for README-only delivery, matching house style (#3/#5/#7/#9/#11/#14).
- [2026-05-29] **`build-artifact` install-path derived from `project-type`** (`theme` → `wp-content/themes`, else `wp-content/plugins`) and `slug` defaulted to the repo name — the most the 2-input contract can infer.

---

## Files changed so far

- `.github/workflows/wp-ci.yml` — new (the orchestrator + `validate-inputs` job)
- `.github/workflows/ci-test-php.yml` — edited (`wp-version` input + WP_ENV pin steps for the matrix)
- `README.md` — edited (new `### wp-ci.yml` section; orchestrator inputs + presets)
- `CHANGELOG.md` — edited (bullets under Unreleased → Added)
- `.claude/issues/13-ci-orchestrator.md` — new (this file)

---

## Verification run

```bash
❯ act workflow_call -W .github/workflows/wp-ci.yml --dryrun
INFO[0000] Using docker host 'unix:///var/run/docker.sock', and daemon socket 'unix:///var/run/docker.sock' 
WARN  ⚠ You are using Apple M-series chip and you have not specified container architecture, you might encounter issues while running act. If so, try running it with '--container-architecture linux/amd64'. ⚠  
*DRYRUN* [CI / Orchestrator/Validate inputs] ⭐ Run Set up job
*DRYRUN* [CI / Orchestrator/Validate inputs] 🚀  Start image=node:16-buster-slim
*DRYRUN* [CI / Orchestrator/Validate inputs]   🐳  docker pull image=node:16-buster-slim platform= username= forcePull=true
*DRYRUN* [CI / Orchestrator/Validate inputs]   🐳  docker create image=node:16-buster-slim platform= entrypoint=["tail" "-f" "/dev/null"] cmd=[] network="host"
*DRYRUN* [CI / Orchestrator/Validate inputs]   🐳  docker run image=node:16-buster-slim platform= entrypoint=["tail" "-f" "/dev/null"] cmd=[] network="host"
*DRYRUN* [CI / Orchestrator/Validate inputs]   ✅  Success - Set up job
*DRYRUN* [CI / Orchestrator/Validate inputs] ⭐ Run Main Check project-type and test-php matrix inputs
*DRYRUN* [CI / Orchestrator/Validate inputs]   ✅  Success - Main Check project-type and test-php matrix inputs [7.807875ms]
*DRYRUN* [CI / Orchestrator/Validate inputs] ⭐ Run Complete job
*DRYRUN* [CI / Orchestrator/Validate inputs] Cleaning up container for job Validate inputs
*DRYRUN* [CI / Orchestrator/Validate inputs]   ✅  Success - Complete job
*DRYRUN* [CI / Orchestrator/Validate inputs] 🏁  Job succeeded
*DRYRUN* [Detect changes/CI / Detect Changes/Detect changes] ⭐ Run Set up job
*DRYRUN* [Detect changes/CI / Detect Changes/Detect changes] 🚀  Start image=node:16-buster-slim
*DRYRUN* [Detect changes/CI / Detect Changes/Detect changes]   🐳  docker pull image=node:16-buster-slim platform= username= forcePull=true
*DRYRUN* [Detect changes/CI / Detect Changes/Detect changes]   🐳  docker create image=node:16-buster-slim platform= entrypoint=["tail" "-f" "/dev/null"] cmd=[] network="host"
*DRYRUN* [Detect changes/CI / Detect Changes/Detect changes]   🐳  docker run image=node:16-buster-slim platform= entrypoint=["tail" "-f" "/dev/null"]cmd=[] network="host"
*DRYRUN* [Detect changes/CI / Detect Changes/Detect changes]   ✅  Success - Set up job
*DRYRUN* [Detect changes/CI / Detect Changes/Detect changes]   ☁  git clone 'https://github.com/actions/setup-node' # ref=49933ea5288caeca8642d1e84afbd3f7d6820020
*DRYRUN* [Detect changes/CI / Detect Changes/Detect changes] Non-terminating error while running 'git clone': some refs were not updated
*DRYRUN* [Detect changes/CI / Detect Changes/Detect changes] ⭐ Run Main Checkout repository
*DRYRUN* [Detect changes/CI / Detect Changes/Detect changes]   ✅  Success - Main Checkout repository [3.83375ms]
*DRYRUN* [Detect changes/CI / Detect Changes/Detect changes] ⭐ Run Main Set up Node.js
*DRYRUN* [Detect changes/CI / Detect Changes/Detect changes]   ✅  Success - Main Set up Node.js [3.577917ms]
*DRYRUN* [Detect changes/CI / Detect Changes/Detect changes] ⭐ Run Main Install wp-tooling
*DRYRUN* [Detect changes/CI / Detect Changes/Detect changes]   ✅  Success - Main Install wp-tooling [5.64275ms]
*DRYRUN* [Detect changes/CI / Detect Changes/Detect changes] ⭐ Run Main Detect changed files
*DRYRUN* [Detect changes/CI / Detect Changes/Detect changes]   ✅  Success - Main Detect changed files [5.960959ms]
*DRYRUN* [Detect changes/CI / Detect Changes/Detect changes] ⭐ Run Post Set up Node.js
*DRYRUN* [Detect changes/CI / Detect Changes/Detect changes]   ✅  Success - Post Set up Node.js [1.769208ms]
*DRYRUN* [Detect changes/CI / Detect Changes/Detect changes] ⭐ Run Complete job
*DRYRUN* [Detect changes/CI / Detect Changes/Detect changes] Cleaning up container for job Detect changes
*DRYRUN* [Detect changes/CI / Detect Changes/Detect changes]   ✅  Success - Complete job
*DRYRUN* [Detect changes/CI / Detect Changes/Detect changes] 🏁  Job succeeded
```

Clean — no errors or warnings.

Gating trace (manual) — expected job set per preset:

- **plugin** → detect-changes + lint-css/js/php + test-js + test-php + build + build-artifact + a11y
- **theme** → detect-changes + lint-css/js/php + test-js + build + build-artifact + a11y (no test-php)
- **package** → detect-changes + lint-php + test-php (no css/js lint, test-js, build, build-artifact, a11y)

Each job additionally requires its bucket count `> 0`; `skip: "<id>"` drops exactly that job (comma-bounded — no substring bleed, e.g. `build` vs `build-artifact`).

---

## Open questions

- _(none yet)_

---

## Notes for the reviewer

- **`act` dry-run passes.** All `uses:` targets are present on the branch (`build-artifact` included), so the orchestrator parses and the `test-php` matrix expands under `act --dryrun`. A full green run still needs a real consumer on GitHub Actions; anything touching `wp-env` (Docker-in-Docker) cannot run under local `act`.
- **`build-artifact` is the weakest generic fit.** It needs a *packaged* artifact (`dist/<slug>/`), but the default `ci-build` build-command emits bare `build/`. Wired with `slug` = repo name + `project-type`-derived install-path for design completeness; a non-standard slug or a packaging step needs a consumer override (candidate v1.x passthrough inputs). Do not assume this job runs green post-#23 without packaging wiring.
- **`bc` removed.** `ci-test-bc.yml` is deferred (TypeScript blocker), so no `bc` job is defined; add it back when that workflow lands.
- **Self-test deferred.** This repo is pure YAML (no PHP/JS to lint/test), so a meaningful self-run of `wp-ci.yml` is not possible. Real e2e proof = a consumer repo calling `wp-ci.yml@<branch>` on push/PR.
- **a11y default trigger.** `ci-test-a11y` is label-triggered at the caller level by design; the orchestrator includes it per preset and exposes `skip: a11y`. Label-gating stays a caller concern.
- **Deps landed.** detect-changes + lint (#2) and build-artifact (#23) are present on the branch; only `bc` (`ci-test-bc.yml`) stays deferred and is intentionally not wired.

---

## Handoff log

_(no rotations yet — delete this line when the first entry is added)_
