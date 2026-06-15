# Issue #7 — Add ci-build reusable workflow

**Status:** done
**Branch:** `v1.0.0/task/ci-build`
**PR:** #8
**Assignee:** @Adi-ty

---

## Summary

Every rtCamp WordPress project that ships JS or CSS runs the same production build — `Test and Measure`'s `build-prod` job is copy-pasted across plugins, themes, and packages. Most callers only need to verify the build exits 0; CD callers also need the built files handed to a downstream deploy job. This task adds `ci-build.yml` — a single reusable workflow with an `upload-artifact` toggle (default `false`) that covers both shapes so every consumer can adopt one canonical implementation via `uses: rtCamp/shared-workflows/.github/workflows/ci-build.yml@v1`.

---

## Decisions made

- [2026-05-12] `node-version` defaults to `"22"` rather than `required: true` — matches CLAUDE.md ("Node in workflows: 22, overridable per call") and the input-design convention adopted in the lint-trio / test-js / test-php PRs. `required: true` is reserved for unguessable identity (deploy slugs, bucket names) on future CD workflows.
- [2026-05-12] `if-no-files-found: error` set on `actions/upload-artifact`. The action's default is `warn`, which silently produces an empty artifact and breaks any downstream CD job that tries to `actions/download-artifact` it. Failing loudly is the right shape for a reusable workflow — a misconfigured `artifact-path` should surface at the upload step, not three jobs later.
- [2026-05-12] Artifact `path` is composed as `${{ inputs.working-dir }}/${{ inputs.artifact-path }}`. `actions/upload-artifact`'s `path` is repo-root-relative, not working-directory-relative, so monorepo callers would otherwise have to double-prefix. Composing here means `working-dir: "plugins/foo"` + `artifact-path: "build/"` does what a consumer expects.
- [2026-05-12] No `env: CI: true` on the build step. GitHub Actions sets `CI=true` automatically on hosted runners. The legacy workflow set it explicitly — that was redundant. Mirrors the convention from `ci-test-js` / `ci-test-php`.
- [2026-05-12] No build-output caching in v1.0.0. `actions/setup-node`'s `cache: npm` already covers the slow part (dependency install); build outputs are reproducible from `package-lock.json` + source and rarely benefit from caching. Can be added later without breaking the input schema.
- [2026-05-12] `actions/upload-artifact` pinned to `v4.6.2`, not `v5`/`v6`/`v7`. v4 is the stable major referenced in the planning doc; v5+ introduced breaking changes around upload behaviour that aren't needed here. We can move forward on a future minor when consumers ask for it.
- [2026-05-12] `upload-artifact` defaults to `false`. The CI-verification path (no upload) is the common case; defaulting to `true` would burn artifact storage on every CI run for callers that don't need it.
- [2026-05-12] Drive-by fix to `.yamllint.yml` line 14 (bracket spacing) — same starter-kit bug that the lint-trio, ci-test-js, and ci-test-php PRs all touch. Whichever PR merges first wins; later ones hit a one-line conflict.
- [2026-05-13] Added `install-composer-deps` / `install-node-deps` toggles (+ `php-version`, `composer-flags`) in response to PR review. Both stacks are individually optional — three consumer shapes: Node-only (default), Composer-only, both. `composer-flags` defaults to `--no-dev` (production build, not dev). Node defaults on; Composer defaults off. Backwards-compatible.

### Action SHA pins recorded

- `actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683` — v4.2.2.
- `actions/setup-node@39370e3970a6d050c480ffad4ff0ed4d3fdee5af` — v4.1.0.
- `actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02` — v4.6.2.
- `shivammathur/setup-php@accd6127cb78bee3e8082180cb391013d204ef9f` — 2.37.0.

---

## Files changed so far

- `.github/workflows/ci-build.yml` — new
- `.claude/issues/7-ci-build.md` — new
- `CHANGELOG.md` — new (first entry under `## Unreleased`)
- `README.md` — edited (caller example + inputs row)
- `.yamllint.yml` — edited (drive-by bracket-spacing fix on line 14)

---

## Verification run

```bash
❯ pipx run yamllint .
❯ act workflow_call -W .github/workflows/ci-build.yml --dryrun
INFO[0000] Using docker host 'unix:///var/run/docker.sock', and daemon socket 'unix:///var/run/docker.sock' 
WARN  ⚠ You are using Apple M-series chip and you have not specified container architecture, you might encounter issues while running act. If so, try running it with '--container-architecture linux/amd64'. ⚠  
*DRYRUN* [CI / Build/Build] ⭐ Run Set up job
*DRYRUN* [CI / Build/Build] 🚀  Start image=node:16-buster-slim
*DRYRUN* [CI / Build/Build]   🐳  docker pull image=node:16-buster-slim platform= username= forcePull=true
*DRYRUN* [CI / Build/Build]   🐳  docker create image=node:16-buster-slim platform= entrypoint=["tail" "-f" "/dev/null"] cmd=[] network="host"
*DRYRUN* [CI / Build/Build]   🐳  docker run image=node:16-buster-slim platform= entrypoint=["tail" "-f" "/dev/null"] cmd=[] network="host"
*DRYRUN* [CI / Build/Build]   ✅  Success - Set up job
*DRYRUN* [CI / Build/Build]   ☁  git clone 'https://github.com/actions/setup-node' # ref=39370e3970a6d050c480ffad4ff0ed4d3fdee5af
*DRYRUN* [CI / Build/Build]   ☁  git clone 'https://github.com/shivammathur/setup-php' # ref=accd6127cb78bee3e8082180cb391013d204ef9f
*DRYRUN* [CI / Build/Build] Non-terminating error while running 'git clone': some refs were not updated
*DRYRUN* [CI / Build/Build]   ☁  git clone 'https://github.com/actions/upload-artifact' # ref=ea165f8d65b6e75b540449e92b4886f43607fa02
*DRYRUN* [CI / Build/Build] ⭐ Run Main Checkout repository
*DRYRUN* [CI / Build/Build]   ✅  Success - Main Checkout repository [6.2005ms]
*DRYRUN* [CI / Build/Build] ⭐ Run Main Build production assets
*DRYRUN* [CI / Build/Build]   ✅  Success - Main Build production assets [13.612625ms]
*DRYRUN* [CI / Build/Build] ⭐ Run Complete job
*DRYRUN* [CI / Build/Build] Cleaning up container for job Build
*DRYRUN* [CI / Build/Build]   ✅  Success - Complete job
*DRYRUN* [CI / Build/Build] 🏁  Job succeeded
❯ act workflow_call -W .github/workflows/ci-build.yml --dryrun \
    --input install-node-deps=false --input install-composer-deps=true
INFO[0000] Using docker host 'unix:///var/run/docker.sock', and daemon socket 'unix:///var/run/docker.sock' 
WARN  ⚠ You are using Apple M-series chip and you have not specified container architecture, you might encounter issues while running act. If so, try running it with '--container-architecture linux/amd64'. ⚠  
*DRYRUN* [CI / Build/Build] ⭐ Run Set up job
*DRYRUN* [CI / Build/Build] 🚀  Start image=node:16-buster-slim
*DRYRUN* [CI / Build/Build]   🐳  docker pull image=node:16-buster-slim platform= username= forcePull=true
*DRYRUN* [CI / Build/Build]   🐳  docker create image=node:16-buster-slim platform= entrypoint=["tail" "-f" "/dev/null"] cmd=[] network="host"
*DRYRUN* [CI / Build/Build]   🐳  docker run image=node:16-buster-slim platform= entrypoint=["tail" "-f" "/dev/null"] cmd=[] network="host"
*DRYRUN* [CI / Build/Build]   ✅  Success - Set up job
*DRYRUN* [CI / Build/Build]   ☁  git clone 'https://github.com/actions/setup-node' # ref=39370e3970a6d050c480ffad4ff0ed4d3fdee5af
*DRYRUN* [CI / Build/Build]   ☁  git clone 'https://github.com/shivammathur/setup-php' # ref=accd6127cb78bee3e8082180cb391013d204ef9f
*DRYRUN* [CI / Build/Build] Non-terminating error while running 'git clone': some refs were not updated
*DRYRUN* [CI / Build/Build]   ☁  git clone 'https://github.com/actions/upload-artifact' # ref=ea165f8d65b6e75b540449e92b4886f43607fa02
*DRYRUN* [CI / Build/Build] ⭐ Run Main Checkout repository
*DRYRUN* [CI / Build/Build]   ✅  Success - Main Checkout repository [5.398708ms]
*DRYRUN* [CI / Build/Build] ⭐ Run Main Set up PHP
*DRYRUN* [CI / Build/Build]   ✅  Success - Main Set up PHP [5.585334ms]
*DRYRUN* [CI / Build/Build] ⭐ Run Main Install Composer dependencies
*DRYRUN* [CI / Build/Build]   ✅  Success - Main Install Composer dependencies [26.049167ms]
*DRYRUN* [CI / Build/Build] ⭐ Run Main Build production assets
*DRYRUN* [CI / Build/Build]   ✅  Success - Main Build production assets [13.907375ms]
*DRYRUN* [CI / Build/Build] ⭐ Run Complete job
*DRYRUN* [CI / Build/Build] Cleaning up container for job Build
*DRYRUN* [CI / Build/Build]   ✅  Success - Complete job
*DRYRUN* [CI / Build/Build] 🏁  Job succeeded
```

---

## Open questions

- _(none yet)_

---

## Notes for the reviewer

- The `path: ${{ inputs.working-dir }}/${{ inputs.artifact-path }}` composition is the only non-obvious bit. `defaults.run.working-directory` only affects `run:` steps; action inputs (`uses:` blocks) still resolve relative to the repo root. Composing the two inputs here is the cheapest way to keep monorepo callers ergonomic without exposing the GitHub Actions quirk.
- `if-no-files-found: error` is a deliberate hardening over the planning doc, which didn't mention it. Worth a sanity-check during smoke testing — confirm that misconfiguring `artifact-path` produces a clear failure rather than a silent empty artifact.
- `actions/upload-artifact` v7.0.1 exists but pins live at v4.6.2. Happy to bump if reviewers prefer staying on the latest major; v4 was chosen for stability and alignment with the planning doc.
- Default `composer-flags` use `--no-dev` because this is a production-build workflow — different from `ci-lint-php` / `ci-test-php`, which need dev deps (PHPCS, PHPUnit). The inconsistency is deliberate, not a copy-paste oversight.
- Both stacks are individually toggleable (`install-node-deps`, `install-composer-deps`) because rtCamp consumes this workflow from plugins, themes, AND pure-PHP packages. Defaults reflect the most common case (Node-only). Setting both to `false` runs `build-command` on a bare checkout — degenerate but not broken.
- `.yamllint.yml` fix is duplicated across the PRs. Whichever merges first wins; later ones hit a one-line conflict.

---

## Handoff log

_(no rotations yet — delete this line when the first entry is added)_
