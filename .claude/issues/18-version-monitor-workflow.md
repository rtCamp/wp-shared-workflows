# Issue #18 — Add Version Monitor reusable workflow

**Status:** in-review
**Branch:** `v1.0.0/task/version-monitor-workflow`
**PR:** <!-- fill once opened -->
**Assignee:** @Swanand01

---

## Summary

Add a `version-monitor.yml` reusable workflow that runs on a monthly schedule, calls `@rtcamp/wp-tooling version-monitor` to detect version bumps across npm, GitHub Actions, PHP, Node, WP-CLI, and container base images, and opens a draft PR on a `version-monitor/YYYY-MM` branch. Re-runs in the same month update the existing PR rather than opening a duplicate.

---

## Decisions made

- [2026-05-26] Using `peter-evans/create-pull-request@v8.1.1` (SHA-pinned) for PR creation — handles idempotent open/update on the same monthly branch automatically.
- [2026-05-26] Config check (`.github/version-monitor.yml` present) runs before Node setup for fast failure.
- [2026-05-27] Install step uses branch URL (`git+https://github.com/rtCamp/wp-tooling.git#v1.0.0/task/version-monitor-scripts`) with a `TODO(wp-tooling#10)` comment to switch to the published package once released.
- [2026-05-27] `updates.json` and `pr-body.md` written to `$RUNNER_TEMP` (not the workspace) so `peter-evans/create-pull-request` does not commit them into the consumer repo's dependency-bump PR.

---

## Files changed

- `.claude/issues/18-version-monitor-workflow.md` — new
- `.github/workflows/version-monitor.yml` — new
- `.github/workflows/_examples/caller-version-monitor.yml` — new
- `README.md` — edited
- `CHANGELOG.md` — new

---

## Verification run

Tested locally with `act` v0.2.88 (`~/.local/bin/act`) using `--platform ubuntu-latest=-self-hosted`.

**No-updates path** — `wp-tooling version-monitor --detect` ran against this repo's `.github/version-monitor.yml`, returned `count=0`, workflow exited cleanly with expected log message.

**Updates-found path** — detect step patched to emit a single fake update record with the correct schema (`source`, `file`, `package`, `currentValue`, `latestValue`, `reason`). Confirmed:
- `--apply` and `--report` steps executed
- `pr-body.md` generated in `$RUNNER_TEMP` with correct markdown table (`actions/checkout | v3.5.3 | v4.2.2`)
- Workspace clean check passed — neither `updates.json` nor `pr-body.md` present in the repo working tree

**Config-missing guard** — removed `.github/version-monitor.yml` and confirmed workflow errors with `::error::` annotation and non-zero exit.

Full PR creation (`peter-evans/create-pull-request`) requires a pushed branch and real CI — local runner cannot complete that step.

---

## Open questions

_(none)_

---

## Notes for the reviewer

- Install step intentionally uses the branch URL while `@rtcamp/wp-tooling` is unpublished; the `TODO(wp-tooling#10)` comment marks the switch point.
- End-to-end PR creation (the `peter-evans/create-pull-request` step) is verified structurally but requires real CI for a live smoke test.

---

## Handoff log

_(no rotations yet — delete this line when the first entry is added)_
