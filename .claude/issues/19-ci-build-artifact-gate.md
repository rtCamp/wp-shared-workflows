# Issue #19: Add ci-build-artifact-gate reusable workflow

**Status:** done
**Branch:** `v1.0.0/task/ci-build-artifact-gate`
**PR:** #19
**Closes:** `rtCamp/theme-elementary#642` (external)
**Assignee:** @Adi-ty

---

## Summary

Every rtCamp WordPress project that produces build output (compiled CSS/JS, Composer `vendor/`, etc.) needs a gate that fails any PR which commits those files. The build is meant to be produced by CI on merge, not committed by hand. Without a gate, stale build trees creep into the repo and silently override what CI produces.

This task lifts the inline `rtcamp-standard.yml` workflow from `rtCamp/theme-elementary` (issue [#642](https://github.com/rtCamp/theme-elementary/issues/642)) into shared-workflows as `ci-build-artifact-gate.yml`, so every rtCamp repo can consume it via `uses:` instead of copy-pasting. Default gated path is `assets/build/`. Consumers can pass a newline-separated list of prefixes and an optional `working-dir` for monorepos.

---

## Decisions made

- [2026-05-21] Implementation lifted from `theme-elementary`'s inline `.github/workflows/rtcamp-standard.yml`. Same diff-based detection, but reworked to take inputs (`gated-paths`, `working-dir`) so consumers can configure rather than fork.
- [2026-05-21] Inputs passed to bash via `env:` rather than direct GHA expression interpolation. Prevents expression injection if a consumer ever passes a value with backticks or `$(...)` in it. `set -euo pipefail` guards against silent failures in the script body.
- [2026-05-21] `--diff-filter=ACMR` chosen so deletions of previously-committed artifacts are explicitly allowed. Cleaning up an old committed `assets/build/` is a welcome change, not something the gate should block.
- [2026-05-21] Non-PR triggers (missing `github.base_ref`) skip gracefully with a `::notice::`. Lets a consumer wire this into a generic `on: [push, pull_request]` workflow without it firing on direct pushes to main.
- [2026-05-21] `permissions: contents: read`. Least-privilege; the workflow only reads the diff, never writes anywhere.
- [2026-05-21] Drive-by fix to `.yamllint.yml` line 14 (bracket spacing). Same starter-kit bug other PRs in this milestone also touched. Whichever lands first wins.
- [2026-05-21] In response to PR review (PR #19): switched empty-line removal from `grep -v '^$'` to `sed -e '/^$/d'`. `grep -v` returns exit 1 when no matches are found, which under `set -e` + `pipefail` would crash the script before the empty-`PATTERN` check could fire. `sed` exits 0 even on empty input, so the graceful-skip branch is now actually reachable. Verified by reproduction.
- [2026-05-21] In response to PR review (PR #19): broadened the regex escape from `sed 's/\./\\./g'` to `sed 's/[][\\.|^$()*+?{}]/\\&/g'` so all regex metacharacters in path names are neutralised. A directory like `c++build/` or `dist[v2]/` now matches as a literal path, not as a regex pattern.

### Action SHA pins recorded

- `actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683`: v4.2.2.

---

## Files changed so far

- `.github/workflows/ci-build-artifact-gate.yml`: new
- `.claude/issues/19-ci-build-artifact-gate.md`: new (this file)
- `README.md`: edited (caller examples + inputs table)
- `CHANGELOG.md`: edited (new entry under `## Unreleased`)
- `.yamllint.yml`: edited (drive-by bracket-spacing fix on line 14)

---

## Verification run

```bash
$ python3 -m yamllint .
# exit 0

$ act workflow_call -W .github/workflows/ci-build-artifact-gate.yml --dryrun --container-architecture linux/amd64
*DRYRUN* [CI / Build Artifact Gate/Block committed build artifacts] ⭐ Run Set up job
*DRYRUN* [CI / Build Artifact Gate/Block committed build artifacts]   ✅  Success - Set up job
*DRYRUN* [CI / Build Artifact Gate/Block committed build artifacts] ⭐ Run Main Checkout repository
*DRYRUN* [CI / Build Artifact Gate/Block committed build artifacts]   ✅  Success - Main Checkout repository
*DRYRUN* [CI / Build Artifact Gate/Block committed build artifacts] ⭐ Run Main Detect committed build artifacts
*DRYRUN* [CI / Build Artifact Gate/Block committed build artifacts]   ✅  Success - Main Detect committed build artifacts
*DRYRUN* [CI / Build Artifact Gate/Block committed build artifacts]   ✅  Success - Complete job
*DRYRUN* [CI / Build Artifact Gate/Block committed build artifacts] 🏁  Job succeeded
```

Standalone reproduction of the PATTERN pipeline against the post-review code (commit `c1ad9e4`):

```
case=empty                            PATTERN=[]
  -> graceful-skip-reached
case=whitespace-only                  PATTERN=[]
  -> graceful-skip-reached
case=single-path                      PATTERN=[assets/build/]
  -> continues to diff phase
case=multi-path-with-regex-chars      PATTERN=[assets/build/|c\+\+build/|dist\[v2\]/]
  -> continues to diff phase
overall-exit=0
```

Confirms: empty and whitespace-only `gated-paths` reach the graceful-skip branch (acceptance criterion), and paths with regex metacharacters (`c++build/`, `dist[v2]/`) are escaped as literal strings.

---

## Open questions

- _(none yet)_

---

## Notes for the reviewer

- A full end-to-end smoke test against a real `pull_request` payload is still outstanding. `act --dryrun` cannot exercise the actual GitHub event context, so the "detects a committed `assets/build/` file, surfaces a clear error, exits 1" path is unverified locally. Recommend running once against a throwaway consumer repo before tagging.
- This PR closes an external issue (`rtCamp/theme-elementary#642`), so there was no internal GitHub issue in this repo. This file was created retroactively to keep the decision log alongside the other v1.0.0 task issues.
- `.yamllint.yml` line 14 conflicts with PRs #6 and #8. PR #6 already merged, so this branch was rebased and the conflict resolved before final review.

---

## Handoff log

_(no rotations yet; delete this line when the first entry is added)_
