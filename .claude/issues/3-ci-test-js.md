# Issue #3 — ci-test-js.yml reusable workflow

**Status:** in-progress
**Branch:** `v1.0.0/task/ci-test-js`
**PR:** #4
**Assignee:** @Adi-ty

---

## Summary

Every rtCamp WordPress project that ships JS runs the same Jest pipeline — `Test and Measure`'s `unit-tests-js` job is copy-pasted across plugins, themes, and Composer packages with minor drift. Centralising this as a reusable workflow lets every consumer adopt one canonical implementation via `uses: rtCamp/wp-shared-workflows/.github/workflows/ci-test-js.yml@v1`, and adds Jest cache support that the legacy job didn't have.

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
❯ pipx run yamllint .
❯ act workflow_call -W .github/workflows/ci-test-js.yml --dryrun
INFO[0000] Using docker host 'unix:///var/run/docker.sock', and daemon socket 'unix:///var/run/docker.sock' 
WARN  ⚠ You are using Apple M-series chip and you have not specified container architecture, you might encounter issues while running act. If so, try running it with '--container-architecture linux/amd64'. ⚠  
*DRYRUN* [CI / Test JS/Jest] ⭐ Run Set up job
*DRYRUN* [CI / Test JS/Jest] 🚀  Start image=node:16-buster-slim
*DRYRUN* [CI / Test JS/Jest]   🐳  docker pull image=node:16-buster-slim platform= username= forcePull=true
*DRYRUN* [CI / Test JS/Jest]   🐳  docker create image=node:16-buster-slim platform= entrypoint=["tail" "-f" "/dev/null"] cmd=[] network="host"
*DRYRUN* [CI / Test JS/Jest]   🐳  docker run image=node:16-buster-slim platform= entrypoint=["tail" "-f" "/dev/null"] cmd=[] network="host"
*DRYRUN* [CI / Test JS/Jest]   ✅  Success - Set up job
*DRYRUN* [CI / Test JS/Jest]   ☁  git clone 'https://github.com/actions/setup-node' # ref=39370e3970a6d050c480ffad4ff0ed4d3fdee5af
*DRYRUN* [CI / Test JS/Jest]   ☁  git clone 'https://github.com/actions/cache' # ref=1bd1e32a3bdc45362d1e726936510720a7c30a57
*DRYRUN* [CI / Test JS/Jest] ⭐ Run Main Checkout repository
*DRYRUN* [CI / Test JS/Jest]   ✅  Success - Main Checkout repository [5.413291ms]
*DRYRUN* [CI / Test JS/Jest] ⭐ Run Main Set up Node.js
*DRYRUN* [CI / Test JS/Jest]   ✅  Success - Main Set up Node.js [5.880042ms]
*DRYRUN* [CI / Test JS/Jest] ⭐ Run Main Install npm dependencies
*DRYRUN* [CI / Test JS/Jest]   ✅  Success - Main Install npm dependencies [16.523709ms]
*DRYRUN* [CI / Test JS/Jest] ⭐ Run Main Run Jest
*DRYRUN* [CI / Test JS/Jest]   ✅  Success - Main Run Jest [17.757417ms]
*DRYRUN* [CI / Test JS/Jest] ⭐ Run Post Set up Node.js
*DRYRUN* [CI / Test JS/Jest]   ✅  Success - Post Set up Node.js [4.301542ms]
*DRYRUN* [CI / Test JS/Jest] ⭐ Run Complete job
*DRYRUN* [CI / Test JS/Jest] Cleaning up container for job Jest
*DRYRUN* [CI / Test JS/Jest]   ✅  Success - Complete job
*DRYRUN* [CI / Test JS/Jest] 🏁  Job succeeded
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
