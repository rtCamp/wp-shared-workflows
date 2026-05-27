# Issue #18 — Add Version Monitor reusable workflow

**Status:** in-progress
**Branch:** `v1.0.0/task/version-monitor-workflow`
**PR:** <!-- fill once opened -->
**Assignee:** @Swanand01

---

## Summary

Add a `version-monitor.yml` reusable workflow that runs on a monthly schedule, calls `npx @rtcamp/wp-tooling version-monitor` to detect version bumps across npm, GitHub Actions, PHP, Node, WP-CLI, and container base images, and opens a draft PR on a `version-monitor/YYYY-MM` branch. Re-runs in the same month update the existing PR rather than opening a duplicate. The `wp-tooling` command steps are stubbed pending `wp-tooling#10`.

---

## Decisions made

- [2026-05-26] Using `peter-evans/create-pull-request@v8.1.1` (SHA-pinned) for PR creation — handles idempotent open/update on the same monthly branch automatically.
- [2026-05-26] Config check (`.github/version-monitor.yml` present) runs before Node setup for fast failure.
- [2026-05-26] `npx wp-tooling` steps are stubbed with `TODO(wp-tooling#10)` comments; stub always produces `count=0` so PR steps are never reached until real tool is wired in.
- [2026-05-26] Building workflow structure now; real `wp-tooling` commands wired once `wp-tooling#10` merges.

---

## Files changed so far

- `.claude/issues/18-version-monitor-workflow.md` — new
- `.github/workflows/version-monitor.yml` — new
- `.github/workflows/_examples/caller-version-monitor.yml` — new
- `README.md` — edited
- `CHANGELOG.md` — new

---

## Verification run

```bash
$ # No act dry-run yet — wp-tooling#10 needed for end-to-end test
$ # YAML structure validated via yamllint (run locally)
```

---

## Open questions

- What is the exact output schema of `npx @rtcamp/wp-tooling version-monitor --detect`? (blocks wiring real steps)

---

## Notes for the reviewer

- All three `npx wp-tooling` step bodies are stubs. The workflow structure, inputs, idempotency logic, and PR wiring are ready for review.
- End-to-end smoke test is blocked on `wp-tooling#10`.

---

## Handoff log

_(no rotations yet — delete this line when the first entry is added)_
