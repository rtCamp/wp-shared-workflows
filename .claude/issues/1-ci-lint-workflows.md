# Issue #1 — Add detect-changes + lint-css/js/php reusable workflows

**Status:** in-progress <!-- in-progress | in-review | done -->
**Branch:** `v1.0.0/task/ci-lint-workflows`
**PR:** #2
**Assignee:** @Adi-ty

---

## Summary

Every rtCamp WordPress project duplicates the same lint pipeline (the copy-pasted `Test and Measure` workflow, with drift). This issue centralises the four pre-CI lint stages — changed-file detection plus CSS / JS / PHP linting — into individually callable reusable workflows so every consumer adopts one canonical implementation via `uses: rtCamp/wp-shared-workflows/.github/workflows/ci-*.yml@v1`.

---

## Decisions made

- [2026-05-29] `ci-detect-changes.yml` wraps the `wp-tooling detect-changes` CLI rather than re-implementing the legacy git-diff bash dance. Base-ref resolution (PR via `GITHUB_BASE_REF`, push via the event `before` SHA / `HEAD~1`), bucket regexes, and the ignore default all live in the CLI — the workflow only passes flags and promotes outputs.
- [2026-05-29] wp-tooling is installed with `npm install --global "git+https://github.com/rtCamp/wp-tooling.git#release/v1.0.0"`, mirroring `version-monitor.yml`. It is not published to a public registry yet (GitHub Packages, `access: restricted`), so a global git install pinned to `release/v1.0.0` is the stopgap. No `npm ci` / `cache: npm` — the CLI has zero runtime deps.
- [2026-05-29] Detection runs with `--output github --include-files`, so the workflow exposes both per-bucket counts (for gating) and per-bucket file lists (`css-files`, `js-files`, `php-files`, `gha-files`). The `--include-files` support is wp-tooling#7, now on `release/v1.0.0`.
- [2026-05-29] The three lint workflows each accept a `changed-files` input: non-empty lints only those paths, empty runs the whole-project `lint-command`. This is what makes the detector's `*-files` outputs useful — addresses @AnuragVasanwala's review asks (lint only updated files for CSS/JS/PHP; include exact file paths). For PHP, `changed-files` scopes PHPCS only; PHPStan always runs whole-project (cross-file analysis).
- [2026-05-29] `ignore-paths` / `base-ref` flags are only passed to the CLI when non-empty. An empty `--ignore` *disables* ignoring in the CLI, so omitting the flag (the default) correctly falls through to the CLI's built-in ignore set.
- [2026-05-29] Orchestrator wiring (`wp-ci.yml`, issue #13) is out of scope — `ci-detect-changes.yml` runs unconditionally and only exposes outputs; the orchestrator does the count-based gating and feeds `*-files` into the lint jobs.

---

## Files changed so far

- `.github/workflows/ci-detect-changes.yml` — new
- `.github/workflows/ci-lint-css.yml` — new (already on branch)
- `.github/workflows/ci-lint-js.yml` — new (already on branch)
- `.github/workflows/ci-lint-php.yml` — new (already on branch)
- `README.md` — edited (added detect-changes + lint-css/js/php sections)
- `CHANGELOG.md` — edited (four bullets under Unreleased → Added)
- `.claude/issues/1-ci-lint-workflows.md` — new (this file)

---

## Verification run

```bash
❯ pipx run yamllint .
❯ act workflow_call -W .github/workflows/ci-detect-changes.yml --dryrun
INFO[0000] Using docker host 'unix:///var/run/docker.sock', and daemon socket 'unix:///var/run/docker.sock' 
WARN  ⚠ You are using Apple M-series chip and you have not specified container architecture, you might encounter issues while running act. If so, try running it with '--container-architecture linux/amd64'. ⚠  
*DRYRUN* [CI / Detect Changes/Detect changes] ⭐ Run Set up job
*DRYRUN* [CI / Detect Changes/Detect changes] 🚀  Start image=node:16-buster-slim
*DRYRUN* [CI / Detect Changes/Detect changes]   🐳  docker pull image=node:16-buster-slim platform= username= forcePull=true
*DRYRUN* [CI / Detect Changes/Detect changes]   🐳  docker create image=node:16-buster-slim platform= entrypoint=["tail" "-f" "/dev/null"] cmd=[] network="host"
*DRYRUN* [CI / Detect Changes/Detect changes]   🐳  docker run image=node:16-buster-slim platform= entrypoint=["tail" "-f" "/dev/null"] cmd=[] network="host"
*DRYRUN* [CI / Detect Changes/Detect changes]   ✅  Success - Set up job
*DRYRUN* [CI / Detect Changes/Detect changes]   ☁  git clone 'https://github.com/actions/setup-node' # ref=49933ea5288caeca8642d1e84afbd3f7d6820020
*DRYRUN* [CI / Detect Changes/Detect changes] Non-terminating error while running 'git clone': some refs were not updated
*DRYRUN* [CI / Detect Changes/Detect changes] ⭐ Run Main Checkout repository
*DRYRUN* [CI / Detect Changes/Detect changes]   ✅  Success - Main Checkout repository [7.201541ms]
*DRYRUN* [CI / Detect Changes/Detect changes] ⭐ Run Main Set up Node.js
*DRYRUN* [CI / Detect Changes/Detect changes]   ✅  Success - Main Set up Node.js [9.009583ms]
*DRYRUN* [CI / Detect Changes/Detect changes] ⭐ Run Main Install wp-tooling
*DRYRUN* [CI / Detect Changes/Detect changes]   ✅  Success - Main Install wp-tooling [17.675625ms]
*DRYRUN* [CI / Detect Changes/Detect changes] ⭐ Run Main Detect changed files
*DRYRUN* [CI / Detect Changes/Detect changes]   ✅  Success - Main Detect changed files [17.995125ms]
*DRYRUN* [CI / Detect Changes/Detect changes] ⭐ Run Post Set up Node.js
*DRYRUN* [CI / Detect Changes/Detect changes]   ✅  Success - Post Set up Node.js [6.890833ms]
*DRYRUN* [CI / Detect Changes/Detect changes] ⭐ Run Complete job
*DRYRUN* [CI / Detect Changes/Detect changes] Cleaning up container for job Detect changes
*DRYRUN* [CI / Detect Changes/Detect changes]   ✅  Success - Complete job
*DRYRUN* [CI / Detect Changes/Detect changes] 🏁  Job succeeded
❯ act workflow_call -W .github/workflows/ci-lint-js.yml --dryrun
INFO[0000] Using docker host 'unix:///var/run/docker.sock', and daemon socket 'unix:///var/run/docker.sock' 
WARN  ⚠ You are using Apple M-series chip and you have not specified container architecture, you might encounter issues while running act. If so, try running it with '--container-architecture linux/amd64'. ⚠  
*DRYRUN* [CI / Lint JS/ESLint] ⭐ Run Set up job
*DRYRUN* [CI / Lint JS/ESLint] 🚀  Start image=node:16-buster-slim
*DRYRUN* [CI / Lint JS/ESLint]   🐳  docker pull image=node:16-buster-slim platform= username= forcePull=true
*DRYRUN* [CI / Lint JS/ESLint]   🐳  docker create image=node:16-buster-slim platform= entrypoint=["tail" "-f" "/dev/null"] cmd=[] network="host"
*DRYRUN* [CI / Lint JS/ESLint]   🐳  docker run image=node:16-buster-slim platform= entrypoint=["tail" "-f" "/dev/null"] cmd=[] network="host"
*DRYRUN* [CI / Lint JS/ESLint]   ✅  Success - Set up job
*DRYRUN* [CI / Lint JS/ESLint]   ☁  git clone 'https://github.com/actions/setup-node' # ref=49933ea5288caeca8642d1e84afbd3f7d6820020
*DRYRUN* [CI / Lint JS/ESLint] Non-terminating error while running 'git clone': some refs were not updated
*DRYRUN* [CI / Lint JS/ESLint] ⭐ Run Main Checkout repository
*DRYRUN* [CI / Lint JS/ESLint]   ✅  Success - Main Checkout repository [6.915708ms]
*DRYRUN* [CI / Lint JS/ESLint] ⭐ Run Main Set up Node.js
*DRYRUN* [CI / Lint JS/ESLint]   ✅  Success - Main Set up Node.js [6.775ms]
*DRYRUN* [CI / Lint JS/ESLint] ⭐ Run Main Install npm dependencies
*DRYRUN* [CI / Lint JS/ESLint]   ✅  Success - Main Install npm dependencies [20.010333ms]
*DRYRUN* [CI / Lint JS/ESLint] ⭐ Run Main Run ESLint
*DRYRUN* [CI / Lint JS/ESLint]   ✅  Success - Main Run ESLint [15.109542ms]
*DRYRUN* [CI / Lint JS/ESLint] ⭐ Run Post Set up Node.js
*DRYRUN* [CI / Lint JS/ESLint]   ✅  Success - Post Set up Node.js [4.765958ms]
*DRYRUN* [CI / Lint JS/ESLint] ⭐ Run Complete job
*DRYRUN* [CI / Lint JS/ESLint] Cleaning up container for job ESLint
*DRYRUN* [CI / Lint JS/ESLint]   ✅  Success - Complete job
*DRYRUN* [CI / Lint JS/ESLint] 🏁  Job succeeded
❯ act workflow_call -W .github/workflows/ci-lint-php.yml --dryrun
INFO[0000] Using docker host 'unix:///var/run/docker.sock', and daemon socket 'unix:///var/run/docker.sock' 
WARN  ⚠ You are using Apple M-series chip and you have not specified container architecture, you might encounter issues while running act. If so, try running it with '--container-architecture linux/amd64'. ⚠  
*DRYRUN* [CI / Lint PHP/Lint PHP] ⭐ Run Set up job
*DRYRUN* [CI / Lint PHP/Lint PHP] 🚀  Start image=node:16-buster-slim
*DRYRUN* [CI / Lint PHP/Lint PHP]   🐳  docker pull image=node:16-buster-slim platform= username= forcePull=true
*DRYRUN* [CI / Lint PHP/Lint PHP]   🐳  docker create image=node:16-buster-slim platform= entrypoint=["tail" "-f" "/dev/null"] cmd=[] network="host"
*DRYRUN* [CI / Lint PHP/Lint PHP]   🐳  docker run image=node:16-buster-slim platform= entrypoint=["tail" "-f" "/dev/null"] cmd=[] network="host"
*DRYRUN* [CI / Lint PHP/Lint PHP]   ✅  Success - Set up job
*DRYRUN* [CI / Lint PHP/Lint PHP]   ☁  git clone 'https://github.com/shivammathur/setup-php' # ref=accd6127cb78bee3e8082180cb391013d204ef9f
*DRYRUN* [CI / Lint PHP/Lint PHP] Non-terminating error while running 'git clone': some refs were not updated
*DRYRUN* [CI / Lint PHP/Lint PHP]   ☁  git clone 'https://github.com/actions/cache' # ref=0057852bfaa89a56745cba8c7296529d2fc39830
*DRYRUN* [CI / Lint PHP/Lint PHP] Non-terminating error while running 'git clone': some refs were not updated
*DRYRUN* [CI / Lint PHP/Lint PHP] ⭐ Run Main Checkout repository
*DRYRUN* [CI / Lint PHP/Lint PHP]   ✅  Success - Main Checkout repository [6.769458ms]
*DRYRUN* [CI / Lint PHP/Lint PHP] ⭐ Run Main Set up PHP
*DRYRUN* [CI / Lint PHP/Lint PHP]   ✅  Success - Main Set up PHP [6.604291ms]
*DRYRUN* [CI / Lint PHP/Lint PHP] ⭐ Run Main Resolve Composer cache directory
*DRYRUN* [CI / Lint PHP/Lint PHP]   ✅  Success - Main Resolve Composer cache directory [14.866541ms]
*DRYRUN* [CI / Lint PHP/Lint PHP] ⭐ Run Main Cache Composer dependencies
*DRYRUN* [CI / Lint PHP/Lint PHP]   ✅  Success - Main Cache Composer dependencies [6.350875ms]
*DRYRUN* [CI / Lint PHP/Lint PHP] ⭐ Run Main Install Composer dependencies
*DRYRUN* [CI / Lint PHP/Lint PHP]   ✅  Success - Main Install Composer dependencies [16.199916ms]
*DRYRUN* [CI / Lint PHP/Lint PHP] ⭐ Run Main Run PHPCS
*DRYRUN* [CI / Lint PHP/Lint PHP]   ✅  Success - Main Run PHPCS [17.39875ms]
*DRYRUN* [CI / Lint PHP/Lint PHP] ⭐ Run Post Cache Composer dependencies
*DRYRUN* [CI / Lint PHP/Lint PHP]   ✅  Success - Post Cache Composer dependencies [4.434375ms]
*DRYRUN* [CI / Lint PHP/Lint PHP] ⭐ Run Complete job
*DRYRUN* [CI / Lint PHP/Lint PHP] Cleaning up container for job Lint PHP
*DRYRUN* [CI / Lint PHP/Lint PHP]   ✅  Success - Complete job
*DRYRUN* [CI / Lint PHP/Lint PHP] 🏁  Job succeeded
❯ act workflow_call -W .github/workflows/ci-lint-css.yml --dryrun
INFO[0000] Using docker host 'unix:///var/run/docker.sock', and daemon socket 'unix:///var/run/docker.sock' 
WARN  ⚠ You are using Apple M-series chip and you have not specified container architecture, you might encounter issues while running act. If so, try running it with '--container-architecture linux/amd64'. ⚠  
*DRYRUN* [CI / Lint CSS/Stylelint] ⭐ Run Set up job
*DRYRUN* [CI / Lint CSS/Stylelint] 🚀  Start image=node:16-buster-slim
*DRYRUN* [CI / Lint CSS/Stylelint]   🐳  docker pull image=node:16-buster-slim platform= username= forcePull=true
*DRYRUN* [CI / Lint CSS/Stylelint]   🐳  docker create image=node:16-buster-slim platform= entrypoint=["tail" "-f" "/dev/null"] cmd=[] network="host"
*DRYRUN* [CI / Lint CSS/Stylelint]   🐳  docker run image=node:16-buster-slim platform= entrypoint=["tail" "-f" "/dev/null"] cmd=[] network="host"
*DRYRUN* [CI / Lint CSS/Stylelint]   ✅  Success - Set up job
*DRYRUN* [CI / Lint CSS/Stylelint]   ☁  git clone 'https://github.com/actions/setup-node' # ref=49933ea5288caeca8642d1e84afbd3f7d6820020
*DRYRUN* [CI / Lint CSS/Stylelint] Non-terminating error while running 'git clone': some refs were not updated
*DRYRUN* [CI / Lint CSS/Stylelint] ⭐ Run Main Checkout repository
*DRYRUN* [CI / Lint CSS/Stylelint]   ✅  Success - Main Checkout repository [5.968583ms]
*DRYRUN* [CI / Lint CSS/Stylelint] ⭐ Run Main Set up Node.js
*DRYRUN* [CI / Lint CSS/Stylelint]   ✅  Success - Main Set up Node.js [6.16925ms]
*DRYRUN* [CI / Lint CSS/Stylelint] ⭐ Run Main Install npm dependencies
*DRYRUN* [CI / Lint CSS/Stylelint]   ✅  Success - Main Install npm dependencies [20.346042ms]
*DRYRUN* [CI / Lint CSS/Stylelint] ⭐ Run Main Run Stylelint
*DRYRUN* [CI / Lint CSS/Stylelint]   ✅  Success - Main Run Stylelint [16.111666ms]
*DRYRUN* [CI / Lint CSS/Stylelint] ⭐ Run Post Set up Node.js
*DRYRUN* [CI / Lint CSS/Stylelint]   ✅  Success - Post Set up Node.js [4.70925ms]
*DRYRUN* [CI / Lint CSS/Stylelint] ⭐ Run Complete job
*DRYRUN* [CI / Lint CSS/Stylelint] Cleaning up container for job Stylelint
*DRYRUN* [CI / Lint CSS/Stylelint]   ✅  Success - Complete job
*DRYRUN* [CI / Lint CSS/Stylelint] 🏁  Job succeeded
---

## Open questions

- _(none yet)_

---

## Notes for the reviewer

- **Private-repo install auth (deferred, not a blocker):** `git+https://github.com/rtCamp/wp-tooling.git` needs wp-tooling to be public (or a token) to clone in a consumer's CI — the caller's `GITHUB_TOKEN` is not scoped to wp-tooling. Same limitation `version-monitor.yml` already carries; resolves when both repos go public / wp-tooling is published. Carries a `# TODO(wp-tooling publish)` comment.
- **Multi-line `*-files` outputs** are subject to GitHub's `$GITHUB_OUTPUT` size limits on very large PRs — acceptable for normal PRs.
- **`act` cannot fully exercise** the GitHub-event base-ref path or the private `git+https` install; the real proof is a consumer repo referencing `@<branch>` that wires `detect` → lint workflows. Note this as deferred end-to-end verification.
- Detection semantics (two-dot `git diff base HEAD`, bucket regexes, ignore defaults) are the CLI's contract, not overridden here.

---

## Handoff log

_(no rotations yet — delete this line when the first entry is added)_
