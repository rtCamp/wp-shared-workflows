# Issue #3 — ci-test-js.yml reusable workflow

**Status:** in-progress
**Branch:** `v1.0.0/task/ci-test-js`
**PR:** #4
**Assignee:** @Adi-ty

---

## Summary

Every rtCamp WordPress project that ships JS runs the same Jest pipeline — `Test and Measure`'s `unit-tests-js` job is copy-pasted across plugins, themes, and Composer packages with minor drift. Centralising this as a reusable workflow lets every consumer adopt one canonical implementation via `uses: rtCamp/shared-workflows/.github/workflows/ci-test-js.yml@v1`, and adds Jest cache support that the legacy job didn't have.

---

## Decisions made

- [2026-05-12] `node-version` ships with `default: "22"`, not `required: true`. CLAUDE.md says "Node 22 (overridable per call)"; required-with-no-default would be boilerplate tax for a workflow library where every consumer wants the org default anyway. Major bumps go to `@v2` per tag strategy, so silent drift is already prevented.
- [2026-05-12] Jest cache path resolved at runtime via `$HOME/.jest-cache` in a step output, not literal `~/.jest-cache` in the env. Reason: Node doesn't expand `~` from `process.env.JEST_CACHE_DIRECTORY`, but `actions/cache` *does* expand `~` for its `path:` field — mixing both forms silently breaks caching. Computing once with `$HOME` keeps both ends pointing at the same directory.
- [2026-05-12] When `enable-cache: false`, the resolve step is skipped, `steps.jest-cache.outputs.dir` is empty, and `JEST_CACHE_DIRECTORY` becomes `""`. Jest treats empty as falsy and falls back to its OS-temp default — same end-state as not setting the var at all.
- [2026-05-12] `--ci` baked into the default `test-command`. Legacy used `env: CI: true` (still set by the runner automatically); the explicit flag in the default communicates intent at the call site.
- [2026-05-12] Cache key keyed by OS only (`jest-${{ runner.os }}`) per spec. Jest manages its own internal invalidation; no need to mix `node-version` or content hashes into the key.
- [2026-05-12] Job display name `Jest` — matches the tool-name pattern from the lint-trio PR (`Stylelint`, `ESLint`).

---

## Files changed so far

- `.github/workflows/ci-test-js.yml` — new
- `.claude/issues/3-ci-test-js.md` — new
- `CHANGELOG.md` — new
- `README.md` — edited
- `.yamllint.yml` — edited (drive-by: removed stray spaces in `truthy.allowed-values` flow sequence so the starter-kit config passes its own linter; same fix also lives on the lint PR — merge order produces a trivial no-op conflict)

---

## Verification run

```bash
$ pipx run yamllint .github/workflows/ci-test-js.yml
(no output — clean)
```

---

## Open questions

- _(none yet)_

---

## Notes for the reviewer

- SHA pins resolved: `actions/checkout@v4.2.2` → `11bd71901bbe5b1630ceea73d27597364c9af683`, `actions/setup-node@v4.1.0` → `39370e3970a6d050c480ffad4ff0ed4d3fdee5af`, `actions/cache@v4.2.0` → `1bd1e32a3bdc45362d1e726936510720a7c30a57`. All three are direct commit refs (not annotated tag objects — verified via `gh api .../git/refs/tags/...`).
- README's "Individual workflows" section is new in this PR.
- Smoke test deferred to consumer-side run — call this branch from a Jest-configured throwaway repo and confirm: clean exit on green tests, non-zero on a failing test, cache restore visible in `actions/cache` step logs on the second run.

---

## Handoff log

_(no rotations yet — delete this line when the first entry is added)_
