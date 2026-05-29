# Issue #14 — Add CD GitHub Releases workflow (`cd-github-release.yml`)

**Status:** in-review
**Branch:** `v1.0.0/task/cd-github-release`
**PR:** #24
**Assignee:** @Adi-ty

---

## Summary

Tagging a release should produce a Git tag, a GitHub Release carrying the changelog notes, and the build artifact attached to that Release — without every skeleton wiring it by hand. `cd-github-release.yml` does exactly that on a `v*.*.*` tag push: download the named artifact, extract the matching `CHANGELOG.md` section as the body, and create the Release. It is the first CD workflow in the repo and the GitHub-target option the CD orchestrator (`wp-cd.yml`, #17) will call.

---

## Decisions made

- [2026-05-29] Create the Release with the **`gh` CLI** (`gh release create`), not `softprops/action-gh-release`. gh is preinstalled on runners, needs no third-party SHA to pin/track, and matches the repo's "prefer official/built-in tooling" rule. Overrides the issue's softprops suggestion.
- [2026-05-29] **README-only** delivery — no `.github/workflows/_examples/` file. The dir does not exist and every prior workflow shipped README-only. Overrides the issue's literal `_examples/` acceptance criterion for consistency.
- [2026-05-29] **Tolerant changelog heading match.** The awk does a literal first-token compare after stripping `## `, surrounding brackets, and a leading `v` — so `## v1.2.3`, `## 1.2.3`, `## [1.2.3]`, `## [v1.2.3]`, and `## v1.2.3 - <date>` all match `v1.2.3`, while `## Unreleased` and `## v1.2.30` do not. Avoids dynamic-regex escaping entirely.
- [2026-05-29] **Injection-safe:** `tag` / paths / booleans pass through step-level `env:` and are referenced as `$VARS`; nothing is interpolated as `${{ inputs.* }}` inside a shell/awk script (hardens the issue's reference snippet).
- [2026-05-29] **Fail closed:** missing changelog file, empty/absent section, or an empty downloaded artifact each `::error::` + `exit 1` — never publish a Release with no notes or no asset. `gh release create` runs with `--verify-tag` so a wrong/absent tag errors rather than silently creating a tag off the default branch.
- [2026-05-29] Inputs are exactly the five from the contract: `tag` (required), `artifact-name` (required), `changelog-path` (`CHANGELOG.md`), `draft` (`false`), `prerelease` (`false`). No extra knobs added.

---

## Files changed so far

- `.github/workflows/cd-github-release.yml` — new
- `README.md` — edited (new `### cd-github-release.yml` section)
- `CHANGELOG.md` — edited (bullet under Unreleased → Added)
- `.claude/issues/14-cd-github-release.md` — new (this file)

---

## Verification run

```bash
$ yamllint .                       # exit 0 (via pipx)
$ act workflow_call -W .github/workflows/cd-github-release.yml --dryrun
  ✅ Checkout → Download release artifact → Extract changelog section → Create GitHub Release → Job succeeded

# changelog parser unit-check (awk, TAG=v1.2.3 against a fixture):
#   ## v1.2.3   → body extracted
#   ## [1.2.3]  → body extracted
#   ## Unreleased / ## v1.2.30 → not matched
#   empty / absent section → exit 1
```

All pass. `## v1.2.3` and `## [1.2.3]` extract the right body; `## Unreleased` and `## v1.2.30` are not matched for tag `v1.2.3`; a tag with no section returns empty → exit 1. (A degenerate `tag: vUnreleased` would match `## Unreleased`, but a `v*.*.*` trigger can never produce that, so no special-casing.)

---

## Open questions

- _(none yet)_

---

## Notes for the reviewer

- **Same-run artifact:** `actions/download-artifact@v4` only sees the current run's artifacts. The intended model is orchestrator-driven (build → release in one run); a standalone tag-push call with no in-run build finds nothing.
- **Re-runs:** `gh release create` fails if the Release already exists. Acceptable for "create a Release" — no idempotency was requested. Flag if reviewers want upsert behaviour.
- **Asset shape:** attaches each file under `artifact/` as a Release asset (mirrors the issue's `files: artifact/*`). A single zipped asset would be a follow-up.
- **End-to-end is deferred:** `act` cannot create a real Release. Real proof is a `v*.*.*` tag push in a throwaway consumer (or via the orchestrator) with `contents: write`.
- **Soft deps:** #11 (artifact contract) and #17 (orchestrator) are open but non-blocking — the upload contract already lives in `ci-build.yml`, and the orchestrator is downstream.
- **Action pins:** `actions/checkout@…v4.2.2` (reused), `actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093 # v4.3.0` (matches the v4 `upload-artifact` producer).

---

## Handoff log

_(no rotations yet — delete this line when the first entry is added)_
